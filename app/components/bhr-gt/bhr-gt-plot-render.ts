import * as Plot from "@observablehq/plot";
import { max, min } from "d3-array";
import { scaleBand } from "d3-scale";
import type { BHRGTLayer, Grainshape } from "@bedrock-engineer/bro-xml-parser";
import {
  LAB_TEST_CATEGORIES,
  type LabTestCategory,
} from "./determination-types";
import {
  PLOT_MARGINS,
  depthYScaleOptions,
  hiddenXAxisConfig,
  createWatermarkMark,
  filterLayersByPixelHeight,
} from "../../util/plot-config";
import {
  buildSoilBands,
  injectHatchPatterns,
  type SoilBand,
} from "../../util/bro-lithology";

/** Minimal shape of i18next's t() used here (dynamic keys, returns a string). */
export type TranslateFunction = (key: string) => string;

// Per-layer attributes now live in the depth-aligned HTML details table beside
// the chart, so the SVG only needs room for the lab-sample indicator columns
// (which extend to ~x=1.43) plus the groundwater marker.
const BHRGT_MARGIN_RIGHT = 100;

// Soil bands sit flush with the top of the plot frame (no reserved label band);
// the depth/NAP unit label lives in the HTML header above the chart instead.
const BHRGT_MARGIN_TOP = 0;

// Derived from LAB_TEST_CATEGORIES to ensure they stay in sync
export const CATEGORY_ORDER = Object.keys(
  LAB_TEST_CATEGORIES,
) as Array<LabTestCategory>;

/** Band scale for positioning sample indicator columns by category */
const sampleCategoryScale = scaleBand<LabTestCategory>()
  .domain(CATEGORY_ORDER)
  .range([1.01, 1.01 + CATEGORY_ORDER.length * 0.053])
  .paddingInner(0.06)
  .paddingOuter(0);

export interface SampleLine {
  beginDepth: number;
  endDepth: number;
  category: LabTestCategory;
  intervalIndex: number;
}

export interface BuildBhrgtPlotOptions {
  layers: Array<BHRGTLayer>;
  sampleLines: Array<SampleLine>;
  /** Groundwater depth during drilling (m below surface) */
  groundwaterLevel?: number | null;
  /** Surface elevation (m NAP). When set and napMode is on, the depth axis is
   *  relabelled to NAP elevation. */
  surfaceNap?: number | null;
  /** Label the depth axis as m NAP rather than m below surface. */
  napMode?: boolean;
  width: number;
  height: number;
  t: TranslateFunction;
}

/**
 * Build the BHR-GT bore plot SVG, ready to append to the DOM.
 * Returns null when there are no layers to render.
 */
