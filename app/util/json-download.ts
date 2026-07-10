import type { BROData } from "~/types/bro-data";
import { isCPTData, isBHRGTData, isBHRGData } from "~/types/bro-data";
import { downloadFile } from "./download";

/**
 * Convert BRO data to JSON export format
 */
function convertBroDataToJson(broData: BROData): Record<string, unknown> {
  const location = broData.standardizedLocation ?? broData.deliveredLocation;

  // Build base structure
  const json: Record<string, unknown> = {
    broId: broData.broId,
    qualityRegime: broData.qualityRegime,
    dataType: broData.meta.dataType,
    schemaVersion: broData.meta.schemaVersion,
    reportDate: broData.researchReportDate?.toISOString().split("T")[0] ?? null,
    metadata: {
      location: location
        ? {
            epsg: location.epsg,
            x: location.x,
            y: location.y,
          }
        : null,
      standardizedLocation: broData.standardizedLocation
        ? {
            epsg: broData.standardizedLocation.epsg,
            x: broData.standardizedLocation.x,
            y: broData.standardizedLocation.y,
          }
        : null,
      verticalPosition: {
        offset: broData.deliveredVerticalPositionOffset,
        datum: broData.deliveredVerticalPositionDatum,
        referencePoint: broData.deliveredVerticalPositionReferencePoint,
      },
    },
  };

  if (isCPTData(broData)) {
    // CPT-specific fields
    json.cptMetadata = {
      cptStandard: broData.cptStandard,
      qualityClass: broData.qualityClass,
      predrilledDepth: broData.predrilledDepth,
      finalDepth: broData.finalDepth,
      groundwaterLevel: broData.groundwaterLevel,
      dissipationtestPerformed: broData.dissipationtestPerformed,
      equipment: {
        description: broData.cptDescription,
        type: broData.cptType,
        coneSurfaceArea: broData.coneSurfaceArea,
        coneDiameter: broData.coneDiameter,
        coneSurfaceQuotient: broData.coneSurfaceQuotient,
        coneToFrictionSleeveDistance: broData.coneToFrictionSleeveDistance,
        frictionSleeveSurfaceArea: broData.coneToFrictionSleeveSurfaceArea,
        frictionSleeveSurfaceQuotient: broData.coneToFrictionSleeveSurfaceQuotient,
      },
      zeroLoadMeasurements: {
        coneResistanceBefore: broData.zlmConeResistanceBefore,
        coneResistanceAfter: broData.zlmConeResistanceAfter,
        localFrictionBefore: broData.zlmLocalFrictionBefore,
        localFrictionAfter: broData.zlmLocalFrictionAfter,
        inclinationResultantBefore: broData.zlmInclinationResultantBefore,
        inclinationResultantAfter: broData.zlmInclinationResultantAfter,
      },
    };

    if (broData.removedLayers.length > 0) {
      json.removedLayers = broData.removedLayers.map((layer) => ({
        sequenceNumber: layer.sequenceNumber,
        upperBoundary: layer.upperBoundary,
        lowerBoundary: layer.lowerBoundary,
        description: layer.description,
      }));
    }

    json.measurements = broData.data;
  } else if (isBHRGTData(broData)) {
    // BHR-GT specific fields
    json.boreMetadata = {
      descriptionProcedure: broData.descriptionProcedure,
      finalBoreDepth: broData.finalBoreDepth,
      finalSampleDepth: broData.finalSampleDepth,
      groundwaterLevel: broData.groundwaterLevel,
      boreRockReached: broData.boreRockReached,
      boreHoleCompleted: broData.boreHoleCompleted,
    };

    json.layers = broData.data.map((layer) => ({
      upperBoundary: layer.upperBoundary,
      lowerBoundary: layer.lowerBoundary,
      geotechnicalSoilName: layer.geotechnicalSoilName,
      color: layer.color ?? null,
      organicMatterContentClass: layer.organicMatterContentClass ?? null,
      sandMedianClass: layer.sandMedianClass ?? null,
      dispersedInhomogeneity: layer.dispersedInhomogeneity ?? null,
    }));

    // Include laboratory analysis if present
    if (broData.analysis) {
      json.analysis = {
        reportDate: broData.analysis.analysisReportDate?.toISOString().split("T")[0] ?? null,
        procedure: broData.analysis.analysisProcedure,
        intervals: broData.analysis.investigatedIntervals.map((interval) => ({
          beginDepth: interval.beginDepth,
          endDepth: interval.endDepth,
          sampleQuality: interval.sampleQuality,
          analysisType: interval.analysisType,
          waterContent: interval.waterContentDetermination?.waterContent ?? null,
          organicMatterContent: interval.organicMatterContentDetermination?.organicMatterContent ?? null,
          carbonateContent: interval.carbonateContentDetermination?.carbonateContent ?? null,
          bulkDensity: interval.volumetricMassDensityDetermination?.volumetricMassDensity ?? null,
          particleDensity: interval.volumetricMassDensityOfSolidsDetermination?.volumetricMassDensityOfSolids ?? null,
          liquidLimit: interval.consistencyLimitsDetermination?.liquidLimit ?? null,
          plasticLimit: interval.consistencyLimitsDetermination?.plasticLimit ?? null,
          plasticityIndex: interval.consistencyLimitsDetermination?.plasticityIndex ?? null,
        })),
      };
    }
  } else if (isBHRGData(broData)) {
    // BHR-G specific fields
    json.boreMetadata = {
      descriptionProcedure: broData.descriptionProcedure,
      finalBoreDepth: broData.finalBoreDepth,
      finalSampleDepth: broData.finalSampleDepth,
      boreRockReached: broData.boreRockReached,
      boreHoleCompleted: broData.boreHoleCompleted,
    };

    json.layers = broData.data.map((layer) => ({
      upperBoundary: layer.upperBoundary,
      lowerBoundary: layer.lowerBoundary,
      soilNameNEN5104: layer.soilNameNEN5104,
      color: layer.color ?? null,
      anthropogenic: layer.anthropogenic ?? null,
      rooted: layer.rooted ?? null,
      organicMatterContentClassNEN5104: layer.organicMatterContentClassNEN5104 ?? null,
      gravelContentClass: layer.gravelContentClass ?? null,
      carbonateContentClass: layer.carbonateContentClass ?? null,
      sandMedianClass: layer.sandMedianClass ?? null,
    }));
  }

  return json;
}

/**
 * Download BRO data as JSON file
 */
export function downloadBroDataAsJson(
  broData: BROData,
  filename: string,
): void {
  const jsonData = convertBroDataToJson(broData);
  const jsonString = JSON.stringify(jsonData, null, 2);

  // Generate filename (replace .xml extension with .json)
  const jsonFilename = filename.replace(/\.xml$/i, ".json");

  downloadFile(jsonString, jsonFilename, "application/json;charset=utf-8;");
}
