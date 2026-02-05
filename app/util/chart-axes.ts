/**
 * BRO CPT Chart Helpers
 *
 * Utilities for detecting chart axes and formatting column metadata for visualization.
 */

import type { CPTData, CPTMeasurement } from "@bedrock-engineer/bro-xml";

export interface ChartColumn {
  key: keyof CPTMeasurement;
  unit: string;
  name: string;
}

export interface ChartAxes {
  yAxis: ChartColumn | null;
  xAxis: ChartColumn | null;
  availableColumns: Array<ChartColumn>;
  yAxisOptions: Array<ChartColumn>;
}

/**
 * CPT measurement field metadata
 */
const CPT_COLUMN_METADATA: Record<
  keyof CPTMeasurement,
  { name: string; unit: string }
> = {
  penetrationLength: { name: "Penetration Length", unit: "m" },
  depth: { name: "Depth", unit: "m" },
  elapsedTime: { name: "Elapsed Time", unit: "s" },
  coneResistance: { name: "Cone Resistance (qc)", unit: "MPa" },
  correctedConeResistance: { name: "Corrected Cone Resistance (qt)", unit: "MPa" },
  netConeResistance: { name: "Net Cone Resistance (qn)", unit: "MPa" },
  localFriction: { name: "Sleeve Friction (fs)", unit: "MPa" },
  frictionRatio: { name: "Friction Ratio (Rf)", unit: "%" },
  porePressureU1: { name: "Pore Pressure U1", unit: "MPa" },
  porePressureU2: { name: "Pore Pressure U2", unit: "MPa" },
  porePressureU3: { name: "Pore Pressure U3", unit: "MPa" },
  poreRatio: { name: "Pore Ratio", unit: "-" },
  inclinationX: { name: "Inclination X", unit: "°" },
  inclinationY: { name: "Inclination Y", unit: "°" },
  inclinationEW: { name: "Inclination EW", unit: "°" },
  inclinationNS: { name: "Inclination NS", unit: "°" },
  inclinationResultant: { name: "Inclination Resultant", unit: "°" },
  magneticFieldStrengthX: { name: "Magnetic Field X", unit: "nT" },
  magneticFieldStrengthY: { name: "Magnetic Field Y", unit: "nT" },
  magneticFieldStrengthZ: { name: "Magnetic Field Z", unit: "nT" },
  magneticFieldStrengthTotal: { name: "Magnetic Field Total", unit: "nT" },
  magneticInclination: { name: "Magnetic Inclination", unit: "°" },
  magneticDeclination: { name: "Magnetic Declination", unit: "°" },
  electricalConductivity: { name: "Electrical Conductivity", unit: "mS/m" },
  temperature: { name: "Temperature", unit: "°C" },
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
