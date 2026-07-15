import { max as d3Max, extent as d3Extent } from "d3-array";
import { scaleLinear, type ScaleLinear } from "d3-scale";
import { line as d3Line } from "d3-shape";
import { useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { CPTMeasurement } from "@bedrock-engineer/bro-xml-parser";
import type { ChartColumn, CPTChartRow } from "~/util/chart-axes";
import { PlotDownloadButtons } from "../plot-download-buttons";

/**
 * Classic all-in-one CPT sounding chart, à la the geotechnical convention used
 * by libraries such as `brodata` (matplotlib `twiny`): several measured
 * parameters share a single inverted depth axis, each with its own colour and
 * its own x-scale. Cone resistance & sleeve friction read left-to-right along
 * the bottom; friction ratio & inclination are mirrored (right-to-left) along
 * the top, so the two dominant curves sit back-to-back.
 *
 * Observable Plot deliberately omits secondary x-axes, so this view drops down
 * to d3 for the maths (scales, line-path generation) while React renders every
 * axis, tick and path as JSX — no d3-selection, no imperative DOM.
 */

interface ClassicParameterStyle {
  color: string;
  /** SVG `stroke-dasharray`; undefined = solid line. */
  dash?: string;
  /** Mirrored (reversed) x-scale, drawn along the top. */
  mirror: boolean;
}

/** Parameters drawn, in stacking order, with their conventional styling. */
const CLASSIC_PARAMS: Array<{ key: keyof CPTMeasurement } & ClassicParameterStyle> =
  [
    { key: "coneResistance", color: "#2563eb", mirror: false },
    { key: "frictionRatio", color: "#16a34a", mirror: true },
    { key: "localFriction", color: "#dc2626", dash: "5 3", mirror: false },
    {
      key: "inclinationResultant",
      color: "#9333ea",
      dash: "5 3",
      mirror: true,
    },
  ];

const MARGIN_LEFT = 56;
const MARGIN_RIGHT = 20;
/** Vertical space reserved for each stacked x-axis (line + ticks + title). */
const AXIS_ROW_H = 38;
const AXIS_PAD = 16;

interface ResolvedParameter {
  column: ChartColumn;
  style: ClassicParameterStyle;
  scale: ScaleLinear<number, number>;
  /** Row index within its side (0 = closest to the plot frame). */
  row: number;
}

interface ClassicCptPlotProps {
  data: Array<CPTChartRow>;
  yAxis: ChartColumn;
  availableChartColumns: Array<ChartColumn>;
  width?: number;
  height?: number;
  baseFilename: string;
  /** Use each column's conventional fixed range instead of the data extent,
   *  so charts of different soundings share the same x-scales. */
  fixedDomains?: boolean;
}

export function ClassicCptPlot({
  data,
  yAxis,
  availableChartColumns,
  width = 460,
  height = 800,
  baseFilename,
  fixedDomains = false,
}: ClassicCptPlotProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const clipId = useId();

  const yKey = yAxis.key;

  // Depth domain from the data; the shallow end maps to the top of the frame:
  // the minimum for depth-like columns, the maximum for NAP elevation.
  const yDomain = d3Extent(data, (d) => d[yKey]);

  if (data.length === 0 || yDomain[0] === undefined) {
    return null;
  }

  // Resolve which classic parameters are actually present and non-empty,
  // assigning each a row within its side (top = mirrored, bottom = normal).
  const bottom: Array<ResolvedParameter> = [];
  const top: Array<ResolvedParameter> = [];

  for (const parameter of CLASSIC_PARAMS) {
    const column = availableChartColumns.find((c) => c.key === parameter.key);
    if (!column) {
      continue;
    }

    const maxValue = d3Max(data, (d) => d[parameter.key] as number | null);
    if (maxValue == null || maxValue <= 0) {
      continue;
    }

    const side = parameter.mirror ? top : bottom;
    // Domain [0, 2·max] keeps each curve in roughly one half of the frame;
    // with fixed domains the column's conventional max replaces the data max.
    const domainMax =
      fixedDomains && column.fixedDomain ? column.fixedDomain[1] : maxValue;
    side.push({
      column,
      style: parameter,
      scale: scaleLinear().domain([0, domainMax * 2]),
      row: side.length,
    });
  }

  const params = [...bottom, ...top];
  const gridParameter = params[0];
  if (gridParameter === undefined) {
    return null;
  }

  const marginTop = AXIS_PAD + top.length * AXIS_ROW_H;
  const marginBottom = AXIS_PAD + bottom.length * AXIS_ROW_H;
  const plotLeft = MARGIN_LEFT;
  const plotRight = width - MARGIN_RIGHT;
  const plotTop = marginTop;
  const plotBottom = height - marginBottom;

  const yScale = scaleLinear()
    .domain(
      yAxis.increasesUpward
        ? [yDomain[1], yDomain[0]]
        : [yDomain[0], yDomain[1]],
    )
    .range([plotTop, plotBottom]);

  // Now that the pixel range is known, fix each x-scale's range (mirrored
  // params run right→left).
  for (const p of params) {
    p.scale.range(
      p.style.mirror ? [plotRight, plotLeft] : [plotLeft, plotRight],
    );
  }

  const yTicks = yScale.ticks(10);

  // Vertical grid aligned to the primary parameter's scale (cone resistance
  // when present), giving the chart its conventional graph-paper look.
  const xGridTicks = gridParameter.scale.ticks(8);

  return (
    <div className="flex flex-col items-center">
      <div ref={containerRef}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ backgroundColor: "white", overflow: "visible" }}
          role="img"
          aria-label={t("classicCptChart")}
        >
          {/* With fixed domains the data can exceed the conventional range;
              clip the curves at the frame instead of drawing past it. */}
          {fixedDomains && (
            <clipPath id={clipId}>
              <rect
                x={plotLeft}
                y={plotTop}
                width={plotRight - plotLeft}
                height={plotBottom - plotTop}
              />
            </clipPath>
          )}
          {/* Depth grid + y-axis */}
          {yTicks.map((tick) => {
            const y = yScale(tick);
            return (
              <g key={`y-${tick}`}>
                <line
                  x1={plotLeft}
                  x2={plotRight}
                  y1={y}
                  y2={y}
                  stroke="#e5e7eb"
                />
                <text
                  x={plotLeft - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="#374151"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Vertical grid */}
          {xGridTicks.map((tick) => {
            const x = gridParameter.scale(tick);
            return (
              <line
                key={`x-grid-${tick}`}
                x1={x}
                x2={x}
                y1={plotTop}
                y2={plotBottom}
                stroke="#e5e7eb"
              />
            );
          })}

          {/* Plot frame */}
          <rect
            x={plotLeft}
            y={plotTop}
            width={plotRight - plotLeft}
            height={plotBottom - plotTop}
            fill="none"
            stroke="#9ca3af"
          />

          {/* Y-axis title */}
          <text
            transform={`translate(14,${(plotTop + plotBottom) / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize={11}
            fill="#374151"
          >
            {yAxis.name} ({yAxis.unit})
          </text>

          {/* Stacked x-axes */}
          {bottom.map((p) => (
            <XAxis
              key={`b-${p.column.key}`}
              parameter={p}
              axisY={plotBottom + AXIS_PAD - 2 + p.row * AXIS_ROW_H}
              side="bottom"
              plotLeft={plotLeft}
              plotRight={plotRight}
            />
          ))}
          
          {top.map((p) => (
            <XAxis
              key={`t-${p.column.key}`}
              parameter={p}
              axisY={plotTop - AXIS_PAD + 2 - p.row * AXIS_ROW_H}
              side="top"
              plotLeft={plotLeft}
              plotRight={plotRight}
            />
          ))}

          {/* Curves */}
          {params.map((p) => {
            const path = d3Line<CPTChartRow>()
              .defined((d) => d[p.column.key] != null && d[yKey] != null)
              .x((d) => p.scale(Number(d[p.column.key])))
              .y((d) => yScale(Number(d[yKey])))(data);

            if (!path) {
              return null;
            }

            return (
              <path
                key={`line-${p.column.key}`}
                d={path}
                fill="none"
                stroke={p.style.color}
                strokeWidth={1}
                strokeDasharray={p.style.dash}
                clipPath={fixedDomains ? `url(#${clipId})` : undefined}
              />
            );
          })}

          {/* Watermark */}
          <text
            x={plotRight - 4}
            y={plotTop + 12}
            textAnchor="end"
            fontSize={8}
            fill="gray"
          >
            {t("madeWithBedrockBroViewer")}
          </text>
        </svg>
      </div>

      <PlotDownloadButtons
        containerRef={containerRef}
        filename={`${baseFilename}-classic-cpt`}
      />
    </div>
  );
}

interface XAxisProps {
  parameter: ResolvedParameter;
  /** Pixel y of the axis baseline. */
  axisY: number;
  side: "top" | "bottom";
  plotLeft: number;
  plotRight: number;
}

/** A single colour-coded x-axis: baseline, tick marks/labels and title.
 *  Ticks come straight from the d3 scale; we only render the result as JSX. */
function XAxis({ parameter, axisY, side, plotLeft, plotRight }: XAxisProps) {
  const { scale, style, column } = parameter;
  const ticks = scale.ticks(4);
  const format = scale.tickFormat(4);
  const direction = side === "bottom" ? 1 : -1;

  return (
    <g>
      <line
        x1={plotLeft}
        x2={plotRight}
        y1={axisY}
        y2={axisY}
        stroke={style.color}
      />
      {ticks.map((tick) => {
        const x = scale(tick);
        return (
          <g key={tick}>
            <line
              x1={x}
              x2={x}
              y1={axisY}
              y2={axisY + 5 * direction}
              stroke={style.color}
            />
            <text
              x={x}
              y={axisY + (side === "bottom" ? 14 : -8)}
              textAnchor="middle"
              fontSize={9}
              fill={style.color}
            >
              {format(tick)}
            </text>
          </g>
        );
      })}
      {/* Title anchored to the curve's zero end (left for normal, right for
          mirrored), matching the geotechnical convention. */}
      <text
        x={style.mirror ? plotRight : plotLeft}
        y={axisY + (side === "bottom" ? 28 : -22)}
        textAnchor={style.mirror ? "end" : "start"}
        fontSize={10}
        fontWeight={600}
        fill={style.color}
      >
        {column.name} ({column.unit})
      </text>
    </g>
  );
}
