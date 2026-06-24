import type { SettlementCharacteristicsDetermination } from "@bedrock-engineer/bro-xml-parser";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TranslateFunction } from "../../util/plot-config";
import { PlotDownloadButtons } from "../plot-download-buttons";
import { PlotFigure } from "../plot-figure";
import { buildSettlementCharacteristicsPlot } from "./settlement-characteristics-plot";

interface SettlementCharacteristicsDisplayProps {
  data: SettlementCharacteristicsDetermination;
  baseFilename: string;
}
export function SettlementCharacteristicsDisplay({
  data,
  baseFilename,
}: SettlementCharacteristicsDisplayProps) {
  const { t } = useTranslation();
  const plotRef = useRef<HTMLDivElement>(null);

  return (
    <div className="border border-gray-200 rounded p-4">
      <h4 className="font-medium mb-3">{t("settlementCharacteristics")}</h4>

      <div className="mb-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {data.determinationMethod && (
            <>
              <dt className="text-gray-500">{t("method")}</dt>
              <dd>{data.determinationMethod}</dd>
            </>
          )}
          {data.ringDiameter !== null && (
            <>
              <dt className="text-gray-500">{t("ringDiameter")}</dt>
              <dd>{data.ringDiameter} mm</dd>
            </>
          )}
          {data.temperature !== null && (
            <>
              <dt className="text-gray-500">{t("temperature")}</dt>
              <dd>{data.temperature} °C</dd>
            </>
          )}
        </dl>
      </div>

      <PlotFigure
        containerRef={plotRef}
        render={() =>
          buildSettlementCharacteristicsPlot(data, t as TranslateFunction)
        }
        deps={[data, t]}
      />

      {/* Legend */}
      <div className="mt-3 flex gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-600"></div>
          <span>{t("loading")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-0.5 bg-red-600"
            style={{ borderTop: "2px dashed #dc2626" }}
          ></div>
          <span>{t("unloading")}</span>
        </div>
      </div>

      <PlotDownloadButtons containerRef={plotRef} filename={baseFilename} />
    </div>
  );
}
