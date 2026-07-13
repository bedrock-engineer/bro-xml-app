import { type RefObject, useState, useEffect } from "react";
import { type BasemapId, defaultBasemapId, basemaps } from "./map-controls.client";
import { runWhenStyleLoaded } from "./map-hooks.client";

/**
 * Basemap selection. Switching toggles visibility of the raster layers
 * that are all part of the style; the initial state matches the style
 * defaults, so nothing needs to happen before the style has loaded.
 */

export function useBasemap(
  mapRef: RefObject<maplibregl.Map | null>
): [BasemapId, (id: BasemapId) => void] {
  const [basemap, setBasemap] = useState<BasemapId>(defaultBasemapId);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    return runWhenStyleLoaded(map, () => {
      for (const definition of basemaps) {
        map.setLayoutProperty(
          `basemap-${definition.id}`,
          "visibility",
          definition.id === basemap ? "visible" : "none"
        );
      }
    });
  }, [mapRef, basemap]);

  return [basemap, setBasemap];
}
