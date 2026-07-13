import type { InvestigatedInterval } from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import {
  CHART_COLORS,
  createWatermarkMark,
  type TranslateFunction,
} from "../../util/plot-config";

export type DirectShearDetermination = NonNullable<
  InvestigatedInterval["shearStressChangeDuringHorizontalDeformationDetermination"]
>[number];

export interface PeakData {
  normalStress: number;
  peakShearStress: number;
  testIndex: number;
  color: string;
}

/** Peak shear stress (and its normal stress) per test, for the failure envelope. */
export function extractPeakData(
  tests: Array<DirectShearDetermination>,
): Array<PeakData> {
  return tests
    .map((test, testIndex) => {
      const data =
        test.shearStage?.shearStressChangeDuringHorizontalDeformation;
      if (!data || data.length === 0) {
        return null;
      }

      let peakShearStress = 0;
      let normalStress = 0;
      for (const point of data) {
        if (point.shearStress > peakShearStress) {
          peakShearStress = point.shearStress;
          normalStress = point.verticalStress;
        }
      }

      if (peakShearStress === 0) {
        return null;
      }

      return {
        normalStress,
        peakShearStress,
        testIndex,
        color: CHART_COLORS[testIndex % CHART_COLORS.length],
      };
    })
    .filter((d): d is PeakData => d !== null);
}

/** Whether any test carries height-change (volume) data. */
export function hasHeightChangeData(
  tests: Array<DirectShearDetermination>,
): boolean {
  return tests.some((test) =>
    test.shearStage?.shearStressChangeDuringHorizontalDeformation.some(
      (p) => p.heightChange != null,
    ),
  );
}

export interface FailureEnvelope {
  /** Cohesion intercept c (kPa) */
  cohesion: number;
  /** tan(φ) — slope of the envelope */
  tanPhi: number;
  /** Friction angle φ (degrees) */
  phi: number;
}

/**
 * Fit the Mohr-Coulomb failure envelope τ = c + σ·tan(φ) to the peak points by
 * ordinary least squares. A negative cohesion intercept is physically
 * meaningless, so such fits are redone through the origin (c = 0). Returns
 * zeroed parameters for a degenerate fit (fewer than two distinct normal
 * stresses).
 */
export function fitFailureEnvelope(
  peakData: Array<PeakData>,
): FailureEnvelope {
  const n = peakData.length;
  const sumX = peakData.reduce((s, d) => s + d.normalStress, 0);
  const sumY = peakData.reduce((s, d) => s + d.peakShearStress, 0);
  const sumXY = peakData.reduce(
    (s, d) => s + d.normalStress * d.peakShearStress,
    0,
  );
  const sumX2 = peakData.reduce((s, d) => s + d.normalStress * d.normalStress, 0);

  const denom = n * sumX2 - sumX * sumX;
  let cohesion = denom === 0 ? 0 : (sumY * sumX2 - sumX * sumXY) / denom;
  let tanPhi = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;

  if (cohesion < 0 && sumX2 > 0) {
    cohesion = 0;
    tanPhi = sumXY / sumX2;
  }

  const phi = (Math.atan(tanPhi) * 180) / Math.PI;

  return { cohesion, tanPhi, phi };
}

/** Group a flat list of points by test index, dropping empty groups. */
function groupByTest<T extends { testIndex: number }>(
  tests: Array<unknown>,
  points: Array<T>,
): Array<Array<T>> {
  return tests
    .map((_, index) => points.filter((d) => d.testIndex === index))
    .filter((group) => group.length > 0);
}

/**
 * Build the shear-stress vs horizontal-displacement curves, one line per test.
 * Returns null when no test has data.
 */
export function buildStressDisplacementPlot(
  tests: Array<DirectShearDetermination>,
  t: TranslateFunction,
): (SVGSVGElement | HTMLElement) | null {
  const allData: Array<{
    displacement: number;
    stress: number;
    testIndex: number;
  }> = [];

  for (const [testIndex, test] of tests.entries()) {
    const data = test.shearStage?.shearStressChangeDuringHorizontalDeformation;
    if (!data || data.length === 0) {
      continue;
    }

    for (const point of data) {
      allData.push({
        displacement: point.horizontalDisplacement,
        stress: point.shearStress,
        testIndex,
      });
    }
  }

  if (allData.length === 0) {
    return null;
  }

  const testGroups = groupByTest(tests, allData);

  return Plot.plot({
    width: 500,
    height: 350,
    style: { backgroundColor: "white" },
    x: {
      label: t("horizontalDisplacementAxisLabel"),
      grid: true,
    },
    y: {
      label: t("shearStressAxisLabel"),
      grid: true,
    },
    marks: [
      Plot.frame(),
      ...testGroups.map((group) =>
        Plot.line(group, {
          x: "displacement",
          y: "stress",
          stroke: CHART_COLORS[(group[0]?.testIndex ?? 0) % CHART_COLORS.length],
          strokeWidth: 2,
        }),
      ),
      createWatermarkMark(t("madeWithBedrockBroViewer"), {
        frameAnchor: "top-right",
        dx: -5,
        dy: 5,
      }),
    ],
  });
}

const ENVELOPE_PLOT_WIDTH = 500;
const ENVELOPE_PLOT_HEIGHT = 350;
// Fixed margins so the data area's aspect ratio is known exactly — required
// for the equal-scaling domain math (Plot's implicit margins would skew it)
const ENVELOPE_PLOT_MARGINS = { left: 40, right: 20, top: 20, bottom: 30 };

