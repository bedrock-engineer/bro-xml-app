import * as Plot from "@observablehq/plot";

export const PLOT_MARGINS = {
  left: 50,
  right: 220,
  bottom: 20,
  top: 30,
} as const;

export const MIN_LAYER_HEIGHT_PX = 15;

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

/**
 * Calculate pixels per meter for a given plot configuration
 */
export function calculatePixelsPerMeter(
  plotHeight: number,
  minDepth: number,
  maxDepth: number,
): number {
  const depthRange = maxDepth - minDepth;
  return plotHeight / depthRange;
}
