import { type Map as MaplibreMap } from "maplibre-gl";
import { type RefObject, useEffect, useState } from "react";
import type { BROLocationLayer } from "~/util/bro-api";
import { runWhenStyleLoaded } from "./map-hooks.client";
import {
  broTileLayers,
  clusterLayerId,
  loadedLayerIds,
  pointLayerId,
} from "./map-style.client";

/** Layer groups the user can show/hide from the layers panel. */
export type ToggleableMapLayer = BROLocationLayer | "loaded";

const toggleableLayers: Array<ToggleableMapLayer> = [
  ...broTileLayers,
  "loaded",
];

function toggleLayerIds(toggle: ToggleableMapLayer): Array<string> {
  return toggle === "loaded"
    ? loadedLayerIds
    : [pointLayerId(toggle), clusterLayerId(toggle)];
}

export interface LayerVisibilityResult {
  visibility: Record<ToggleableMapLayer, boolean>;
  setLayerVisible: (layer: ToggleableMapLayer, visible: boolean) => void;
}
/**
 * Visibility toggles for the BRO location layers and the files loaded
 * in the app. Hidden layers are also skipped by queryRenderedFeatures,
 * so hover and click stop matching them too.
 */

export function useLayerVisibility(
  mapRef: RefObject<MaplibreMap | null>,
): LayerVisibilityResult {
  const [visibility, setVisibility] = useState<
    Record<ToggleableMapLayer, boolean>
  >({ cpt: true, bhrgt: true, bhrg: true, loaded: true });

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    return runWhenStyleLoaded(map, () => {
      for (const layer of toggleableLayers) {
        const value = visibility[layer] ? "visible" : "none";
        for (const layerId of toggleLayerIds(layer)) {
          map.setLayoutProperty(layerId, "visibility", value);
        }
      }
    });
  }, [mapRef, visibility]);

  const setLayerVisible = (layer: ToggleableMapLayer, visible: boolean) => {
    setVisibility((previous) => ({ ...previous, [layer]: visible }));
  };

  return { visibility, setLayerVisible };
}
