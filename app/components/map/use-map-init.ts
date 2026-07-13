import {
  Map as MaplibreMap,
  NavigationControl,
  ScaleControl,
  type LngLatBoundsLike,
} from "maplibre-gl";
import { type RefObject, useEffect, useRef, useState } from "react";
import { createMapStyle, registerCptIcons } from "./map-style.client";
import { PortalControl } from "./portal-control";

/**
 * Production tiles live on R2 (the bucket's CORS allows only the app
 * origin); dev uses a gitignored local copy in public/ so the map also
 * works offline. Resolved lazily — `location` only exists client-side.
 */
function pmtilesUrl(): string {
  return import.meta.env.DEV
    ? `${globalThis.location.origin}/bro_locations.pmtiles`
    : "https://r2.eu.bedrock.engineer/bro_locations.pmtiles";
}

const netherlandsBounds: LngLatBoundsLike = [
  [3, 50.5],
  [7.5, 53.8],
];

export const maxBounds: LngLatBoundsLike = [
  [2, 50],
  [8.5, 54.3],
];

export interface MapPortals {
  search: HTMLDivElement;
  panel: HTMLDivElement;
}

export interface MapInitResult {
  mapRef: RefObject<maplibregl.Map | null>;
  /**
   * Null until the map has mounted. Once set, each field is a stable
   * DOM node the caller renders into via `createPortal`. Cleared on
   * unmount so the portals leave the React tree before the nodes are
   * removed.
   */
  portals: MapPortals | null;
}

export function useMapInit(
  containerRef: RefObject<HTMLDivElement | null>,
): MapInitResult {
  const mapRef = useRef<MaplibreMap | null>(null);
  const [portals, setPortals] = useState<MapPortals | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const map = new MaplibreMap({
      container,
      style: createMapStyle(pmtilesUrl()),
      bounds: netherlandsBounds,
      maxBounds,
      minZoom: 5,
      maxZoom: 18,
    });

    registerCptIcons(map);

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");

    const searchControl = new PortalControl();
    map.addControl(searchControl, "top-left");

    const panelControl = new PortalControl();
    map.addControl(panelControl, "top-left");

    mapRef.current = map;
    setPortals({ search: searchControl.element, panel: panelControl.element });

    return () => {
      setPortals(null);
      map.remove();
      mapRef.current = null;
    };
  }, [containerRef]);

  return { mapRef, portals };
}
