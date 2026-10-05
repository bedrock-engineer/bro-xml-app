import type {
  BHRGData as ParsedBHRGData,
  BHRGTData as ParsedBHRGTData,
  CPTMeasurement,
  CPTData as ParsedCPTData,
  GLDData as ParsedGLDData,
  GMWData as ParsedGMWData,
  Location,
  Measure,
  ParseMeta,
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
export type GMWData = ParsedData<ParsedGMWData>;
export type GLDData = ParsedData<ParsedGLDData>;
export type { CPTMeasurement } from "@bedrock-engineer/bro-xml-parser";

/** One monitoring tube of a groundwater monitoring well (GMW). */
export type GMWMonitoringTube = GMWData["monitoringTube"][number];
/** One groundwater level observation series of a GLD registration. */
export type GLDObservation = GLDData["observation"][number];
/** One `{time, value, unit, qualifier}` point of a GLD observation series. */
export type GLDObservationPoint = GLDObservation["points"][number];

/**
 * BRO data types this app can display.
 */
export type BROData = CPTData | BHRGTData | BHRGData | GMWData | GLDData;
export type BROFileType = "CPT" | "BHR-GT" | "BHR-G" | "GMW" | "GLD";

/**
 * Parse BRO XML into one of the data types the app can display.
 * Throws "unknownBROFileType" for other (valid) BRO types.
 */
export async function parseBRO(xml: string): Promise<BROData> {
  // Dynamically imported so the ~900 KB parser (schemas + resolvers) is split
  // out of the initial bundle and only fetched when a file is actually parsed.
  const { BROParser, XMLAdapter } = await import(
    "@bedrock-engineer/bro-xml-parser"
  );
  const data = new BROParser(new XMLAdapter()).parse(xml);
  if (
    isCPTData(data) ||
    isBHRGTData(data) ||
    isBHRGData(data) ||
    isGMWData(data) ||
    isGLDData(data)
  ) {
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
 * Type guard for GMW (groundwater monitoring well) data
 */
export function isGMWData(data: { meta: ParseMeta }): data is GMWData {
  return data.meta.dataType === "GMW";
}

/**
 * Type guard for GLD (groundwater level research) data
 */
export function isGLDData(data: { meta: ParseMeta }): data is GLDData {
  return data.meta.dataType === "GLD";
}

/**
 * The data type, narrowed to the types the app displays
 */
export function getFileType(data: BROData): BROFileType {
  return data.meta.dataType;
}

/**
 * Get the final depth from any BRO data type, with the unit the XML declares.
 * GMW and GLD have no single survey depth, so they return null.
 */
export function getFinalDepth(data: BROData): Measure | null {
  if (isCPTData(data)) {
    return data.conePenetrometerSurvey?.trajectory?.finalDepth ?? null;
  }
  if ("boring" in data) {
    return data.boring?.finalDepthBoring ?? null;
  }
  return null;
}

/**
 * Delivered location, falling back to the standardized (ETRS89) location.
 * GLD has no location of its own (it references a GMW well), so returns null.
 */
export function getLocation(data: BROData): Location | null {
  if ("deliveredLocation" in data) {
    return (
      data.deliveredLocation?.location ??
      data.standardizedLocation?.location ??
      null
    );
  }
  return null;
}

/**
 * Surface (ground) level relative to the vertical datum (usually NAP).
 *
 * For a GMW the maaiveld is its own `groundLevelPosition`; `offset` there is the
 * local reference point's offset (often 0, coinciding with NAP), not the ground
 * level. For CPT/BHR the delivered vertical `offset` is the surface level.
 */
export function getSurfaceLevel(data: BROData): Measure | null {
  if (isGMWData(data)) {
    return (
      data.deliveredVerticalPosition?.groundLevelPosition ??
      data.deliveredVerticalPosition?.offset ??
      null
    );
  }
  if ("deliveredVerticalPosition" in data) {
    return data.deliveredVerticalPosition?.offset ?? null;
  }
  return null;
}

/**
 * Vertical datum code (e.g. "NAP")
 */
export function getVerticalDatum(data: BROData): string | null {
  if ("deliveredVerticalPosition" in data) {
    return data.deliveredVerticalPosition?.verticalDatum?.code ?? null;
  }
  return null;
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
    unwrapBoundaries(data.additionalInvestigation?.removedLayer ?? []),
  );
}

const removedLayerCache = new WeakMap<CPTData, Array<RemovedLayer>>();

export type RemovedLayer = BoundedLayer<
  NonNullable<CPTData["additionalInvestigation"]>["removedLayer"][number]
>;

/**
 * One descriptive log (the first by default). A borehole can carry several
 * (e.g. field and lab descriptions of the same interval); pass `logIndex` to
 * pick another.
 */
export function getDescriptiveLog(
  data: BHRGTData,
  logIndex?: number,
): BHRGTLog | null;
export function getDescriptiveLog(
  data: BHRGData,
  logIndex?: number,
): BHRGLog | null;
export function getDescriptiveLog(
  data: BHRGTData | BHRGData,
  logIndex = 0,
): BHRGTLog | BHRGLog | null {
  return data.boreholeSampleDescription?.descriptiveBoreholeLog[logIndex] ?? null;
}

/**
 * Described layers of a descriptive log (the first by default). Layers without
 * both boundaries cannot be placed on a depth axis and are left out.
 */
export function getLayers(data: BHRGTData, logIndex?: number): Array<BoreLayer>;
export function getLayers(
  data: BHRGData,
  logIndex?: number,
): Array<BHRGBoreLayer>;
export function getLayers(
  data: BHRGTData | BHRGData,
  logIndex = 0,
): Array<BoreLayer> | Array<BHRGBoreLayer> {
  return boundedLayersOf(data, logIndex) as
    | Array<BoreLayer>
    | Array<BHRGBoreLayer>;
}

/**
 * Depth extent `[min, max]` across *every* descriptive log, so switching logs
 * keeps the depth axis fixed (both logs plot on the same scale). `[0, 0]` when
 * no log has bounded layers.
 */
export function getDepthRange(data: BHRGTData | BHRGData): [number, number] {
  const logCount =
    data.boreholeSampleDescription?.descriptiveBoreholeLog.length ?? 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (let index = 0; index < logCount; index++) {
    for (const layer of boundedLayersOf(data, index)) {
      lo = Math.min(lo, layer.upperBoundary);
      hi = Math.max(hi, layer.lowerBoundary);
    }
  }
  return lo <= hi ? [lo, hi] : [0, 0];
}

/** Shared per-`(data, logIndex)` cache for the bounded layers of one log. */
function boundedLayersOf(
  data: BHRGTData | BHRGData,
  logIndex: number,
): Array<BoundedLayer<BHRGTLayer | BHRGLayer>> {
  let byIndex = layerCache.get(data);
  if (byIndex === undefined) {
    byIndex = new Map();
    layerCache.set(data, byIndex);
  }
  let value = byIndex.get(logIndex);
  if (value === undefined) {
    const layers: Array<BHRGTLayer | BHRGLayer> =
      data.boreholeSampleDescription?.descriptiveBoreholeLog[logIndex]?.layer ??
      [];
    value = unwrapBoundaries(layers);
    byIndex.set(logIndex, value);
  }
  return value;
}

const layerCache = new WeakMap<
  BHRGTData | BHRGData,
  Map<number, Array<BoundedLayer<BHRGTLayer | BHRGLayer>>>
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

/**
 * A layer with both boundaries known — required to draw it. The parser gives
 * boundaries as `Measure` (value + uom); they are unwrapped to plain numbers
 * (meters, per the BRO schema) here so plotting code can do arithmetic on them.
 */
type BoundedLayer<T extends { upperBoundary: Measure | null }> = Omit<
  T,
  "upperBoundary" | "lowerBoundary"
> & {
  upperBoundary: number;
  lowerBoundary: number;
};

function unwrapBoundaries<
  T extends { upperBoundary: Measure | null; lowerBoundary: Measure | null },
>(layers: Array<T>): Array<BoundedLayer<T>> {
  const bounded: Array<BoundedLayer<T>> = [];
  for (const layer of layers) {
    if (layer.upperBoundary !== null && layer.lowerBoundary !== null) {
      bounded.push({
        ...layer,
        upperBoundary: layer.upperBoundary.value,
        lowerBoundary: layer.lowerBoundary.value,
      });
    }
  }
  return bounded;
}
