import type { BROFetchErrorKind } from "~/util/bro-api.server";
import { toWgs84 } from "~/util/coordinates";
import { type BROData, getFileType, getLocation } from "./bro-data";

/**
 * What the /:broId route hands the App: the parsed object, or — on a client
 * navigation that failed — the classified error, so the App stays mounted
 * and can report it inline (document requests throw instead and render the
 * route's ErrorBoundary).
 */
export type RouteObjectResult =
  | { broId: string; data: BROData }
  | { broId: string; error: RouteObjectError };

interface RouteObjectError {
  kind: BROFetchErrorKind | "invalid" | "error";
  /** The BRO's own rejection reason (Dutch prose), when it gave one. */
  reason?: string;
}

/** The shape the /:broId loader throws for the route ErrorBoundary. */
export type BroRouteErrorData = RouteObjectError & { broId: string };

/**
 * Camera flights: the map's search box needs the searched object's WGS84
 * coordinates once its loader data arrives. The clientLoader resolves these,
 * so resolution happens exactly once per load (no render-effect involved).
 */
const pendingFlights = new Map<
  string,
  (coords: { lat: number; lon: number } | null) => void
>();

export function registerFlight(
  broId: string,
): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    pendingFlights.set(broId, resolve);
  });
}

export function resolveFlight(broId: string, data: BROData | null): void {
  const resolve = pendingFlights.get(broId);
  if (!resolve) {
    return;
  }
  pendingFlights.delete(broId);
  resolve(data ? flightCoords(data) : null);
}

function flightCoords(data: BROData): { lat: number; lon: number } | null {
  const location = getLocation(data);
  return location ? toWgs84(location) : null;
}

/**
 * How a pending route load was initiated, for analytics. Absent means the
 * user arrived via a direct link ("route").
 */
const loadSources = new Map<string, "map" | "search">();

export function rememberLoadSource(
  broId: string,
  source: "map" | "search",
): void {
  loadSources.set(broId, source);
}

/** Capture a completed load. Called from the clientLoader: once per load. */
export function captureObjectLoaded(data: BROData, broId: string): void {
  const source = loadSources.get(broId) ?? "route";
  loadSources.delete(broId);
  // Dynamic import keeps posthog-js (a browser library) out of the server
  // bundle; it resolves to the singleton entry.client.tsx initialized.
  void import("posthog-js").then(({ default: posthog }) => {
    posthog.capture("bro_location_loaded", {
      file_type: getFileType(data),
      source,
    });
  });
}
