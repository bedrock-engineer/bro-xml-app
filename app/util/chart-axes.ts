/**
 * BRO CPT Chart Helpers
 *
 * Utilities for detecting chart axes and formatting column metadata for visualization.
 */

import type { CPTData, CPTMeasurement } from "@bedrock-engineer/bro-xml-parser";
import type { TFunction } from "i18next";

/**
 * A CPT measurement row extended with columns derived in-app. BRO XML only
 * delivers depths relative to the local reference point; elevation w.r.t. NAP
 * is computed from the delivered vertical position offset.
 */
export type CPTChartRow = CPTMeasurement & {
  elevationNAP?: number | null;
};

export interface ChartColumn {
  key: keyof CPTChartRow;
  unit: string;
  name: string;
  /** Conventional value range, used when plotting with fixed domains so
   *  multiple CPTs can be compared side by side. */
  fixedDomain?: [number, number];
  /** Values increase upward (elevation) instead of downward (depth), so the
   *  y-axis must not be inverted when this column is plotted vertically. */
  increasesUpward?: boolean;
}

interface ChartAxes {
  yAxis: ChartColumn | null;
  xAxis: ChartColumn | null;
  availableColumns: Array<ChartColumn>;
  yAxisOptions: Array<ChartColumn>;
  /** Measurement rows, augmented with derived columns such as elevationNAP. */
  data: Array<CPTChartRow>;
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
  keyof CPTChartRow,
  {
    unit: string;
    fixedDomain?: [number, number];
    increasesUpward?: boolean;
  }
> = {
  penetrationLength: { unit: "m" },
  depth: { unit: "m" },
  elevationNAP: { unit: "m", increasesUpward: true },
  elapsedTime: { unit: "s" },
  coneResistance: { unit: "MPa", fixedDomain: [0, 60] },
  correctedConeResistance: { unit: "MPa", fixedDomain: [0, 60] },
  netConeResistance: { unit: "MPa", fixedDomain: [0, 60] },
  localFriction: { unit: "MPa", fixedDomain: [0, 0.3] },
  frictionRatio: { unit: "%", fixedDomain: [0, 10] },
  porePressureU1: { unit: "MPa", fixedDomain: [-0.1, 1] },
  porePressureU2: { unit: "MPa", fixedDomain: [-0.1, 1] },
  porePressureU3: { unit: "MPa", fixedDomain: [-0.1, 1] },
  poreRatio: { unit: "-", fixedDomain: [-0.2, 1.2] },
  inclinationX: { unit: "°", fixedDomain: [-15, 15] },
  inclinationY: { unit: "°", fixedDomain: [-15, 15] },
  inclinationEW: { unit: "°", fixedDomain: [-15, 15] },
  inclinationNS: { unit: "°", fixedDomain: [-15, 15] },
  inclinationResultant: { unit: "°", fixedDomain: [0, 15] },
  magneticFieldStrengthX: { unit: "nT", fixedDomain: [-50_000, 50_000] },
  magneticFieldStrengthY: { unit: "nT", fixedDomain: [-50_000, 50_000] },
  magneticFieldStrengthZ: { unit: "nT", fixedDomain: [-50_000, 50_000] },
  magneticFieldStrengthTotal: { unit: "nT", fixedDomain: [0, 75_000] },
  magneticInclination: { unit: "°", fixedDomain: [0, 90] },
  magneticDeclination: { unit: "°", fixedDomain: [-30, 30] },
  electricalConductivity: { unit: "mS/m", fixedDomain: [0, 500] },
  temperature: { unit: "°C", fixedDomain: [0, 25] },
};

/**
 * Get available columns from CPT measurement data
 */
function getAvailableColumns(
  data: Array<CPTChartRow>,
  t: TFunction,
): Array<ChartColumn> {
  const firstRow = data[0];
  if (!firstRow) {return [];}

  const columns: Array<ChartColumn> = [];

  for (const [key, meta] of Object.entries(CPT_COLUMN_METADATA)) {
    const fieldKey = key as keyof CPTChartRow;
    // Check if the field exists and has non-null values in the data
    if (firstRow[fieldKey] !== undefined) {
      columns.push({
        key: fieldKey,
        unit: meta.unit,
        name: t(`cptColumn.${fieldKey}`),
        fixedDomain: meta.fixedDomain,
        increasesUpward: meta.increasesUpward,
      });
    }
  }

  return columns;
}

/**
 * Augment measurement rows with elevation w.r.t. NAP when the file's vertical
 * position allows it: BRO XML has no per-row NAP column, only the elevation of
 * the reference point (`deliveredVerticalPositionOffset`), so
 * elevationNAP = offset − depth (falling back to penetration length when the
 * file has no inclination-corrected depth column).
 */
function withElevationNAP(cptData: CPTData): Array<CPTChartRow> {
  const offset = cptData.deliveredVerticalPositionOffset;
  if (
    offset == null ||
    cptData.deliveredVerticalPositionDatum?.toLowerCase() !== "nap"
  ) {
    return cptData.data;
  }

  const depthKey =
    cptData.data[0]?.depth === undefined ? "penetrationLength" : "depth";

  return cptData.data.map((row) => {
    const depth = row[depthKey];
    return { ...row, elevationNAP: depth == null ? null : offset - depth };
  });
}

/**
 * Detect sensible default chart axes for BRO CPT data visualization
 *
 * Default behavior:
 * - Y-axis: Penetration length or depth
 * - X-axis: Cone resistance, fallback to corrected cone resistance or friction ratio
 */
export function detectChartAxes(cptData: CPTData, t: TFunction): ChartAxes {
  const data = withElevationNAP(cptData);
  const availableColumns = getAvailableColumns(data, t);

  // Y-axis options: depth-related columns
  const yAxisOptions = availableColumns.filter((col) =>
    ["penetrationLength", "depth", "elevationNAP"].includes(col.key),
  );

  // Y-axis: prefer penetrationLength, then depth
  const yAxis =
    yAxisOptions.find((col) => col.key === "penetrationLength") ??
    yAxisOptions.find((col) => col.key === "depth") ??
    yAxisOptions[0] ??
    null;

  // X-axis candidates: exclude depth columns
  const xCandidates = availableColumns.filter(
    (col) =>
      !["penetrationLength", "depth", "elevationNAP", "elapsedTime"].includes(
        col.key,
      ),
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
    data,
  };
}
