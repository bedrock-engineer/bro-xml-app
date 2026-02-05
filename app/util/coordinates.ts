import type { Location } from "@bedrock-engineer/bro-xml";
import proj4 from "proj4";

export interface WGS84Coords {
  lat: number;
  lon: number;
}

// Define coordinate systems
// RD New
proj4.defs("EPSG:28992", "+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.4171,50.3319,465.5524,1.9342,-1.6677,9.1019,4.0725 +units=m +no_defs +type=crs");
// ETRS89
proj4.defs("EPSG:4258", "+proj=longlat +ellps=GRS80 +no_defs +type=crs"); 

/**
 * Normalize EPSG code to just the numeric part
 * Handles formats like "EPSG:28992", "urn:ogc:def:crs:EPSG::28992", or just "28992"
 */
export function normalizeEpsg(epsg: string): string {
  const match = /(\d+)$/.exec(epsg);
  return match?.[1] ?? epsg;
}

/**
 * Convert location to WGS84 coordinates using proj4
 */
export function toWgs84(location: Location): WGS84Coords | null {
  try {
    const code = normalizeEpsg(location.epsg);

    if (code === "4326") {
      // Already WGS84
      return { lat: location.x, lon: location.y };
    }

    if (code === "4258") {
      // ETRS89 - practically identical to WGS84
      return { lat: location.x, lon: location.y };
    }

    const sourceProj = `EPSG:${code}`;
    const [lon, lat] = proj4(sourceProj, "EPSG:4326", [location.x, location.y]);

    return { lat, lon };
  } catch {
    return null;
  }
}

/**
 * Get human-readable coordinate system name
 */
export function getCoordSystemName(epsg: string): string {
  const code = normalizeEpsg(epsg);
  if (code === "28992") {
    return "Rijksdriehoekscoördinaten";
  }
  if (code === "4258") {
    return "ETRS89";
  }
  if (code === "4326") {
    return "WGS84";
  }
  return `EPSG:${code}`;
}
