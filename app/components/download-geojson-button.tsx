import type { Feature, FeatureCollection } from "geojson";
import { DownloadIcon } from "lucide-react";
import { Button } from "react-aria-components";
import { useTranslation } from "react-i18next";
import type { BROData } from "~/types/bro-data";
import { getFinalDepth } from "~/types/bro-data";
import { toWgs84 } from "~/util/coordinates";
import { downloadFile } from "~/util/download";

function createGeoJSON(broData: Record<string, BROData>): FeatureCollection {
  const features: Array<Feature> = [];

  for (const [filename, data] of Object.entries(broData)) {
    const location = data.standardized_location ?? data.delivered_location;
    if (!location) {
      continue;
    }

    const wgs84 = toWgs84(location);
    if (!wgs84) {
      continue;
    }
    const finalDepth = getFinalDepth(data);

    features.push({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [wgs84.lon, wgs84.lat],
      },
      properties: {
        filename,
        broId: data.bro_id,
        fileType: data.meta.dataType,
        qualityRegime: data.quality_regime,
        reportDate:
          data.research_report_date?.toISOString().split("T")[0] ?? null,
        surfaceElevation: data.delivered_vertical_position_offset,
        verticalDatum: data.delivered_vertical_position_datum,
        coordinateSystem: location.epsg,
        easting: location.x,
        northing: location.y,
        finalDepth,
      },
    });
  }

  return {
    type: "FeatureCollection" as const,
    features,
  };
}

function downloadAsGeoJSON(broData: Record<string, BROData>) {
  const geojson = createGeoJSON(broData);
  const geojsonString = JSON.stringify(geojson, null, 2);
  downloadFile(geojsonString, "bro-locations.geojson", "application/geo+json");
}

interface DownloadGeoJSONButtonProps {
  broData: Record<string, BROData>;
}

export function DownloadGeoJSONButton({ broData }: DownloadGeoJSONButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      className="button mt-2 ml-auto"
      onPress={() => {
        downloadAsGeoJSON(broData);
      }}
      isDisabled={Object.keys(broData).length === 0}
    >
      {t("downloadLocationsGeoJson")} <DownloadIcon size={14} />{" "}
    </Button>
  );
}