export function buildBhrgtPlot({
  layers,
  sampleLines,
  groundwaterLevel,
  surfaceNap,
  napMode,
  width,
  height,
  t,
}: BuildBhrgtPlotOptions): (SVGSVGElement | HTMLElement) | null {
  if (layers.length === 0) {
    return null;
  }

  // Calculate the depth range
  const minDepth = min(layers.map((l) => l.upperBoundary)) ?? 0;
  const maxDepth = max(layers.map((l) => l.lowerBoundary)) ?? 0;
  const plotHeight = height - PLOT_MARGINS.top - PLOT_MARGINS.bottom - 20;

  // In NAP mode the y axis still positions by depth, but tick labels show the
  // NAP elevation (surface − depth) instead of depth below surface.
  const useNap = napMode === true && surfaceNap != null;
  const tickFormat = useNap
    ? (depth: number) => (surfaceNap - depth).toFixed(1)
    : undefined;

  const layersWithLabels = filterLayersByPixelHeight(
    layers,
    plotHeight,
    minDepth,
    maxDepth,
  );

  const hasGroundwater = groundwaterLevel != null;

  // Split each layer into proportional soil-composition bands (main soil +
  // admixtures), coloured by soil type with a hatch overlay per band.
  const soilBands = buildSoilBands(layers);
  const hatchedBands = soilBands.filter((b) => b.hatchId);

  const plot = Plot.plot({
    style: {
      overflow: "visible",
      backgroundColor: "white",
    },
    width,
    height,
    marginLeft: PLOT_MARGINS.left,
    marginRight: BHRGT_MARGIN_RIGHT,
    marginTop: BHRGT_MARGIN_TOP,
    marginBottom: PLOT_MARGINS.bottom,
    // Pass fill values verbatim (hex colours and url(#pattern) refs)
    color: { type: "identity" },
    x: hiddenXAxisConfig,
    // Shares its domain + range with the HTML details table's d3 scale.
    y: {
      ...depthYScaleOptions(height, minDepth, maxDepth, BHRGT_MARGIN_TOP),
      tickFormat,
    },
    marks: [
      // Soil composition bands: main soil + admixtures, widths proportional to
      // the BRO admixture grades (e.g. sterkZandigeKlei ≈ half sand).
      Plot.rect(soilBands, {
        x1: "x1",
        x2: "x2",
        y1: "y1",
        y2: "y2",
        fill: "color",
        stroke: "white",
        strokeWidth: 0.5,
      }),
      // Hatch overlay per band (second visual channel beyond colour)
      Plot.rect(hatchedBands, {
        x1: "x1",
        x2: "x2",
        y1: "y1",
        y2: "y2",
        fill: (d: SoilBand) => `url(#${d.hatchId})`,
        stroke: null,
      }),
      // Transparent full-width overlay carrying the per-layer tooltip
      Plot.rect(layers, {
        x1: 0,
        x2: 1,
        y1: "upperBoundary",
        y2: "lowerBoundary",
        fill: "transparent",
        title: (d: BHRGTLayer) => formatBHRGTLayerTitle(d, t),
        tip: true,
      }),
      // Soil-name labels for layers tall enough in pixels. A white halo
      // (paint-order: stroke) plus wrapping keeps names legible over the
      // narrow, dark soil bands instead of hard-truncating them.
      Plot.text(layersWithLabels, {
        x: 0.5,
        y: (d: BHRGTLayer) =>
          d.upperBoundary + (d.lowerBoundary - d.upperBoundary) / 2,
        text: (d: BHRGTLayer) => d.geotechnicalSoilName,
        fill: "black",
        stroke: "white",
        strokeWidth: 2,
        paintOrder: "stroke",
        fontSize: 9,
        textAnchor: "middle",
        lineWidth: 8,
        lineHeight: 1,
      }),
      // Sample interval lines showing lab test locations
      ...(sampleLines.length > 0
        ? [
            Plot.rect(sampleLines, {
              x1: (d: SampleLine) => sampleCategoryScale(d.category) ?? 1.01,
              x2: (d: SampleLine) =>
                (sampleCategoryScale(d.category) ?? 1.01) +
                sampleCategoryScale.bandwidth(),
              y1: "beginDepth",
              y2: "endDepth",
              fill: (d: SampleLine) => LAB_TEST_CATEGORIES[d.category].color,
              stroke: "white",
              strokeWidth: 0.5,
              title: (d: SampleLine) =>
                `${t(`labTestType.${d.category}`)}\n${d.beginDepth.toFixed(2)} – ${d.endDepth.toFixed(2)} m`,
              tip: true,
            }),
          ]
        : []),
      // Groundwater level during drilling (dashed line + ▽ marker)
      ...(hasGroundwater
        ? [
            Plot.ruleY([groundwaterLevel], {
              stroke: "#2563eb",
              strokeWidth: 1.2,
              strokeDasharray: "4 3",
            }),
            Plot.text([groundwaterLevel], {
              x: 0,
              y: (d: number) => d,
              text: (d: number) =>
                useNap
                  ? `▽ ${t("waterLevel")} ${(surfaceNap - d).toFixed(2)} m NAP`
                  : `▽ ${t("waterLevel")} ${d.toFixed(2)} m`,
              textAnchor: "start",
              dx: 3,
              dy: -3,
              fill: "#2563eb",
              fontSize: 9,
              fontWeight: "bold",
              // White halo keeps the label legible over the soil bands.
              stroke: "white",
              strokeWidth: 2.5,
              paintOrder: "stroke",
            }),
          ]
        : []),
      Plot.frame(),
      createWatermarkMark(t("madeWithBedrockBroViewer")),
    ],
  });

  // Inject the hatch <pattern> defs the bands reference via url(#…).
  const svg = (
    plot.tagName.toLowerCase() === "svg" ? plot : plot.querySelector("svg")
  ) as SVGElement | null;
  if (svg) {
    injectHatchPatterns(svg);
  }

  return plot;
}

