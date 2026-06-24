import type { ConsistencyLimitsDetermination } from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import {
  createWatermarkMark,
  type TranslateFunction,
} from "../../util/plot-config";

// A-line: PI = 0.73 * (LL - 20)
const aLine = (ll: number) => 0.73 * (ll - 20);
// U-line: PI = 0.9 * (LL - 8)
const uLine = (ll: number) => 0.9 * (ll - 8);

/**
 * Build the Casagrande plasticity chart (plasticity index vs liquid limit) with
 * the A-line and U-line references. Returns null when the sample has no liquid
 * limit or plasticity index.
 */
export function buildConsistencyLimitsPlot(
  data: ConsistencyLimitsDetermination,
  t: TranslateFunction,
): (SVGSVGElement | HTMLElement) | null {
  if (data.liquidLimit == null || data.plasticityIndex == null) {
    return null;
  }

  return Plot.plot({
    aspectRatio: 1,
    style: { backgroundColor: "white" },
    x: {
      domain: [0, 110],
      label: t("liquidLimitAxisLabel"),
      grid: true,
      ticks: 10,
    },
    y: {
      label: t("plasticityIndexAxisLabel"),
      ticks: 8,
      domain: [0, 60],
      grid: true,
    },
    marks: [
      Plot.frame(),
      // U-line
      Plot.line(
        [
          [16, 0],
          [16, 7],
          [74.5, uLine(74.5)],
        ],
        { strokeDasharray: "8", stroke: "lightgrey" },
      ),
      // Vertical separator at LL=50 (low/high plasticity boundary)
      Plot.ruleX([50]),
      // Reference line PI = LL
      Plot.line([
        [0, 0],
        [60, 60],
      ]),
      // A-line
      Plot.line([
        [4, 4],
        [25.5, 4],
        [25.5, aLine(25.5)],
        [102, aLine(102)],
      ]),
      // Data point
      Plot.dot([data], {
        x: "liquidLimit",
        y: "plasticityIndex",
        fill: "red",
      }),
      createWatermarkMark(t("madeWithBedrockBroViewer"), {
        frameAnchor: "top-right",
        dx: -5,
        dy: 5,
      }),
    ],
  });
}
