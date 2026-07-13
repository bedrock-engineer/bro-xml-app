import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { CPTData } from "@bedrock-engineer/bro-xml-parser";
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

interface CompactCptHeaderProps {
  filename: string;
  data: CPTData;
}

export function CompactCptHeader({ filename, data }: CompactCptHeaderProps) {
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

      {/* Right column - Location and test info */}
      <HeaderColumn>
        <LocationDisplay location={location} />
        <SurfaceLevelRow
          offset={data.deliveredVerticalPositionOffset}
          datum={data.deliveredVerticalPositionDatum}
        />
        <DepthRow label={t("finalDepth")} depth={data.finalDepth} />
        <WaterLevelRow level={data.groundwaterLevel} />
        <HeaderRow label={t("qualityClass")} value={data.qualityClass} />
      </HeaderColumn>
    </CompactHeaderWrapper>
  );
}

function getCptSurveyInfo(data: CPTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.cptStandard) {
    items.push({ label: t("cptStandard"), value: data.cptStandard });
  }
  if (data.cptMethod) {
    items.push({ label: t("cptMethod"), value: data.cptMethod });
  }
  if (data.qualityClass !== null) {
    items.push({ label: t("qualityClass"), value: data.qualityClass });
  }
  if (data.predrilledDepth !== null) {
    items.push({
      label: t("predrilledDepth"),
      value: `${data.predrilledDepth.toFixed(2)} m`,
    });
  }
  if (data.finalDepth !== null) {
    items.push({
      label: t("finalDepth"),
      value: `${data.finalDepth.toFixed(2)} m`,
    });
  }
  if (data.groundwaterLevel !== null) {
    items.push({
      label: t("waterLevel"),
      value: `${data.groundwaterLevel.toFixed(2)} m`,
    });
  }
  if (data.stopCriterion) {
    items.push({ label: t("stopCriterion"), value: data.stopCriterion });
  }
  if (data.dissipationtestPerformed !== null) {
    items.push({
      label: t("dissipationTest"),
      value: data.dissipationtestPerformed ? t("yes") : t("no"),
    });
  }

  return items;
}

function getCptLocationInfo(data: CPTData, t: TFunction): Array<HeaderItem> {
  return getLocationItems(data, t);
}

function getCptEquipmentInfo(data: CPTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.cptDescription) {
    items.push({ label: t("description"), value: data.cptDescription });
  }
  if (data.cptType) {
    items.push({ label: t("cptType"), value: data.cptType });
  }
  if (data.coneSurfaceArea !== null) {
    items.push({
      label: t("coneSurfaceArea"),
      value: `${data.coneSurfaceArea} mm²`,
    });
  }
  if (data.coneDiameter !== null) {
    items.push({
      label: t("coneDiameter"),
      value: `${data.coneDiameter} mm`,
    });
  }
  if (data.coneSurfaceQuotient !== null) {
    items.push({
      label: t("coneSurfaceQuotient"),
      value: data.coneSurfaceQuotient.toFixed(3),
    });
  }
  if (data.coneToFrictionSleeveDistance !== null) {
    items.push({
      label: t("coneToFrictionSleeveDistance"),
      value: `${data.coneToFrictionSleeveDistance} mm`,
    });
  }
  if (data.coneToFrictionSleeveSurfaceArea !== null) {
    items.push({
      label: t("frictionSleeveSurfaceArea"),
      value: `${data.coneToFrictionSleeveSurfaceArea} mm²`,
    });
  }
  if (data.coneToFrictionSleeveSurfaceQuotient !== null) {
    items.push({
      label: t("frictionSleeveSurfaceQuotient"),
      value: data.coneToFrictionSleeveSurfaceQuotient.toFixed(3),
    });
  }

  return items;
}

