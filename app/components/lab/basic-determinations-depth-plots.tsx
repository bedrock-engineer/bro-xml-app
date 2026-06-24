import type { InvestigatedInterval } from "@bedrock-engineer/bro-xml-parser";
import { max } from "d3-array";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TranslateFunction } from "../../util/plot-config";
import { PlotFigure } from "../plot-figure";
import {
  buildDepthProfilesPlot,
  type DeterminationConfig,
} from "./basic-determinations-depth-plots-render";

interface BasicDeterminationsDepthPlotsProps {
  intervals: Array<InvestigatedInterval>;
  baseFilename: string;
}

export function BasicDeterminationsDepthPlots({
  intervals,
  baseFilename,
}: BasicDeterminationsDepthPlotsProps) {
  const { t } = useTranslation();

  const determinations: Array<DeterminationConfig> = useMemo(
    () => [
      {
        key: "waterContent",
        getValue: (d) => d.waterContentDetermination?.waterContent,
        domain: [0, 100],
        label: t("waterContent"),
        unit: "%",
        ticks: 5,
      },
      {
        key: "volumetricMassDensity",
        getValue: (d) =>
          d.volumetricMassDensityDetermination?.volumetricMassDensity,
        domain: [1, 2.5],
        label: t("bulkDensity"),
        unit: "g/cm³",
        ticks: 5,
      },
      {
        key: "organicMatterContent",
        getValue: (d) =>
          d.organicMatterContentDetermination?.organicMatterContent,
        domain: [0, 100],
        label: t("organicMatterContent"),
        unit: "%",
        ticks: 5,
      },
      {
        key: "carbonateContent",
        getValue: (d) => d.carbonateContentDetermination?.carbonateContent,
        domain: [0, 50],
        label: t("carbonateContent"),
        unit: "%",
        ticks: 5,
      },
      {
        key: "volumetricMassDensityOfSolids",
        getValue: (d) =>
          d.volumetricMassDensityOfSolidsDetermination
            ?.volumetricMassDensityOfSolids,
        domain: [2, 3],
        label: t("particleDensity"),
        unit: "g/cm³",
        ticks: 5,
      },
      {
        key: "maximumUndrainedShearStrength",
        getValue: (d) =>
          d.maximumUndrainedShearStrengthDetermination
            ?.maximumUndrainedShearStrength,
        domain: [0, 200],
        label: t("undrainedShearStrength"),
        unit: "kPa",
        ticks: 5,
      },
    ],
    [t],
  );

  // Filter to only include determinations that have data
  const availableDeterminations = useMemo(
    () =>
      determinations.filter((det) =>
        intervals.some((interval) => det.getValue(interval) != null),
      ),
    [determinations, intervals],
  );

  // Calculate max depth for y-axis
  const maxDepth = max(intervals, (d) => d.endDepth) ?? 10;

  if (availableDeterminations.length === 0) {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded p-4">
      <h4 className="font-medium mb-3">{t("depthProfiles")}</h4>

      <SummaryTable
        intervals={intervals}
        determinations={availableDeterminations}
      />

      <div className="mt-4 overflow-x-auto">
        <PlotFigure
          render={() =>
            buildDepthProfilesPlot({
              intervals,
              determinations: availableDeterminations,
              maxDepth,
              t: t as TranslateFunction,
            })
          }
          deps={[intervals, availableDeterminations, maxDepth, t]}
          filename={`${baseFilename}-depth-profiles`}
        />
      </div>
    </div>
  );
}

interface SummaryTableProps {
  intervals: Array<InvestigatedInterval>;
  determinations: Array<DeterminationConfig>;
}

function SummaryTable({ intervals, determinations }: SummaryTableProps) {
  const { t } = useTranslation();

  // Get intervals that have at least one basic determination
  const intervalsWithData = intervals.filter((interval) =>
    determinations.some((det) => det.getValue(interval) != null),
  );

  if (intervalsWithData.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="py-2 px-2 text-left text-gray-500 font-medium">
              {t("depth")} (m)
            </th>
            {determinations.map((det) => (
              <th
                key={det.key}
                className="py-2 px-2 text-right text-gray-500 font-medium"
              >
                {det.label}
                <br />
                <span className="font-normal text-xs">({det.unit})</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {intervalsWithData.map((interval, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-2 px-2 font-mono text-gray-700">
                {interval.beginDepth.toFixed(2)} –{" "}
                {interval.endDepth.toFixed(2)}
              </td>
              {determinations.map((det) => {
                const value = det.getValue(interval);
                return (
                  <td key={det.key} className="py-2 px-2 text-right font-mono">
                    {value == null ? "–" : value.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
