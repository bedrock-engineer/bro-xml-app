/**
 * Fetch BRO XML documents from the public BRO uitgifteservice
 * (publiek.broservices.nl). The service returns the same
 * dispatchDataResponse documents that BROloket delivers as downloads,
 * so they can be parsed with BROParser directly.
 */

/** Source layers in bro_locations.pmtiles */
export type BROLocationLayer = "cpt" | "bhrgt" | "bhrg";

const endpoints: Record<BROLocationLayer, (broId: string) => string> = {
  cpt: (broId) => `https://publiek.broservices.nl/sr/cpt/v1/objects/${broId}`,
  bhrgt: (broId) =>
    `https://publiek.broservices.nl/sr/bhrgt/v2/objects/${broId}`,
  bhrg: (broId) => `https://publiek.broservices.nl/sr/bhrg/v3/objects/${broId}`,
};

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
 * Fetch the BRO XML for a single object by its BRO ID.
 * Throws on network errors and on rejection responses.
 */
export async function fetchBROObject(
  broId: string,
  layer: BROLocationLayer,
): Promise<string> {
  const response = await fetch(endpoints[layer](broId));
  const xml = await response.text();

  const rejectionReason = getRejectionReason(xml);
  if (rejectionReason) {
    throw new Error(rejectionReason);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return xml;
}
