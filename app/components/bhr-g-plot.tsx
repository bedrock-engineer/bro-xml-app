import type { BHRGLayer } from "@bedrock-engineer/bro-xml-parser";
import { getSoilColor } from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import { max, min } from "d3-array";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  PLOT_MARGINS,
  createWatermarkMark,
  depthYAxisConfig,
  filterLayersByPixelHeight,
  hiddenXAxisConfig,
} from "../util/plot-config";
import { Card, CardTitle } from "./card";
import { PlotDownloadButtons } from "./plot-download-buttons";
const id = "bhrg-plot";

/** Default color when layer has no BRO color specified */
const DEFAULT_LAYER_COLOR = "#b0b0b0";

/**
 * Get hex color for a BHR-G layer
 * Uses the BRO color field if available, otherwise falls back to default
 */
function getLayerColor(layer: BHRGLayer): string {
  if (layer.color) {
    return getSoilColor(layer.color, DEFAULT_LAYER_COLOR);
  }
  return DEFAULT_LAYER_COLOR;
}

interface BHRGPlotProps {
  layers: Array<BHRGLayer>;
  baseFilename: string;
  width?: number;
  height?: number;
}

export function BHRGPlot({
  layers,
  width = 350,
  height = 800,
  baseFilename,
}: BHRGPlotProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current === null || layers.length === 0) {
      return;
    }

    // Calculate the depth range
    const minDepth = min(layers.map((l) => l.upperBoundary)) ?? 0;
    const maxDepth = max(layers.map((l) => l.lowerBoundary)) ?? 0;
    const plotHeight = height - PLOT_MARGINS.top - PLOT_MARGINS.bottom - 20;

    // Filter layers that are tall enough in pixels to show labels
    const layersWithLabels = filterLayersByPixelHeight(
      layers,
      plotHeight,
      minDepth,
      maxDepth,
    );

    const plot = Plot.plot({
      style: {
        overflow: "visible",
        backgroundColor: "white",
      },
      width,
      height,
      marginLeft: PLOT_MARGINS.left,
      marginRight: PLOT_MARGINS.right,
      marginBottom: PLOT_MARGINS.bottom,
      x: hiddenXAxisConfig,
      y: depthYAxisConfig,
      marks: [
        // Soil layer rectangles
        Plot.rect(layers, {
          x1: 0,
          x2: 1,
          y1: "upperBoundary",
          y2: "lowerBoundary",
          fill: (d: BHRGLayer) => getLayerColor(d),
          stroke: "white",
          strokeWidth: 0.5,
          title: formatBHRGLayerTitle,
          tip: true,
        }),
        // Anthropogenic indicator (hatching pattern simulation with dots)
        Plot.dot(
          layers.filter((l) => l.anthropogenic),
          {
            x: 1.2,
            y: (d: BHRGLayer) =>
              d.upperBoundary + (d.lowerBoundary - d.upperBoundary) / 2,
            fill: "#a0522d",
            r: 4,
            symbol: "square",
            title: t("anthropogenic"),
            tip: true,
          },
        ),
        // Rooted indicator
        Plot.dot(
          layers.filter((l) => l.rooted),
          {
            x: 1.1,
            y: (d: BHRGLayer) =>
              d.upperBoundary + (d.lowerBoundary - d.upperBoundary) / 2,
            fill: "#228b22",
            r: 3,
            title: t("rooted"),
            symbol: "triangle",
            tip: true,
          },
        ),
        // NEN5104 code labels for layers tall enough
        Plot.text(layersWithLabels, {
          x: 1.3,
          y: (d: BHRGLayer) =>
            d.upperBoundary + (d.lowerBoundary - d.upperBoundary) / 2,
          text: (d: BHRGLayer) => d.soilNameNEN5104,
          fill: "black",
          fontSize: 10,
          textAnchor: "start",
          // mixBlendMode:"difference"
        }),
        // Full soil descriptions to the right
        // Plot.text(layers, {
        //   x: 1,
        //   y: (d: BHRGLayer) =>
        //     d.upperBoundary + (d.lowerBoundary - d.upperBoundary) / 2,
        //   text: (d: BHRGLayer) => formatLayerDescription(d),
        //   fill: "black",
        //   fontSize: 9,
        //   textAnchor: "start",
        //   dx: 5,
        // }),
        Plot.frame(),
        createWatermarkMark(t("madeWithBedrockBroViewer")),
      ],
    });

    containerRef.current.append(plot);

    return () => {
      plot.remove();
    };
  }, [layers, width, height, t]);

  const hasAnthropogenic = layers.some((l) => l.anthropogenic);
  const hasRooted = layers.some((l) => l.rooted);

  return (
    <Card>
      <CardTitle>{t("geologicalBoreLog")}</CardTitle>

      <div className="flex justify-center">
        <div id={id} ref={containerRef}></div>
      </div>

      {/* Special indicators legend */}
      {(hasAnthropogenic || hasRooted) && (
        <div className="flex flex-wrap gap-4 mt-2 text-xs">
          {hasAnthropogenic && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-[#a0522d]" />
              <span className="text-gray-600">{t("anthropogenic")}</span>
            </div>
          )}
          {hasRooted && (
            <div className="flex items-center gap-1">
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderBottom: "8px solid #228b22",
                }}
              />
              <span className="text-gray-600">{t("rooted")}</span>
            </div>
          )}
        </div>
      )}

      <PlotDownloadButtons
        plotId={id}
        filename={`${baseFilename}-geologisch-profiel`}
      />
    </Card>
  );
}

function formatBHRGLayerTitle(layer: BHRGLayer): string {
  const parts = [
    `${layer.upperBoundary.toFixed(2)} – ${layer.lowerBoundary.toFixed(2)} m`,
    `NEN5104: ${layer.soilNameNEN5104}`,
  ];

  if (layer.color) {
    parts.push(`Color: ${layer.color}`);
  }

  if (layer.anthropogenic) {
    parts.push(`Anthropogenic: ${layer.anthropogenic}`);
  }

  if (layer.rooted) {
    parts.push(`Rooted: ${layer.rooted}`);
  }

  if (layer.organicMatterContentClassNEN5104) {
    parts.push(`Organic matter: ${layer.organicMatterContentClassNEN5104}`);
  }

  if (layer.carbonateContentClass) {
    parts.push(`Carbonate: ${layer.carbonateContentClass}`);
  }

  if (layer.gravelContentClass) {
    parts.push(`Gravel: ${layer.gravelContentClass}`);
  }

  if (layer.sandMedianClass) {
    parts.push(`Sand median: ${layer.sandMedianClass}`);
  }

  return parts.join("\n");
}
