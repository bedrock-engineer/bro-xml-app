import type { BHRGData } from "@bedrock-engineer/bro-xml-parser";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { HeaderItem, HeaderSection } from "../../types/header-types";
import { formatDate } from "../../util/format";
import { getLocationItems } from "../../util/location-info";
import { CardTitle } from "../card";
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
} from "../compact-header-parts";
import { HeaderSections } from "../header-section";

interface CompactBHRGHeaderProps {
  filename: string;
  data: BHRGData;
}

export function CompactBHRGHeader({ filename, data }: CompactBHRGHeaderProps) {
  const { t } = useTranslation();
  const location = data.deliveredLocation ?? data.standardizedLocation;

  return (
    <CompactHeaderWrapper testId={data.broId}>
      {/* Left column - Basic info */}
      <HeaderColumn>
        <FilenameRow filename={filename} />
        <BroIdRow broId={data.broId} />
        <QualityRegimeRow qualityRegime={data.qualityRegime} />
        <ReportDateRow date={data.researchReportDate} />
        <HeaderRow label={t("dataType")} value={t("geologicalBorehole")} />
      </HeaderColumn>

      {/* Right column - Location and bore info */}
      <HeaderColumn>
        <LocationDisplay location={location} />
        <SurfaceLevelRow
          offset={data.deliveredVerticalPositionOffset}
          datum={data.deliveredVerticalPositionDatum}
        />
        <DepthRow label={t("finalBoreDepth")} depth={data.finalBoreDepth} />
        <HeaderRow
          label={t("classificationStandard")}
          value={data.descriptionProcedure}
        />
      </HeaderColumn>
    </CompactHeaderWrapper>
  );
}

function getBHRGSurveyInfo(data: BHRGData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.descriptionProcedure) {
    items.push({
      label: t("descriptionProcedure"),
      value: data.descriptionProcedure,
    });
  }
  if (data.finalBoreDepth !== null) {
    items.push({
      label: t("finalBoreDepth"),
      value: `${data.finalBoreDepth.toFixed(2)} m`,
    });
  }
  if (data.finalSampleDepth !== null) {
    items.push({
      label: t("finalSampleDepth"),
      value: `${data.finalSampleDepth.toFixed(2)} m`,
    });
  }
  if (data.boreRockReached !== null) {
    items.push({
      label: t("rockReached"),
      value: data.boreRockReached ? t("yes") : t("no"),
    });
  }
  if (data.boreHoleCompleted !== null) {
    items.push({
      label: t("boreholeCompleted"),
      value: data.boreHoleCompleted,
    });
  }
  if (data.stopCriterion) {
    items.push({ label: t("stopCriterion"), value: data.stopCriterion });
  }
  if (data.nitgCode) {
    items.push({ label: t("nitgCode"), value: data.nitgCode });
  }

  return items;
}

function getBHRGBoringInfo(data: BHRGData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.boringStartDate) {
    items.push({
      label: t("boringStartDate"),
      value: formatDate(data.boringStartDate),
    });
  }
  if (data.boringEndDate) {
    items.push({
      label: t("boringEndDate"),
      value: formatDate(data.boringEndDate),
    });
  }
  if (data.boringProcedure) {
    items.push({ label: t("boringProcedure"), value: data.boringProcedure });
  }
  if (data.boringTechnique) {
    items.push({ label: t("boringTechnique"), value: data.boringTechnique });
  }
  if (data.trajectoryExcavated !== null) {
    items.push({
      label: t("trajectoryExcavated"),
      value: data.trajectoryExcavated ? t("yes") : t("no"),
    });
  }
  if (data.subsurfaceContaminated !== null) {
    items.push({
      label: t("subsurfaceContaminated"),
      value: data.subsurfaceContaminated ? t("yes") : t("no"),
    });
  }

  return items;
}

function getBHRGSamplingInfo(data: BHRGData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.samplingProcedure) {
    items.push({
      label: t("samplingProcedure"),
      value: data.samplingProcedure,
    });
  }
  if (data.samplingMethod) {
    items.push({ label: t("samplingMethod"), value: data.samplingMethod });
  }
  if (data.samplingQuality) {
    items.push({ label: t("samplingQuality"), value: data.samplingQuality });
  }
  if (data.continuouslySampled !== null) {
    items.push({
      label: t("continuouslySampled"),
      value: data.continuouslySampled ? t("yes") : t("no"),
    });
  }

  return items;
}

function getBHRGDescriptionInfo(
  data: BHRGData,
  t: TFunction,
): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.descriptionQuality) {
    items.push({
      label: t("descriptionQuality"),
      value: data.descriptionQuality,
    });
  }
  if (data.describedSamplesQuality) {
    items.push({
      label: t("describedSamplesQuality"),
      value: data.describedSamplesQuality,
    });
  }
  if (data.descriptionLocation) {
    items.push({
      label: t("descriptionLocation"),
      value: data.descriptionLocation,
    });
  }
  if (data.descriptionReportDate) {
    items.push({
      label: t("descriptionReportDate"),
      value: formatDate(data.descriptionReportDate),
    });
  }
  if (data.describedMaterial) {
    items.push({
      label: t("describedMaterial"),
      value: data.describedMaterial,
    });
  }
  if (data.sampleMoistness) {
    items.push({ label: t("sampleMoistness"), value: data.sampleMoistness });
  }

  return items;
}

function getBHRGSurveyContext(data: BHRGData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.deliveryContext) {
    items.push({ label: t("deliveryContext"), value: data.deliveryContext });
  }
  if (data.surveyPurpose) {
    items.push({ label: t("surveyPurpose"), value: data.surveyPurpose });
  }
  if (data.discipline) {
    items.push({ label: t("discipline"), value: data.discipline });
  }
  if (data.surveyProcedure) {
    items.push({ label: t("surveyProcedure"), value: data.surveyProcedure });
  }

  return items;
}

function getBHRGIntervalData(data: BHRGData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.boredIntervals.length > 0) {
    items.push({
      label: t("boredIntervals"),
      value: data.boredIntervals.length,
    });
  }
  if (data.sampledIntervals.length > 0) {
    items.push({
      label: t("sampledIntervals"),
      value: data.sampledIntervals.length,
    });
  }

  return items;
}

function getBHRGRegistrationInfo(
  data: BHRGData,
  t: TFunction,
): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.registrationHistory) {
    const history = data.registrationHistory;
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

  if (data.reportHistory) {
    const report = data.reportHistory;
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
