import type { BROData } from "~/types/bro-data";
import { isCPTData, isBHRGTData, isBHRGData } from "~/types/bro-data";
import { downloadFile } from "./download";

/**
 * Convert BRO data to JSON export format
 */
function convertBroDataToJson(broData: BROData): Record<string, unknown> {
  const location = broData.standardized_location ?? broData.delivered_location;

  // Build base structure
  const json: Record<string, unknown> = {
    broId: broData.bro_id,
    qualityRegime: broData.quality_regime,
    dataType: broData.meta.dataType,
    schemaVersion: broData.meta.schemaVersion,
    reportDate: broData.research_report_date?.toISOString().split("T")[0] ?? null,
    metadata: {
      location: location
        ? {
            epsg: location.epsg,
            x: location.x,
            y: location.y,
          }
        : null,
      standardizedLocation: broData.standardized_location
        ? {
            epsg: broData.standardized_location.epsg,
            x: broData.standardized_location.x,
            y: broData.standardized_location.y,
          }
        : null,
      verticalPosition: {
        offset: broData.delivered_vertical_position_offset,
        datum: broData.delivered_vertical_position_datum,
        referencePoint: broData.delivered_vertical_position_reference_point,
      },
    },
  };

  if (isCPTData(broData)) {
    // CPT-specific fields
    json.cptMetadata = {
      cptStandard: broData.cpt_standard,
      qualityClass: broData.quality_class,
      predrilledDepth: broData.predrilled_depth,
      finalDepth: broData.final_depth,
      groundwaterLevel: broData.groundwater_level,
      dissipationtestPerformed: broData.dissipationtest_performed,
      equipment: {
        description: broData.cpt_description,
        type: broData.cpt_type,
        coneSurfaceArea: broData.cone_surface_area,
        coneDiameter: broData.cone_diameter,
        coneSurfaceQuotient: broData.cone_surface_quotient,
        coneToFrictionSleeveDistance: broData.cone_to_friction_sleeve_distance,
        frictionSleeveSurfaceArea: broData.cone_to_friction_sleeve_surface_area,
        frictionSleeveSurfaceQuotient: broData.cone_to_friction_sleeve_surface_quotient,
      },
      zeroLoadMeasurements: {
        coneResistanceBefore: broData.zlm_cone_resistance_before,
        coneResistanceAfter: broData.zlm_cone_resistance_after,
        localFrictionBefore: broData.zlm_local_friction_before,
        localFrictionAfter: broData.zlm_local_friction_after,
        inclinationResultantBefore: broData.zlm_inclination_resultant_before,
        inclinationResultantAfter: broData.zlm_inclination_resultant_after,
      },
    };

    json.measurements = broData.data;
  } else if (isBHRGTData(broData)) {
    // BHR-GT specific fields
    json.boreMetadata = {
      descriptionProcedure: broData.description_procedure,
      finalBoreDepth: broData.final_bore_depth,
      finalSampleDepth: broData.final_sample_depth,
      groundwaterLevel: broData.groundwater_level,
      boreRockReached: broData.bore_rock_reached,
      boreHoleCompleted: broData.bore_hole_completed,
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
      descriptionProcedure: broData.description_procedure,
      finalBoreDepth: broData.final_bore_depth,
      finalSampleDepth: broData.final_sample_depth,
      boreRockReached: broData.bore_rock_reached,
      boreHoleCompleted: broData.bore_hole_completed,
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
