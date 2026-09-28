import * as Plot from "@observablehq/plot";
import { prettifyBroCode } from "@bedrock-engineer/bro-xml-parser/reference-codes";
import type { GLDObservation } from "../../types/bro-data";
import { formatDate } from "../../util/format";
import {
  CHART_COLORS,
  createWatermarkMark,
  type TranslateFunction,
} from "../../util/plot-config";

/** A single plotted groundwater level measurement. */
interface GroundwaterPoint {
  date: Date;
  value: number;
  series: string;
  dateLabel: string;
  qualifier: string | null;
}

/**
 * A vertex of the connecting line. `value` is null at a synthetic breakpoint
 * inserted across a data gap, which tells Plot to lift the pen there rather
 * than draw a misleading straight line over months of missing measurements.
 */
interface LineVertex {
  date: Date;
  value: number | null;
  series: string;
}

/**
 * The line only breaks across a genuine data outage: a gap that is both long in
 * absolute terms (more than a year — bridging that reads as fabricated data)
 * and anomalous for the series (several times its median sampling interval).
 * Groundwater hydrographs are otherwise conventionally drawn as a continuous
 * line, so ordinary and seasonal spacing stays connected.
 */
const GAP_BREAK_MULTIPLIER = 4;
const MIN_GAP_BREAK_MS = 365 * 24 * 60 * 60 * 1000;

/** Break threshold in ms, or Infinity when a series is too short to judge. */
function gapThresholdMs(points: Array<GroundwaterPoint>): number {
  if (points.length < 4) {
    return Number.POSITIVE_INFINITY;
  }
  const intervals: Array<number> = [];
  let previous: GroundwaterPoint | null = null;
  for (const point of points) {
    if (previous !== null) {
      intervals.push(point.date.getTime() - previous.date.getTime());
    }
    previous = point;
  }
  intervals.sort((a, b) => a - b);
  const middle = Math.floor(intervals.length / 2);
  const lower = intervals[middle - 1];
  const upper = intervals[middle];
  if (upper === undefined) {
    return Number.POSITIVE_INFINITY;
  }
  const median =
    intervals.length % 2 === 0 && lower !== undefined
      ? (lower + upper) / 2
      : upper;
  return Math.max(MIN_GAP_BREAK_MS, median * GAP_BREAK_MULTIPLIER);
}

/**
 * Build the line vertices for one date-sorted series, inserting a null-valued
 * breakpoint at the midpoint of every gap wider than {@link gapThresholdMs}.
 */
function buildLineVertices(points: Array<GroundwaterPoint>): Array<LineVertex> {
  const threshold = gapThresholdMs(points);
  const vertices: Array<LineVertex> = [];
  let previous: GroundwaterPoint | null = null;
  for (const point of points) {
    if (previous !== null) {
      const gap = point.date.getTime() - previous.date.getTime();
      if (gap > threshold) {
        vertices.push({
          date: new Date((previous.date.getTime() + point.date.getTime()) / 2),
          value: null,
          series: point.series,
        });
      }
    }
    vertices.push({
      date: point.date,
      value: point.value,
      series: point.series,
    });
    previous = point;
  }
  return vertices;
}

interface BuildGldChartOptions {
  observations: Array<GLDObservation>;
  t: TranslateFunction;
  width: number;
  height: number;
}

/**
 * Label for an observation series. Observations of the same type (e.g. several
 * "reguliereMeting" batches over the years) share a label so they render as one
 * coloured series rather than fragmenting the legend.
 */
function seriesLabel(
  observation: GLDObservation,
  index: number,
  t: TranslateFunction,
): string {
  return observation.observationType
    ? prettifyBroCode(observation.observationType)
    : `${t("observationType")} ${index + 1}`;
}

function pointTitle(point: GroundwaterPoint): string {
  const lines = [
    point.series,
    point.dateLabel,
    `${point.value.toFixed(2)} m NAP`,
  ];
  if (point.qualifier) {
    lines.push(prettifyBroCode(point.qualifier));
  }
  return lines.join("\n");
}

/**
 * Build the GLD groundwater level time series: level (m NAP) against date, one
 * coloured line + dots per observation type. Returns null when no point carries
 * both a time and a value.
 */
export function buildGldChart({
  observations,
  t,
  width,
  height,
}: BuildGldChartOptions): SVGSVGElement | HTMLElement | null {
  const data: Array<GroundwaterPoint> = [];

  for (const [index, observation] of observations.entries()) {
    const series = seriesLabel(observation, index, t);
    for (const point of observation.points) {
      if (point.time === null || point.value === null) {
        continue;
      }
      const date = new Date(point.time);
      if (Number.isNaN(date.getTime())) {
        continue;
      }
      data.push({
        date,
        value: point.value,
        series,
        dateLabel: formatDate(point.time),
        qualifier: point.qualifier,
      });
    }
  }

  if (data.length === 0) {
    return null;
  }

  // Sorting by date keeps each series' connecting line monotonic in time.
  data.sort((a, b) => a.date.getTime() - b.date.getTime());

  const seriesNames = [...new Set(data.map((d) => d.series))];
  const multiSeries = seriesNames.length > 1;

  // The line is drawn from vertices with gap breaks inserted; the dots use the
  // real measurements only, so a break never drops a genuine point.
  const lineData: Array<LineVertex> = seriesNames.flatMap((name) =>
    buildLineVertices(data.filter((point) => point.series === name)),
  );

  const plot = Plot.plot({
    style: {
      overflow: "visible",
      backgroundColor: "white",
    },
    width,
    height,
    marginLeft: 55,
    marginRight: 20,
    marginTop: 20,
    marginBottom: 54,
    x: {
      label: t("dateAxisLabel"),
      grid: true,
    },
    y: {
      label: t("groundwaterLevelAxisLabel"),
      grid: true,
      nice: true,
    },
    color: multiSeries
      ? { domain: seriesNames, range: CHART_COLORS, legend: true }
      : undefined,
    marks: [
      Plot.lineY(lineData, {
        x: "date",
        y: "value",
        stroke: multiSeries ? "series" : CHART_COLORS[0],
        strokeWidth: 1,
        z: "series",
      }),
      Plot.dot(data, {
        x: "date",
        y: "value",
        fill: multiSeries ? "series" : CHART_COLORS[0],
        r: 1.6,
        title: pointTitle,
        tip: true,
      }),
      Plot.frame(),
      // Sit the watermark in the bottom margin, clear of the x-axis ticks and
      // label (the depth-axis plots have no bottom axis so use the default dy).
      createWatermarkMark(t("madeWithBedrockBroViewer"), { dy: 36 }),
    ],
  });

  return plot;
}
