import type { Coded, Measure } from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import { useFeatureFlagEnabled } from "@posthog/react";
import { max } from "d3-array";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { BHRGData, BHRGTData } from "~/types/bro-data";
import { formatCode, formatMeasure } from "~/util/format";
import {
  createWatermarkMark,
  type TranslateFunction,
} from "~/util/plot-config";
import { Card, CardTitle } from "./card";
import { PlotDownloadButtons } from "./plot-download-buttons";

const id = "bore-interval-coverage";

/** PostHog flag gating the whole card while the design is still settling. */
const FEATURE_FLAG = "bore-interval-coverage";

/** Half-width of a lane column in x-units (lanes are one unit apart). */
const LANE_HALF_WIDTH = 0.3;

// The interval lists differ slightly per borehole type (e.g. analysisType is
// BHR-GT only); this structural type covers the fields any lane may show.
interface IntervalFields {
  beginDepth?: Measure | null;
  endDepth?: Measure | null;
  boringTechnique?: Coded | null;
  boredDiameter?: Measure | null;
  samplingMethod?: Coded | null;
  samplingQuality?: Coded | null;
  diameterPermanentCasing?: Measure | null;
  noDescriptionReason?: Coded | null;
  analysisType?: Coded | null;
  sampleQuality?: Coded | null;
}

interface CoverageInterval {
  top: number;
  bottom: number;
  details: Array<string>;
}

interface CoverageLane {
  label: string;
  color: string;
  intervals: Array<CoverageInterval>;
}

function toIntervals(
  list: ReadonlyArray<IntervalFields>,
  details: (interval: IntervalFields) => Array<string | null>,
): Array<CoverageInterval> {
  const intervals: Array<CoverageInterval> = [];
  for (const interval of list) {
    const top = interval.beginDepth?.value ?? null;
    const bottom = interval.endDepth?.value ?? null;
    if (top === null || bottom === null) {
      continue;
    }
    intervals.push({
      top,
      bottom,
      details: details(interval).filter(
        (detail): detail is string => detail !== null,
      ),
    });
  }
  return intervals;
}

function buildLanes(
  data: BHRGTData | BHRGData,
  t: TranslateFunction,
): Array<CoverageLane> {
  const boring = data.boring;
  const logs = data.boreholeSampleDescription?.descriptiveBoreholeLog ?? [];
  const notDescribed = logs.flatMap((log) =>
    "notDescribedInterval" in log ? log.notDescribedInterval : [],
  );

  const lanes: Array<CoverageLane> = [
    {
      label: t("laneBored"),
      color: "#64748b", // slate-500
      intervals: toIntervals(boring?.boredInterval ?? [], (interval) => [
        formatCode(interval.boringTechnique),
        interval.boredDiameter == null
          ? null
          : `Ø ${formatMeasure(interval.boredDiameter)}`,
      ]),
    },
    {
      label: t("laneSampled"),
      color: "#16a34a", // green-600
      intervals: toIntervals(boring?.sampledInterval ?? [], (interval) => [
        formatCode(interval.samplingMethod),
        formatCode(interval.samplingQuality),
      ]),
    },
    {
      label: t("laneCompleted"),
      color: "#9333ea", // purple-600
      intervals: toIntervals(boring?.completedInterval ?? [], (interval) => [
        interval.diameterPermanentCasing == null
          ? null
          : `Ø ${formatMeasure(interval.diameterPermanentCasing)}`,
      ]),
    },
    {
      label: t("laneNotDescribed"),
      color: "#dc2626", // red-600
      intervals: toIntervals(notDescribed, (interval) => [
        formatCode(interval.noDescriptionReason),
      ]),
    },
    {
      label: t("laneInvestigated"),
      color: "#d97706", // amber-600
      intervals: toIntervals(
        data.boreholeSampleAnalysis?.investigatedInterval ?? [],
        (interval) => [
          formatCode(interval.analysisType),
          formatCode(interval.sampleQuality),
        ],
      ),
    },
  ];

  return lanes.filter((lane) => lane.intervals.length > 0);
}

interface LaneSegment {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  color: string;
  title: string;
}

