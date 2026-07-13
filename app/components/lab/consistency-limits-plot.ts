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
      // A-line
      Plot.line([
        [4, 4],
        [25.5, 4],
        [25.5, aLine(25.5)],
        [102, aLine(102)],
      ]),
      // Line labels
      Plot.text([{ x: 95, y: aLine(95) - 3, text: t("aLineLabel") }], {
        x: "x",
        y: "y",
        text: "text",
        fontSize: 10,
        fill: "gray",
      }),
      Plot.text([{ x: 62, y: uLine(62) + 5, text: t("uLineLabel") }], {
        x: "x",
        y: "y",
        text: "text",
        fontSize: 10,
        fill: "lightgrey",
      }),
      // Classification zone labels per ASTM D2487 Fig. 4: clays (C) above the
      // A-line, silts (M) below; organic soils (O) can plot in either zone
      Plot.text(
        [
          { x: 37, y: 20, text: "CL or OL" },
          { x: 72, y: 46, text: "CH or OH" },
          { x: 43, y: 7, text: "ML or OL" },
          { x: 82, y: 22, text: "MH or OH" },
        ],
        {
          x: "x",
          y: "y",
          text: "text",
          fontSize: 10,
          fill: "gray",
        },
      ),
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
