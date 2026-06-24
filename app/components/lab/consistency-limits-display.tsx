import type { ConsistencyLimitsDetermination } from "@bedrock-engineer/bro-xml-parser";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TranslateFunction } from "../../util/plot-config";
import { PlotDownloadButtons } from "../plot-download-buttons";
import { PlotFigure } from "../plot-figure";
import { buildConsistencyLimitsPlot } from "./consistency-limits-plot";

export interface ConsistencyLimitsDisplayProps {
  data: ConsistencyLimitsDetermination;
  baseFilename: string;
}

export function ConsistencyLimitsDisplay({
  data,
  baseFilename,
}: ConsistencyLimitsDisplayProps) {
  const { t } = useTranslation();
  const plotRef = useRef<HTMLDivElement>(null);

  return (
    <div className="border border-gray-200 rounded p-4">
      <h4 className="font-medium mb-3">{t("atterbergLimits")}</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Values table */}
        <div>
          <table className="w-full text-sm">
            <tbody>
              {data.liquidLimit !== null && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500">
                    {t("liquidLimit")} (LL)
                  </td>
                  <td className="py-2 text-right font-mono">
                    {data.liquidLimit.toFixed(1)} %
                  </td>
                </tr>
              )}
              {data.plasticLimit !== null && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500">
                    {t("plasticLimit")} (PL)
                  </td>
                  <td className="py-2 text-right font-mono">
                    {data.plasticLimit.toFixed(1)} %
                  </td>
                </tr>
              )}
              {data.plasticityIndex !== null && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500">
                    {t("plasticityIndex")} (PI)
                  </td>
                  <td className="py-2 text-right font-mono">
                    {data.plasticityIndex.toFixed(1)} %
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Casagrande chart */}
        <PlotFigure
          containerRef={plotRef}
          render={() =>
            buildConsistencyLimitsPlot(data, t as TranslateFunction)
          }
          deps={[data, t]}
        />
      </div>

      <PlotDownloadButtons containerRef={plotRef} filename={baseFilename} />
    </div>
  );
}
