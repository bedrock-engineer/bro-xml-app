import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { getUniqueDeterminationTypes } from "./determination-types";
import type { HeaderItem, HeaderSection } from "../../types/header-types";
import {
  type BHRGTData,
  getDescriptiveLog,
  getFinalDepth,
  getLayers,
  getLocation,
  getSurfaceLevel,
  getVerticalDatum,
} from "../../types/bro-data";
import {
  codeItem,
  formatCode,
  formatCodes,
  formatDate,
  formatIndication,
  uniqueCodes,
} from "../../util/format";
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
        <LocationDisplay location={getLocation(data)} />
        <SurfaceLevelRow
          offset={getSurfaceLevel(data)}
          datum={getVerticalDatum(data)}
        />
        <DepthRow label={t("finalBoreDepth")} depth={getFinalDepth(data)} />
        <WaterLevelRow level={data.boring?.groundwaterLevel ?? null} />
        {data.analysis && (
          <HeaderRow label={t("laboratoryAnalysis")} value={t("available")} />
        )}
      </HeaderColumn>
    </CompactHeaderWrapper>
  );
}

function getBHRGTSurveyInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const boring = data.boring;
  const descriptionProcedure = formatCodes(
    data.boreholeSampleDescription?.descriptionProcedure,
  );

  if (descriptionProcedure) {
    items.push({
      label: t("descriptionProcedure"),
      value: descriptionProcedure,
    });
  }
  if (boring?.finalDepthBoring != null) {
    items.push({
      label: t("finalBoreDepth"),
      value: `${boring.finalDepthBoring.toFixed(2)} m`,
    });
  }
  if (boring?.finalDepthSampling != null) {
    items.push({
      label: t("finalSampleDepth"),
      value: `${boring.finalDepthSampling.toFixed(2)} m`,
    });
  }
  if (boring?.groundwaterLevel != null) {
    items.push({
      label: t("waterLevel"),
      value: `${boring.groundwaterLevel.toFixed(2)} m`,
    });
  }
  if (boring?.rockReached != null) {
    items.push({
      label: t("rockReached"),
      value: formatIndication(boring.rockReached, t),
    });
  }
  if (boring?.boreholeCompleted) {
    items.push({
      label: t("boreholeCompleted"),
      value: formatIndication(boring.boreholeCompleted, t),
    });
  }
  if (boring?.stopCriterion) {
    items.push(codeItem(t("stopCriterion"), boring.stopCriterion));
  }

  return items;
}

function getBHRGTInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const boring = data.boring;

  if (!boring) {
    return items;
  }

  const boringProcedure = formatCodes(boring.boringProcedure);
  const boringTechnique = formatCodes(
    uniqueCodes(
      boring.boredInterval.map((interval) => interval.boringTechnique),
    ),
  );

  if (boring.boringStartDate) {
    items.push({
      label: t("boringStartDate"),
      value: formatDate(boring.boringStartDate),
    });
  }
  if (boring.boringEndDate) {
    items.push({
      label: t("boringEndDate"),
      value: formatDate(boring.boringEndDate),
    });
  }
  if (boringProcedure) {
    items.push({ label: t("boringProcedure"), value: boringProcedure });
  }
  if (boringTechnique) {
    items.push({ label: t("boringTechnique"), value: boringTechnique });
  }
  if (boring.trajectoryExcavated !== null) {
    items.push({
      label: t("trajectoryExcavated"),
      value: formatIndication(boring.trajectoryExcavated, t),
    });
  }
  if (boring.subsurfaceContaminated !== null) {
    items.push({
      label: t("subsurfaceContaminated"),
      value: formatIndication(boring.subsurfaceContaminated, t),
    });
  }

  return items;
}

function getSamplingInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const boring = data.boring;
  // Sampling details are recorded per sampled interval; show the first
  // interval's, as the header summarises the borehole as a whole.
  const interval = boring?.sampledInterval[0];
  const sampler = boring?.sampledInterval.find(
    (sampled) => sampled.sampler,
  )?.sampler;
  const continuouslySampled = getDescriptiveLog(data)?.continuouslySampled;

  if (sampler?.samplerType) {
    items.push(codeItem(t("samplerType"), sampler.samplerType));
  }
  if (boring?.samplingProcedure) {
    items.push(codeItem(t("samplingProcedure"), boring.samplingProcedure));
  }
  if (interval?.samplingMethod) {
    items.push(codeItem(t("samplingMethod"), interval.samplingMethod));
  }
  if (interval?.samplingQuality) {
    items.push(codeItem(t("samplingQuality"), interval.samplingQuality));
  }
  if (interval?.orientatedSampled != null) {
    items.push({
      label: t("orientatedSampled"),
      value: formatIndication(interval.orientatedSampled, t),
    });
  }
  if (continuouslySampled) {
    items.push({
      label: t("continuouslySampled"),
      value: formatIndication(continuouslySampled, t),
    });
  }

  if (!sampler) {
    return items;
  }

  if (sampler.sampleContainerDiameter !== null) {
    items.push({
      label: t("sampleContainerDiameter"),
      value: `${sampler.sampleContainerDiameter} mm`,
    });
  }
  if (sampler.sampleContainerLength !== null) {
    items.push({
      label: t("sampleContainerLength"),
      value: `${sampler.sampleContainerLength} mm`,
    });
  }
  if (sampler.pistonPresent !== null) {
    items.push({
      label: t("pistonPresent"),
      value: formatIndication(sampler.pistonPresent, t),
    });
  }
  if (sampler.coreCatcherPresent !== null) {
    items.push({
      label: t("coreCatcherPresent"),
      value: formatIndication(sampler.coreCatcherPresent, t),
    });
  }
  if (sampler.stockingUsed !== null) {
    items.push({
      label: t("stockingUsed"),
      value: formatIndication(sampler.stockingUsed, t),
    });
  }
  if (sampler.lubricationFluidUsed !== null) {
    items.push({
      label: t("lubricationFluidUsed"),
      value: formatIndication(sampler.lubricationFluidUsed, t),
    });
  }
  if (sampler.rightAngledCuttingShoe !== null) {
    items.push({
      label: t("rightAngledCuttingShoe"),
      value: formatIndication(sampler.rightAngledCuttingShoe, t),
    });
  }
  if (sampler.cuttingShoeInsideDiameter !== null) {
    items.push({
      label: t("cuttingShoeInsideDiameter"),
      value: `${sampler.cuttingShoeInsideDiameter} mm`,
    });
  }
  if (sampler.cuttingShoeOutsideDiameter !== null) {
    items.push({
      label: t("cuttingShoeOutsideDiameter"),
      value: `${sampler.cuttingShoeOutsideDiameter} mm`,
    });
  }
  if (sampler.taperAngle !== null) {
    items.push({
      label: t("taperAngle"),
      value: `${sampler.taperAngle}°`,
    });
  }

  return items;
}

function getDescriptionInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const description = data.boreholeSampleDescription;
  const log = getDescriptiveLog(data);

  if (log?.descriptionQuality) {
    items.push(codeItem(t("descriptionQuality"), log.descriptionQuality));
  }
  if (log?.descriptionLocation) {
    items.push(codeItem(t("descriptionLocation"), log.descriptionLocation));
  }
  if (description?.descriptionReportDate) {
    items.push({
      label: t("descriptionReportDate"),
      value: formatDate(description.descriptionReportDate),
    });
  }
  if (log?.describedMaterial) {
    items.push(codeItem(t("describedMaterial"), log.describedMaterial));
  }
  if (log?.sampleMoistness) {
    items.push(codeItem(t("sampleMoistness"), log.sampleMoistness));
  }
  if (log?.boreholeLogChecked != null) {
    items.push({
      label: t("boreholeLogChecked"),
      value: formatIndication(log.boreholeLogChecked, t),
    });
  }

  return items;
}

function getSurveyContext(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.deliveryContext) {
    items.push(codeItem(t("deliveryContext"), data.deliveryContext));
  }
  if (data.surveyPurpose) {
    items.push(codeItem(t("surveyPurpose"), data.surveyPurpose));
  }
  if (data.discipline) {
    items.push(codeItem(t("discipline"), data.discipline));
  }
  if (data.surveyProcedure) {
    items.push(codeItem(t("surveyProcedure"), data.surveyProcedure));
  }
  if (data.siteCharacteristicDetermined !== null) {
    items.push({
      label: t("siteCharacteristicDetermined"),
      value: formatIndication(data.siteCharacteristicDetermined, t),
    });
  }

  return items;
}

function getIntervalData(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const boring = data.boring;
  const notDescribed = getDescriptiveLog(data)?.notDescribedInterval ?? [];

  if (boring && boring.boredInterval.length > 0) {
    items.push({
      label: t("boredIntervals"),
      value: boring.boredInterval.length,
    });
  }
  if (boring && boring.sampledInterval.length > 0) {
    items.push({
      label: t("sampledIntervals"),
      value: boring.sampledInterval.length,
    });
  }
  if (boring && boring.completedInterval.length > 0) {
    items.push({
      label: t("completedIntervals"),
      value: boring.completedInterval.length,
    });
  }
  if (notDescribed.length > 0) {
    items.push({
      label: t("notDescribedIntervals"),
      value: notDescribed.length,
    });
  }

  return items;
}

function getRegistrationInfo(data: BHRGTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.registrationHistory) {
    const history = data.registrationHistory;
    if (history.registrationStatus) {
      items.push(codeItem(t("registrationStatus"), history.registrationStatus));
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
        value: formatIndication(history.corrected, t),
      });
    }
    if (history.underReview !== null) {
      items.push({
        label: t("underReview"),
        value: formatIndication(history.underReview, t),
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
  const layers = getLayers(data);
  const items: Array<HeaderItem> = [{
    label: t("numberOfLayers"),
    value: layers.length,
  }];

  if (layers.length > 0) {
    const firstLayer = layers[0];
    const lastLayer = layers.at(-1);

    items.push({
      label: t("depthRange"),
      value: `${firstLayer?.upperBoundary.toFixed(2)} - ${lastLayer?.lowerBoundary.toFixed(2)} m`,
    });

    // List unique soil names
    const soilNames = [
      ...new Set(
        layers
          .map((l) => formatCode(l.soil?.geotechnicalSoilName))
          .filter((name) => name !== null),
      ),
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
    items.push(codeItem(t("analysisProcedure"), analysis.analysisProcedure));
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
