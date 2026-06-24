import * as Plot from "@observablehq/plot";
import {
  createWatermarkMark,
  type TranslateFunction,
} from "../../util/plot-config";

export interface PermeabilityPoint {
  dryVolumetricMassDensity: number;
  saturatedPermeability: number;
}

/**
 * Build the saturated-permeability plot (k vs dry density, log y-axis).
 * Returns null when there are no points to render.
 */
export function buildPermeabilityPlot(
  data: Array<PermeabilityPoint>,
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
      label: t("dryDensityAxisLabel"),
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
        x: "dryVolumetricMassDensity",
        y: "saturatedPermeability",
        stroke: "#2563eb",
        strokeWidth: 2,
      }),
      Plot.dot(data, {
        x: "dryVolumetricMassDensity",
        y: "saturatedPermeability",
        fill: "#2563eb",
        r: 6,
      }),
      // Label each point with its permeability value
      Plot.text(data, {
        x: "dryVolumetricMassDensity",
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
