import type { Location } from "@bedrock-engineer/bro-xml-parser";

/**
 * Format a Date to ISO date string (YYYY-MM-DD)
 */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
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
