import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { HeaderItem, HeaderSection } from "../../types/header-types";
import {
  type CPTData,
  getFinalDepth,
  getLocation,
  getMeasurements,
  getSurfaceLevel,
  getVerticalDatum,
} from "../../types/bro-data";
import {
  codeItem,
  describeCode,
  formatDate,
  formatIndication,
  formatQualityClass,
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

interface CompactCptHeaderProps {
  filename: string;
  data: CPTData;
}

export function CompactCptHeader({ filename, data }: CompactCptHeaderProps) {
  const { t } = useTranslation();
  const location = getLocation(data);
  const survey = data.conePenetrometerSurvey;

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
          offset={getSurfaceLevel(data)}
          datum={getVerticalDatum(data)}
        />
        <DepthRow label={t("finalDepth")} depth={getFinalDepth(data)} />
        <WaterLevelRow
          level={data.additionalInvestigation?.groundwaterLevel ?? null}
        />
        <HeaderRow
          label={t("qualityClass")}
          value={formatQualityClass(survey?.qualityClass)}
        />
      </HeaderColumn>
    </CompactHeaderWrapper>
  );
}

function getCptSurveyInfo(data: CPTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const survey = data.conePenetrometerSurvey;
  const predrilledDepth = survey?.trajectory?.predrilledDepth ?? null;
  const finalDepth = survey?.trajectory?.finalDepth ?? null;
  const groundwaterLevel = data.additionalInvestigation?.groundwaterLevel;

  if (data.cptStandard) {
    items.push(codeItem(t("cptStandard"), data.cptStandard));
  }
  if (survey?.cptMethod) {
    items.push(codeItem(t("cptMethod"), survey.cptMethod));
  }
  if (survey?.qualityClass) {
    items.push({
      label: t("qualityClass"),
      value: formatQualityClass(survey.qualityClass),
      description: describeCode(survey.qualityClass),
    });
  }
  if (predrilledDepth !== null) {
    items.push({
      label: t("predrilledDepth"),
      value: `${predrilledDepth.toFixed(2)} m`,
    });
  }
  if (finalDepth !== null) {
    items.push({
      label: t("finalDepth"),
      value: `${finalDepth.toFixed(2)} m`,
    });
  }
  if (groundwaterLevel != null) {
    items.push({
      label: t("waterLevel"),
      value: `${groundwaterLevel.toFixed(2)} m`,
    });
  }
  if (survey?.stopCriterion) {
    items.push(codeItem(t("stopCriterion"), survey.stopCriterion));
  }
  if (survey?.dissipationTestPerformed != null) {
    items.push({
      label: t("dissipationTest"),
      value: formatIndication(survey.dissipationTestPerformed, t),
    });
  }

  return items;
}

function getCptLocationInfo(data: CPTData, t: TFunction): Array<HeaderItem> {
  return getLocationItems(data, t);
}

function getCptEquipmentInfo(data: CPTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const cone = data.conePenetrometerSurvey?.conePenetrometer;

  if (!cone) {
    return items;
  }

  if (cone.description) {
    items.push({ label: t("description"), value: cone.description });
  }
  if (cone.conePenetrometerType) {
    items.push({ label: t("cptType"), value: cone.conePenetrometerType });
  }
  if (cone.coneSurfaceArea !== null) {
    items.push({
      label: t("coneSurfaceArea"),
      value: `${cone.coneSurfaceArea} mm²`,
    });
  }
  if (cone.coneDiameter !== null) {
    items.push({
      label: t("coneDiameter"),
      value: `${cone.coneDiameter} mm`,
    });
  }
  if (cone.coneSurfaceQuotient !== null) {
    items.push({
      label: t("coneSurfaceQuotient"),
      value: cone.coneSurfaceQuotient.toFixed(3),
    });
  }
  if (cone.coneToFrictionSleeveDistance !== null) {
    items.push({
      label: t("coneToFrictionSleeveDistance"),
      value: `${cone.coneToFrictionSleeveDistance} mm`,
    });
  }
  if (cone.frictionSleeveSurfaceArea !== null) {
    items.push({
      label: t("frictionSleeveSurfaceArea"),
      value: `${cone.frictionSleeveSurfaceArea} mm²`,
    });
  }
  if (cone.frictionSleeveSurfaceQuotient !== null) {
    items.push({
      label: t("frictionSleeveSurfaceQuotient"),
      value: cone.frictionSleeveSurfaceQuotient.toFixed(3),
    });
  }

  return items;
}

