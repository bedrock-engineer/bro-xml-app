import type { ShearStressChangeDuringLoadingDetermination } from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import {
  CHART_COLORS,
  createWatermarkMark,
  type TranslateFunction,
} from "../../util/plot-config";

export interface MohrCircleData {
  sigma3: number; // confining pressure
  sigma1: number; // major principal stress at failure
  color: string;
  testIndex: number;
}

/** Derive the Mohr-circle endpoints (σ₃, σ₁) at peak deviator stress per test. */
export function computeMohrCircles(
  tests: Array<ShearStressChangeDuringLoadingDetermination>,
): Array<MohrCircleData> {
  return tests
    .map((test, testIndex) => {
      const loadStageData = test.loadStage?.shearStressChangeDuringLoading;
      if (!loadStageData || loadStageData.length === 0) {
        return null;
      }

      // Find peak deviator stress
      let maxDeviator = 0;
      let sigma3 = loadStageData[0]?.cellPressure ?? 0;

      for (const point of loadStageData) {
        if (
          point.deviatorStress != null &&
          point.deviatorStress > maxDeviator
        ) {
          maxDeviator = point.deviatorStress;
          sigma3 = point.cellPressure;
        }
      }

      if (maxDeviator === 0) {
        return null;
      }

      return {
        sigma3,
        sigma1: sigma3 + maxDeviator, // σ1 = σ3 + (σ1 - σ3)
        color: CHART_COLORS[testIndex % CHART_COLORS.length],
        testIndex,
      };
    })
    .filter((c): c is MohrCircleData => c !== null);
}

/**
 * Build the deviator-stress vs axial-strain curves, one line per test.
 * Returns null when no test has stress-strain data.
 */
export function buildTriaxialStressStrainPlot(
  tests: Array<ShearStressChangeDuringLoadingDetermination>,
  t: TranslateFunction,
): (SVGSVGElement | HTMLElement) | null {
  const allData: Array<{
    strain: number;
    stress: number;
    testIndex: number;
    cellPressure: number;
  }> = [];

  for (const [testIndex, test] of tests.entries()) {
    const loadStageData = test.loadStage?.shearStressChangeDuringLoading;
    if (!loadStageData || loadStageData.length === 0) {
      continue;
    }

    for (const point of loadStageData) {
      if (point.axialStrain != null && point.deviatorStress != null) {
        allData.push({
          strain: point.axialStrain,
          stress: point.deviatorStress,
          testIndex,
          cellPressure: point.cellPressure,
        });
      }
    }
  }

  if (allData.length === 0) {
    return null;
  }

  const testGroups = tests
    .map((_, index) => allData.filter((d) => d.testIndex === index))
    .filter((group) => group.length > 0);

  return Plot.plot({
    width: 500,
    height: 350,
    style: { backgroundColor: "white" },
    x: {
      label: t("axialStrainAxisLabel"),
      grid: true,
    },
    y: {
      label: t("deviatorStressAxisLabel"),
      grid: true,
    },
    marks: [
      Plot.frame(),
      ...testGroups.map((group, index) =>
        Plot.line(group, {
          x: "strain",
          y: "stress",
          stroke: CHART_COLORS[index % CHART_COLORS.length],
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

const MOHR_PLOT_WIDTH = 500;
const MOHR_PLOT_HEIGHT = 350;

/**
 * Build the Mohr-circle diagram (shear stress vs normal stress). The axis
 * domains are sized so the circles render with equal visual scaling.
 * Returns null when there are no circles.
 */
export function buildTriaxialMohrCirclesPlot(
  mohrCircles: Array<MohrCircleData>,
  t: TranslateFunction,
): (SVGSVGElement | HTMLElement) | null {
  if (mohrCircles.length === 0) {
    return null;
  }

  // Generate semicircle points (top half) for each test
  const circlePoints: Array<{ x: number; y: number; testIndex: number }> = [];

  for (const circle of mohrCircles) {
    const center = (circle.sigma1 + circle.sigma3) / 2;
    const radius = (circle.sigma1 - circle.sigma3) / 2;

    for (let angle = 0; angle <= Math.PI; angle += Math.PI / 50) {
      circlePoints.push({
        x: center + radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        testIndex: circle.testIndex,
      });
    }
  }

  // Size domains for equal visual scaling (so circles appear circular)
  const plotAspect = MOHR_PLOT_HEIGHT / MOHR_PLOT_WIDTH;
  const dataMaxSigma = Math.max(...mohrCircles.map((c) => c.sigma1)) * 1.1;
  const dataMaxTau =
    Math.max(...mohrCircles.map((c) => (c.sigma1 - c.sigma3) / 2)) * 1.2;

  let xDomainMax: number;
  let yDomainMax: number;

  if (dataMaxTau <= dataMaxSigma * plotAspect) {
    // x constraint is binding
    xDomainMax = dataMaxSigma;
    yDomainMax = dataMaxSigma * plotAspect;
  } else {
    // y constraint is binding
    yDomainMax = dataMaxTau;
    xDomainMax = dataMaxTau / plotAspect;
  }

  return Plot.plot({
    width: MOHR_PLOT_WIDTH,
    height: MOHR_PLOT_HEIGHT,
    style: { backgroundColor: "white" },
    x: {
      label: t("mohrNormalStressAxisLabel"),
      domain: [0, xDomainMax],
      grid: true,
    },
    y: {
      label: t("shearStressAxisLabel"),
      domain: [0, yDomainMax],
      grid: true,
    },
    marks: [
      Plot.frame(),
      // Draw each Mohr circle
      ...mohrCircles.map((circle) =>
        Plot.line(
          circlePoints.filter((p) => p.testIndex === circle.testIndex),
          {
            x: "x",
            y: "y",
            stroke: circle.color,
            strokeWidth: 2,
          },
        ),
      ),
      // Mark σ3 and σ1 points on x-axis
      ...mohrCircles.flatMap((circle) => [
        Plot.dot([{ x: circle.sigma3, y: 0 }], {
          x: "x",
          y: "y",
          fill: circle.color,
          r: 5,
        }),
        Plot.dot([{ x: circle.sigma1, y: 0 }], {
          x: "x",
          y: "y",
          fill: circle.color,
          r: 5,
        }),
      ]),
      // Label σ3 values
      ...mohrCircles.map((circle) =>
        Plot.text(
          [
            {
              x: circle.sigma3,
              y: -yDomainMax * 0.05,
              text: `σ₃=${circle.sigma3}`,
            },
          ],
          {
            x: "x",
            y: "y",
            text: "text",
            fontSize: 9,
            fill: circle.color,
          },
        ),
      ),
      createWatermarkMark(t("madeWithBedrockBroViewer"), {
        frameAnchor: "top-right",
        dx: -5,
        dy: 5,
      }),
    ],
  });
}
