import * as Plot from "@observablehq/plot";
import { max, min } from "d3-array";
import type { GMWData, GMWMonitoringTube } from "../../types/bro-data";
import { formatCode } from "../../util/format";
import {
  createWatermarkMark,
  type TranslateFunction,
} from "../../util/plot-config";

/** Fills for the three parts of a monitoring tube, reused by the HTML legend. */
export const PLAIN_TUBE_COLOR = "#cbd5e1"; // slate-300
export const SCREEN_COLOR = "#2563eb"; // blue — the filter, the business end
export const SEDIMENT_SUMP_COLOR = "#b45309"; // amber-700
export const GROUND_LEVEL_COLOR = "#78716c"; // stone-500

/** Half-width of a tube column in x-units (columns are one unit apart). */
const TUBE_HALF_WIDTH = 0.28;

interface TubeSegment {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  color: string;
  title: string;
}

interface TubeLabel {
  x: number;
  y: number;
  label: string;
}

interface BuildGmwSchematicOptions {
  data: GMWData;
  t: TranslateFunction;
  width: number;
  height: number;
}

function segmentTitle(
  tube: GMWMonitoringTube,
  kindLabel: string,
  top: number,
  bottom: number,
  t: TranslateFunction,
): string {
  const lines = [
    `${t("tube")} ${tube.tubeNumber ?? "?"} — ${kindLabel}`,
    `${top.toFixed(2)} – ${bottom.toFixed(2)} m NAP`,
  ];
  const material = formatCode(tube.materialUsed?.tubeMaterial);
  if (material) {
    lines.push(`${t("tubeMaterial")}: ${material}`);
  }
  if (tube.tubeTopDiameter !== null) {
    lines.push(`${t("tubeTopDiameter")}: ${tube.tubeTopDiameter} mm`);
  }
  return lines.join("\n");
}

/**
 * Build a groundwater monitoring well schematic: each monitoring tube is a
 * column on a height (m NAP) axis, split into its plain riser, screen (filter)
 * and sediment sump, with the ground level drawn as a reference rule. Returns
 * null when no tube carries enough vertical geometry to place a segment.
 */
export function buildGmwSchematic({
  data,
  t,
  width,
  height,
}: BuildGmwSchematicOptions): SVGSVGElement | HTMLElement | null {
  const tubes = data.monitoringTube;
  const segments: Array<TubeSegment> = [];
  const labels: Array<TubeLabel> = [];

  for (const [index, tube] of tubes.entries()) {
    const center = index;
    const x1 = center - TUBE_HALF_WIDTH;
    const x2 = center + TUBE_HALF_WIDTH;

    const tubeTop = tube.tubeTopPosition;
    const screenTop = tube.screen?.screenTopPosition ?? null;
    const screenBottom = tube.screen?.screenBottomPosition ?? null;
    const sumpLength = tube.sedimentSump?.sedimentSumpLength ?? null;

    // Plain riser: from the screen top up to the tube top.
    if (tubeTop !== null && screenTop !== null && tubeTop > screenTop) {
      segments.push({
        x1,
        x2,
        y1: screenTop,
        y2: tubeTop,
        color: PLAIN_TUBE_COLOR,
        title: segmentTitle(tube, t("plainTubePart"), screenTop, tubeTop, t),
      });
    }

    // Screen (filter): the perforated interval the water enters through.
    if (screenTop !== null && screenBottom !== null && screenTop > screenBottom) {
      segments.push({
        x1,
        x2,
        y1: screenBottom,
        y2: screenTop,
        color: SCREEN_COLOR,
        title: segmentTitle(tube, t("screen"), screenBottom, screenTop, t),
      });
    }

    // Sediment sump: hangs below the screen to collect settling sediment.
    if (screenBottom !== null && sumpLength !== null && sumpLength > 0) {
      const sumpBottom = screenBottom - sumpLength;
      segments.push({
        x1,
        x2,
        y1: sumpBottom,
        y2: screenBottom,
        color: SEDIMENT_SUMP_COLOR,
        title: segmentTitle(tube, t("sedimentSump"), sumpBottom, screenBottom, t),
      });
    }

    // Label the column at its highest known point.
    const labelY = tubeTop ?? screenTop ?? screenBottom;
    if (labelY !== null && tube.tubeNumber !== null) {
      labels.push({
        x: center,
        y: labelY,
        label: `${t("tube")} ${tube.tubeNumber}`,
      });
    }
  }

  if (segments.length === 0) {
    return null;
  }

  const groundLevel = data.deliveredVerticalPosition?.groundLevelPosition ?? null;

  const lows = segments.map((segment) => segment.y1);
  const highs = segments.map((segment) => segment.y2);
  if (groundLevel !== null) {
    highs.push(groundLevel);
    lows.push(groundLevel);
  }
  const minY = min(lows) ?? 0;
  const maxY = max(highs) ?? 0;
  const padding = Math.max((maxY - minY) * 0.08, 0.1);

  const plot = Plot.plot({
    style: {
      overflow: "visible",
      backgroundColor: "white",
    },
    width,
    height,
    marginLeft: 55,
    marginRight: 30,
    marginTop: 30,
    marginBottom: 30,
    // Colours are passed verbatim; the legend is rendered in HTML alongside.
    color: { type: "identity" },
    x: {
      axis: null,
      domain: [-0.6, Math.max(tubes.length - 1, 0) + 0.6],
    },
    y: {
      label: t("heightMNAP"),
      grid: true,
      domain: [minY - padding, maxY + padding],
    },
    marks: [
      Plot.rect(segments, {
        x1: "x1",
        x2: "x2",
        y1: "y1",
        y2: "y2",
        fill: "color",
        stroke: "white",
        strokeWidth: 0.5,
        title: "title",
        tip: true,
      }),
      ...(groundLevel === null
        ? []
        : [
            Plot.ruleY([groundLevel], {
              stroke: GROUND_LEVEL_COLOR,
              strokeDasharray: "4 3",
            }),
            Plot.text([{ x: -0.55, y: groundLevel }], {
              x: "x",
              y: "y",
              text: () =>
                `${t("groundLevelPosition")} ${groundLevel.toFixed(2)} m NAP`,
              textAnchor: "start",
              dy: -4,
              fontSize: 9,
              fill: GROUND_LEVEL_COLOR,
            }),
          ]),
      Plot.text(labels, {
        x: "x",
        y: "y",
        text: "label",
        textAnchor: "middle",
        dy: -8,
        fontSize: 10,
        fontWeight: "bold",
        fill: "black",
      }),
      Plot.frame(),
      createWatermarkMark(t("madeWithBedrockBroViewer")),
    ],
  });

  return plot;
}
