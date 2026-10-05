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
  formatMeasure,
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
      value: formatMeasure(predrilledDepth, 2),
    });
  }
  if (finalDepth !== null) {
    items.push({
      label: t("finalDepth"),
      value: formatMeasure(finalDepth, 2),
    });
  }
  if (groundwaterLevel != null) {
    items.push({
      label: t("waterLevel"),
      value: formatMeasure(groundwaterLevel, 2),
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
      value: formatMeasure(cone.coneSurfaceArea),
    });
  }
  if (cone.coneDiameter !== null) {
    items.push({
      label: t("coneDiameter"),
      value: formatMeasure(cone.coneDiameter),
    });
  }
  if (cone.coneSurfaceQuotient !== null) {
    items.push({
      label: t("coneSurfaceQuotient"),
      value: formatMeasure(cone.coneSurfaceQuotient, 3),
    });
  }
  if (cone.coneToFrictionSleeveDistance !== null) {
    items.push({
      label: t("coneToFrictionSleeveDistance"),
      value: formatMeasure(cone.coneToFrictionSleeveDistance),
    });
  }
  if (cone.frictionSleeveSurfaceArea !== null) {
    items.push({
      label: t("frictionSleeveSurfaceArea"),
      value: formatMeasure(cone.frictionSleeveSurfaceArea),
    });
  }
  if (cone.frictionSleeveSurfaceQuotient !== null) {
    items.push({
      label: t("frictionSleeveSurfaceQuotient"),
      value: formatMeasure(cone.frictionSleeveSurfaceQuotient, 3),
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

  const zlmKeys = [
    "coneResistanceBefore",
    "coneResistanceAfter",
    "localFrictionBefore",
    "localFrictionAfter",
    "porePressureU1Before",
    "porePressureU1After",
    "porePressureU2Before",
    "porePressureU2After",
    "porePressureU3Before",
    "porePressureU3After",
    "inclinationEWBefore",
    "inclinationEWAfter",
    "inclinationNSBefore",
    "inclinationNSAfter",
    "inclinationResultantBefore",
    "inclinationResultantAfter",
  ] as const;

  for (const key of zlmKeys) {
    const value = zlm[key];
    if (value !== null) {
      items.push({
        label: t(key),
        value: formatMeasure(value, 4),
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
