import type { BROData } from "@bedrock-engineer/bro-xml-parser";
import { type Map as MaplibreMap } from "maplibre-gl";
import { LngLatBounds, type GeoJSONSource } from "maplibre-gl";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import { useToWgs84 } from "~/util/coordinates";
import {
  type LocationInfo,
  extractLocation,
  locationsToGeoJSON,
  runWhenStyleLoaded,
} from "./map-hooks.client";

/**
 * Keep the "loaded" GeoJSON source in sync with the files loaded in the
 * app, and fit bounds when files are added outside the current view
 * (uploads); picked points are already in view, so the map does not jump.
 */

export function useLoadedLocations(
  mapRef: RefObject<MaplibreMap | null>,
  broData: Record<string, BROData>,
  selectedFileName: string | null,
): void {
  const knownFilenamesRef = useRef<Set<string>>(new Set());

  // Gets a new identity once the RDNAPTRANS datum grid activates and
  // conversions upgrade from ~0.5 m to cm accuracy (popups show 6
  // decimals), so the locations memo recomputes then.
  const toWgs84 = useToWgs84();

  // Extract locations of the files loaded in the app
  const locations: Array<LocationInfo> = useMemo(() => {
    return Object.entries(broData)
      .map(([filename, data]) => extractLocation(filename, data, toWgs84))
      .filter((loc): loc is LocationInfo => loc !== null);
  }, [broData, toWgs84]);

  const loadedGeoJSON = useMemo(
    () => locationsToGeoJSON(locations, selectedFileName),
    [locations, selectedFileName],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const cleanup = runWhenStyleLoaded(map, () => {
      map.getSource<GeoJSONSource>("loaded")?.setData(loadedGeoJSON);
    });

    const known = knownFilenamesRef.current;
    const added = locations.filter((loc) => !known.has(loc.filename));
    knownFilenamesRef.current = new Set(locations.map((loc) => loc.filename));

    const bounds = map.getBounds();
    const outsideView = added.some(
      (loc) => !bounds.contains([loc.lon, loc.lat]),
    );

    if (outsideView && locations.length > 0) {
      const fitBounds = new LngLatBounds();
      for (const loc of locations) {
        fitBounds.extend([loc.lon, loc.lat]);
      }
      map.fitBounds(fitBounds, { padding: 50, maxZoom: 14 });
    }

    return cleanup;
  }, [mapRef, loadedGeoJSON, locations]);
}
