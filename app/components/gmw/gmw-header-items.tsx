import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import {
  type GMWData,
  type GMWMonitoringTube,
  getLocation,
  getSurfaceLevel,
  getVerticalDatum,
} from "../../types/bro-data";
import type { HeaderItem, HeaderSection } from "../../types/header-types";
import {
  codeItem,
  formatCode,
  formatDate,
  formatIndication,
  formatMeasure,
} from "../../util/format";
import { getLocationItems } from "../../util/location-info";
import { CardTitle } from "../card";
import {
  BroIdRow,
  CompactHeaderWrapper,
  FilenameRow,
  HeaderColumn,
  HeaderRow,
  LocationDisplay,
  QualityRegimeRow,
  SurfaceLevelRow,
} from "../compact-header-parts";
import { HeaderSections } from "../header-section";

interface CompactGmwHeaderProps {
  filename: string;
  data: GMWData;
}

export function CompactGmwHeader({ filename, data }: CompactGmwHeaderProps) {
  const { t } = useTranslation();

  return (
    <CompactHeaderWrapper testId={data.broId}>
      {/* Left column - Basic info */}
      <HeaderColumn>
        <FilenameRow filename={filename} />
        <BroIdRow broId={data.broId} />
        <QualityRegimeRow qualityRegime={data.qualityRegime} />
        <HeaderRow label={t("dataType")} value={t("groundwaterMonitoringWell")} />
        <HeaderRow label={t("wellCode")} value={data.wellCode} />
      </HeaderColumn>

      {/* Right column - Location and well info */}
      <HeaderColumn>
        <LocationDisplay location={getLocation(data)} />
        <SurfaceLevelRow
          offset={getSurfaceLevel(data)}
          datum={getVerticalDatum(data)}
        />
        <HeaderRow
          label={t("numberOfMonitoringTubes")}
          value={data.numberOfMonitoringTubes}
        />
        <HeaderRow
          label={t("wellConstructionDate")}
          value={
            data.wellHistory?.wellConstructionDate
              ? formatDate(data.wellHistory.wellConstructionDate)
              : null
          }
        />
      </HeaderColumn>
    </CompactHeaderWrapper>
  );
}

function getWellInfo(data: GMWData, t: TFunction): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.constructionStandard) {
    items.push(codeItem(t("constructionStandard"), data.constructionStandard));
  }
  if (data.initialFunction) {
    items.push(codeItem(t("initialFunction"), data.initialFunction));
  }
  if (data.wellStability) {
    items.push(codeItem(t("wellStability"), data.wellStability));
  }
  if (data.wellHeadProtector) {
    items.push(codeItem(t("wellHeadProtector"), data.wellHeadProtector));
  }
  if (data.groundLevelStable !== null) {
    items.push({
      label: t("groundLevelStable"),
      value: formatIndication(data.groundLevelStable, t),
    });
  }
  if (data.wellHistory?.wellConstructionDate) {
    items.push({
      label: t("wellConstructionDate"),
      value: formatDate(data.wellHistory.wellConstructionDate),
    });
  }
  if (data.wellHistory?.wellRemovalDate) {
    items.push({
      label: t("wellRemovalDate"),
      value: formatDate(data.wellHistory.wellRemovalDate),
    });
  }
  if (data.nitgCode) {
    items.push({ label: t("nitgCode"), value: data.nitgCode });
  }
  if (data.owner) {
    items.push({ label: t("owner"), value: data.owner });
  }
  if (data.maintenanceResponsibleParty) {
    items.push({
      label: t("maintenanceParty"),
      value: data.maintenanceResponsibleParty,
    });
  }

  return items;
}

/** One summary row per monitoring tube: screen interval, diameter and material. */
function describeTube(tube: GMWMonitoringTube, t: TFunction): HeaderItem {
  const parts: Array<string> = [];
  const screenTop = tube.screen?.screenTopPosition ?? null;
  const screenBottom = tube.screen?.screenBottomPosition ?? null;
  if (screenTop !== null && screenBottom !== null) {
    parts.push(
      `${t("screen")} ${screenTop.value.toFixed(2)} – ${formatMeasure(screenBottom, 2)} NAP`,
    );
  }
  if (tube.tubeTopDiameter !== null) {
    parts.push(`Ø ${formatMeasure(tube.tubeTopDiameter)}`);
  }
  const material = formatCode(tube.materialUsed?.tubeMaterial);
  if (material) {
    parts.push(material);
  }

  return {
    label: `${t("tube")} ${tube.tubeNumber ?? "?"}`,
    value: parts.length > 0 ? parts.join(" · ") : "—",
  };
}

function getTubeInfo(data: GMWData, t: TFunction): Array<HeaderItem> {
  return data.monitoringTube.map((tube) => describeTube(tube, t));
}

function getGmwRegistrationInfo(data: GMWData, t: TFunction): Array<HeaderItem> {
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

interface DetailedGmwHeadersProps {
  data: GMWData;
}

export function DetailedGmwHeaders({ data }: DetailedGmwHeadersProps) {
  const { t } = useTranslation();

  const sections: Array<HeaderSection> = [
    {
      id: "well",
      title: t("wellInformation"),
      items: getWellInfo(data, t),
    },
    {
      id: "location",
      title: t("locationInformation"),
      items: getLocationItems(data, t),
    },
    {
      id: "tubes",
      title: t("monitoringTubes"),
      items: getTubeInfo(data, t),
    },
    {
      id: "registration",
      title: t("registrationInformation"),
      items: getGmwRegistrationInfo(data, t),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="space-y-2">
      <CardTitle>{t("technicalDetails")}</CardTitle>
      <HeaderSections sections={sections} />
    </div>
  );
}
