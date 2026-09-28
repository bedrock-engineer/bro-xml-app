import { prettifyBroCode } from "@bedrock-engineer/bro-xml-parser/reference-codes";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { GLDData } from "../../types/bro-data";
import type { HeaderItem, HeaderSection } from "../../types/header-types";
import { codeItem, formatDate, formatIndication } from "../../util/format";
import { CardTitle } from "../card";
import {
  BroIdRow,
  CompactHeaderWrapper,
  FilenameRow,
  HeaderColumn,
  HeaderRow,
  QualityRegimeRow,
} from "../compact-header-parts";
import { HeaderSections } from "../header-section";

/** Total number of measurement points across every observation series. */
function countPoints(data: GLDData): number {
  return data.observation.reduce(
    (total, observation) => total + observation.points.length,
    0,
  );
}

interface CompactGldHeaderProps {
  filename: string;
  data: GLDData;
}

export function CompactGldHeader({ filename, data }: CompactGldHeaderProps) {
  const { t } = useTranslation();

  return (
    <CompactHeaderWrapper testId={data.broId}>
      {/* Left column - Basic info */}
      <HeaderColumn>
        <FilenameRow filename={filename} />
        <BroIdRow broId={data.broId} />
        <QualityRegimeRow qualityRegime={data.qualityRegime} />
        <HeaderRow label={t("dataType")} value={t("groundwaterLevelData")} />
      </HeaderColumn>

      {/* Right column - Referenced well and measurement span */}
      <HeaderColumn>
        <HeaderRow
          label={t("referencedWell")}
          value={data.monitoringPoint?.broId}
          copyable={data.monitoringPoint?.broId != null}
          copyLabel={t("copyBroId")}
        />
        <HeaderRow
          label={t("monitoringTube")}
          value={data.monitoringPoint?.tubeNumber}
        />
        <HeaderRow
          label={t("firstMeasurement")}
          value={data.researchFirstDate ? formatDate(data.researchFirstDate) : null}
        />
        <HeaderRow
          label={t("lastMeasurement")}
          value={data.researchLastDate ? formatDate(data.researchLastDate) : null}
        />
        <HeaderRow label={t("measurementPoints")} value={countPoints(data)} />
      </HeaderColumn>
    </CompactHeaderWrapper>
  );
}

function getObservationInfo(data: GLDData, t: TFunction): Array<HeaderItem> {
  const observations = data.observation;
  const items: Array<HeaderItem> = [
    { label: t("numberOfObservations"), value: observations.length },
    { label: t("measurementPoints"), value: countPoints(data) },
  ];

  if (data.researchFirstDate) {
    items.push({
      label: t("firstMeasurement"),
      value: formatDate(data.researchFirstDate),
    });
  }
  if (data.researchLastDate) {
    items.push({
      label: t("lastMeasurement"),
      value: formatDate(data.researchLastDate),
    });
  }

  // Distinct observation types present (e.g. "Reguliere meting", "Controlemeting")
  const types = [
    ...new Set(
      observations
        .map((observation) => observation.observationType)
        .filter((type): type is string => type !== null)
        .map((type) => prettifyBroCode(type)),
    ),
  ];
  if (types.length > 0) {
    items.push({ label: t("observationType"), value: types.join(", ") });
  }

  const procedures = [
    ...new Set(
      observations
        .map((observation) => observation.evaluationProcedure)
        .filter((procedure): procedure is string => procedure !== null)
        .map((procedure) => prettifyBroCode(procedure)),
    ),
  ];
  if (procedures.length > 0) {
    items.push({ label: t("evaluationProcedure"), value: procedures.join(", ") });
  }

  return items;
}

function getGldRegistrationInfo(data: GLDData, t: TFunction): Array<HeaderItem> {
  const history = data.registrationHistory;
  if (!history) {
    return [];
  }

  const items: Array<HeaderItem> = [];
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
  return items;
}

function getMonitoringNetworkInfo(
  data: GLDData,
  t: TFunction,
): Array<HeaderItem> {
  const networks = data.groundwaterMonitoringNet
    .map((net) => net.broId)
    .filter((broId): broId is string => broId !== null);
  if (networks.length === 0) {
    return [];
  }
  return [{ label: t("monitoringNetworks"), value: networks.join(", ") }];
}

interface DetailedGldHeadersProps {
  data: GLDData;
}

export function DetailedGldHeaders({ data }: DetailedGldHeadersProps) {
  const { t } = useTranslation();

  const sections: Array<HeaderSection> = [
    {
      id: "observations",
      title: t("observationInformation"),
      items: getObservationInfo(data, t),
    },
    {
      id: "networks",
      title: t("monitoringNetworks"),
      items: getMonitoringNetworkInfo(data, t),
    },
    {
      id: "registration",
      title: t("registrationInformation"),
      items: getGldRegistrationInfo(data, t),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="space-y-2">
      <CardTitle>{t("technicalDetails")}</CardTitle>
      <HeaderSections sections={sections} />
    </div>
  );
}
