/**
 * BRO lithology rendering data: composition bands, soil colours, sand-class
 * refinement and hatch patterns.
 *
 * Ported from the `brodata` Python package (ArtesiaWater), `plot.py`
 * (`get_bro_lithology_properties`, `get_lithology_color`). Composite BRO
 * `geotechnicalSoilName` values map to proportionally-sized sub-bands of base
 * lithologies, each carrying a colour and (where defined) a hatch — a second
 * visual channel beyond colour. Widths follow the BRO admixture grades
 * (zwak/matig/sterk), expressed there as x/60 fractions and reproduced verbatim.
 *
 * Note: this colours by *soil type* (geotechnicalSoilName), unlike the parser's
 * getSoilColor() which maps an *observed* BRO colour name (e.g. "lichtBruin").
 * Soil names absent from the table fall back to the observed colour as a single
 * plain band, so nothing regresses.
 */
import type { BHRGTLayer } from "@bedrock-engineer/bro-xml-parser";
import { getSoilColor } from "@bedrock-engineer/bro-xml-parser";

/** Default colour when a layer has neither a mapped soil type nor a BRO colour */
export const DEFAULT_LAYER_COLOR = "#b0b0b0";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Observed-colour fill for a layer: the parser maps the BRO colour name
 * (e.g. "lichtBruin") to hex. Used as the fallback fill for soil names not in
 * the composition table.
 */
export function getLayerColor(layer: BHRGTLayer): string {
  if (layer.color) {
    return getSoilColor(layer.color, DEFAULT_LAYER_COLOR);
  }
  return DEFAULT_LAYER_COLOR;
}

// Base lithology fill colours (brodata get_bro_lithology_properties, RGB→hex).
const COLOR = {
  veen: "#994c3a",
  klei: "#009608",
  leem: "#dbdbdb",
  silt: "#dbdbdb",
  grind: "#f3c027",
  zand: "#fefe08", // unspecified sand median
  nietBepaald: "#7030a0",
  grondNietGespecificeerd: "#ffffff",
} as const;

// Sand colours refined by median class (brodata lithology_colors: zand
// fijn/midden/grof). Picked per layer from sandMedianClass.
const SAND_COLOR = {
  fine: "#ffff00",
  medium: "#f3e106",
  coarse: "#e7c316",
} as const;

type SandCategory = "fine" | "medium" | "coarse" | "unknown";

/**
 * Classify a BRO `sandMedianClass` value (codelist urn:bro:bhrgt:SandMedianClass,
 * e.g. "fijn", "middelgrof", "middelgrof200tot300um", "grof") into a coarse
 * fine/medium/coarse bucket. "middelgrof"/"matig" must be tested before "grof"
 * since they contain that substring.
 */
function classifySand(sandMedianClass: string | null | undefined): SandCategory {
  if (!sandMedianClass) {
    return "unknown";
  }
  const c = sandMedianClass.toLowerCase();
  if (c.startsWith("middelgrof") || c.startsWith("matig") || c.includes("midden")) {
    return "medium";
  }
  if (c.includes("fijn")) {
    return "fine";
  }
  if (c.includes("grof")) {
    return "coarse";
  }
  return "unknown";
}

/** Soil-type fill for a sand band, refined by the layer's median class. */
function sandColor(sandMedianClass: string | null | undefined): string {
  switch (classifySand(sandMedianClass)) {
    case "fine": {
      return SAND_COLOR.fine;
    }
    case "medium": {
      return SAND_COLOR.medium;
    }
    case "coarse": {
      return SAND_COLOR.coarse;
    }
    default: {
      return COLOR.zand;
    }
  }
}

/** Legend key for a sand band, refined by median class. */
function sandLegendKey(sandMedianClass: string | null | undefined): string {
  switch (classifySand(sandMedianClass)) {
    case "fine": {
      return "zandFijn";
    }
    case "medium": {
      return "zandMidden";
    }
    case "coarse": {
      return "zandGrof";
    }
    default: {
      return "zand";
    }
  }
}

