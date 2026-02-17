import type { CircleMarker, Map as LeafletMap } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { BROData, BROFileType } from "~/types/bro-data";
import { getCoordSystemName, toWgs84 } from "~/util/coordinates";

interface LocationInfo {
  filename: string;
  lat: number;
  lon: number;
  fileType: BROFileType;
  broId: string | null;
  epsg: string;
  x: number;
  y: number;
}

interface MapProps {
  broData: Record<string, BROData>;
  selectedFileName: string | null;
  onMarkerClick: (filename: string) => void;
}

/**
 * Get color for marker based on BRO file type
 */
function getMarkerColor(fileType: BROFileType): string {
  switch (fileType) {
    case "CPT": {
      return "#2563eb";
    } // blue
    case "BHR-GT": {
      return "#ea580c";
    } // orange
    case "BHR-G": {
      return "#16a34a";
    } // green
  }
}

/**
 * Extract location from BRO data
 */
function extractLocation(filename: string, data: BROData): LocationInfo | null {
  const location = data.standardized_location ?? data.delivered_location;

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
    broId: data.bro_id,
    epsg: location.epsg,
    x: location.x,
    y: location.y,
  };
}

export function BROMap({ broData, selectedFileName, onMarkerClick }: MapProps) {
  if (globalThis.window === undefined) {
    throw new TypeError("BROMultiMap should only render on the client.");
  }

  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap>(null);
  const markersRef = useRef<Map<string, CircleMarker>>(new Map());

  // Extract locations from BRO data
  const locations: Array<LocationInfo> = useMemo(() => {
    return Object.entries(broData)
      .map(([filename, data]) => extractLocation(filename, data))
      .filter((loc): loc is LocationInfo => loc !== null);
  }, [broData]);

  useEffect(() => {
    if (!mapRef.current || locations.length === 0) {
      return;
    }

    // Create or update map
    if (!mapInstanceRef.current) {
      // Calculate bounds
      const lats = locations.map((l) => l.lat).filter((n) => Number.isFinite(n));
      const lngs = locations.map((l) => l.lon).filter((n) => Number.isFinite(n));

      if (lats.length === 0 || lngs.length === 0) {
        return;
      }

      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ];

      // Netherlands bounds with some padding
      const netherlandsBounds: [[number, number], [number, number]] = [
        [50.5, 3],
        [53.8, 7.5],
      ];

      // eslint-disable-next-line unicorn/no-array-method-this-argument, unicorn/no-array-callback-reference
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
        maxBounds: netherlandsBounds,
        maxBoundsViscosity: 1,
        minZoom: 7,
      });

      map.fitBounds(bounds, { padding: [50, 50] });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    for (const marker of markersRef.current.values()) {
      marker.remove();
    }
    markersRef.current.clear();

    // Add markers for each location
    for (const loc of locations) {
      const color = getMarkerColor(loc.fileType);

      const marker = L.circleMarker([loc.lat, loc.lon], {
        radius: 8,
        fillColor: color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(map);

      const coordSystem = getCoordSystemName(loc.epsg);

      marker.bindPopup(`
            <div class="text-xs">
              <strong>${loc.filename}</strong><br/>
              ${loc.broId ? `BRO ID: ${loc.broId}<br/>` : ""}
              ${coordSystem}: ${loc.x.toFixed(2)}, ${loc.y.toFixed(2)}<br/>
              Lat/Lng: ${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)}
            </div>
          `);

      marker.on("click", () => {
        onMarkerClick(loc.filename);
      });

      markersRef.current.set(loc.filename, marker);
    }

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locations, locations.length, onMarkerClick, t]);

  // Update marker styles when selection changes
  useEffect(() => {
    if (!mapInstanceRef.current) {
      return;
    }

    for (const [filename, marker] of markersRef.current.entries()) {
      const isSelected = filename === selectedFileName;
      const loc = locations.find((l) => l.filename === filename);
      const baseColor = loc ? getMarkerColor(loc.fileType) : "#2563eb";

      marker.setStyle({
        radius: isSelected ? 10 : 8,
        fillColor: isSelected ? "#dc2626" : baseColor,
        weight: isSelected ? 3 : 2,
      });

      if (isSelected) {
        marker.bringToFront();
      }
    }
  }, [selectedFileName, locations]);

  if (locations.length === 0) {
    return (
      <div className="w-full h-96 rounded-sm border border-gray-300 bg-gray-50 flex items-center justify-center">
        <span className="text-gray-500">{t("noLocationData")}</span>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-96 rounded-sm border border-gray-300"
      style={{ zIndex: 0 }}
    />
  );
}
