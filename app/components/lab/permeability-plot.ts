import * as Plot from "@observablehq/plot";
import {
  createWatermarkMark,
  type TranslateFunction,
} from "../../util/plot-config";

/** One permeability result against the condition it was determined at. */
export interface PermeabilityPoint {
  /** Dry density (g/cm³) or load (kPa), depending on the dataset */
  x: number;
  saturatedPermeability: number;
}

/**
 * Build a saturated-permeability plot (k on a log y-axis against the
 * determination condition: dry density or load). Returns null when there are
 * no points to render.
 */
export function buildPermeabilityPlot(
  data: Array<PermeabilityPoint>,
  xLabel: string,
  t: TranslateFunction,
): (SVGSVGElement | HTMLElement) | null {
  if (data.length === 0) {
    return null;
  }

  return Plot.plot({
    width: 500,
    height: 300,
    style: { backgroundColor: "white" },
    x: {
      label: xLabel,
      grid: true,
    },
    y: {
      type: "log",
      label: t("permeabilityAxisLabel"),
      grid: true,
    },
    marks: [
      Plot.frame(),
      Plot.line(data, {
        x: "x",
        y: "saturatedPermeability",
        stroke: "#2563eb",
        strokeWidth: 2,
      }),
      Plot.dot(data, {
        x: "x",
        y: "saturatedPermeability",
        fill: "#2563eb",
        r: 6,
      }),
      // Label each point with its permeability value
      Plot.text(data, {
        x: "x",
        y: "saturatedPermeability",
        text: (d: PermeabilityPoint) =>
          d.saturatedPermeability.toExponential(1),
        dy: -12,
        fontSize: 10,
      }),
      createWatermarkMark(t("madeWithBedrockBroViewer"), {
        frameAnchor: "top-right",
        dx: -5,
        dy: 5,
      }),
    ],
  });
}
