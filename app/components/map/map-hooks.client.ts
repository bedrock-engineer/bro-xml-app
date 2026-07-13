import type { TFunction } from "i18next";
import type { MapGeoJSONFeature } from "maplibre-gl";
import { type Map as MaplibreMap } from "maplibre-gl";
import type { BROData, BROFileType } from "~/types/bro-data";
import { getCoordSystemName, toWgs84 } from "~/util/coordinates";

export interface LocationInfo {
  filename: string;
  lat: number;
  lon: number;
  fileType: BROFileType;
  broId: string | null;
  epsg: string;
  x: number;
  y: number;
}

/**
 * Extract location from BRO data
 */
export function extractLocation(
  filename: string,
  data: BROData,
): LocationInfo | null {
  const location = data.standardizedLocation ?? data.deliveredLocation;

  if (!location) {
    return null;
  }

  const wgs84 = toWgs84(location);
  if (!wgs84) {
    return null;
  }

  let { lat, lon } = wgs84;

  // Validate coordinates are reasonable for Netherlands
  if (lat < 50 || lat > 54 || lon < 3 || lon > 8) {
    // Try swapping if lat/lon seem reversed
    if (lon >= 50 && lon <= 54 && lat >= 3 && lat <= 8) {
      [lat, lon] = [lon, lat];
    } else {
      return null;
    }
  }

  return {
    filename,
    lat,
    lon,
    fileType: data.meta.dataType,
    broId: data.broId,
    epsg: location.epsg,
    x: location.x,
    y: location.y,
  };
}

export function locationsToGeoJSON(
  locations: Array<LocationInfo>,
  selectedFileName: string | null,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: locations.map((loc) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [loc.lon, loc.lat] },
      properties: {
        filename: loc.filename,
        fileType: loc.fileType,
        broId: loc.broId,
        epsg: loc.epsg,
        x: loc.x,
        y: loc.y,
        lat: loc.lat,
        lon: loc.lon,
        selected: loc.filename === selectedFileName,
      },
    })),
  };
}

// String(undefined) is the truthy "undefined", so keep absent values empty
function asText(value: string | number | boolean | null | undefined): string {
  return value == null ? "" : String(value);
}

export function hoverPopupHtml(
  feature: MapGeoJSONFeature,
  t: TFunction,
): string {
  // todo maybe use zod here or just define a better type
  const properties = feature.properties as Record<
    string,
    string | number | boolean | null | undefined
  >;

  if (feature.layer.id.startsWith("loaded-points")) {
    const broId = asText(properties.broId);
    const coordSystem = getCoordSystemName(String(properties.epsg));
    const x = Number(properties.x);
    const y = Number(properties.y);
    const lat = Number(properties.lat);
    const lon = Number(properties.lon);

    return `
      <div class="text-xs">
        <strong>${String(properties.filename)}</strong><br/>
        ${broId ? `BRO ID: ${broId}<br/>` : ""}
        ${coordSystem}: ${x.toFixed(2)}, ${y.toFixed(2)}<br/>
        Lat/Lng: ${lat.toFixed(6)}, ${lon.toFixed(6)}
      </div>
    `;
  }

  // Unclustered PMTiles point: bro_id plus the attributes baked into
  // the tiles (quality regime, CPT quality class, final depth, report
  // year). Older records can miss any of them, so every line is
  // optional.
  const metaLine = [asText(properties.quality), asText(properties.year)]
    .filter(Boolean)
    .join(" · ");
  const qualityClass = /^klasse(\d)$/.exec(asText(properties.quality_class));
  const depth = Number(properties.depth);

  const lines = [
    `<strong>${asText(properties.bro_id)}</strong>`,
    metaLine,
    qualityClass
      ? t("mapPopupQualityClass", { classNumber: qualityClass[1] })
      : "",
    Number.isFinite(depth) ? `${t("mapPopupDepth")}: ${depth} m` : "",
  ].filter(Boolean);

  return `<div class="text-xs">${lines.join("<br/>")}</div>`;
}

/**
 * Run `apply` now if the map style is ready, otherwise once it loads.
 * Returns a cleanup function for the pending listener, for use as an
 * effect return value.
 */
export function runWhenStyleLoaded(
  map: MaplibreMap,
  apply: () => void,
): (() => void) | undefined {
  if (map.isStyleLoaded()) {
    apply();
    return undefined;
  }
  void map.once("load", apply);
  return () => {
    map.off("load", apply);
  };
}


