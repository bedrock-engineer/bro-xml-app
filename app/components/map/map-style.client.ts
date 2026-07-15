import type {
  FilterSpecification,
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import type { BROLocationLayer } from "~/util/bro-api";
import {
  basemaps,
  defaultBasemapId,
  loadedStrokeColor,
  selectedColor,
  typeColors,
} from "./map-controls.client";

// Register the PMTiles protocol once per app load (client-only module)
const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

const pmtilesLayerColors: Record<BROLocationLayer, string> = {
  cpt: typeColors.CPT,
  bhrgt: typeColors["BHR-GT"],
  bhrg: typeColors["BHR-G"],
};

/**
 * The PMTiles source layers, in draw order. Derived from the color
 * record so the compiler demands an entry for every BROLocationLayer.
 */
export const broTileLayers = Object.keys(
  pmtilesLayerColors,
) as Array<BROLocationLayer>;

export function pointLayerId(layer: BROLocationLayer): string {
  return `${layer}-points`;
}

export function clusterLayerId(layer: BROLocationLayer): string {
  return `${layer}-clusters`;
}

/** Ids of the layers showing the files loaded in the app. */
export const loadedLayerIds = ["loaded-points", "loaded-points-cpt"];

/**
 * Filter for the unclustered tile point layers. Locations loaded in
 * the app are excluded so each BRO point renders exactly once — as its
 * "loaded" marker. Clusters are baked into the tiles by tippecanoe, so
 * their counts still include loaded points.
 */
export function broPointFilter(
  excludedBroIds: Array<string>,
): FilterSpecification {
  return [
    "all",
    ["!", ["has", "point_count"]],
    ["!", ["in", ["get", "bro_id"], ["literal", excludedBroIds]]],
  ];
}

// Layers that respond to hover/click, in priority order: loaded files
// first, then single points, then clusters
export const interactiveLayers = [
  ...loadedLayerIds,
  ...broTileLayers.map((layer) => pointLayerId(layer)),
  ...broTileLayers.map((layer) => clusterLayerId(layer)),
];

interface MapIcon {
  data: ImageData;
  pixelRatio: number;
}

/**
 * Downward-pointing triangle (the geotechnical map convention for a
 * cone penetration test), rendered at 2x for crisp display.
 */
function triangleIcon(
  size: number,
  color: string,
  strokeWidth: number,
  strokeColor: string,
): MapIcon {
  const pixelRatio = 2;
  const canvas = document.createElement("canvas");
  canvas.width = size * pixelRatio;
  canvas.height = size * pixelRatio;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context unavailable");
  }

  context.scale(pixelRatio, pixelRatio);

  const inset = strokeWidth / 2 + 0.5;

  context.beginPath();
  context.moveTo(inset, inset);
  context.lineTo(size - inset, inset);
  context.lineTo(size / 2, size - inset);
  context.closePath();
  context.fillStyle = color;
  context.fill();
  context.lineJoin = "round";
  context.lineWidth = strokeWidth;
  context.strokeStyle = strokeColor;
  context.stroke();

  return {
    data: context.getImageData(0, 0, canvas.width, canvas.height),
    pixelRatio,
  };
}

/**
 * Register the CPT triangle icons used by the symbol layers in
 * `createMapStyle`. Sizes mirror the circle layers they replaced:
 * small for tile points, larger for loaded / selected files.
 */
export function registerCptIcons(map: maplibregl.Map): void {
  const icons: Record<string, MapIcon> = {
    "cpt-triangle": triangleIcon(12, typeColors.CPT, 1.5, "#ffffff"),
    "cpt-triangle-loaded": triangleIcon(
      16,
      typeColors.CPT,
      2,
      loadedStrokeColor,
    ),
    "cpt-triangle-selected": triangleIcon(20, selectedColor, 2, "#ffffff"),
  };
  
  for (const [id, icon] of Object.entries(icons)) {
    map.addImage(id, icon.data, { pixelRatio: icon.pixelRatio });
  }
}

/**
 * Single unclustered points: CPTs draw as triangle symbols (see
 * `registerCptIcons`), boreholes as circles.
 */