// Hatch shapes per base lithology (brodata: veen "-", klei "/", leem "\",
// zand ".", grind "o", silt "|"). Rendered as 6×6 SVG <pattern> tiles, shared
// between the plot's <defs> and the legend swatches so both stay in sync.
const STROKE = `stroke="rgba(0,0,0,0.32)" stroke-width="0.8"`;
const HATCH_SHAPE: Record<string, string> = {
  veen: `<path d="M0,3 L6,3" ${STROKE}/>`,
  klei: `<path d="M0,6 L6,0" ${STROKE}/>`,
  leem: `<path d="M0,0 L6,6" ${STROKE}/>`,
  silt: `<path d="M3,0 L3,6" ${STROKE}/>`,
  zand: `<circle cx="3" cy="3" r="0.9" fill="rgba(0,0,0,0.32)"/>`,
  grind: `<circle cx="3" cy="3" r="1.4" fill="none" stroke="rgba(0,0,0,0.32)" stroke-width="0.7"/>`,
};

/** Base lithologies that carry a hatch (used to inject <pattern> defs). */
const HATCH_SOILS = Object.keys(HATCH_SHAPE);

/** SVG <pattern> id used inside the plot for a base lithology's hatch. */
function hatchPatternId(soil: string): string {
  return `bhrgt-hatch-${soil}`;
}

/** Build a <pattern> element for a base lithology ("" when it has no hatch). */
export function patternMarkup(soil: string, patternId: string): string {
  const shape = HATCH_SHAPE[soil];
  if (!shape) {
    return "";
  }
  return `<pattern id="${patternId}" width="6" height="6" patternUnits="userSpaceOnUse">${shape}</pattern>`;
}

/** Inject hatch <pattern> defs into the plot's SVG (idempotent). */
export function injectHatchPatterns(svg: SVGElement): void {
  if (svg.querySelector(`#${hatchPatternId("veen")}`)) {
    return;
  }
  const defs = document.createElementNS(SVG_NS, "defs");
  defs.innerHTML = HATCH_SOILS.map((soil) =>
    patternMarkup(soil, hatchPatternId(soil)),
  ).join("");
  svg.insertBefore(defs, svg.firstChild);
}

// A sub-band within a soil composition: a base lithology and the fraction of
// the layer width it occupies. `hatch: false` overrides the base lithology's
// default hatch (brodata draws the silt sub-band of uiterstSiltigeKlei plain).
interface SubBand {
  soil: keyof typeof COLOR;
  width: number;
  hatch?: false;
}

const f = (n: number) => n / 60; // BRO admixture grades are expressed as x/60

/**
 * BRO geotechnicalSoilName → proportional sub-bands. Ported verbatim from
 * brodata's get_bro_lithology_properties (widths in x/60). Base lithologies are
 * single full-width bands; composites stack a main soil plus its admixture(s).
 */