function getZeroLoadMeasurements(
  data: CPTData,
  t: TFunction,
): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const zlm =
    data.conePenetrometerSurvey?.conePenetrometer?.zeroLoadMeasurement;

  if (!zlm) {
    return items;
  }

  const zlmFields: Array<{
    key: keyof typeof zlm;
    label: string;
    unit: string;
  }> = [
    {
      key: "coneResistanceBefore",
      label: t("coneResistanceBefore"),
      unit: "MPa",
    },
    {
      key: "coneResistanceAfter",
      label: t("coneResistanceAfter"),
      unit: "MPa",
    },
    {
      key: "localFrictionBefore",
      label: t("localFrictionBefore"),
      unit: "MPa",
    },
    {
      key: "localFrictionAfter",
      label: t("localFrictionAfter"),
      unit: "MPa",
    },
    {
      key: "porePressureU1Before",
      label: t("porePressureU1Before"),
      unit: "MPa",
    },
    {
      key: "porePressureU1After",
      label: t("porePressureU1After"),
      unit: "MPa",
    },
    {
      key: "porePressureU2Before",
      label: t("porePressureU2Before"),
      unit: "MPa",
    },
    {
      key: "porePressureU2After",
      label: t("porePressureU2After"),
      unit: "MPa",
    },
    {
      key: "porePressureU3Before",
      label: t("porePressureU3Before"),
      unit: "MPa",
    },
    {
      key: "porePressureU3After",
      label: t("porePressureU3After"),
      unit: "MPa",
    },
    {
      key: "inclinationEWBefore",
      label: t("inclinationEWBefore"),
      unit: "°",
    },
    {
      key: "inclinationEWAfter",
      label: t("inclinationEWAfter"),
      unit: "°",
    },
    {
      key: "inclinationNSBefore",
      label: t("inclinationNSBefore"),
      unit: "°",
    },
    {
      key: "inclinationNSAfter",
      label: t("inclinationNSAfter"),
      unit: "°",
    },
    {
      key: "inclinationResultantBefore",
      label: t("inclinationResultantBefore"),
      unit: "°",
    },
    {
      key: "inclinationResultantAfter",
      label: t("inclinationResultantAfter"),
      unit: "°",
    },
  ];

  for (const field of zlmFields) {
    const value = zlm[field.key];
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
  const survey = data.conePenetrometerSurvey;
  const procedure = survey?.procedure;

  if (survey?.finalProcessingDate) {
    items.push({
      label: t("finalProcessingDate"),
      value: formatDate(survey.finalProcessingDate),
    });
  }
  if (procedure?.signalProcessingPerformed) {
    items.push({
      label: t("signalProcessingPerformed"),
      value: formatIndication(procedure.signalProcessingPerformed, t),
    });
  }
  if (procedure?.interruptionProcessingPerformed) {
    items.push({
      label: t("interruptionProcessingPerformed"),
      value: formatIndication(procedure.interruptionProcessingPerformed, t),
    });
  }
  if (procedure?.expertCorrectionPerformed) {
    items.push({
      label: t("expertCorrectionPerformed"),
      value: formatIndication(procedure.expertCorrectionPerformed, t),
    });
  }

  return items;
}

function getMeasurementInfo(data: CPTData, t: TFunction): Array<HeaderItem> {
  const measurements = getMeasurements(data);
  const items: Array<HeaderItem> = [{
    label: t("numberOfMeasurements"),
    value: measurements.length,
  }];

  if (measurements.length > 0) {
    const firstRow = measurements[0];
    const lastRow = measurements.at(-1);

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