function getZeroLoadMeasurements(
  data: CPTData,
  t: TFunction,
): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  const zlmFields: Array<{
    key: keyof CPTData;
    label: string;
    unit: string;
  }> = [
    {
      key: "zlmConeResistanceBefore",
      label: t("coneResistanceBefore"),
      unit: "MPa",
    },
    {
      key: "zlmConeResistanceAfter",
      label: t("coneResistanceAfter"),
      unit: "MPa",
    },
    {
      key: "zlmLocalFrictionBefore",
      label: t("localFrictionBefore"),
      unit: "MPa",
    },
    {
      key: "zlmLocalFrictionAfter",
      label: t("localFrictionAfter"),
      unit: "MPa",
    },
    {
      key: "zlmPorePressureU1Before",
      label: t("porePressureU1Before"),
      unit: "MPa",
    },
    {
      key: "zlmPorePressureU1After",
      label: t("porePressureU1After"),
      unit: "MPa",
    },
    {
      key: "zlmPorePressureU2Before",
      label: t("porePressureU2Before"),
      unit: "MPa",
    },
    {
      key: "zlmPorePressureU2After",
      label: t("porePressureU2After"),
      unit: "MPa",
    },
    {
      key: "zlmPorePressureU3Before",
      label: t("porePressureU3Before"),
      unit: "MPa",
    },
    {
      key: "zlmPorePressureU3After",
      label: t("porePressureU3After"),
      unit: "MPa",
    },
    {
      key: "zlmInclinationEwBefore",
      label: t("inclinationEWBefore"),
      unit: "°",
    },
    {
      key: "zlmInclinationEwAfter",
      label: t("inclinationEWAfter"),
      unit: "°",
    },
    {
      key: "zlmInclinationNsBefore",
      label: t("inclinationNSBefore"),
      unit: "°",
    },
    {
      key: "zlmInclinationNsAfter",
      label: t("inclinationNSAfter"),
      unit: "°",
    },
    {
      key: "zlmInclinationResultantBefore",
      label: t("inclinationResultantBefore"),
      unit: "°",
    },
    {
      key: "zlmInclinationResultantAfter",
      label: t("inclinationResultantAfter"),
      unit: "°",
    },
  ];

  for (const field of zlmFields) {
    const value = data[field.key] as number | null;
    if (value !== null) {
      items.push({
        label: field.label,
        value: `${value.toFixed(4)} ${field.unit}`,
      });
    }
  }

  return items;
}

function getProcessingInfo(data: CPTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.finalProcessingDate) {
    items.push({
      label: t("finalProcessingDate"),
      value: formatDate(data.finalProcessingDate),
    });
  }
  if (data.signalProcessingPerformed !== null) {
    items.push({
      label: t("signalProcessingPerformed"),
      value: data.signalProcessingPerformed ? t("yes") : t("no"),
    });
  }
  if (data.interruptionProcessingPerformed !== null) {
    items.push({
      label: t("interruptionProcessingPerformed"),
      value: data.interruptionProcessingPerformed ? t("yes") : t("no"),
    });
  }
  if (data.expertCorrectionPerformed !== null) {
    items.push({
      label: t("expertCorrectionPerformed"),
      value: data.expertCorrectionPerformed ? t("yes") : t("no"),
    });
  }

  return items;
}

function getMeasurementInfo(data: CPTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [{
    label: t("numberOfMeasurements"),
    value: data.data.length,
  }];

  if (data.data.length > 0) {
    const firstRow = data.data[0];
    const lastRow = data.data.at(-1);

    items.push({
      label: t("depthRange"),
      value: `${firstRow?.penetrationLength.toFixed(2)} - ${lastRow?.penetrationLength.toFixed(2)} m`,
    });

    // Count available columns
    const availableColumns: Array<string> = [];
    if (firstRow?.coneResistance !== undefined)
      {availableColumns.push("Cone Resistance");}
    if (firstRow?.localFriction !== undefined)
      {availableColumns.push("Local Friction");}
    if (firstRow?.frictionRatio !== undefined)
      {availableColumns.push("Friction Ratio");}
    if (firstRow?.porePressureU2 !== undefined)
      {availableColumns.push("Pore Pressure U2");}
    if (firstRow?.inclinationResultant !== undefined)
      {availableColumns.push("Inclination");}

    if (availableColumns.length > 0) {
      items.push({
        label: t("availableColumns"),
        value: availableColumns.join(", "),
      });
    }
  }

  return items;
}

interface DetailedCptHeadersProps {
  data: CPTData;
}

export function DetailedCptHeaders({ data }: DetailedCptHeadersProps) {
  const { t } = useTranslation();

  const sections: Array<HeaderSection> = [
    {
      id: "survey",
      title: t("surveyInformation"),
      items: getCptSurveyInfo(data, t),
    },
    {
      id: "location",
      title: t("locationInformation"),
      items: getCptLocationInfo(data, t),
    },
    {
      id: "equipment",
      title: t("equipmentSpecifications"),
      items: getCptEquipmentInfo(data, t),
    },
    {
      id: "processing",
      title: t("processingInformation"),
      items: getProcessingInfo(data, t),
    },
    {
      id: "zero_load",
      title: t("zeroLoadMeasurements"),
      items: getZeroLoadMeasurements(data, t),
    },
    {
      id: "measurements",
      title: t("measurementData"),
      items: getMeasurementInfo(data, t),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="space-y-2">
      <CardTitle>{t("technicalDetails")}</CardTitle>
      <HeaderSections sections={sections} />
    </div>
  );
}