const BRO_LITHOLOGY_PROPERTIES: Record<string, Array<SubBand>> = {
  // Base lithologies
  veen: [{ soil: "veen", width: 1 }],
  klei: [{ soil: "klei", width: 1 }],
  leem: [{ soil: "leem", width: 1 }],
  zand: [{ soil: "zand", width: 1 }],
  grind: [{ soil: "grind", width: 1 }],
  silt: [{ soil: "silt", width: 1 }],
  nietBepaald: [{ soil: "nietBepaald", width: 1 }],
  grondNietGespecificeerd: [{ soil: "grondNietGespecificeerd", width: 1 }],
  // Composites (main soil + admixture)
  mineraalarmVeen: [{ soil: "veen", width: 1 }],
  zwakZandigVeen: [{ soil: "veen", width: f(50) }, { soil: "zand", width: f(10) }],
  sterkZandigVeen: [{ soil: "veen", width: f(41) }, { soil: "zand", width: f(19) }],
  zwakKleiigVeen: [{ soil: "veen", width: f(50) }, { soil: "klei", width: f(10) }],
  sterkKleiigVeen: [{ soil: "veen", width: f(41) }, { soil: "klei", width: f(19) }],
  kleiigVeen: [{ soil: "veen", width: f(42) }, { soil: "klei", width: f(18) }],
  zwakZandigSilt: [{ soil: "silt", width: f(48) }, { soil: "zand", width: f(12) }],
  zwakGrindigeKlei: [{ soil: "klei", width: f(48) }, { soil: "grind", width: f(12) }],
  zwakZandigeKlei: [{ soil: "klei", width: f(48) }, { soil: "zand", width: f(12) }],
  zwakZandigeKleiMetGrind: [{ soil: "klei", width: f(48) }, { soil: "zand", width: f(12) }],
  matigZandigeKlei: [{ soil: "klei", width: f(41) }, { soil: "zand", width: f(19) }],
  sterkZandigeKlei: [{ soil: "klei", width: f(30) }, { soil: "zand", width: f(30) }],
  sterkZandigeKleiMetGrind: [{ soil: "klei", width: f(36) }, { soil: "leem", width: f(24) }],
  zwakSiltigeKlei: [{ soil: "klei", width: f(50) }, { soil: "leem", width: f(10) }],
  matigSiltigeKlei: [{ soil: "klei", width: f(41) }, { soil: "leem", width: f(19) }],
  sterkSiltigeKlei: [{ soil: "klei", width: f(30) }, { soil: "leem", width: f(30) }],
  uiterstSiltigeKlei: [{ soil: "klei", width: f(26) }, { soil: "silt", width: f(34), hatch: false }],
  zwakZandigeLeem: [{ soil: "leem", width: f(50) }, { soil: "zand", width: f(10) }],
  sterkZandigeLeem: [{ soil: "leem", width: f(30) }, { soil: "zand", width: f(30) }],
  zwakGrindigZand: [{ soil: "zand", width: f(48) }, { soil: "grind", width: f(12) }],
  sterkGrindigZand: [{ soil: "zand", width: f(36) }, { soil: "grind", width: f(24) }],
  zwakSiltigZand: [{ soil: "zand", width: f(50) }, { soil: "leem", width: f(10) }],
  matigSiltigZand: [{ soil: "zand", width: f(41) }, { soil: "leem", width: f(19) }],
  sterkSiltigZand: [{ soil: "zand", width: f(30) }, { soil: "leem", width: f(30) }],
  siltigZandMetGrind: [{ soil: "zand", width: f(42) }, { soil: "silt", width: f(18) }],
  kleiigZand: [{ soil: "zand", width: f(50) }, { soil: "klei", width: f(10) }],
  kleiigZandMetGrind: [{ soil: "zand", width: f(42) }, { soil: "klei", width: f(18) }],
  siltigZand: [{ soil: "zand", width: f(42) }, { soil: "silt", width: f(18) }],
  zwakZandigGrind: [{ soil: "grind", width: f(48) }, { soil: "zand", width: f(12) }],
  sterkZandigGrind: [{ soil: "grind", width: f(36) }, { soil: "zand", width: f(24) }],
  zandNietGespecificeerd: [
    { soil: "zand", width: f(24) },
    { soil: "grondNietGespecificeerd", width: f(36) },
  ],
};

/** A horizontal soil composition band, ready for Plot.rect. */
export interface SoilBand {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  color: string;
  /** SVG pattern id of the hatch overlay, or undefined for a plain band */
  hatchId?: string;
  /** Legend bucket this band belongs to */
  legendKey: string;
}

// Resolve one layer into its composition sub-bands (x ∈ [0, 1]).
function layerBands(layer: BHRGTLayer): Array<SoilBand> {
  const y1 = layer.upperBoundary;
  const y2 = layer.lowerBoundary;
  const spec = BRO_LITHOLOGY_PROPERTIES[layer.geotechnicalSoilName];

  // Unmapped soil name: one plain band in the observed BRO colour.
  if (!spec) {
    return [
      {
        x1: 0,
        x2: 1,
        y1,
        y2,
        color: getLayerColor(layer),
        legendKey: `other:${layer.geotechnicalSoilName}`,
      },
    ];
  }

  let x = 0;
  return spec.map((band) => {
    const x1 = x;
    x += band.width;
    const isSand = band.soil === "zand";
    const color = isSand ? sandColor(layer.sandMedianClass) : COLOR[band.soil];
    const hatchId =
      band.hatch === false || !HATCH_SHAPE[band.soil]
        ? undefined
        : hatchPatternId(band.soil);
    const legendKey = isSand
      ? sandLegendKey(layer.sandMedianClass)
      : band.soil;
    return { x1, x2: x, y1, y2, color, hatchId, legendKey };
  });
}

