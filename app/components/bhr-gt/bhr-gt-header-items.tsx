import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { BHRGTData } from "@bedrock-engineer/bro-xml-parser";
import { getUniqueDeterminationTypes } from "./determination-types";
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
  WaterLevelRow,
} from "../compact-header-parts";
import { HeaderSections } from "../header-section";

interface CompactBHRGTHeaderProps {
  filename: string;
  data: BHRGTData;
}

export function CompactBHRGTHeader({ filename, data }: CompactBHRGTHeaderProps) {
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
      </HeaderColumn>

      {/* Right column - Location and bore info */}
      <HeaderColumn>
        <LocationDisplay location={location} />
        <SurfaceLevelRow
          offset={data.deliveredVerticalPositionOffset}
          datum={data.deliveredVerticalPositionDatum}
        />
        <DepthRow label={t("finalBoreDepth")} depth={data.finalBoreDepth} />
        <WaterLevelRow level={data.groundwaterLevel} />
        {data.analysis && (
          <HeaderRow label={t("laboratoryAnalysis")} value={t("available")} />
        )}
      </HeaderColumn>
    </CompactHeaderWrapper>
  );
}

function getBHRGTSurveyInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
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
  if (data.groundwaterLevel !== null) {
    items.push({
      label: t("waterLevel"),
      value: `${data.groundwaterLevel.toFixed(2)} m`,
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
      value: data.boreHoleCompleted ? t("yes") : t("no"),
    });
  }
  if (data.stopCriterion) {
    items.push({ label: t("stopCriterion"), value: data.stopCriterion });
  }

  return items;
}

function getBHRGTInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
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

function getSamplingInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.samplerType) {
    items.push({ label: t("samplerType"), value: data.samplerType });
  }
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
  if (data.orientatedSampled !== null) {
    items.push({
      label: t("orientatedSampled"),
      value: data.orientatedSampled ? t("yes") : t("no"),
    });
  }
  if (data.continuouslySampled !== null) {
    items.push({
      label: t("continuouslySampled"),
      value: data.continuouslySampled ? t("yes") : t("no"),
    });
  }
  if (data.sampleContainerDiameter !== null) {
    items.push({
      label: t("sampleContainerDiameter"),
      value: `${data.sampleContainerDiameter} mm`,
    });
  }
  if (data.sampleContainerLength !== null) {
    items.push({
      label: t("sampleContainerLength"),
      value: `${data.sampleContainerLength} mm`,
    });
  }
  if (data.pistonPresent !== null) {
    items.push({
      label: t("pistonPresent"),
      value: data.pistonPresent ? t("yes") : t("no"),
    });
  }
  if (data.coreCatcherPresent !== null) {
    items.push({
      label: t("coreCatcherPresent"),
      value: data.coreCatcherPresent ? t("yes") : t("no"),
    });
  }
  if (data.stockingUsed !== null) {
    items.push({
      label: t("stockingUsed"),
      value: data.stockingUsed ? t("yes") : t("no"),
    });
  }
  if (data.lubricationFluidUsed !== null) {
    items.push({
      label: t("lubricationFluidUsed"),
      value: data.lubricationFluidUsed ? t("yes") : t("no"),
    });
  }
  if (data.rightAngledCuttingShoe !== null) {
    items.push({
      label: t("rightAngledCuttingShoe"),
      value: data.rightAngledCuttingShoe ? t("yes") : t("no"),
    });
  }
  if (data.cuttingShoeInsideDiameter !== null) {
    items.push({
      label: t("cuttingShoeInsideDiameter"),
      value: `${data.cuttingShoeInsideDiameter} mm`,
    });
  }
  if (data.cuttingShoeOutsideDiameter !== null) {
    items.push({
      label: t("cuttingShoeOutsideDiameter"),
      value: `${data.cuttingShoeOutsideDiameter} mm`,
    });
  }
  if (data.taperAngle !== null) {
    items.push({
      label: t("taperAngle"),
      value: `${data.taperAngle}°`,
    });
  }

  return items;
}

function getDescriptionInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.descriptionQuality) {
    items.push({
      label: t("descriptionQuality"),
      value: data.descriptionQuality,
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
  if (data.boreholeLogChecked !== null) {
    items.push({
      label: t("boreholeLogChecked"),
      value: data.boreholeLogChecked ? t("yes") : t("no"),
    });
  }

  return items;
}

function getSurveyContext(data: BHRGTData, t: TFunction): Array<HeaderItem> {
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
  if (data.siteCharacteristicDetermined !== null) {
    items.push({
      label: t("siteCharacteristicDetermined"),
      value: data.siteCharacteristicDetermined ? t("yes") : t("no"),
    });
  }

  return items;
}

function getIntervalData(data: BHRGTData, t: TFunction): Array<HeaderItem> {
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
  if (data.completedIntervals.length > 0) {
    items.push({
      label: t("completedIntervals"),
      value: data.completedIntervals.length,
    });
  }
  if (data.notDescribedIntervals.length > 0) {
    items.push({
      label: t("notDescribedIntervals"),
      value: data.notDescribedIntervals.length,
    });
  }

  return items;
}

function getRegistrationInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
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
