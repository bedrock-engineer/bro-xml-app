import { csvFormat } from "d3-dsv";
import type { BROData } from "~/types/bro-data";
import { isCPTData, isBHRGTData, isBHRGData } from "~/types/bro-data";
import { downloadFile } from "./download";

export function downloadBroDataAsCsv(broData: BROData, filename: string): void {
  let csvContent: string;

  if (isCPTData(broData)) {
    // CPT: export measurements
    csvContent = csvFormat(broData.data);
  } else if (isBHRGTData(broData)) {
    // BHR-GT: data export layers
    const layersForCsv = broData.data.map((layer) => ({
      upperBoundary: layer.upperBoundary,
      lowerBoundary: layer.lowerBoundary,
      geotechnicalSoilName: layer.geotechnicalSoilName,
      color: layer.color ?? "",
      organicMatterContentClass: layer.organicMatterContentClass ?? "",
      sandMedianClass: layer.sandMedianClass ?? "",
      dispersedInhomogeneity: layer.dispersedInhomogeneity ?? "",
    }));
    csvContent = csvFormat(layersForCsv);
  } else if (isBHRGData(broData)) {
    // BHR-G data: export geological layers
    const layersForCsv = broData.data.map((layer) => ({
      upperBoundary: layer.upperBoundary,
      lowerBoundary: layer.lowerBoundary,
      soilNameNEN5104: layer.soilNameNEN5104,
      color: layer.color ?? "",
      anthropogenic: layer.anthropogenic ?? "",
      rooted: layer.rooted ?? "",
      organicMatterContentClassNEN5104:
        layer.organicMatterContentClassNEN5104 ?? "",
      gravelContentClass: layer.gravelContentClass ?? "",
      carbonateContentClass: layer.carbonateContentClass ?? "",
      sandMedianClass: layer.sandMedianClass ?? "",
    }));
    csvContent = csvFormat(layersForCsv);
  } else {
    throw new Error("Unknown BRO data type");
  }

  // Generate filename (replace .xml extension with .csv)
  const csvFilename = filename.replace(/\.xml$/i, ".csv");

  downloadFile(csvContent, csvFilename, "text/csv;charset=utf-8;");
}