/**
 * Build the failure envelope (τf vs σn) with the fitted Mohr-Coulomb line and a
 * c/φ annotation. The axis domains share one kPa-per-pixel scale so the slope
 * of the drawn line reads as the true friction angle. Returns null with fewer
 * than two peak points.
 */
export function buildFailureEnvelopePlot(
  peakData: Array<PeakData>,
  t: TranslateFunction,
): (SVGSVGElement | HTMLElement) | null {
  if (peakData.length < 2) {
    return null;
  }

  const { cohesion, tanPhi, phi } = fitFailureEnvelope(peakData);
  // Suppress the fitted line when all tests share one normal stress — the
  // degenerate fit would draw a misleading τ = 0 envelope
  const distinctStresses = new Set(peakData.map((d) => d.normalStress));
  const showEnvelope = distinctStresses.size >= 2;

  const plotAspect =
    (ENVELOPE_PLOT_HEIGHT -
      ENVELOPE_PLOT_MARGINS.top -
      ENVELOPE_PLOT_MARGINS.bottom) /
    (ENVELOPE_PLOT_WIDTH -
      ENVELOPE_PLOT_MARGINS.left -
      ENVELOPE_PLOT_MARGINS.right);
  const dataMaxSigma = Math.max(...peakData.map((d) => d.normalStress)) * 1.2;
  const dataMaxTau = Math.max(...peakData.map((d) => d.peakShearStress)) * 1.15;

  let maxSigma: number;
  let maxTau: number;
  if (dataMaxTau <= dataMaxSigma * plotAspect) {
    maxSigma = dataMaxSigma;
    maxTau = dataMaxSigma * plotAspect;
  } else {
    maxTau = dataMaxTau;
    maxSigma = dataMaxTau / plotAspect;
  }

  const lineData = [
    { x: 0, y: cohesion },
    { x: maxSigma, y: cohesion + tanPhi * maxSigma },
  ];

  return Plot.plot({
    width: ENVELOPE_PLOT_WIDTH,
    height: ENVELOPE_PLOT_HEIGHT,
    marginLeft: ENVELOPE_PLOT_MARGINS.left,
    marginRight: ENVELOPE_PLOT_MARGINS.right,
    marginTop: ENVELOPE_PLOT_MARGINS.top,
    marginBottom: ENVELOPE_PLOT_MARGINS.bottom,
    style: { backgroundColor: "white" },
    x: {
      label: t("normalStressAxisLabel"),
      domain: [0, maxSigma],
      grid: true,
    },
    y: {
      label: t("peakShearStressAxisLabel"),
      domain: [0, maxTau],
      grid: true,
    },
    marks: [
      Plot.frame(),
      // Regression line
      ...(showEnvelope
        ? [
            Plot.line(lineData, {
              x: "x",
              y: "y",
              stroke: "#6b7280",
              strokeWidth: 1.5,
              strokeDasharray: "6,3",
              clip: true,
            }),
          ]
        : []),
      // Data points
      Plot.dot(peakData, {
        x: "normalStress",
        y: "peakShearStress",
        fill: "color",
        r: 6,
        tip: true,
        title: (d: PeakData) =>
          `σn = ${d.normalStress.toFixed(1)} kPa\nτf = ${d.peakShearStress.toFixed(1)} kPa`,
      }),
      // c and φ label
      ...(showEnvelope
        ? [
            Plot.text(
              [`c = ${cohesion.toFixed(1)} kPa, φ = ${phi.toFixed(1)}°`],
              {
                frameAnchor: "top-left",
                dx: 10,
                dy: 10,
                fill: "#374151",
                fontSize: 11,
                fontWeight: "bold",
              },
            ),
          ]
        : []),
      createWatermarkMark(t("madeWithBedrockBroViewer"), {
        frameAnchor: "top-right",
        dx: -5,
        dy: 5,
      }),
    ],
  });
}

/**
 * Build the height-change vs horizontal-displacement curves (volume change).
 * Returns null when no test has height-change data.
 */
export function buildHeightChangePlot(
  tests: Array<DirectShearDetermination>,
  t: TranslateFunction,
): (SVGSVGElement | HTMLElement) | null {
  const allData: Array<{
    displacement: number;
    heightChange: number;
    testIndex: number;
  }> = [];

  for (const [testIndex, test] of tests.entries()) {
    const data = test.shearStage?.shearStressChangeDuringHorizontalDeformation;
    if (!data) {
      continue;
    }

    for (const point of data) {
      if (point.heightChange != null) {
        allData.push({
          displacement: point.horizontalDisplacement,
          heightChange: point.heightChange,
          testIndex,
        });
      }
    }
  }

  if (allData.length === 0) {
    return null;
  }

  const testGroups = groupByTest(tests, allData);

  return Plot.plot({
    width: 500,
    height: 300,
    style: { backgroundColor: "white" },
    x: {
      label: t("horizontalDisplacementAxisLabel"),
      grid: true,
    },
    y: {
      label: t("heightChangeAxisLabel"),
      grid: true,
    },
    marks: [
      Plot.frame(),
      ...testGroups.map((group) =>
        Plot.line(group, {
          x: "displacement",
          y: "heightChange",
          stroke: CHART_COLORS[(group[0]?.testIndex ?? 0) % CHART_COLORS.length],
          strokeWidth: 1,
        }),
      ),
      createWatermarkMark(t("madeWithBedrockBroViewer"), {
        frameAnchor: "top-right",
        dx: -5,
        dy: 5,
      }),
    ],
  });
}