function broPointLayer(layer: BROLocationLayer): LayerSpecification {
  if (layer === "cpt") {
    return {
      id: pointLayerId(layer),
      type: "symbol",
      source: "bro",
      "source-layer": layer,
      filter: broPointFilter([]),
      layout: {
        "icon-image": "cpt-triangle",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": 0.85,
      },
    };
  }

  return {
    id: pointLayerId(layer),
    type: "circle",
    source: "bro",
    "source-layer": layer,
    filter: broPointFilter([]),
    paint: {
      "circle-color": pmtilesLayerColors[layer],
      "circle-opacity": 0.85,
      "circle-radius": 4,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ffffff",
    },
  };
}

/**
 * Layers for one source-layer of the BRO locations PMTiles: one circle
 * layer for clusters (sized by point_count), one for single points.
 * Clusters carry `point_count`; only single points have a usable bro_id.
 */
function broLocationLayers(
  layer: BROLocationLayer,
): StyleSpecification["layers"] {
  return [
    {
      id: clusterLayerId(layer),
      type: "circle",
      source: "bro",
      "source-layer": layer,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": pmtilesLayerColors[layer],
        "circle-opacity": 0.5,
        // Radius follows sqrt(count) so circle area is proportional
        // to the number of points; counts range from 2 to ~50k.
        // prettier-ignore
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["sqrt", ["get", "point_count"]],
          // sqrt of count, radius
          1.4, 5,
          7, 9,
          22, 11,
          71, 13, 
          225, 20,
        ],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
      },
    },
    broPointLayer(layer),
  ];
}

export function createMapStyle(pmtilesUrl: string): StyleSpecification {
  // All basemaps are part of the style; switching toggles layer
  // visibility instead of adding/removing sources.
  const basemapSources = Object.fromEntries(
    basemaps.map((definition) => [
      `basemap-${definition.id}`,
      {
        type: "raster" as const,
        tiles: [definition.tiles],
        tileSize: 256,
        maxzoom: 19,
        attribution: definition.attribution,
      },
    ]),
  );

  const basemapLayers: StyleSpecification["layers"] = basemaps.map(
    (definition) => ({
      id: `basemap-${definition.id}`,
      type: "raster",
      source: `basemap-${definition.id}`,
      layout: {
        visibility: definition.id === defaultBasemapId ? "visible" : "none",
      },
    }),
  );

  return {
    version: 8,
    sources: {
      ...basemapSources,
      bro: {
        type: "vector",
        url: `pmtiles://${pmtilesUrl}`,
        attribution: "BRO",
      },
      loaded: {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      },
    },
    layers: [
      ...basemapLayers,
      ...broTileLayers.flatMap((layer) => broLocationLayers(layer)),
      {
        id: "loaded-points",
        type: "circle",
        source: "loaded",
        filter: ["!=", ["get", "fileType"], "CPT"],
        layout: {
          "circle-sort-key": ["case", ["get", "selected"], 1, 0],
        },
        paint: {
          "circle-color": [
            "case",
            ["get", "selected"],
            selectedColor,
            [
              "match",
              ["get", "fileType"],
              "BHR-GT",
              typeColors["BHR-GT"],
              "BHR-G",
              typeColors["BHR-G"],
              typeColors["BHR-GT"],
            ],
          ],
          "circle-radius": ["case", ["get", "selected"], 8, 6],
          "circle-stroke-width": ["case", ["get", "selected"], 2.5, 2],
          "circle-stroke-color": [
            "case",
            ["get", "selected"],
            "#ffffff",
            loadedStrokeColor,
          ],
        },
      },
      {
        id: "loaded-points-cpt",
        type: "symbol",
        source: "loaded",
        filter: ["==", ["get", "fileType"], "CPT"],
        layout: {
          "icon-image": [
            "case",
            ["get", "selected"],
            "cpt-triangle-selected",
            "cpt-triangle-loaded",
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "symbol-sort-key": ["case", ["get", "selected"], 1, 0],
        },
      },
    ],
  };
}
