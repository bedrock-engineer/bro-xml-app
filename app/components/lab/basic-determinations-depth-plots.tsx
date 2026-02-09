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

const FIRST_COL_WIDTH = 200;
const OTHER_COL_WIDTH = 160;
const FIRST_MARGIN_LEFT = 50;
const OTHER_MARGIN_LEFT = 10;
const MARGIN_RIGHT = 5;
const PLOT_HEIGHT = 400;

export function BasicDeterminationsDepthPlots({
  intervals,
  baseFilename,
}: BasicDeterminationsDepthPlotsProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const plotId = "depth-profiles-combined";

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

  // Calculate max depth for y-axis
  const maxDepth = max(intervals, (d) => d.endDepth) ?? 10;

  useEffect(() => {
    if (!containerRef.current || availableDeterminations.length === 0) {
      return;
    }

    const count = availableDeterminations.length;
    const totalWidth =
      FIRST_COL_WIDTH + (count - 1) * OTHER_COL_WIDTH;

    // Create parent SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(totalWidth));
    svg.setAttribute("height", String(PLOT_HEIGHT));
    svg.setAttribute("viewBox", `0 0 ${totalWidth} ${PLOT_HEIGHT}`);
    svg.style.backgroundColor = "white";

    let xOffset = 0;

    for (const [index, det] of availableDeterminations.entries()) {
      const isFirst = index === 0;
      const colWidth = isFirst ? FIRST_COL_WIDTH : OTHER_COL_WIDTH;

      const dataPoints = intervals.filter(
        (interval) => det.getValue(interval) != null,
      );

      if (dataPoints.length === 0) {
        xOffset += colWidth;
        continue;
      }

      // Auto-extend domain if any data exceeds configured max
      const maxValue = Math.max(
        ...dataPoints.map((d) => det.getValue(d) ?? 0),
      );
      const xDomain: [number, number] =
        maxValue > det.domain[1]
          ? [det.domain[0], maxValue * 1.1]
          : det.domain;

      const childPlot = Plot.plot({
        width: colWidth,
        height: PLOT_HEIGHT,
        style: { backgroundColor: "transparent" },
        marginLeft: isFirst ? FIRST_MARGIN_LEFT : OTHER_MARGIN_LEFT,
        marginRight: MARGIN_RIGHT,
        marginTop: 30,
        marginBottom: 40,
        x: {
          domain: xDomain,
          label: `${det.label} (${det.unit})`,
          grid: true,
          ticks: det.ticks,
        },
        y: {
          ...depthYAxisConfig,
          domain: [0, maxDepth],
          ...(isFirst ? {} : { axis: null }),
        },
        marks: [
          Plot.frame(),
          Plot.dot(dataPoints, {
            x: det.getValue,
            y: (d: InvestigatedInterval) => (d.endDepth + d.beginDepth) / 2,
            symbol: "times",
            stroke: "#2563eb",
            strokeWidth: 2,
            title: (d: InvestigatedInterval) => {
              const value = det.getValue(d);
              return `${d.beginDepth.toFixed(2)} – ${d.endDepth.toFixed(2)} m\n${det.label}: ${value?.toFixed(2)} ${det.unit}`;
            },
            tip: true,
          }),
        ],
      });

      // Get the inner SVG generated by Plot and nest it
      const childSvg = childPlot as SVGSVGElement;
      childSvg.setAttribute("x", String(xOffset));
      childSvg.setAttribute("y", "0");
      childSvg.removeAttribute("viewBox");
      svg.appendChild(childSvg);

      xOffset += colWidth;
    }

    containerRef.current.append(svg);

    return () => {
      svg.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervals, maxDepth, availableDeterminations.length, t]);

  if (availableDeterminations.length === 0) {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded p-4">
      <h4 className="font-medium mb-3">{t("depthProfiles")}</h4>

      {/* Summary table */}
      <SummaryTable
        intervals={intervals}
        determinations={availableDeterminations}
      />

      {/* Depth plots — nested SVGs for single-image export */}
      <div className="mt-4 overflow-x-auto">
        <div id={plotId} className="flex justify-center" ref={containerRef} />
        <PlotDownloadButtons
          plotId={plotId}
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
