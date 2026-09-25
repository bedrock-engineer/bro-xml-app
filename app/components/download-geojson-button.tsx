import type { Feature, FeatureCollection } from "geojson";
import { DownloadIcon } from "lucide-react";
import { Button } from "react-aria-components";
import { useTranslation } from "react-i18next";
import type { BROData } from "~/types/bro-data";
import {
  getFileType,
  getFinalDepth,
  getSurfaceLevel,
  getVerticalDatum,
} from "~/types/bro-data";
import { toWgs84 } from "~/util/coordinates";
import { downloadFile } from "~/util/download";
import { formatDate } from "~/util/format";

function createGeoJSON(broData: Record<string, BROData>): FeatureCollection {
  const features: Array<Feature> = [];

  for (const [filename, data] of Object.entries(broData)) {
    const location =
      data.standardizedLocation?.location ?? data.deliveredLocation?.location;
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
        broId: data.broId,
        fileType: getFileType(data),
        qualityRegime: data.qualityRegime,
        reportDate: data.researchReportDate
          ? formatDate(data.researchReportDate)
          : null,
        surfaceElevation: getSurfaceLevel(data),
        verticalDatum: getVerticalDatum(data),
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
