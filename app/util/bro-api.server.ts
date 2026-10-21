/**
 * Worker-side fetching of BRO XML documents from the public BRO
 * uitgifteservice (publiek.broservices.nl), with edge caching.
 *
 * Documents are cached in the Cloudflare Cache API under a canonical key per
 * BRO ID, storing the *resolved* document (the BHR-GT → BHR-G fallback is
 * applied before caching, so a BHR-G object costs the extra upstream lookup
 * only once per colo). Staleness is tracked via an own fetched-at header
 * rather than Cache-Control so an expired copy can still be served when the
 * BRO API is down or rate-limiting (stale-if-error).
 */

export type BROFetchErrorKind =
  | "unsupported"
  | "rejected"
  | "rate-limited"
  | "unavailable";

/**
 * The part of Cloudflare's ExecutionContext this module uses. App code
 * typechecks against DOM types (worker-configuration.d.ts is only included
 * for workers/), so the workers globals are typed locally, following the
 * same pattern as the KV access in routes/feedback.tsx.
 */
export interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

/** The Workers Cache API: the DOM CacheStorage type lacks `default`. */
function edgeCache(): Cache {
  return (caches as unknown as { default: Cache }).default;
}

export class BROFetchError extends Error {
  readonly kind: BROFetchErrorKind;

  constructor(kind: BROFetchErrorKind, message?: string) {
    super(message ?? kind);
    this.kind = kind;
  }
}

const endpoints = {
  cpt: (broId: string) =>
    `https://publiek.broservices.nl/sr/cpt/v1/objects/${broId}`,
  bhrgt: (broId: string) =>
    `https://publiek.broservices.nl/sr/bhrgt/v2/objects/${broId}`,
  bhrg: (broId: string) =>
    `https://publiek.broservices.nl/sr/bhrg/v3/objects/${broId}`,
  gmw: (broId: string) =>
    `https://publiek.broservices.nl/gm/gmw/v1/objects/${broId}`,
} as const;

type UpstreamLayer = keyof typeof endpoints;

/**
 * The upstream endpoints that can serve a given BRO ID, in the order they
 * should be tried. The `BHR` prefix is shared by geotechnical (BHR-GT) and
 * geological (BHR-G) borings, so both are candidates. GLD is recognized but
 * deliberately unsupported for now: dossiers grow continuously and can run
 * to tens of MB, which needs its own loading strategy first.
 */
function candidatesForBroId(broId: string): Array<UpstreamLayer> {
  const prefix = broId.slice(0, 3);
  if (prefix === "CPT") {
    return ["cpt"];
  }
  if (prefix === "BHR") {
    return ["bhrgt", "bhrg"];
  }
  if (prefix === "GMW") {
    return ["gmw"];
  }
  return [];
}

/** Time units, in seconds (the unit of Cache-Control and the ages below). */
const SECOND = 1;
const HOUR = 3600 * SECOND;
const DAY = 24 * HOUR;

/** How long a cached document is served without revalidating upstream. */
const FRESH_SECONDS = 7 * DAY;
/** Negative cache: how long a rejection (e.g. unknown ID) is remembered. */
const REJECTION_FRESH_SECONDS = 60 * SECOND;
/**
 * Cache API retention. Longer than FRESH_SECONDS on purpose: entries older
 * than FRESH_SECONDS are revalidated upstream, but kept around as the
 * stale-if-error fallback.
 */
const RETENTION_SECONDS = 30 * DAY;

const FETCHED_AT_HEADER = "X-BRO-Fetched-At";
const REJECTION_HEADER = "X-BRO-Rejection";

/** Canonical cache key per BRO ID (the host only namespaces the key). */
function cacheKeyFor(broId: string): Request {
  return new Request(`https://bro.bedrock.engineer/__bro-cache/${broId}`);
}

/**
 * Extract the rejection reason from a dispatchDataResponse rejection
 * document, if present.
 */
function getRejectionReason(xml: string): string | null {
  const match =
    /<brocom:rejectionReason>([^<]*)<\/brocom:rejectionReason>/.exec(xml);
  return match?.[1] ?? null;
}