/** A labelled per-layer attribute, ready for the tooltip or the details table. */
export interface LayerAttribute {
  /** Stable identifier (also the i18n key) — used to pivot attributes into
   *  the details-table columns. */
  key: string;
  label: string;
  value: string;
}

/**
 * Canonical order of the secondary-attribute keys, matching the push order in
 * {@link getLayerAttributes}. The details table uses this to order its columns.
 */
export const LAYER_ATTRIBUTE_KEYS = [
  "layerColor",
  "organicMatter",
  "carbonateContentClass",
  "sandMedian",
  "tertiaryConstituent",
  "fineSoilConsistency",
  "organicSoilConsistency",
  "organicSoilTexture",
  "peatTensileStrength",
  "angularity",
  "sphericity",
  "dispersedInhomogeneity",
  "anthropogenic",
  "bedded",
  "mixed",
  "mottled",
  "roughness",
] as const satisfies Array<
  | keyof BHRGTLayer
  | keyof Grainshape
  | "layerColor"
  | "sandMedian"
  | "organicMatter"
>;

// Codelist values that carry no information for the reader (negatives /
// unknowns). Dropped from both the tooltip and the details table so rows
// aren't cluttered with "geen", "nietOrganisch", "kalkloos", etc. Mirrors the
// isMeaningful() filter in open-geotechniek-studio's bore strip-log.
const NOISE_VALUES = new Set(["geen", "onbekend", "nietorganisch"]);

function isMeaningful(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }
  const v = value.toLowerCase();
  return !NOISE_VALUES.has(v) && !v.startsWith("kalkloos");
}

/**
 * Labelled secondary attributes of a layer, filtered to the meaningful ones.
 * Strings are kept as-is; booleans are included only when true (a "no" row
 * everywhere is noise). Shared by the hover tooltip and the HTML details table.
 */
export function getLayerAttributes(
  layer: BHRGTLayer,
  t: TranslateFunction,
): Array<LayerAttribute> {
  const attributes: Array<LayerAttribute> = [];

  const pushString = (key: string, value: string | null | undefined): void => {
    if (isMeaningful(value)) {
      attributes.push({ key, label: t(key), value });
    }
  };
  
  const pushFlag = (key: string, value: boolean | null | undefined): void => {
    if (value === true) {
      attributes.push({ key, label: t(key), value: t("yes") });
    }
  };

  pushString("layerColor", layer.color);
  pushString("organicMatter", layer.organicMatterContentClass);
  pushString("carbonateContentClass", layer.carbonateContentClass);
  pushString("sandMedian", layer.sandMedianClass);
  pushString("tertiaryConstituent", layer.tertiaryConstituent);
  pushString("fineSoilConsistency", layer.fineSoilConsistency);
  pushString("organicSoilConsistency", layer.organicSoilConsistency);
  pushString("organicSoilTexture", layer.organicSoilTexture);
  pushString("peatTensileStrength", layer.peatTensileStrength);
  pushString("angularity", layer.grainshape?.angularity);
  pushString("sphericity", layer.grainshape?.sphericity);
  pushString("roughness", layer.grainshape?.roughness);
  pushFlag("dispersedInhomogeneity", layer.dispersedInhomogeneity);
  pushFlag("anthropogenic", layer.anthropogenic);
  pushFlag("bedded", layer.bedded);
  pushFlag("mixed", layer.mixed);
  pushFlag("mottled", layer.mottled);

  return attributes;
}

function formatBHRGTLayerTitle(
  layer: BHRGTLayer,
  t: TranslateFunction,
): string {
  const parts = [
    `${layer.upperBoundary.toFixed(2)} – ${layer.lowerBoundary.toFixed(2)} m`,
    layer.geotechnicalSoilName,
    ...getLayerAttributes(layer, t).map(
      ({ label, value }) => `${label}: ${value}`,
    ),
  ];

  return parts.join("\n");
}
