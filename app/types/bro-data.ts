import {
  BROParser,
  XMLAdapter,
  type BHRGData as ParsedBHRGData,
  type BHRGTData as ParsedBHRGTData,
  type CPTMeasurement,
  type CPTData as ParsedCPTData,
  type Location,
  type ParseMeta,
} from "@bedrock-engineer/bro-xml-parser";

/**
 * bro-xml-parser 0.6.0 parses an absent optional element to `null` (e.g. a
 * layer's `rock`, a CPT's `additionalInvestigation`), but types every nested
 * object as always present. Widen nested objects to `| null` so the compiler
 * enforces the checks the runtime needs. Fields the library already types as
 * nullable or optional (e.g. BHR-GT `analysis`) are left as they are. Remove
 * once the library's types include the null.
 */
type WithNullableObjects<T> = {
  [K in keyof T]: NullableObject<T[K]>;
};

type NullableObject<V> = null extends V
  ? V
  : undefined extends V
    ? V
    : V extends ReadonlyArray<infer Item>
      ? Array<Item extends object ? WithNullableObjects<Item> : Item>
      : V extends object
        ? WithNullableObjects<V> | null
        : V;

type ParsedData<T extends { meta: ParseMeta }> = WithNullableObjects<
  Omit<T, "meta">
> & { meta: ParseMeta };

export type CPTData = ParsedData<ParsedCPTData>;
export type BHRGTData = ParsedData<ParsedBHRGTData>;
export type BHRGData = ParsedData<ParsedBHRGData>;
export type { CPTMeasurement } from "@bedrock-engineer/bro-xml-parser";

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
export function isCPTData(data: { meta: ParseMeta }): data is CPTData {
  return data.meta.dataType === "CPT";
}

/**
 * Type guard for BHR-GT (geotechnical borehole) data
 */
export function isBHRGTData(data: { meta: ParseMeta }): data is BHRGTData {
  return data.meta.dataType === "BHR-GT";
}

/**
 * Type guard for BHR-G (geological borehole) data
 */
export function isBHRGData(data: { meta: ParseMeta }): data is BHRGData {
  return data.meta.dataType === "BHR-G";
}

/**
 * The data type, narrowed to the types the app displays
 */
export function getFileType(data: BROData): BROFileType {
  if (isCPTData(data)) {
    return "CPT";
  }
  return isBHRGTData(data) ? "BHR-GT" : "BHR-G";
}

/**
 * Get the final depth from any BRO data type
 */
export function getFinalDepth(data: BROData): number | null {
  if (isCPTData(data)) {
    return data.conePenetrometerSurvey?.trajectory?.finalDepth ?? null;
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
  return (
    data.conePenetrometerSurvey?.conePenetrationTest?.measurements ??
    NO_MEASUREMENTS
  );
}

const NO_MEASUREMENTS: Array<CPTMeasurement> = [];

/**
 * CPT dissipation tests
 */
export function getDissipationTests(data: CPTData): Array<DissipationTest> {
  return data.conePenetrometerSurvey?.dissipationTest ?? NO_DISSIPATION_TESTS;
}

type DissipationTest = NonNullable<
  CPTData["conePenetrometerSurvey"]
>["dissipationTest"][number];

const NO_DISSIPATION_TESTS: Array<DissipationTest> = [];

/**
 * Layers removed before the CPT was performed (voorontgraving)
 */
export function getRemovedLayers(data: CPTData): Array<RemovedLayer> {
  return memoize(removedLayerCache, data, () =>
    (data.additionalInvestigation?.removedLayer ?? []).filter((layer) =>
      hasBoundaries(layer),
    ),
  );
}

const removedLayerCache = new WeakMap<CPTData, Array<RemovedLayer>>();

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
  return memoize(layerCache, data, () => {
    const layers: Array<BHRGTLayer | BHRGLayer> =
      data.boreholeSampleDescription?.descriptiveBoreholeLog[0]?.layer ?? [];
    return layers.filter((layer) => hasBoundaries(layer));
  }) as Array<BoreLayer> | Array<BHRGBoreLayer>;
}

const layerCache = new WeakMap<
  BHRGTData | BHRGData,
  Array<BoundedLayer<BHRGTLayer | BHRGLayer>>
>();

/**
 * Derived arrays are cached per parsed object so their identity is stable
 * across renders (they feed effect and memo dependencies).
 */
function memoize<K extends object, V>(
  cache: WeakMap<K, V>,
  key: K,
  compute: () => V,
): V {
  let value = cache.get(key);
  if (value === undefined) {
    value = compute();
    cache.set(key, value);
  }
  return value;
}

type BHRGTLayer = BHRGTLog["layer"][number];
type BHRGLayer = BHRGLog["layer"][number];

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
type BoundedLayer<T extends { upperBoundary: number | null }> = T & {
  upperBoundary: number;
  lowerBoundary: number;
};

function hasBoundaries<
  T extends { upperBoundary: number | null; lowerBoundary: number | null },
>(layer: T): layer is BoundedLayer<T> {
  return layer.upperBoundary !== null && layer.lowerBoundary !== null;
}