function buildCoveragePlot(
  lanes: Array<CoverageLane>,
  t: TranslateFunction,
  width: number,
  height: number,
): SVGSVGElement | HTMLElement {
  const segments: Array<LaneSegment> = lanes.flatMap((lane, index) =>
    lane.intervals.map((interval) => ({
      x1: index - LANE_HALF_WIDTH,
      x2: index + LANE_HALF_WIDTH,
      y1: interval.top,
      y2: interval.bottom,
      color: lane.color,
      title: [
        `${lane.label}: ${interval.top.toFixed(2)} – ${interval.bottom.toFixed(2)} m`,
        ...interval.details,
      ].join("\n"),
    })),
  );

  const maxDepth = max(segments, (segment) => segment.y2) ?? 1;

  return Plot.plot({
    style: {
      overflow: "visible",
      backgroundColor: "white",
    },
    width,
    height,
    marginLeft: 55,
    marginRight: 30,
    marginTop: 34,
    marginBottom: 30,
    color: { type: "identity" },
    x: {
      axis: null,
      domain: [-0.6, lanes.length - 1 + 0.6],
    },
    y: {
      label: t("depthM"),
      grid: true,
      reverse: true,
      domain: [0, maxDepth * 1.02],
    },
    marks: [
      Plot.rect(segments, {
        x1: "x1",
        x2: "x2",
        y1: "y1",
        y2: "y2",
        fill: "color",
        fillOpacity: 0.85,
        stroke: "white",
        strokeWidth: 0.5,
        title: "title",
        tip: true,
      }),
      Plot.text(
        lanes.map((lane, index) => ({ x: index, label: lane.label })),
        {
          x: "x",
          y: () => 0,
          text: "label",
          textAnchor: "middle",
          dy: -14,
          fontSize: 10,
          fontWeight: "bold",
        },
      ),
      Plot.frame(),
      createWatermarkMark(t("madeWithBedrockBroViewer")),
    ],
  });
}

interface BoreIntervalCoverageProps {
  data: BHRGTData | BHRGData;
  baseFilename: string;
  height?: number;
}

/**
 * Depth-coverage strips for a borehole: one column per evidence kind (bored,
 * sampled, completed, not described, lab analyzed), each showing its depth
 * intervals, so gaps and overlaps are visible at a glance. Renders nothing
 * when the file carries no intervals.
 *
 * Behind the `bore-interval-coverage` PostHog flag until the design settles;
 * with the flag off (and during SSR, where flags aren't loaded) it renders
 * nothing.
 */
export function BoreIntervalCoverage(props: BoreIntervalCoverageProps) {
  const enabled = useFeatureFlagEnabled(FEATURE_FLAG);

  if (!enabled) {
    return null;
  }

  return <BoreIntervalCoverageCard {...props} />;
}

function BoreIntervalCoverageCard({
  data,
  baseFilename,
  height = 420,
}: BoreIntervalCoverageProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const lanes = buildLanes(data, t as TranslateFunction);
  const width = Math.max(300, lanes.length * 110 + 85);

  useEffect(() => {
    if (containerRef.current === null || lanes.length === 0) {
      return;
    }
    const plot = buildCoveragePlot(
      lanes,
      t as TranslateFunction,
      width,
      height,
    );
    containerRef.current.append(plot);
    return () => {
      plot.remove();
    };
    // lanes is derived from data; rebuilding on data keeps the effect stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, width, height, t]);

  if (lanes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardTitle>{t("depthCoverage")}</CardTitle>

      <div className="flex justify-center">
        <div id={id} ref={containerRef}></div>
      </div>

      <div className="flex flex-wrap gap-4 mt-2 text-xs">
        {lanes.map((lane) => (
          <div key={lane.label} className="flex items-center gap-1">
            <div className="w-3 h-3" style={{ backgroundColor: lane.color }} />
            <span className="text-gray-600">{lane.label}</span>
          </div>
        ))}
      </div>

      <PlotDownloadButtons plotId={id} filename={`${baseFilename}-trajecten`} />
    </Card>
  );
}
