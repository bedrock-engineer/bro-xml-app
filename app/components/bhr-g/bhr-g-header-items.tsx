import type { BHRGData } from "@bedrock-engineer/bro-xml-parser";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { HeaderItem, HeaderSection } from "../../types/header-types";
import {
  getDescriptiveLog,
  getFinalDepth,
  getLayers,
  getLocation,
  getSurfaceLevel,
  getVerticalDatum,
} from "../../types/bro-data";
import {
  codeItem,
  describeCode,
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
} from "../compact-header-parts";
import { HeaderSections } from "../header-section";

interface CompactBHRGHeaderProps {
  filename: string;
  data: BHRGData;
}

export function CompactBHRGHeader({ filename, data }: CompactBHRGHeaderProps) {
  const { t } = useTranslation();

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
        <LocationDisplay location={getLocation(data)} />
        <SurfaceLevelRow
          offset={getSurfaceLevel(data)}
          datum={getVerticalDatum(data)}
        />
        <DepthRow label={t("finalBoreDepth")} depth={getFinalDepth(data)} />
        <HeaderRow
          label={t("classificationStandard")}
          value={formatCode(data.boreholeSampleDescription?.descriptionProcedure)}
        />
      </HeaderColumn>
    </CompactHeaderWrapper>
  );
}

function getBHRGSurveyInfo(data: BHRGData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const boring = data.boring;
  const descriptionProcedure =
    data.boreholeSampleDescription?.descriptionProcedure;

  if (descriptionProcedure) {
    items.push(codeItem(t("descriptionProcedure"), descriptionProcedure));
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
  if (data.nITGCode) {
    items.push({ label: t("nitgCode"), value: data.nITGCode });
  }

  return items;
}

function getBHRGBoringInfo(data: BHRGData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const boring = data.boring;

  if (!boring) {
    return items;
  }

  const boringProcedure = formatCodes(boring.boringProcedure);
  const boringTechnique = formatCodes(
    uniqueCodes(boring.boredInterval.map((i) => i.boringTechnique)),
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

function getBHRGSamplingInfo(data: BHRGData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const boring = data.boring;
  // Sampling details are recorded per sampled interval; show the first
  // interval's, as the header summarises the borehole as a whole.
  const interval = boring?.sampledInterval[0];
  const continuouslySampled = getDescriptiveLog(data)?.continuouslySampled;

  if (boring?.samplingProcedure) {
    items.push(codeItem(t("samplingProcedure"), boring.samplingProcedure));
  }
  if (interval?.samplingMethod) {
    items.push(codeItem(t("samplingMethod"), interval.samplingMethod));
  }
  if (interval?.samplingQuality) {
    items.push(codeItem(t("samplingQuality"), interval.samplingQuality));
  }
  if (continuouslySampled) {
    items.push({
      label: t("continuouslySampled"),
      value: formatIndication(continuouslySampled, t),
    });
  }

  return items;
}

function getBHRGDescriptionInfo(
  data: BHRGData,
  t: TFunction,
): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const description = data.boreholeSampleDescription;
  const log = getDescriptiveLog(data);

  if (log?.descriptionQuality) {
    items.push(codeItem(t("descriptionQuality"), log.descriptionQuality));
  }
  if (log?.describedSamplesQuality) {
    items.push(
      codeItem(t("describedSamplesQuality"), log.describedSamplesQuality),
    );
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

  return items;
}

function getBHRGSurveyContext(data: BHRGData, t: TFunction): Array<HeaderItem> {
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

  return items;
}

function getBHRGIntervalData(data: BHRGData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const boring = data.boring;

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

  // BHR-G reports its history as dated events (e.g. "volledig gerapporteerd")
  for (const event of data.reportHistory?.event ?? []) {
    if (event.name && event.date) {
      items.push({
        label: formatCode(event.name) ?? event.name.code,
        value: formatDate(event.date),
        description: describeCode(event.name),
      });
    }
  }

  return items;
}

function getBHRGLocationInfo(data: BHRGData, t: TFunction): Array<HeaderItem> {
  return getLocationItems(data, t);
}

function getBHRGLayerInfo(data: BHRGData, t: TFunction): Array<HeaderItem> {
  const layers = getLayers(data);
  const items: Array<HeaderItem> = [
    {
      label: t("numberOfLayers"),
      value: layers.length,
    },
  ];

  if (layers.length > 0) {
    const firstLayer = layers[0];
    const lastLayer = layers.at(-1);

    items.push({
      label: t("depthRange"),
      value: `${firstLayer?.upperBoundary.toFixed(2)} - ${lastLayer?.lowerBoundary.toFixed(2)} m`,
    });

    // List unique soil names (NEN5104)
    const soilNames = [
      ...new Set(
        layers
          .map((l) => formatCode(l.soil?.soilNameNEN5104))
          .filter((name) => name !== null),
      ),
    ];
    if (soilNames.length > 0) {
      items.push({
        label: t("soilTypesNEN5104"),
        value:
          soilNames.slice(0, 5).join(", ") +
          (soilNames.length > 5 ? "..." : ""),
      });
    }

    // Count anthropogenic layers
    const anthropogenicCount = layers.filter(
      (l) => l.anthropogenic === "ja",
    ).length;
    if (anthropogenicCount > 0) {
      items.push({
        label: t("anthropogenicLayers"),
        value: anthropogenicCount,
      });
    }

    // Count rooted layers
    const rootedCount = layers.filter((l) => l.rooted === "ja").length;
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
