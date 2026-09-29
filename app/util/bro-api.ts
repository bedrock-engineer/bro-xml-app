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

/** A BRO ID is a three-letter domain code followed by 12 digits. */
export const broIdPattern = /^(CPT|BHR)\d{12}$/;

/**
 * The layers whose endpoints can serve a given BRO ID, in the order they
 * should be tried. `CPT` maps to a single layer; the `BHR` prefix is
 * shared by geotechnical (BHR-GT) and geological (BHR-G) borings, so both
 * are candidates and the caller falls back from one to the other. GMW/GLD
 * groundwater objects have no endpoint here and yield an empty list.
 */
export function layersForBroId(broId: string): Array<BROLocationLayer> {
  const prefix = broId.slice(0, 3).toUpperCase();
  if (prefix === "CPT") {
    return ["cpt"];
  }
  if (prefix === "BHR") {
    return ["bhrgt", "bhrg"];
  }
  return [];
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
