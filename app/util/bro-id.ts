/**
 * Client-side BRO ID knowledge. Fetching the actual XML happens worker-side
 * (app/util/bro-api.server.ts); the browser only needs to recognize BRO IDs
 * and the map's tile layers.
 */

/** Source layers in bro_locations.pmtiles */
export type BROLocationLayer = "cpt" | "bhrgt" | "bhrg";

/**
 * A BRO ID is a three-letter domain code followed by 12 digits. Matches the
 * types the app can route to (GLD is recognized so it can get a specific
 * "not supported yet" message rather than a generic failure).
 */
export const broIdPattern = /^(CPT|BHR|GMW|GLD)\d{12}$/;
