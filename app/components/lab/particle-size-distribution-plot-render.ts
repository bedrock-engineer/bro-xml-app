import type {
  Measure,
  ParticleSizeDistributionDetermination,
} from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import {
  createWatermarkMark,
  type TranslateFunction,
} from "../../util/plot-config";

// Size fractions in μm with their corresponding field names, smallest first.
// BRO allows two sieve series (e.g. 63–90–125 μm vs 63–75–90–106–125 μm); a
// file reports in one of them, so both are merged here and absent fields are
// simply skipped.
const FRACTIONS: Array<{
  size: number;
  field: keyof ParticleSizeDistributionDetermination;
}> = [
  { size: 2, field: "fraction0to2um" },
  { size: 4, field: "fraction2to4um" },
  { size: 8, field: "fraction4to8um" },
  { size: 16, field: "fraction8to16um" },
  { size: 32, field: "fraction16to32um" },
  { size: 50, field: "fraction32to50um" },
  { size: 63, field: "fraction50to63um" },
  { size: 75, field: "fraction63to75um" },
  { size: 90, field: "fraction63to90um" },
  { size: 90, field: "fraction75to90um" },
  { size: 106, field: "fraction90to106um" },
  { size: 125, field: "fraction90to125um" },
  { size: 125, field: "fraction106to125um" },
  { size: 150, field: "fraction125to150um" },
  { size: 180, field: "fraction125to180um" },
  { size: 180, field: "fraction150to180um" },
  { size: 212, field: "fraction180to212um" },
  { size: 250, field: "fraction180to250um" },
  { size: 250, field: "fraction212to250um" },
  { size: 355, field: "fraction250to355um" },
  { size: 500, field: "fraction355to500um" },
  { size: 710, field: "fraction500to710um" },
  { size: 1000, field: "fraction710to1000um" },
  { size: 1400, field: "fraction1000to1400um" },
  { size: 2000, field: "fraction1400umto2mm" },
  { size: 4000, field: "fraction2to4mm" },
  { size: 5600, field: "fraction4to5_6mm" },
  { size: 8000, field: "fraction4to8mm" },
  { size: 8000, field: "fraction5_6to8mm" },
  { size: 11_200, field: "fraction8to11_2mm" },
  { size: 16_000, field: "fraction8to16mm" },
  { size: 16_000, field: "fraction11_2to16mm" },
  { size: 20_000, field: "fraction16to20mm" },
  { size: 31_500, field: "fraction16to31_5mm" },
  { size: 31_500, field: "fraction20to31_5mm" },
  { size: 63_000, field: "fraction31_5to63mm" },
];

// The fine tail can also arrive as one aggregate instead of the 2-4-8-16-32 μm
// breakdown. Only used when the whole breakdown is absent, so a file carrying
// both can't be double counted.
const FINE_AGGREGATE = { size: 32, field: "fraction2to32um" } as const;
const FINE_BREAKDOWN_FIELDS = [
  "fraction2to4um",
  "fraction4to8um",
  "fraction8to16um",
  "fraction16to32um",
] as const;

/** Build the cumulative grain-size curve from the determination's fractions. */
function buildSizeData(
  data: ParticleSizeDistributionDetermination,
): Array<{ size: number; passing: number }> {
  const sizeData: Array<{ size: number; passing: number }> = [];

  const hasFineBreakdown = FINE_BREAKDOWN_FIELDS.some(
    (field) => data[field] != null,
  );
  const fractions = hasFineBreakdown
    ? FRACTIONS
    : [...FRACTIONS, FINE_AGGREGATE].toSorted((a, b) => a.size - b.size);

  let cumulative = 0;
  for (const { size, field } of fractions) {
    const value = data[field] as Measure | null | undefined;
    if (value !== null && value !== undefined) {
      cumulative += value.value;
      sizeData.push({ size, passing: cumulative });
    }
  }

  if (sizeData.length === 0) {
    // Use basic fractions if detailed ones are not available
    if (data.fractionSmaller63um != null) {
      sizeData.push({ size: 63, passing: data.fractionSmaller63um.value });
    }
    if (data.fractionLarger63um != null) {
      sizeData.push({ size: 63_000, passing: 100 });
    }
  }

  return sizeData;
}

/**
 * Build the particle-size-distribution plot (cumulative passing vs grain size,
 * log x-axis). Returns null when there are no fractions to render.
 */
export function buildParticleSizeDistributionPlot(
  data: ParticleSizeDistributionDetermination,
  t: TranslateFunction,
): (SVGSVGElement | HTMLElement) | null {
  const sizeData = buildSizeData(data);

  if (sizeData.length === 0) {
    return null;
  }

  return Plot.plot({
    width: 600,
    height: 400,
    style: { backgroundColor: "white" },
    x: {
      type: "log",
      label: t("particleSizeAxisLabel"),
      grid: true,
      domain: [1, 100_000],
    },
    y: {
      label: t("cumulativePassingAxisLabel"),
      domain: [0, 100],
      grid: true,
    },
    marks: [
      Plot.frame(),
      // Soil classification boundaries
      Plot.ruleX([2], { stroke: "#ddd", strokeDasharray: "4,4" }),
      Plot.ruleX([63], { stroke: "#ddd", strokeDasharray: "4,4" }),
      Plot.ruleX([2000], { stroke: "#ddd", strokeDasharray: "4,4" }),
      // Labels for soil fractions (ISO 14688: clay < 2 μm, silt 2-63 μm,
      // sand 63-2000 μm, gravel 2-63 mm), at each band's geometric center
      Plot.text([{ x: 1.4, y: 95, text: t("clay") }], {
        x: "x",
        y: "y",
        text: "text",
        fontSize: 10,
        fill: "gray",
      }),
      Plot.text([{ x: 11, y: 95, text: t("siltSoil") }], {
        x: "x",
        y: "y",
        text: "text",
        fontSize: 10,
        fill: "gray",
      }),
      Plot.text([{ x: 355, y: 95, text: t("sand") }], {
        x: "x",
        y: "y",
        text: "text",
        fontSize: 10,
        fill: "gray",
      }),
      Plot.text([{ x: 11_000, y: 95, text: t("gravel") }], {
        x: "x",
        y: "y",
        text: "text",
        fontSize: 10,
        fill: "gray",
      }),
      // Data line
      Plot.line(sizeData, {
        x: "size",
        y: "passing",
        stroke: "#2563eb",
        strokeWidth: 2,
      }),
      Plot.dot(sizeData, {
        x: "size",
        y: "passing",
        fill: "#2563eb",
        r: 2,
      }),
      createWatermarkMark(t("madeWithBedrockBroViewer"), {
        frameAnchor: "top-right",
        dx: -5,
        dy: 5,
      }),
    ],
  });
}
