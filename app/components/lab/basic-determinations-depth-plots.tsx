import type { InvestigatedInterval } from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import { max } from "d3-array";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { createWatermarkMark, depthYAxisConfig } from "../../util/plot-config";
import { PlotDownloadButtons } from "../plot-download-buttons";

interface BasicDeterminationsDepthPlotsProps {
  intervals: Array<InvestigatedInterval>;
  baseFilename: string;
}

interface DeterminationConfig {
  key: string;
  getValue: (d: InvestigatedInterval) => number | null | undefined;
  domain: [number, number];
  label: string;
  unit: string;
  ticks: number;
}

export function BasicDeterminationsDepthPlots({
  intervals,
  baseFilename,
}: BasicDeterminationsDepthPlotsProps) {
  const { t } = useTranslation();

  const determinations: Array<DeterminationConfig> = [
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
  ];

  // Filter to only include determinations that have data
  const availableDeterminations = determinations.filter((det) =>
    intervals.some((interval) => det.getValue(interval) != null),
  );

  if (availableDeterminations.length === 0) {
    return null;
  }

  // Calculate max depth for y-axis
  const maxDepth = max(intervals, (d) => d.endDepth) ?? 10;

  return (
    <div className="border border-gray-200 rounded p-4">
      <h4 className="font-medium mb-3">{t("depthProfiles")}</h4>

      {/* Summary table */}
      <SummaryTable
        intervals={intervals}
        determinations={availableDeterminations}
      />

      {/* Depth plots */}
      <div className="flex flex-wrap gap-4 mt-4 justify-center">
        {availableDeterminations.map((det) => (
          <DepthPlot
            key={det.key}
            intervals={intervals}
            determination={det}
            maxDepth={maxDepth}
            baseFilename={`${baseFilename}-${det.key}`}
          />
        ))}
      </div>
    </div>
  );
}

interface DepthPlotProps {
  intervals: Array<InvestigatedInterval>;
  determination: DeterminationConfig;
  maxDepth: number;
  baseFilename: string;
}

function DepthPlot({
  intervals,
  determination,
  maxDepth,
  baseFilename,
}: DepthPlotProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const plotId = `depth-plot-${determination.key}`;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // Filter intervals that have this determination
    const dataPoints = intervals.filter(
      (interval) => determination.getValue(interval) != null,
    );

    if (dataPoints.length === 0) {
      return;
    }

    const plot = Plot.plot({
      width: 200,
      height: 400,
      style: { backgroundColor: "white" },
      marginLeft: 50,
      marginRight: 20,
      marginTop: 30,
      marginBottom: 40,
      x: {
        domain: determination.domain,
        label: `${determination.label} (${determination.unit})`,
        grid: true,
        ticks: determination.ticks,
      },
      y: {
        ...depthYAxisConfig,
        domain: [0, maxDepth],
      },
      marks: [
        Plot.frame(),
        Plot.dot(dataPoints, {
          x: determination.getValue,
          y: (d: InvestigatedInterval) => (d.endDepth + d.beginDepth) / 2,
          symbol: "times",
          stroke: "#2563eb",
          strokeWidth: 2,
          title: (d: InvestigatedInterval) => {
            const value = determination.getValue(d);
            return `${d.beginDepth.toFixed(2)} – ${d.endDepth.toFixed(2)} m\n${determination.label}: ${value?.toFixed(2)} ${determination.unit}`;
          },
          tip: true,
        }),
        createWatermarkMark(t("madeWithBedrockBroViewer"), {
          frameAnchor: "top-right",
          dy: -15,
        }),
      ],
    });

    containerRef.current.append(plot);

    return () => {
      plot.remove();
    };
  }, [intervals, determination, maxDepth, t]);

  return (
    <div>
      <div id={plotId} ref={containerRef}></div>
      <PlotDownloadButtons plotId={plotId} filename={baseFilename} />
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
                {interval.beginDepth.toFixed(2)} – {interval.endDepth.toFixed(2)}
              </td>
              {determinations.map((det) => {
                const value = det.getValue(interval);
                return (
                  <td
                    key={det.key}
                    className="py-2 px-2 text-right font-mono"
                  >
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
