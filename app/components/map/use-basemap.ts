import { type RefObject, useState, useEffect } from "react";
import {
  type BasemapId,
  defaultBasemapId,
  basemaps,
} from "./map-controls.client";

/**
 * Basemap selection. Switching toggles visibility of the raster layers
 * that are all part of the style; the initial state matches the style
 * defaults, so nothing needs to happen before the style has loaded.
 */

export function useBasemap(
  mapRef: RefObject<maplibregl.Map | null>,
  styleReady: boolean,
): [BasemapId, (id: BasemapId) => void] {
  const [basemap, setBasemap] = useState<BasemapId>(defaultBasemapId);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) {
      return;
    }
    for (const definition of basemaps) {
      map.setLayoutProperty(
        `basemap-${definition.id}`,
        "visibility",
        definition.id === basemap ? "visible" : "none",
      );
    }
  }, [mapRef, styleReady, basemap]);

  return [basemap, setBasemap];
}
