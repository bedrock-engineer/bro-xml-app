import type { Location } from "@bedrock-engineer/bro-xml-parser";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { getCoordSystemName, normalizeEpsg, toWgs84 } from "../util/coordinates";
import { formatDate } from "../util/format";
import { CopyButton } from "./copy-button";

interface CompactHeaderWrapperProps {
  testId: string | null;
  children: ReactNode;
}

export function CompactHeaderWrapper({
  testId,
  children,
}: CompactHeaderWrapperProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white border border-gray-300 rounded-sm p-4 mb-6">
      <div className="font-bold text-lg text-gray-900 flex items-center gap-1 mb-3">
        {testId ?? t("unknownTest")}
        {testId && <CopyButton value={testId} label={t("copyTestId")} />}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
        {children}
      </div>
    </div>
  );
}

interface HeaderColumnProps {
  children: ReactNode;
}

export function HeaderColumn({ children }: HeaderColumnProps) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-baseline">
      {children}
    </dl>
  );
}

interface HeaderRowProps {
  label: string;
  value: string | number | null | undefined;
  copyable?: boolean;
  copyLabel?: string;
}

export function HeaderRow({
  label,
  value,
  copyable,
  copyLabel,
}: HeaderRowProps) {
  if (value === null || value === undefined) {
    return null;
  }

  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className={copyable ? "flex items-center gap-1" : undefined}>
        {value}
        {copyable && <CopyButton value={value} label={copyLabel ?? label} />}
      </dd>
    </>
  );
}

/**
 * Filename row
 */
interface FilenameRowProps {
  filename: string;
}

export function FilenameRow({ filename }: FilenameRowProps) {
  const { t } = useTranslation();
  return (
    <>
      <dt className="text-gray-500">{t("filename")}</dt>
      <dd className="font-medium break-all">{filename}</dd>
    </>
  );
}

/**
 * BRO ID row with copy button
 */
interface BroIdRowProps {
  broId: string | null | undefined;
}

export function BroIdRow({ broId }: BroIdRowProps) {
  const { t } = useTranslation();

  if (!broId) {
    return null;
  }

  return (
    <>
      <dt className="text-gray-500">BRO ID</dt>
      <dd className="flex items-center gap-1">
        {broId}
        <CopyButton value={broId} label={t("copyBroId")} />
      </dd>
    </>
  );
}

interface QualityRegimeRowProps {
  qualityRegime: string | null | undefined;
}

export function QualityRegimeRow({ qualityRegime }: QualityRegimeRowProps) {
  const { t } = useTranslation();

  if (!qualityRegime) {
    return null;
  }

  return (
    <>
      <dt className="text-gray-500">{t("qualityRegime")}</dt>
      <dd>{qualityRegime}</dd>
    </>
  );
}

interface ReportDateRowProps {
  date: Date | null | undefined;
}

export function ReportDateRow({ date }: ReportDateRowProps) {
  const { t } = useTranslation();

  if (!date) {
    return null;
  }

  return (
    <>
      <dt className="text-gray-500">{t("reportDate")}</dt>
      <dd>{formatDate(date)}</dd>
    </>
  );
}

interface LocationDisplayProps {
  location: Location | null | undefined;
}

export function LocationDisplay({ location }: LocationDisplayProps) {
  const { t } = useTranslation();

  if (!location) {
    return null;
  }

  const coordSystem = getCoordSystemName(location.epsg);
  const epsgCode = normalizeEpsg(location.epsg);
  const wgs84 = toWgs84(location);
  const originalCoords = `${location.x.toFixed(2)}, ${location.y.toFixed(2)}`;

  return (
    <>
      <dt className="text-gray-500">{t("locationLabel")}</dt>
      <dd>
        <div>
          <span className="font-semibold">{coordSystem}</span>
          <span className="text-gray-400 text-sm"> (EPSG:{epsgCode})</span>
        </div>
        <div className="flex items-center gap-1">
          {originalCoords}
          <CopyButton value={originalCoords} label={t("copyCoordinates")} />
        </div>

        {wgs84 && (
          <>
            <div className="mt-2">
              <span className="font-semibold">WGS84</span>
              <span className="text-gray-400 text-sm"> (EPSG:4326)</span>
            </div>
            <div className="flex items-center gap-1">
              {wgs84.lat.toFixed(6)}, {wgs84.lon.toFixed(6)}
              <CopyButton
                value={`${wgs84.lat.toFixed(6)}, ${wgs84.lon.toFixed(6)}`}
                label={t("copyWgs84")}
              />
            </div>
          </>
        )}
      </dd>
    </>
  );
}

interface SurfaceLevelRowProps {
  offset: number | null;
  datum: string | null | undefined;
}

export function SurfaceLevelRow({ offset, datum }: SurfaceLevelRowProps) {
  const { t } = useTranslation();

  if (offset === null) {
    return null;
  }

  return (
    <>
      <dt className="text-gray-500">{t("surfaceLevel")}</dt>
      <dd>
        {offset.toFixed(2)} m {datum?.toLocaleUpperCase() ?? ""}
      </dd>
    </>
  );
}

interface WaterLevelRowProps {
  level: number | null;
}

export function WaterLevelRow({ level }: WaterLevelRowProps) {
  const { t } = useTranslation();

  if (level === null) {
    return null;
  }

  return (
    <>
      <dt className="text-gray-500">{t("waterLevel")}</dt>
      <dd className="flex items-center gap-1">
        {level.toFixed(2)} m
        <CopyButton value={level.toFixed(2)} label={t("copyWaterLevel")} />
      </dd>
    </>
  );
}

interface DepthRowProps {
  label: string;
  depth: number | null;
}

export function DepthRow({ label, depth }: DepthRowProps) {
  if (depth === null) {
    return null;
  }

  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd>{depth.toFixed(2)} m</dd>
    </>
  );
}
