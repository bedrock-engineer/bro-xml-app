import type {
  SettlementCharacteristicsDetermination,
  SettlementDeterminationStep,
} from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import { formatMeasure } from "../../util/format";
import {
  CHART_COLORS,
  createWatermarkMark,
  type TranslateFunction,
} from "../../util/plot-config";

interface CompressionDataPoint {
  stress: number;
  strain: number;
  stepType: string | null;
}

/** Build the stress-strain compression points from the determination steps. */
function buildCompressionData(
  data: SettlementCharacteristicsDetermination,
): Array<CompressionDataPoint> {
  // Stress must be positive for the log axis; a zero (seating) or malformed
  // step would otherwise break the whole plot rather than drop the point.
  return data.determinationSteps.flatMap((step: SettlementDeterminationStep) =>
    step.verticalStress != null &&
    step.verticalStress.value > 0 &&
    step.strainPoint24hours != null
      ? [
          {
            stress: step.verticalStress.value,
            strain: step.strainPoint24hours.value,
            stepType: step.stepType?.code ?? null,
          },
        ]
      : [],
  );
}

/**
 * Build per-step settlement time curves (log time axis), one line per load
 * step, colored by step and labeled with the step's vertical stress when
 * known. Points at t = 0 are skipped (a log scale cannot show them). Returns
 * null when no step carries the series.
 */
function buildStepTimePlot(
  data: SettlementCharacteristicsDetermination,
  t: TranslateFunction,
  getPoints: (
    step: SettlementDeterminationStep,
  ) => Array<{ x: number | null; y: number | null }>,
  yConfig: { label: string; reverse?: boolean },
): (SVGSVGElement | HTMLElement) | null {
  const allData: Array<{ x: number; y: number; stepIndex: number }> = [];

  for (const [stepIndex, step] of data.determinationSteps.entries()) {
    for (const point of getPoints(step)) {
      if (point.x != null && point.x > 0 && point.y != null) {
        allData.push({ x: point.x, y: point.y, stepIndex });
      }
    }
  }

  if (allData.length === 0) {
    return null;
  }

  const stepGroups = data.determinationSteps
    .map((_, index) => allData.filter((d) => d.stepIndex === index))
    .filter((group) => group.length > 0);

  const stepLabel = (stepIndex: number): string => {
    const stress = data.determinationSteps[stepIndex]?.verticalStress ?? null;
    return stress === null
      ? `${t("step")} ${stepIndex + 1}`
      : formatMeasure(stress);
  };

  return Plot.plot({
    width: 600,
    height: 400,
    // Room for the direct labels at the line ends
    marginRight: 60,
    style: { backgroundColor: "white" },
    x: {
      type: "log",
      label: t("elapsedTimeSeconds"),
      grid: true,
    },
    y: {
      grid: true,
      ...yConfig,
    },
    marks: [
      Plot.frame(),
      ...stepGroups.map((group) => {
        const stepIndex = group[0]?.stepIndex ?? 0;
        return Plot.line(group, {
          x: "x",
          y: "y",
          stroke: CHART_COLORS[stepIndex % CHART_COLORS.length],
          strokeWidth: 1.5,
          title: () => `${t("step")} ${stepIndex + 1}: ${stepLabel(stepIndex)}`,
          tip: true,
        });
      }),
      // Each curve is labeled at its end with the step's stress, so steps can
      // be told apart without hovering
      ...stepGroups.map((group) => {
        const stepIndex = group[0]?.stepIndex ?? 0;
        return Plot.text(group.slice(-1), {
          x: "x",
          y: "y",
          text: () => stepLabel(stepIndex),
          dx: 6,
          textAnchor: "start",
          fill: CHART_COLORS[stepIndex % CHART_COLORS.length],
          fontSize: 9,
        });
      }),
      createWatermarkMark(t("madeWithBedrockBroViewer"), {
        frameAnchor: "top-right",
        dx: -5,
        dy: 5,
      }),
    ],
  });
}

/** Consolidation curves: vertical strain vs elapsed time, reversed y. */
export function buildSettlementTimeSeriesPlot(
  data: SettlementCharacteristicsDetermination,
  t: TranslateFunction,
): (SVGSVGElement | HTMLElement) | null {
  return buildStepTimePlot(
    data,
    t,
    (step) =>
      step.stressChangeDuringSettlement.map((point) => ({
        x: point.elapsedTime,
        y: point.verticalStrain,
      })),
    { label: t("verticalStrainAxisLabel"), reverse: true },
  );
}

/** Specimen height vs elapsed time (files report this or the strain series). */
export function buildSettlementHeightPlot(
  data: SettlementCharacteristicsDetermination,
  t: TranslateFunction,
): (SVGSVGElement | HTMLElement) | null {
  return buildStepTimePlot(
    data,
    t,
    (step) =>
      step.heightChangeDuringSettlement.map((point) => ({
        x: point.time,
        y: point.height,
      })),
    { label: t("specimenHeightAxisLabel") },
  );
}

/**
 * Build the settlement compression curve (vertical strain vs vertical stress,
 * log x-axis, reversed y). Returns null when there are no compression points.
 */
export function buildSettlementCharacteristicsPlot(
  data: SettlementCharacteristicsDetermination,
  t: TranslateFunction,
): (SVGSVGElement | HTMLElement) | null {
  const compressionData = buildCompressionData(data);

  if (compressionData.length === 0) {
    return null;
  }

  const loading = compressionData.filter((d) => d.stepType === "belastingstap");
  const unloading = compressionData.filter(
    (d) => d.stepType === "ontlastingstap",
  );

  return Plot.plot({
    width: 600,
    height: 400,
    style: { backgroundColor: "white" },
    x: {
      type: "log",
      label: t("verticalStressAxisLabel"),
      grid: true,
    },
    y: {
      label: t("verticalStrainAxisLabel"),
      reverse: true,
      grid: true,
    },
    marks: [
      Plot.frame(),
      // Loading steps
      Plot.line(loading, {
        x: "stress",
        y: "strain",
        stroke: "#2563eb",
        strokeWidth: 2,
      }),
      Plot.dot(loading, {
        x: "stress",
        y: "strain",
        fill: "#2563eb",
        r: 5,
      }),
      // Unloading steps
      Plot.line(unloading, {
        x: "stress",
        y: "strain",
        stroke: "#dc2626",
        strokeWidth: 2,
        strokeDasharray: "4,4",
      }),
      Plot.dot(unloading, {
        x: "stress",
        y: "strain",
        fill: "#dc2626",
        r: 5,
      }),
      createWatermarkMark(t("madeWithBedrockBroViewer"), {
        frameAnchor: "top-right",
        dx: -5,
        dy: 5,
      }),
    ],
  });
}
