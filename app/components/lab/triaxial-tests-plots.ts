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
  /** Pore pressure at peak deviator stress (undrained tests), for σ' = σ - u */
  porePressureAtFailure: number | null;
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
      let porePressureAtFailure: number | null = null;

      for (const point of loadStageData) {
        if (point.deviatorStress > maxDeviator) {
          maxDeviator = point.deviatorStress;
          sigma3 = point.cellPressure;
          porePressureAtFailure = point.porePressure ?? null;
        }
      }

      if (maxDeviator === 0) {
        return null;
      }

      return {
        sigma3,
        sigma1: sigma3 + maxDeviator, // σ1 = σ3 + (σ1 - σ3)
        porePressureAtFailure,
        color: CHART_COLORS[testIndex % CHART_COLORS.length],
        testIndex,
      };
    })
    .filter((c): c is MohrCircleData => c !== null);
}

export interface MohrEnvelope {
  /** Cohesion intercept c (kPa) */
  cohesion: number;
  /** Friction angle φ (degrees) */
  phi: number;
  /** tan(φ) — slope of the envelope in τ-σ space */
  tanPhi: number;
  /** Whether the fit used effective stresses (σ' = σ - u) */
  effective: boolean;
}

/**
 * Fit a Mohr-Coulomb envelope tangent to the circles by linear regression in
 * s-t space (s = (σ₁+σ₃)/2, t = (σ₁-σ₃)/2): sin φ = slope, c = intercept/cos φ.
 * Uses effective stresses when every circle has a pore pressure at failure
 * (s' = s - u; t is unaffected). A negative cohesion is clamped by refitting
 * through the origin. Returns null when there are fewer than two circles or
 * the fit is degenerate (slope outside (0, 1)).
 */
