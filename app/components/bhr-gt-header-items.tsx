import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { BHRGTData } from "@bedrock-engineer/bro-xml-parser";
import { getUniqueDeterminationTypes } from "../util/determination-types";
import type { HeaderItem, HeaderSection } from "../types/header-types";
import { formatDate } from "../util/format";
import { getLocationItems } from "../util/location-info";
import { CardTitle } from "./card";
import {
  BroIdRow,
  CompactHeaderWrapper,
  DepthRow,
  FilenameRow,
  HeaderColumn,
  HeaderRow,
  LocationDisplay,
  QualityRegimeRow,
  ReportDateRow,
  SurfaceLevelRow,
  WaterLevelRow,
} from "./compact-header-parts";
import { HeaderSections } from "./header-section";

interface CompactBHRGTHeaderProps {
  filename: string;
  data: BHRGTData;
}

export function CompactBHRGTHeader({ filename, data }: CompactBHRGTHeaderProps) {
  const { t } = useTranslation();
  const location = data.delivered_location ?? data.standardized_location;

  return (
    <CompactHeaderWrapper testId={data.bro_id}>
      {/* Left column - Basic info */}
      <HeaderColumn>
        <FilenameRow filename={filename} />
        <BroIdRow broId={data.bro_id} />
        <QualityRegimeRow qualityRegime={data.quality_regime} />
        <ReportDateRow date={data.research_report_date} />
      </HeaderColumn>

      {/* Right column - Location and bore info */}
      <HeaderColumn>
        <LocationDisplay location={location} />
        <SurfaceLevelRow
          offset={data.delivered_vertical_position_offset}
          datum={data.delivered_vertical_position_datum}
        />
        <DepthRow label={t("finalBoreDepth")} depth={data.final_bore_depth} />
        <WaterLevelRow level={data.groundwater_level} />
        {data.analysis && (
          <HeaderRow label={t("laboratoryAnalysis")} value={t("available")} />
        )}
      </HeaderColumn>
    </CompactHeaderWrapper>
  );
}

function getBHRGTSurveyInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.description_procedure) {
    items.push({
      label: t("descriptionProcedure"),
      value: data.description_procedure,
    });
  }
  if (data.final_bore_depth !== null) {
    items.push({
      label: t("finalBoreDepth"),
      value: `${data.final_bore_depth.toFixed(2)} m`,
    });
  }
  if (data.final_sample_depth !== null) {
    items.push({
      label: t("finalSampleDepth"),
      value: `${data.final_sample_depth.toFixed(2)} m`,
    });
  }
  if (data.groundwater_level !== null) {
    items.push({
      label: t("waterLevel"),
      value: `${data.groundwater_level.toFixed(2)} m`,
    });
  }
  if (data.bore_rock_reached !== null) {
    items.push({
      label: t("rockReached"),
      value: data.bore_rock_reached ? t("yes") : t("no"),
    });
  }
  if (data.bore_hole_completed !== null) {
    items.push({
      label: t("boreholeCompleted"),
      value: data.bore_hole_completed ? t("yes") : t("no"),
    });
  }
  if (data.stop_criterion) {
    items.push({ label: t("stopCriterion"), value: data.stop_criterion });
  }

  return items;
}

function getBHRGTInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.boring_start_date) {
    items.push({
      label: t("boringStartDate"),
      value: formatDate(data.boring_start_date),
    });
  }
  if (data.boring_end_date) {
    items.push({
      label: t("boringEndDate"),
      value: formatDate(data.boring_end_date),
    });
  }
  if (data.boring_procedure) {
    items.push({ label: t("boringProcedure"), value: data.boring_procedure });
  }
  if (data.boring_technique) {
    items.push({ label: t("boringTechnique"), value: data.boring_technique });
  }
  if (data.trajectory_excavated !== null) {
    items.push({
      label: t("trajectoryExcavated"),
      value: data.trajectory_excavated ? t("yes") : t("no"),
    });
  }
  if (data.subsurface_contaminated !== null) {
    items.push({
      label: t("subsurfaceContaminated"),
      value: data.subsurface_contaminated ? t("yes") : t("no"),
    });
  }

  return items;
}

function getSamplingInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.sampler_type) {
    items.push({ label: t("samplerType"), value: data.sampler_type });
  }
  if (data.sampling_procedure) {
    items.push({
      label: t("samplingProcedure"),
      value: data.sampling_procedure,
    });
  }
  if (data.sampling_method) {
    items.push({ label: t("samplingMethod"), value: data.sampling_method });
  }
  if (data.sampling_quality) {
    items.push({ label: t("samplingQuality"), value: data.sampling_quality });
  }
  if (data.orientated_sampled !== null) {
    items.push({
      label: t("orientatedSampled"),
      value: data.orientated_sampled ? t("yes") : t("no"),
    });
  }
  if (data.continuously_sampled !== null) {
    items.push({
      label: t("continuouslySampled"),
      value: data.continuously_sampled ? t("yes") : t("no"),
    });
  }
  if (data.sample_container_diameter !== null) {
    items.push({
      label: t("sampleContainerDiameter"),
      value: `${data.sample_container_diameter} mm`,
    });
  }
  if (data.sample_container_length !== null) {
    items.push({
      label: t("sampleContainerLength"),
      value: `${data.sample_container_length} mm`,
    });
  }
  if (data.piston_present !== null) {
    items.push({
      label: t("pistonPresent"),
      value: data.piston_present ? t("yes") : t("no"),
    });
  }
  if (data.core_catcher_present !== null) {
    items.push({
      label: t("coreCatcherPresent"),
      value: data.core_catcher_present ? t("yes") : t("no"),
    });
  }
  if (data.stocking_used !== null) {
    items.push({
      label: t("stockingUsed"),
      value: data.stocking_used ? t("yes") : t("no"),
    });
  }
  if (data.lubrication_fluid_used !== null) {
    items.push({
      label: t("lubricationFluidUsed"),
      value: data.lubrication_fluid_used ? t("yes") : t("no"),
    });
  }
  if (data.right_angled_cutting_shoe !== null) {
    items.push({
      label: t("rightAngledCuttingShoe"),
      value: data.right_angled_cutting_shoe ? t("yes") : t("no"),
    });
  }
  if (data.cutting_shoe_inside_diameter !== null) {
    items.push({
      label: t("cuttingShoeInsideDiameter"),
      value: `${data.cutting_shoe_inside_diameter} mm`,
    });
  }
  if (data.cutting_shoe_outside_diameter !== null) {
    items.push({
      label: t("cuttingShoeOutsideDiameter"),
      value: `${data.cutting_shoe_outside_diameter} mm`,
    });
  }
  if (data.taper_angle !== null) {
    items.push({
      label: t("taperAngle"),
      value: `${data.taper_angle}°`,
    });
  }

  return items;
}

function getDescriptionInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.description_quality) {
    items.push({
      label: t("descriptionQuality"),
      value: data.description_quality,
    });
  }
  if (data.description_location) {
    items.push({
      label: t("descriptionLocation"),
      value: data.description_location,
    });
  }
  if (data.description_report_date) {
    items.push({
      label: t("descriptionReportDate"),
      value: formatDate(data.description_report_date),
    });
  }
  if (data.described_material) {
    items.push({
      label: t("describedMaterial"),
      value: data.described_material,
    });
  }
  if (data.sample_moistness) {
    items.push({ label: t("sampleMoistness"), value: data.sample_moistness });
  }
  if (data.borehole_log_checked !== null) {
    items.push({
      label: t("boreholeLogChecked"),
      value: data.borehole_log_checked ? t("yes") : t("no"),
    });
  }

  return items;
}

function getSurveyContext(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.delivery_context) {
    items.push({ label: t("deliveryContext"), value: data.delivery_context });
  }
  if (data.survey_purpose) {
    items.push({ label: t("surveyPurpose"), value: data.survey_purpose });
  }
  if (data.discipline) {
    items.push({ label: t("discipline"), value: data.discipline });
  }
  if (data.survey_procedure) {
    items.push({ label: t("surveyProcedure"), value: data.survey_procedure });
  }
  if (data.site_characteristic_determined !== null) {
    items.push({
      label: t("siteCharacteristicDetermined"),
      value: data.site_characteristic_determined ? t("yes") : t("no"),
    });
  }

  return items;
}

function getIntervalData(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.bored_intervals.length > 0) {
    items.push({
      label: t("boredIntervals"),
      value: data.bored_intervals.length,
    });
  }
  if (data.sampled_intervals.length > 0) {
    items.push({
      label: t("sampledIntervals"),
      value: data.sampled_intervals.length,
    });
  }
  if (data.completed_intervals.length > 0) {
    items.push({
      label: t("completedIntervals"),
      value: data.completed_intervals.length,
    });
  }
  if (data.not_described_intervals.length > 0) {
    items.push({
      label: t("notDescribedIntervals"),
      value: data.not_described_intervals.length,
    });
  }

  return items;
}

function getRegistrationInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.registration_history) {
    const history = data.registration_history;
    if (history.registrationStatus) {
      items.push({
        label: t("registrationStatus"),
        value: history.registrationStatus,
      });
    }
    if (history.objectRegistrationTime) {
      items.push({
        label: t("registrationTime"),
        value: formatDate(history.objectRegistrationTime),
      });
    }
    if (history.registrationCompletionTime) {
      items.push({
        label: t("registrationCompletionTime"),
        value: formatDate(history.registrationCompletionTime),
      });
    }
    if (history.corrected !== null) {
      items.push({
        label: t("corrected"),
        value: history.corrected ? t("yes") : t("no"),
      });
    }
    if (history.underReview !== null) {
      items.push({
        label: t("underReview"),
        value: history.underReview ? t("yes") : t("no"),
      });
    }
  }

  if (data.report_history) {
    const report = data.report_history;
    if (report.reportStartDate) {
      items.push({
        label: t("reportStartDate"),
        value: formatDate(report.reportStartDate),
      });
    }
    if (report.reportEndDate) {
      items.push({
        label: t("reportEndDate"),
        value: formatDate(report.reportEndDate),
      });
    }
  }

  return items;
}

function getBHRGTLayerInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [{
    label: t("numberOfLayers"),
    value: data.data.length,
  }];


  if (data.data.length > 0) {
    const firstLayer = data.data[0];
    const lastLayer = data.data.at(-1);

    items.push({
      label: t("depthRange"),
      value: `${firstLayer?.upperBoundary.toFixed(2)} - ${lastLayer?.lowerBoundary.toFixed(2)} m`,
    });

    // List unique soil names
    const soilNames = [
      ...new Set(data.data.map((l) => l.geotechnicalSoilName)),
    ];
    if (soilNames.length > 0) {
      items.push({
        label: t("soilTypes"),
        value:
          soilNames.slice(0, 5).join(", ") +
          (soilNames.length > 5 ? "..." : ""),
      });
    }
  }

  return items;
}

function getBHRGTAnalysisInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (!data.analysis) {
    return items;
  }

  const analysis = data.analysis;

  if (analysis.analysisReportDate) {
    items.push({
      label: t("analysisReportDate"),
      value: formatDate(analysis.analysisReportDate),
    });
  }

  if (analysis.analysisProcedure) {
    items.push({
      label: t("analysisProcedure"),
      value: analysis.analysisProcedure,
    });
  }

  items.push({
    label: t("investigatedIntervals"),
    value: analysis.investigatedIntervals.length,
  });

  const uniqueTypes = getUniqueDeterminationTypes(
    analysis.investigatedIntervals,
  );

  if (uniqueTypes.length > 0) {
    items.push({
      label: t("determinationTypes"),
      value: uniqueTypes.join(", "),
    });
  }

  return items;
}

interface DetailedBoreHeadersProps {
  data: BHRGTData;
}

export function DetailedBoreHeaders({ data }: DetailedBoreHeadersProps) {
  const { t } = useTranslation();

  const sections: Array<HeaderSection> = [
    {
      id: "survey",
      title: t("boreholeInformation"),
      items: getBHRGTSurveyInfo(data, t),
    },
    {
      id: "location",
      title: t("locationInformation"),
      items: getLocationItems(data, t),
    },
    {
      id: "boring",
      title: t("boringInformation"),
      items: getBHRGTInfo(data, t),
    },
    {
      id: "sampling",
      title: t("samplingInformation"),
      items: getSamplingInfo(data, t),
    },
    {
      id: "description",
      title: t("descriptionInformation"),
      items: getDescriptionInfo(data, t),
    },
    {
      id: "context",
      title: t("surveyContext"),
      items: getSurveyContext(data, t),
    },
    {
      id: "intervals",
      title: t("intervalData"),
      items: getIntervalData(data, t),
    },
    {
      id: "layers",
      title: t("layerData"),
      items: getBHRGTLayerInfo(data, t),
    },
    {
      id: "analysis",
      title: t("laboratoryAnalysis"),
      items: getBHRGTAnalysisInfo(data, t),
    },
    {
      id: "registration",
      title: t("registrationInformation"),
      items: getRegistrationInfo(data, t),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="space-y-2">
      <CardTitle>{t("technicalDetails")}</CardTitle>
      <HeaderSections sections={sections} />
    </div>
  );
}
