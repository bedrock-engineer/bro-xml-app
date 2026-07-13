import * as Plot from "@observablehq/plot";
import { scaleLinear, type ScaleLinear } from "d3-scale";

/** Minimal shape of i18next's t() used by plot builders (dynamic keys → string). */
export type TranslateFunction = (key: string) => string;

/** Categorical palette for distinguishing multiple series/tests within a plot. */
export const CHART_COLORS: Array<string> = [
  "#2563eb", // blue
  "#dc2626", // red
  "#16a34a", // green
  "#9333ea", // purple
  "#ea580c", // orange
  "#0891b2", // cyan
];

export const PLOT_MARGINS = {
  left: 50,
  right: 220,
  bottom: 20,
  top: 30,
} as const;

const MIN_LAYER_HEIGHT_PX = 15;

export const depthYAxisConfig = {
  reverse: true,
  label: "Depth (m)",
  grid: true,
};

export const hiddenXAxisConfig = {
  axis: null,
  domain: [0, 1] as [number, number],
};

interface WatermarkOptions {
  frameAnchor?: "bottom-right" | "top-right";
  dx?: number;
  dy?: number;
}

export function createWatermarkMark(text: string, options?: WatermarkOptions) {
  return Plot.text([text], {
    frameAnchor: options?.frameAnchor ?? "bottom-right",
    dx: options?.dx ?? 0,
    dy: options?.dy ?? 15,
    fill: "gray",
    fontSize: 8,
  });
}

interface LayerWithBoundaries {
  upperBoundary: number;
  lowerBoundary: number;
}

/**
 * Filter layers to only include those tall enough in pixels to display labels
 */
export function filterLayersByPixelHeight<T extends LayerWithBoundaries>(
  layers: Array<T>,
  plotHeight: number,
  minDepth: number,
  maxDepth: number,
  minHeightPx = MIN_LAYER_HEIGHT_PX,
): Array<T> {
  const depthRange = maxDepth - minDepth;
  const pixelsPerMeter = plotHeight / depthRange;

  return layers.filter((layer) => {
    const layerThickness = layer.lowerBoundary - layer.upperBoundary;
    const layerHeightPx = layerThickness * pixelsPerMeter;
    return layerHeightPx >= minHeightPx;
  });
}

/** Domain + pixel range of a bore plot's depth axis — the single source of
 *  truth shared by Observable Plot's y scale and the HTML details table's d3
 *  scale, so the two can never drift. Range maps `minDepth`→top, `maxDepth`→
 *  bottom (depth increasing downward). */
interface DepthScaleSpec {
  domain: [number, number];
  range: [number, number];
}

function depthScaleSpec(
  height: number,
  minDepth: number,
  maxDepth: number,
  marginTop: number = PLOT_MARGINS.top,
): DepthScaleSpec {
  return {
    domain: [minDepth, maxDepth],
    range: [marginTop, height - PLOT_MARGINS.bottom],
  };
}

/**
 * d3 depth→pixel scale for the HTML overlay, built from the shared
 * {@link depthScaleSpec} so its rows align with the SVG chart's layers.
 */
export function makeDepthToPixel(
  height: number,
  minDepth: number,
  maxDepth: number,
  marginTop: number = PLOT_MARGINS.top,
): ScaleLinear<number, number> {
  const { domain, range } = depthScaleSpec(height, minDepth, maxDepth, marginTop);
  return scaleLinear().domain(domain).range(range);
}

/**
 * Observable Plot y-scale options for a bore plot, sharing domain + range with
 * {@link makeDepthToPixel} via {@link depthScaleSpec}. The explicit range
 * already orients depth downward, so (unlike {@link depthYAxisConfig}, which
 * lets Plot infer its range) no `reverse` is needed.
 */
export function depthYScaleOptions(
  height: number,
  minDepth: number,
  maxDepth: number,
  marginTop: number = PLOT_MARGINS.top,
) {
  const { domain, range } = depthScaleSpec(height, minDepth, maxDepth, marginTop);
  return {
    grid: depthYAxisConfig.grid,
    domain,
    range,
  };
}