export function fitMohrEnvelope(
  mohrCircles: Array<MohrCircleData>,
): MohrEnvelope | null {
  if (mohrCircles.length < 2) {
    return null;
  }

  const effective = mohrCircles.every((c) => c.porePressureAtFailure != null);
  const points = mohrCircles.map((c) => {
    const u = effective ? (c.porePressureAtFailure ?? 0) : 0;
    return {
      s: (c.sigma1 + c.sigma3) / 2 - u,
      t: (c.sigma1 - c.sigma3) / 2,
    };
  });

  const n = points.length;
  const sumS = points.reduce((sum, p) => sum + p.s, 0);
  const sumT = points.reduce((sum, p) => sum + p.t, 0);
  const sumST = points.reduce((sum, p) => sum + p.s * p.t, 0);
  const sumS2 = points.reduce((sum, p) => sum + p.s * p.s, 0);

  const denom = n * sumS2 - sumS * sumS;
  if (denom === 0) {
    return null;
  }

  let sinPhi = (n * sumST - sumS * sumT) / denom;
  let intercept = (sumT * sumS2 - sumS * sumST) / denom;

  if (intercept < 0 && sumS2 > 0) {
    intercept = 0;
    sinPhi = sumST / sumS2;
  }

  if (sinPhi <= 0 || sinPhi >= 1) {
    return null;
  }

  const phiRad = Math.asin(sinPhi);
  return {
    cohesion: intercept / Math.cos(phiRad),
    phi: (phiRad * 180) / Math.PI,
    tanPhi: Math.tan(phiRad),
    effective,
  };
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
      allData.push({
        strain: point.axialStrain,
        stress: point.deviatorStress,
        testIndex,
        cellPressure: point.cellPressure,
      });
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
      ...testGroups.map((group) =>
        Plot.line(group, {
          x: "strain",
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

const MOHR_PLOT_WIDTH = 500;
const MOHR_PLOT_HEIGHT = 350;
// Fixed margins so the data area's aspect ratio is known exactly — required
// for the equal-scaling domain math (Plot's implicit margins would skew it)
const MOHR_PLOT_MARGINS = { left: 40, right: 20, top: 20, bottom: 30 };

/** Sample the top half of a Mohr circle given its endpoints on the σ-axis. */
function semicirclePoints(
  sigmaMin: number,
  sigmaMax: number,
): Array<{ x: number; y: number }> {
  const center = (sigmaMax + sigmaMin) / 2;
  const radius = (sigmaMax - sigmaMin) / 2;
  const points: Array<{ x: number; y: number }> = [];
  for (let angle = 0; angle <= Math.PI; angle += Math.PI / 50) {
    points.push({
      x: center + radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }
  return points;
}

/**
 * Build the Mohr-circle diagram (shear stress vs normal stress). Total-stress
 * circles are solid; when a test carries a pore pressure at failure, the
 * effective-stress circle (σ' = σ - u) is drawn dashed in the same color. With
 * two or more circles the fitted Mohr-Coulomb envelope is drawn and annotated.
 * The axis domains are sized so the circles render with equal visual scaling.
 * Returns null when there are no circles.
 */
export function buildTriaxialMohrCirclesPlot(
  mohrCircles: Array<MohrCircleData>,
  t: TranslateFunction,
): (SVGSVGElement | HTMLElement) | null {
  if (mohrCircles.length === 0) {
    return null;
  }

  const effectiveCircles = mohrCircles.flatMap((c) =>
    c.porePressureAtFailure == null
      ? []
      : [
          {
            ...c,
            sigma3: c.sigma3 - c.porePressureAtFailure,
            sigma1: c.sigma1 - c.porePressureAtFailure,
          },
        ],
  );
  const envelope = fitMohrEnvelope(mohrCircles);

  // Size domains for equal visual scaling (so circles appear circular).
  // Effective circles can extend left of σ = 0 when u > σ₃.
  const plotAspect =
    (MOHR_PLOT_HEIGHT - MOHR_PLOT_MARGINS.top - MOHR_PLOT_MARGINS.bottom) /
    (MOHR_PLOT_WIDTH - MOHR_PLOT_MARGINS.left - MOHR_PLOT_MARGINS.right);
  const dataMaxSigma = Math.max(...mohrCircles.map((c) => c.sigma1)) * 1.1;
  const dataMinSigma = Math.min(
    0,
    ...effectiveCircles.map((c) => c.sigma3 * 1.1),
  );
  const dataMaxTau =
    Math.max(...mohrCircles.map((c) => (c.sigma1 - c.sigma3) / 2)) * 1.2;

  const xDomainMin = dataMinSigma;
  let xDomainMax: number;
  let yDomainMax: number;

  if (dataMaxTau <= (dataMaxSigma - xDomainMin) * plotAspect) {
    // x constraint is binding
    xDomainMax = dataMaxSigma;
    yDomainMax = (dataMaxSigma - xDomainMin) * plotAspect;
  } else {
    // y constraint is binding
    yDomainMax = dataMaxTau;
    xDomainMax = xDomainMin + dataMaxTau / plotAspect;
  }

  return Plot.plot({
    width: MOHR_PLOT_WIDTH,
    height: MOHR_PLOT_HEIGHT,
    marginLeft: MOHR_PLOT_MARGINS.left,
    marginRight: MOHR_PLOT_MARGINS.right,
    marginTop: MOHR_PLOT_MARGINS.top,
    marginBottom: MOHR_PLOT_MARGINS.bottom,
    style: { backgroundColor: "white" },
    x: {
      label: t("mohrNormalStressAxisLabel"),
      domain: [xDomainMin, xDomainMax],
      grid: true,
    },
    y: {
      label: t("shearStressAxisLabel"),
      domain: [0, yDomainMax],
      grid: true,
    },
    marks: [
      Plot.frame(),
      // Fitted Mohr-Coulomb envelope: τ = c + σ·tan(φ)
      ...(envelope
        ? [
            Plot.line(
              [
                { x: xDomainMin, y: envelope.cohesion + envelope.tanPhi * xDomainMin },
                { x: xDomainMax, y: envelope.cohesion + envelope.tanPhi * xDomainMax },
              ],
              {
                x: "x",
                y: "y",
                stroke: "#6b7280",
                strokeWidth: 1.5,
                strokeDasharray: "6,3",
                clip: true,
              },
            ),
            Plot.text(
              [
                envelope.effective
                  ? `c′ = ${envelope.cohesion.toFixed(1)} kPa, φ′ = ${envelope.phi.toFixed(1)}°`
                  : `c = ${envelope.cohesion.toFixed(1)} kPa, φ = ${envelope.phi.toFixed(1)}°`,
              ],
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
      // Legend note when effective-stress circles are shown
      ...(effectiveCircles.length > 0
        ? [
            Plot.text([t("mohrEffectiveLegend")], {
              frameAnchor: "top-left",
              dx: 10,
              dy: envelope ? 26 : 10,
              fill: "#6b7280",
              fontSize: 10,
            }),
          ]
        : []),
      // Total-stress circles (solid)
      ...mohrCircles.map((circle) =>
        Plot.line(semicirclePoints(circle.sigma3, circle.sigma1), {
          x: "x",
          y: "y",
          stroke: circle.color,
          strokeWidth: 2,
        }),
      ),
      // Effective-stress circles (dashed)
      ...effectiveCircles.map((circle) =>
        Plot.line(semicirclePoints(circle.sigma3, circle.sigma1), {
          x: "x",
          y: "y",
          stroke: circle.color,
          strokeWidth: 1.5,
          strokeDasharray: "4,3",
        }),
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
              text: `σ₃=${Number.parseFloat(circle.sigma3.toFixed(1))}`,
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

/**
 * Build the pore-pressure vs axial-strain curves for undrained tests, one line
 * per test. Returns null when no test carries pore pressure measurements.
 */
export function buildPorePressureStrainPlot(
  tests: Array<ShearStressChangeDuringLoadingDetermination>,
  t: TranslateFunction,
): (SVGSVGElement | HTMLElement) | null {
  const allData: Array<{
    strain: number;
    porePressure: number;
    testIndex: number;
  }> = [];

  for (const [testIndex, test] of tests.entries()) {
    const loadStageData = test.loadStage?.shearStressChangeDuringLoading;
    if (!loadStageData) {
      continue;
    }

    for (const point of loadStageData) {
      if (point.porePressure != null) {
        allData.push({
          strain: point.axialStrain,
          porePressure: point.porePressure,
          testIndex,
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
      label: t("porePressureAxisLabel"),
      grid: true,
    },
    marks: [
      Plot.frame(),
      ...testGroups.map((group) =>
        Plot.line(group, {
          x: "strain",
          y: "porePressure",
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
