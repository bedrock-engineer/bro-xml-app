import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { CPTData } from "@bedrock-engineer/bro-xml";
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

interface CompactCptHeaderProps {
  filename: string;
  data: CPTData;
}

export function CompactCptHeader({ filename, data }: CompactCptHeaderProps) {
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

      {/* Right column - Location and test info */}
      <HeaderColumn>
        <LocationDisplay location={location} />
        <SurfaceLevelRow
          offset={data.delivered_vertical_position_offset}
          datum={data.delivered_vertical_position_datum}
        />
        <DepthRow label={t("finalDepth")} depth={data.final_depth} />
        <WaterLevelRow level={data.groundwater_level} />
        <HeaderRow label={t("qualityClass")} value={data.quality_class} />
      </HeaderColumn>
    </CompactHeaderWrapper>
  );
}

function getCptSurveyInfo(data: CPTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.cpt_standard) {
    items.push({ label: t("cptStandard"), value: data.cpt_standard });
  }
  if (data.cpt_method) {
    items.push({ label: t("cptMethod"), value: data.cpt_method });
  }
  if (data.quality_class !== null) {
    items.push({ label: t("qualityClass"), value: data.quality_class });
  }
  if (data.predrilled_depth !== null) {
    items.push({
      label: t("predrilledDepth"),
      value: `${data.predrilled_depth.toFixed(2)} m`,
    });
  }
  if (data.final_depth !== null) {
    items.push({
      label: t("finalDepth"),
      value: `${data.final_depth.toFixed(2)} m`,
    });
  }
  if (data.groundwater_level !== null) {
    items.push({
      label: t("waterLevel"),
      value: `${data.groundwater_level.toFixed(2)} m`,
    });
  }
  if (data.stop_criterion) {
    items.push({ label: t("stopCriterion"), value: data.stop_criterion });
  }
  if (data.dissipationtest_performed !== null) {
    items.push({
      label: t("dissipationTest"),
      value: data.dissipationtest_performed ? t("yes") : t("no"),
    });
  }

  return items;
}

function getCptLocationInfo(data: CPTData, t: TFunction): Array<HeaderItem> {
  return getLocationItems(data, t);
}

function getCptEquipmentInfo(data: CPTData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.cpt_description) {
    items.push({ label: t("description"), value: data.cpt_description });
  }
  if (data.cpt_type) {
    items.push({ label: t("cptType"), value: data.cpt_type });
  }
  if (data.cone_surface_area !== null) {
    items.push({
      label: t("coneSurfaceArea"),
      value: `${data.cone_surface_area} mm²`,
    });
  }
  if (data.cone_diameter !== null) {
    items.push({
      label: t("coneDiameter"),
      value: `${data.cone_diameter} mm`,
    });
  }
  if (data.cone_surface_quotient !== null) {
    items.push({
      label: t("coneSurfaceQuotient"),
      value: data.cone_surface_quotient.toFixed(3),
    });
  }
  if (data.cone_to_friction_sleeve_distance !== null) {
    items.push({
      label: t("coneToFrictionSleeveDistance"),
      value: `${data.cone_to_friction_sleeve_distance} mm`,
    });
  }
  if (data.cone_to_friction_sleeve_surface_area !== null) {
    items.push({
      label: t("frictionSleeveSurfaceArea"),
      value: `${data.cone_to_friction_sleeve_surface_area} mm²`,
    });
  }
  if (data.cone_to_friction_sleeve_surface_quotient !== null) {
    items.push({
      label: t("frictionSleeveSurfaceQuotient"),
      value: data.cone_to_friction_sleeve_surface_quotient.toFixed(3),
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
      key: "zlm_cone_resistance_before",
      label: t("coneResistanceBefore"),
      unit: "MPa",
    },
    {
      key: "zlm_cone_resistance_after",
      label: t("coneResistanceAfter"),
      unit: "MPa",
    },
    {
      key: "zlm_local_friction_before",
      label: t("localFrictionBefore"),
      unit: "MPa",
    },
    {
      key: "zlm_local_friction_after",
      label: t("localFrictionAfter"),
      unit: "MPa",
    },
    {
      key: "zlm_pore_pressure_u1_before",
      label: t("porePressureU1Before"),
      unit: "MPa",
    },
    {
      key: "zlm_pore_pressure_u1_after",
      label: t("porePressureU1After"),
      unit: "MPa",
    },
    {
      key: "zlm_pore_pressure_u2_before",
      label: t("porePressureU2Before"),
      unit: "MPa",
    },
    {
      key: "zlm_pore_pressure_u2_after",
      label: t("porePressureU2After"),
      unit: "MPa",
    },
    {
      key: "zlm_pore_pressure_u3_before",
      label: t("porePressureU3Before"),
      unit: "MPa",
    },
    {
      key: "zlm_pore_pressure_u3_after",
      label: t("porePressureU3After"),
      unit: "MPa",
    },
    {
      key: "zlm_inclination_ew_before",
      label: t("inclinationEWBefore"),
      unit: "°",
    },
    {
      key: "zlm_inclination_ew_after",
      label: t("inclinationEWAfter"),
      unit: "°",
    },
    {
      key: "zlm_inclination_ns_before",
      label: t("inclinationNSBefore"),
      unit: "°",
    },
    {
      key: "zlm_inclination_ns_after",
      label: t("inclinationNSAfter"),
      unit: "°",
    },
    {
      key: "zlm_inclination_resultant_before",
      label: t("inclinationResultantBefore"),
      unit: "°",
    },
    {
      key: "zlm_inclination_resultant_after",
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

  if (data.final_processing_date) {
    items.push({
      label: t("finalProcessingDate"),
      value: formatDate(data.final_processing_date),
    });
  }
  if (data.signal_processing_performed !== null) {
    items.push({
      label: t("signalProcessingPerformed"),
      value: data.signal_processing_performed ? t("yes") : t("no"),
    });
  }
  if (data.interruption_processing_performed !== null) {
    items.push({
      label: t("interruptionProcessingPerformed"),
      value: data.interruption_processing_performed ? t("yes") : t("no"),
    });
  }
  if (data.expert_correction_performed !== null) {
    items.push({
      label: t("expertCorrectionPerformed"),
      value: data.expert_correction_performed ? t("yes") : t("no"),
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
