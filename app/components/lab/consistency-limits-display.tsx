import type { ConsistencyLimitsDetermination } from "@bedrock-engineer/bro-xml-parser";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatMeasure } from "../../util/format";
import type { TranslateFunction } from "../../util/plot-config";
import {
  codedListRow,
  codedRow,
  measureRow,
  TestConditions,
} from "./test-conditions";
import { PlotDownloadButtons } from "../plot-download-buttons";
import { PlotFigure } from "../plot-figure";
import { buildConsistencyLimitsPlot } from "./consistency-limits-plot";

interface ConsistencyLimitsDisplayProps {
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
                  <th
                    scope="row"
                    className="py-2 text-left font-normal text-gray-500"
                  >
                    {t("liquidLimit")} (LL)
                  </th>
                  <td className="py-2 text-right font-mono">
                    {formatMeasure(data.liquidLimit, 1)}
                  </td>
                </tr>
              )}
              {data.plasticLimit !== null && (
                <tr className="border-b border-gray-100">
                  <th
                    scope="row"
                    className="py-2 text-left font-normal text-gray-500"
                  >
                    {t("plasticLimit")} (PL)
                  </th>
                  <td className="py-2 text-right font-mono">
                    {formatMeasure(data.plasticLimit, 1)}
                  </td>
                </tr>
              )}
              {data.plasticityIndex !== null && (
                <tr className="border-b border-gray-100">
                  <th
                    scope="row"
                    className="py-2 text-left font-normal text-gray-500"
                  >
                    {t("plasticityIndex")} (PI)
                  </th>
                  <td className="py-2 text-right font-mono">
                    {formatMeasure(data.plasticityIndex, 1)}
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

      <TestConditions
        rows={[
          codedRow(
            t("method"),
            data.determinationMethod ?? data.determinationProcedure,
          ),
          codedRow(t("conusType"), data.conusType),
          codedRow(t("usedMedium"), data.usedMedium),
          measureRow(t("fractionLarger500um"), data.fractionLarger500um, 1),
          codedListRow(
            t("performanceIrregularity"),
            data.performanceIrregularity,
          ),
          ...data.plasticityAtSpecificWaterContent.map((point, index) => {
            const waterContent = formatMeasure(point.waterContent, 1);
            const penetration = formatMeasure(point.penetrationDepth, 1);
            const parts = [
              waterContent === null ? null : `w = ${waterContent}`,
              point.numberOfFalls == null
                ? null
                : `${point.numberOfFalls} ${t("falls")}`,
              penetration === null
                ? null
                : `${t("penetration")} ${penetration}`,
            ].filter((part) => part !== null);
            return parts.length > 0
              ? {
                  label: `${t("fallConePoint")} ${index + 1}`,
                  value: parts.join(", "),
                }
              : null;
          }),
        ]}
      />

      <PlotDownloadButtons containerRef={plotRef} filename={baseFilename} />
    </div>
  );
}
