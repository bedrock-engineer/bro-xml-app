import {
  BROParser,
  XMLAdapter,
  type BHRGData,
  type BHRGLayer,
  type BHRGTData,
  type BHRGTLayer,
  type BROData as ParsedBROData,
  type CPTData,
  type CPTMeasurement,
  type Location,
} from "@bedrock-engineer/bro-xml-parser";

/**
 * BRO data types this app can display. The parser also handles GMW and GLD,
 * which have no viewer here and are rejected by {@link parseBRO}.
 */
export type BROData = CPTData | BHRGTData | BHRGData;
export type BROFileType = "CPT" | "BHR-GT" | "BHR-G";

/**
 * Parse BRO XML into one of the data types the app can display.
 * Throws "unknownBROFileType" for other (valid) BRO types.
 */
export function parseBRO(xml: string): BROData {
  const data = new BROParser(new XMLAdapter()).parse(xml);
  if (isCPTData(data) || isBHRGTData(data) || isBHRGData(data)) {
    return data;
  }
  throw new Error("unknownBROFileType");
}

/**
 * Type guard for CPT data
 */
export function isCPTData(data: ParsedBROData): data is CPTData {
  return data.meta.dataType === "CPT";
}

/**
 * Type guard for BHR-GT (geotechnical borehole) data
 */
export function isBHRGTData(data: ParsedBROData): data is BHRGTData {
  return data.meta.dataType === "BHR-GT";
}

/**
 * Type guard for BHR-G (geological borehole) data
 */
export function isBHRGData(data: ParsedBROData): data is BHRGData {
  return data.meta.dataType === "BHR-G";
}

/**
 * Get the final depth from any BRO data type
 */
export function getFinalDepth(data: BROData): number | null {
  if (isCPTData(data)) {
    return data.conePenetrometerSurvey.trajectory.finalDepth;
  }
  return data.boring?.finalDepthBoring ?? null;
}

/**
 * Delivered location, falling back to the standardized (ETRS89) location
 */
export function getLocation(data: BROData): Location | null {
  return (
    data.deliveredLocation?.location ??
    data.standardizedLocation?.location ??
    null
  );
}

/**
 * Surface level offset relative to the vertical datum (usually NAP)
 */
export function getSurfaceLevel(data: BROData): number | null {
  return data.deliveredVerticalPosition?.offset ?? null;
}

/**
 * Vertical datum code (e.g. "NAP")
 */
export function getVerticalDatum(data: BROData): string | null {
  return data.deliveredVerticalPosition?.verticalDatum?.code ?? null;
}

/**
 * CPT measurement rows
 */
export function getMeasurements(data: CPTData): Array<CPTMeasurement> {
  return data.conePenetrometerSurvey.conePenetrationTest.measurements;
}

/**
 * Layers removed before the CPT was performed (voorontgraving)
 */
export function getRemovedLayers(data: CPTData): Array<RemovedLayer> {
  return (data.additionalInvestigation?.removedLayer ?? []).filter(
    hasBoundaries,
  );
}

export type RemovedLayer = BoundedLayer<
  NonNullable<CPTData["additionalInvestigation"]>["removedLayer"][number]
>;

/**
 * The borehole's first descriptive log. A borehole can carry several logs
 * (e.g. field and lab descriptions of the same interval); the app shows the
 * first, so layers never overlap.
 */
export function getDescriptiveLog(data: BHRGTData): BHRGTLog | null;
export function getDescriptiveLog(data: BHRGData): BHRGLog | null;
export function getDescriptiveLog(
  data: BHRGTData | BHRGData,
): BHRGTLog | BHRGLog | null {
  return data.boreholeSampleDescription?.descriptiveBoreholeLog[0] ?? null;
}

/**
 * Described layers of the borehole's first descriptive log. Layers without
 * both boundaries cannot be placed on a depth axis and are left out.
 */
export function getLayers(data: BHRGTData): Array<BoreLayer>;
export function getLayers(data: BHRGData): Array<BHRGBoreLayer>;
export function getLayers(
  data: BHRGTData | BHRGData,
): Array<BoreLayer> | Array<BHRGBoreLayer> {
  const layers: Array<BHRGTLayer | BHRGLayer> =
    data.boreholeSampleDescription?.descriptiveBoreholeLog[0]?.layer ?? [];
  return layers.filter(hasBoundaries) as Array<BoreLayer> | Array<BHRGBoreLayer>;
}

/** A BHR-GT layer with known boundaries */
export type BoreLayer = BoundedLayer<BHRGTLayer>;
/** A BHR-G layer with known boundaries */
export type BHRGBoreLayer = BoundedLayer<BHRGLayer>;

type BHRGTLog = NonNullable<
  BHRGTData["boreholeSampleDescription"]
>["descriptiveBoreholeLog"][number];

type BHRGLog = NonNullable<
  BHRGData["boreholeSampleDescription"]
>["descriptiveBoreholeLog"][number];

/** A layer with both boundaries known — required to draw it */
export type BoundedLayer<T extends { upperBoundary: number | null }> = T & {
  upperBoundary: number;
  lowerBoundary: number;
};

export function hasBoundaries<
  T extends { upperBoundary: number | null; lowerBoundary: number | null },
>(layer: T): layer is BoundedLayer<T> {
  return layer.upperBoundary !== null && layer.lowerBoundary !== null;
}
