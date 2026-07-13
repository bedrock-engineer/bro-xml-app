import "maplibre-gl/dist/maplibre-gl.css";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { BROData } from "~/types/bro-data";
import type { BROLocationLayer } from "~/util/bro-api";
import { MapLayersPanel, SearchBox } from "./map-controls.client";
import { useBasemap } from "./use-basemap";
import { useLoadedLocations } from "./use-loaded-locations";
import { useLayerVisibility } from "./use-layer-visibility";
import { useMapInteractions } from "./use-map-interaction-handlers";
import { useMapInit } from "./use-map-init";

interface MapProps {
  broData: Record<string, BROData>;
  selectedFileName: string | null;
  onMarkerClick: (filename: string) => void;
  onPickLocation: (broId: string, layer: BROLocationLayer) => void;
}

/**
 * Thin composition of the map hooks: `useMapInit` owns the map instance
 * and the portal controls; the other hooks react to prop / UI-state
 * changes. The controls are React components rendered into the map's
 * control slots via `createPortal`.
 */
export function BROMap({
  broData,
  selectedFileName,
  onMarkerClick,
  onPickLocation,
}: MapProps) {
  if (typeof document === "undefined") {
    throw new TypeError("BROMap should only render on the client.");
  }

  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const { mapRef, portals } = useMapInit(containerRef);

  useMapInteractions(mapRef, { onMarkerClick, onPickLocation });

  const [basemap, setBasemap] = useBasemap(mapRef);

  const { visibility, setLayerVisible } = useLayerVisibility(mapRef);

  useLoadedLocations(mapRef, broData, selectedFileName);

  return (
    <>
      <div
        ref={containerRef}
        className="w-full h-[580px] rounded-sm border border-gray-300"
      />

      {portals && createPortal(<SearchBox mapRef={mapRef} />, portals.search)}
      {portals &&
        createPortal(
          <MapLayersPanel
            visibility={visibility}
            onVisibilityChange={setLayerVisible}
            basemap={basemap}
            onBasemapChange={setBasemap}
          />,
          portals.panel,
        )}

      <p className="text-xs text-gray-500 mt-1">{t("mapPickHint")}</p>
    </>
  );
}
