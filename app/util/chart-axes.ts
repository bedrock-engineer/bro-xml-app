/**
 * BRO CPT Chart Helpers
 *
 * Utilities for detecting chart axes and formatting column metadata for visualization.
 */

import type { CPTData, CPTMeasurement } from "@bedrock-engineer/bro-xml-parser";

export interface ChartColumn {
  key: keyof CPTMeasurement;
  unit: string;
  name: string;
  /** Conventional value range, used when plotting with fixed domains so
   *  multiple CPTs can be compared side by side. */
  fixedDomain?: [number, number];
}

interface ChartAxes {
  yAxis: ChartColumn | null;
  xAxis: ChartColumn | null;
  availableColumns: Array<ChartColumn>;
  yAxisOptions: Array<ChartColumn>;
}

/**
 * CPT measurement field metadata
 *
 * Fixed domains follow Dutch CPT plotting conventions (GEF/NEN-EN-ISO 22476-1
 * era charts): qc on 0–30 MPa, fs on 0–0.3 MPa, Rf on 0–10 %, etc. Values that
 * exceed these ranges are clipped when fixed domains are enabled — the point
 * of the fixed range is comparability between soundings, not full coverage.
 */
const CPT_COLUMN_METADATA: Record<
  keyof CPTMeasurement,
  { name: string; unit: string; fixedDomain?: [number, number] }
> = {
  penetrationLength: { name: "Penetration Length", unit: "m" },
  depth: { name: "Depth", unit: "m" },
  elapsedTime: { name: "Elapsed Time", unit: "s" },
  coneResistance: {
    name: "Cone Resistance (qc)",
    unit: "MPa",
    fixedDomain: [0, 60],
  },
  correctedConeResistance: {
    name: "Corrected Cone Resistance (qt)",
    unit: "MPa",
    fixedDomain: [0, 60],
  },
  netConeResistance: {
    name: "Net Cone Resistance (qn)",
    unit: "MPa",
    fixedDomain: [0, 60],
  },
  localFriction: {
    name: "Sleeve Friction (fs)",
    unit: "MPa",
    fixedDomain: [0, 0.3],
  },
  frictionRatio: {
    name: "Friction Ratio (Rf)",
    unit: "%",
    fixedDomain: [0, 10],
  },
  porePressureU1: {
    name: "Pore Pressure U1",
    unit: "MPa",
    fixedDomain: [-0.1, 1],
  },
  porePressureU2: {
    name: "Pore Pressure U2",
    unit: "MPa",
    fixedDomain: [-0.1, 1],
  },
  porePressureU3: {
    name: "Pore Pressure U3",
    unit: "MPa",
    fixedDomain: [-0.1, 1],
  },
  poreRatio: { name: "Pore Ratio", unit: "-", fixedDomain: [-0.2, 1.2] },
  inclinationX: { name: "Inclination X", unit: "°", fixedDomain: [-15, 15] },
  inclinationY: { name: "Inclination Y", unit: "°", fixedDomain: [-15, 15] },
  inclinationEW: { name: "Inclination EW", unit: "°", fixedDomain: [-15, 15] },
  inclinationNS: { name: "Inclination NS", unit: "°", fixedDomain: [-15, 15] },
  inclinationResultant: {
    name: "Inclination Resultant",
    unit: "°",
    fixedDomain: [0, 15],
  },
  magneticFieldStrengthX: {
    name: "Magnetic Field X",
    unit: "nT",
    fixedDomain: [-50_000, 50_000],
  },
  magneticFieldStrengthY: {
    name: "Magnetic Field Y",
    unit: "nT",
    fixedDomain: [-50_000, 50_000],
  },
  magneticFieldStrengthZ: {
    name: "Magnetic Field Z",
    unit: "nT",
    fixedDomain: [-50_000, 50_000],
  },
  magneticFieldStrengthTotal: {
    name: "Magnetic Field Total",
    unit: "nT",
    fixedDomain: [0, 75_000],
  },
  magneticInclination: {
    name: "Magnetic Inclination",
    unit: "°",
    fixedDomain: [0, 90],
  },
  magneticDeclination: {
    name: "Magnetic Declination",
    unit: "°",
    fixedDomain: [-30, 30],
  },
  electricalConductivity: {
    name: "Electrical Conductivity",
    unit: "mS/m",
    fixedDomain: [0, 500],
  },
  temperature: { name: "Temperature", unit: "°C", fixedDomain: [0, 25] },
};

/**
 * Get available columns from CPT measurement data
 */
function getAvailableColumns(data: Array<CPTMeasurement>): Array<ChartColumn> {
  const firstRow = data[0];
  if (!firstRow) {return [];}

  const columns: Array<ChartColumn> = [];

  for (const [key, meta] of Object.entries(CPT_COLUMN_METADATA)) {
    const fieldKey = key as keyof CPTMeasurement;
    // Check if the field exists and has non-null values in the data
    if (firstRow[fieldKey] !== undefined) {
      columns.push({
        key: fieldKey,
        unit: meta.unit,
        name: meta.name,
        fixedDomain: meta.fixedDomain,
      });
    }
  }

  return columns;
}

/**
 * Detect sensible default chart axes for BRO CPT data visualization
 *
 * Default behavior:
 * - Y-axis: Penetration length or depth
 * - X-axis: Cone resistance, fallback to corrected cone resistance or friction ratio
 */
export function detectChartAxes(cptData: CPTData): ChartAxes {
  const { data } = cptData;
  const availableColumns = getAvailableColumns(data);

  // Y-axis options: depth-related columns
  const yAxisOptions = availableColumns.filter((col) =>
    ["penetrationLength", "depth"].includes(col.key),
  );

  // Y-axis: prefer penetrationLength, then depth
  const yAxis =
    yAxisOptions.find((col) => col.key === "penetrationLength") ??
    yAxisOptions.find((col) => col.key === "depth") ??
    yAxisOptions[0] ??
    null;

  // X-axis candidates: exclude depth columns
  const xCandidates = availableColumns.filter(
    (col) => !["penetrationLength", "depth", "elapsedTime"].includes(col.key),
  );

  // X-axis: prefer coneResistance, then correctedConeResistance, then frictionRatio
  const xAxis =
    xCandidates.find((col) => col.key === "coneResistance") ??
    xCandidates.find((col) => col.key === "correctedConeResistance") ??
    xCandidates.find((col) => col.key === "frictionRatio") ??
    xCandidates[0] ??
    null;

  return {
    yAxis,
    xAxis,
    availableColumns: xCandidates,
    yAxisOptions,
  };
}
