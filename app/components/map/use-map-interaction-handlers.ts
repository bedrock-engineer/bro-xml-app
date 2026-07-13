import { Popup } from "maplibre-gl";
import type { Map as MaplibreMap, MapMouseEvent } from "maplibre-gl";
import { type RefObject, useEffect, useEffectEvent } from "react";
import { useTranslation } from "react-i18next";
import type { BROLocationLayer } from "~/util/bro-api";
import { hoverPopupHtml } from "./map-hooks.client";
import {
  broTileLayers,
  interactiveLayers,
  pointLayerId,
} from "./map-style.client";

interface MapInteractionHandlers {
  onMarkerClick: (filename: string) => void;
  onPickLocation: (broId: string, layer: BROLocationLayer) => void;
}

/** Maps the unclustered point layer ids back to their PMTiles source layer. */
const tileLayerByPointLayer = new Map(
  broTileLayers.map((layer): [string, BROLocationLayer] => [
    pointLayerId(layer),
    layer,
  ]),
);
/**
 * Hover popups, pointer cursor, and click handling for the interactive
 * layers: loaded files select, clusters zoom in, single BRO points pick.
 * Handlers are effect events so the map listeners never need re-binding.
 */
export function useMapInteractions(
  mapRef: RefObject<MaplibreMap | null>,
  { onMarkerClick, onPickLocation }: MapInteractionHandlers,
): void {
  const { t } = useTranslation();

  const markerClick = useEffectEvent(onMarkerClick);

  const pickLocation = useEffectEvent(onPickLocation);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const clusterLabel = (count: number) => t("clusterLocations", { count });

    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "260px",
    });

    const queryFeatures = (event: MapMouseEvent) =>
      map.queryRenderedFeatures(event.point, { layers: interactiveLayers });

    const handleClick = (event: MapMouseEvent) => {
      const feature = queryFeatures(event)[0];
      if (!feature) {
        return;
      }

      if (feature.layer.id.startsWith("loaded-points")) {
        markerClick(String(feature.properties.filename));
        return;
      }

      const [lng = 0, lat = 0] = (feature.geometry as GeoJSON.Point)
        .coordinates;

      if (feature.layer.id.endsWith("-clusters")) {
        // tippecanoe clusters are baked into the tiles; zooming in
        // reveals the underlying points
        map.easeTo({ center: [lng, lat], zoom: map.getZoom() + 2 });
        return;
      }

      const broId = feature.properties.bro_id as string | undefined;
      const tileLayer = tileLayerByPointLayer.get(feature.layer.id);
      if (broId && tileLayer) {
        pickLocation(broId, tileLayer);
      }
    };

    const handleMousemove = (event: MapMouseEvent) => {
      const feature = queryFeatures(event)[0];
      map.getCanvas().style.cursor = feature ? "pointer" : "";

      if (!feature) {
        popup.remove();
        return;
      }

      const html = feature.layer.id.endsWith("-clusters")
        ? `<div class="text-xs">${clusterLabel(
            Number(feature.properties.point_count),
          )}</div>`
        : hoverPopupHtml(feature, t);

      popup.setLngLat(event.lngLat).setHTML(html).addTo(map);
    };

    const handleMouseout = () => {
      popup.remove();
    };

    map.on("click", handleClick);
    map.on("mousemove", handleMousemove);
    map.on("mouseout", handleMouseout);

    return () => {
      popup.remove();
      map.off("click", handleClick);
      map.off("mousemove", handleMousemove);
      map.off("mouseout", handleMouseout);
    };
  }, [mapRef, t]);
}
