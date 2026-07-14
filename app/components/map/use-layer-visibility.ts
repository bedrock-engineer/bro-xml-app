import { type Map as MaplibreMap } from "maplibre-gl";
import { type RefObject, useEffect, useState } from "react";
import type { BROLocationLayer } from "~/util/bro-api";
import {
  broTileLayers,
  clusterLayerId,
  pointLayerId,
} from "./map-style.client";

interface LayerVisibilityResult {
  visibility: Record<BROLocationLayer, boolean>;
  setLayerVisible: (layer: BROLocationLayer, visible: boolean) => void;
}
/**
 * Visibility toggles for the BRO location layers. Files loaded in the
 * app stay visible regardless — the user put them there deliberately.
 * Hidden layers are also skipped by queryRenderedFeatures, so hover
 * and click stop matching them too.
 */

export function useLayerVisibility(
  mapRef: RefObject<MaplibreMap | null>,
  styleReady: boolean,
): LayerVisibilityResult {
  const [visibility, setVisibility] = useState<
    Record<BROLocationLayer, boolean>
  >({ cpt: true, bhrgt: true, bhrg: true });

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) {
      return;
    }
    for (const layer of broTileLayers) {
      const value = visibility[layer] ? "visible" : "none";
      map.setLayoutProperty(pointLayerId(layer), "visibility", value);
      map.setLayoutProperty(clusterLayerId(layer), "visibility", value);
    }
  }, [mapRef, styleReady, visibility]);

  const setLayerVisible = (layer: BROLocationLayer, visible: boolean) => {
    setVisibility((previous) => ({ ...previous, [layer]: visible }));
  };

  return { visibility, setLayerVisible };
}