/**
 * Fetch the BRO XML for a single object by its (validated, upper-cased)
 * BRO ID, through the edge cache. Throws BROFetchError for every failure
 * mode; callers map the kind to a user-facing response.
 */
export async function fetchBROXml(
  broId: string,
  executionContext?: WorkerExecutionContext,
): Promise<string> {
  const candidates = candidatesForBroId(broId);
  if (candidates.length === 0) {
    throw new BROFetchError("unsupported", broId);
  }

  const cache = edgeCache();
  const key = cacheKeyFor(broId);

  let staleXml: string | null = null;
  const cached = await cache.match(key);
  if (cached) {
    const fetchedAt = Number(cached.headers.get(FETCHED_AT_HEADER) ?? "0");
    const rejection = cached.headers.get(REJECTION_HEADER);
    const age = Date.now() / 1000 - fetchedAt;
    const body = await cached.text();

    if (rejection !== null) {
      if (age < REJECTION_FRESH_SECONDS) {
        throw new BROFetchError("rejected", decodeURIComponent(rejection));
      }
    } else if (age < FRESH_SECONDS) {
      return body;
    } else {
      staleXml = body;
    }
  }

  let result: { xml: string } | { rejection: string };
  try {
    result = await fetchUpstream(broId, candidates);
  } catch (error) {
    // Serve the expired copy rather than an error while the BRO API is
    // down or rate-limiting.
    if (staleXml !== null) {
      return staleXml;
    }
    throw error;
  }

  if ("rejection" in result) {
    store(cache, key, "", result.rejection, executionContext);
    throw new BROFetchError("rejected", result.rejection);
  }

  store(cache, key, result.xml, null, executionContext);
  return result.xml;
}

/**
 * Try each candidate endpoint in order. A rejection document (the BRO's
 * "no such object on this endpoint" answer) falls through to the next
 * candidate; only when every candidate rejected is the rejection the
 * outcome. Transport failures and 5xx responses also fall through, but
 * make the overall outcome an error instead of a (cacheable) rejection.
 */
async function fetchUpstream(
  broId: string,
  candidates: Array<UpstreamLayer>,
): Promise<{ xml: string } | { rejection: string }> {
  let lastRejection: string | null = null;
  let failure: BROFetchError | null = null;

  for (const layer of candidates) {
    let response: Response;
    try {
      response = await fetch(endpoints[layer](broId));
    } catch (error) {
      failure = new BROFetchError(
        "unavailable",
        error instanceof Error ? error.message : String(error),
      );
      continue;
    }

    if (response.status === 429) {
      // Stop immediately: trying further candidates only makes it worse.
      throw new BROFetchError("rate-limited", `HTTP 429 (${layer})`);
    }

    const xml = await response.text();
    const rejection = getRejectionReason(xml);
    if (rejection !== null) {
      lastRejection = rejection;
      continue;
    }
    if (!response.ok) {
      failure = new BROFetchError(
        "unavailable",
        `HTTP ${response.status} (${layer})`,
      );
      continue;
    }
    return { xml };
  }

  if (failure !== null) {
    throw failure;
  }
  return { rejection: lastRejection ?? "rejected" };
}

function store(
  cache: Cache,
  key: Request,
  body: string,
  rejection: string | null,
  executionContext?: WorkerExecutionContext,
): void {
  const headers = new Headers({
    "Content-Type": "application/xml",
    [FETCHED_AT_HEADER]: String(Math.floor(Date.now() / 1000)),
    "Cache-Control": `public, max-age=${rejection === null ? RETENTION_SECONDS : REJECTION_FRESH_SECONDS}`,
  });
  if (rejection !== null) {
    // Header values must be ASCII; the reason is Dutch prose.
    headers.set(REJECTION_HEADER, encodeURIComponent(rejection));
  }
  const putPromise = cache.put(key, new Response(body, { headers }));
  if (executionContext) {
    executionContext.waitUntil(putPromise);
  }
}
