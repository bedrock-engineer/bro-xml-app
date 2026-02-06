import type { BHRGData } from "@bedrock-engineer/bro-xml-parser";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
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
} from "./compact-header-parts";
import { HeaderSections } from "./header-section";

interface CompactBHRGHeaderProps {
  filename: string;
  data: BHRGData;
}

export function CompactBHRGHeader({ filename, data }: CompactBHRGHeaderProps) {
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
        <HeaderRow label={t("dataType")} value={t("geologicalBorehole")} />
      </HeaderColumn>

      {/* Right column - Location and bore info */}
      <HeaderColumn>
        <LocationDisplay location={location} />
        <SurfaceLevelRow
          offset={data.delivered_vertical_position_offset}
          datum={data.delivered_vertical_position_datum}
        />
        <DepthRow label={t("finalBoreDepth")} depth={data.final_bore_depth} />
        <HeaderRow
          label={t("classificationStandard")}
          value={data.description_procedure}
        />
      </HeaderColumn>
    </CompactHeaderWrapper>
  );
}

function getBHRGSurveyInfo(data: BHRGData, t: TFunction): Array<HeaderItem> {
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
  if (data.bore_rock_reached !== null) {
    items.push({
      label: t("rockReached"),
      value: data.bore_rock_reached ? t("yes") : t("no"),
    });
  }
  if (data.bore_hole_completed !== null) {
    items.push({
      label: t("boreholeCompleted"),
      value: data.bore_hole_completed,
    });
  }
  if (data.stop_criterion) {
    items.push({ label: t("stopCriterion"), value: data.stop_criterion });
  }
  if (data.nitg_code) {
    items.push({ label: t("nitgCode"), value: data.nitg_code });
  }

  return items;
}

function getBHRGBoringInfo(data: BHRGData, t: TFunction): Array<HeaderItem> {
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

function getBHRGSamplingInfo(data: BHRGData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

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
  if (data.continuously_sampled !== null) {
    items.push({
      label: t("continuouslySampled"),
      value: data.continuously_sampled ? t("yes") : t("no"),
    });
  }

  return items;
}

function getBHRGDescriptionInfo(
  data: BHRGData,
  t: TFunction,
): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.description_quality) {
    items.push({
      label: t("descriptionQuality"),
      value: data.description_quality,
    });
  }
  if (data.described_samples_quality) {
    items.push({
      label: t("describedSamplesQuality"),
      value: data.described_samples_quality,
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

  return items;
}

function getBHRGSurveyContext(data: BHRGData, t: TFunction): Array<HeaderItem> {
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

  return items;
}

function getBHRGIntervalData(data: BHRGData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.bored_intervals && data.bored_intervals.length > 0) {
    items.push({
      label: t("boredIntervals"),
      value: data.bored_intervals.length,
    });
  }
  if (data.sampled_intervals && data.sampled_intervals.length > 0) {
    items.push({
      label: t("sampledIntervals"),
      value: data.sampled_intervals.length,
    });
  }

  return items;
}

function getBHRGRegistrationInfo(
  data: BHRGData,
  t: TFunction,
): Array<HeaderItem> {
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

function getBHRGLocationInfo(data: BHRGData, t: TFunction): Array<HeaderItem> {
  return getLocationItems(data, t);
}

function getBHRGLayerInfo(data: BHRGData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [
    {
      label: t("numberOfLayers"),
      value: data.data.length,
    },
  ];

  if (data.data.length > 0) {
    const firstLayer = data.data[0];
    const lastLayer = data.data.at(-1);

    items.push({
      label: t("depthRange"),
      value: `${firstLayer?.upperBoundary.toFixed(2)} - ${lastLayer?.lowerBoundary.toFixed(2)} m`,
    });

    // List unique soil names (NEN5104)
    const soilNames = [...new Set(data.data.map((l) => l.soilNameNEN5104))];
    if (soilNames.length > 0) {
      items.push({
        label: t("soilTypesNEN5104"),
        value:
          soilNames.slice(0, 5).join(", ") +
          (soilNames.length > 5 ? "..." : ""),
      });
    }

    // Count anthropogenic layers
    const anthropogenicCount = data.data.filter((l) => l.anthropogenic).length;
    if (anthropogenicCount > 0) {
      items.push({
        label: t("anthropogenicLayers"),
        value: anthropogenicCount,
      });
    }

    // Count rooted layers
    const rootedCount = data.data.filter((l) => l.rooted).length;
    if (rootedCount > 0) {
      items.push({
        label: t("rootedLayers"),
        value: rootedCount,
      });
    }
  }

  return items;
}

interface DetailedBHRGHeadersProps {
  data: BHRGData;
}

export function DetailedBHRGHeaders({ data }: DetailedBHRGHeadersProps) {
  const { t } = useTranslation();

  const sections: Array<HeaderSection> = [
    {
      id: "survey",
      title: t("boreholeInformation"),
      items: getBHRGSurveyInfo(data, t),
    },
    {
      id: "location",
      title: t("locationInformation"),
      items: getBHRGLocationInfo(data, t),
    },
    {
      id: "boring",
      title: t("boringInformation"),
      items: getBHRGBoringInfo(data, t),
    },
    {
      id: "sampling",
      title: t("samplingInformation"),
      items: getBHRGSamplingInfo(data, t),
    },
    {
      id: "description",
      title: t("descriptionInformation"),
      items: getBHRGDescriptionInfo(data, t),
    },
    {
      id: "context",
      title: t("surveyContext"),
      items: getBHRGSurveyContext(data, t),
    },
    {
      id: "intervals",
      title: t("intervalData"),
      items: getBHRGIntervalData(data, t),
    },
    {
      id: "layers",
      title: t("geologicalLayerData"),
      items: getBHRGLayerInfo(data, t),
    },
    {
      id: "registration",
      title: t("registrationInformation"),
      items: getBHRGRegistrationInfo(data, t),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="space-y-2">
      <CardTitle>{t("technicalDetails")}</CardTitle>
      <HeaderSections sections={sections} />
    </div>
  );
}
