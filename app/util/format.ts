import type { Location } from "@bedrock-engineer/bro-xml";

/**
 * Format a Date to ISO date string (YYYY-MM-DD)
 */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

/**
 * Format EPSG code to human-readable coordinate system name
 */
export function formatCoordSystem(epsg: string | undefined) {
  if (epsg === "28992") {
    return "RD";
  }
  if (epsg === "4258") {
    return "ETRS89";
  }
  throw new Error("Invalid EPSG code");
}

/**
 * Format location coordinates with coordinate system prefix
 */
export function formatLocationValue(location: Location, precision = 2): string {
  const coordSystem = formatCoordSystem(location.epsg);
  return `${coordSystem}: ${location.x.toFixed(precision)}, ${location.y.toFixed(precision)}`;
}

/**
 * Format location for detailed header display (with EPSG prefix and axis labels)
 */
export function formatDeliveredLocation(location: Location): string {
  return `${location.epsg} - X: ${location.x.toFixed(2)}, Y: ${location.y.toFixed(2)}`;
}

/**
 * Format standardized location (higher precision, no axis labels)
 */
export function formatStandardizedLocation(location: Location): string {
  return `${location.epsg} - ${location.x.toFixed(6)}, ${location.y.toFixed(6)}`;
}