/** Flatten all layers into horizontally-stacked composition bands. */
export function buildSoilBands(layers: Array<BHRGTLayer>): Array<SoilBand> {
  return layers.flatMap((layer) => layerBands(layer));
}

/** A soil legend entry, resolved to display data for the React legend. */
export interface SoilLegendEntry {
  key: string;
  color: string;
  /** Base lithology whose hatch to overlay on the swatch (undefined = plain) */
  hatchSoil?: string;
  /** i18n key for the label (preferred over rawLabel when present) */
  i18nKey?: string;
  /** Raw soil name label, for soils not in the composition table */
  rawLabel?: string;
}

// Canonical legend order + metadata for the known soil buckets (matches
// brodata's add_lithology_legend ordering: organic → fine clastics → sand
// fine/medium/coarse → gravel, with the "unknown" buckets last).
const LEGEND_ORDER: Array<{
  key: string;
  color: string;
  hatchSoil?: string;
  i18nKey: string;
}> = [
  { key: "veen", color: COLOR.veen, hatchSoil: "veen", i18nKey: "peat" },
  { key: "klei", color: COLOR.klei, hatchSoil: "klei", i18nKey: "clay" },
  { key: "leem", color: COLOR.leem, hatchSoil: "leem", i18nKey: "loam" },
  { key: "silt", color: COLOR.silt, hatchSoil: "silt", i18nKey: "siltSoil" },
  { key: "zandFijn", color: SAND_COLOR.fine, hatchSoil: "zand", i18nKey: "sandFine" },
  { key: "zandMidden", color: SAND_COLOR.medium, hatchSoil: "zand", i18nKey: "sandMedium" },
  { key: "zandGrof", color: SAND_COLOR.coarse, hatchSoil: "zand", i18nKey: "sandCoarse" },
  { key: "zand", color: COLOR.zand, hatchSoil: "zand", i18nKey: "sand" },
  { key: "grind", color: COLOR.grind, hatchSoil: "grind", i18nKey: "gravel" },
  { key: "nietBepaald", color: COLOR.nietBepaald, i18nKey: "notDetermined" },
  { key: "grondNietGespecificeerd", color: COLOR.grondNietGespecificeerd, i18nKey: "soilNotSpecified" },
];

const LEGEND_META = new Map(LEGEND_ORDER.map((entry) => [entry.key, entry]));

/**
 * Distinct soils present across the layers, as legend entries in canonical
 * order. Soils not in the composition table are appended (alphabetically) with
 * their raw name and observed colour.
 */
export function collectSoilLegend(
  layers: Array<BHRGTLayer>,
): Array<SoilLegendEntry> {
  // Record the first band seen per legend bucket (for the extras' colour).
  const present = new Map<string, SoilBand>();
  for (const band of buildSoilBands(layers)) {
    if (!present.has(band.legendKey)) {
      present.set(band.legendKey, band);
    }
  }

  const entries: Array<SoilLegendEntry> = [];
  // Known buckets, in canonical order.
  for (const { key, color, hatchSoil, i18nKey } of LEGEND_ORDER) {
    if (present.has(key)) {
      entries.push({ key, color, hatchSoil, i18nKey });
    }
  }
  // Extras (unmapped soil names), sorted by raw name.
  const extras = [...present.entries()]
    .filter(([key]) => !LEGEND_META.has(key))
    .toSorted((a, b) => a[0].localeCompare(b[0]));
  for (const [key, band] of extras) {
    entries.push({
      key,
      color: band.color,
      rawLabel: key.replace(/^other:/, ""),
    });
  }
  return entries;
}
