import * as Plot from "@observablehq/plot";
import { max, min } from "d3-array";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { BHRGBoreLayer } from "../../types/bro-data";
import { formatCode } from "../../util/format";
import {
  bhrgLithology,
  buildSoilBands,
  collectSoilLegend,
  injectHatchPatterns,
  type SoilBand,
} from "../../util/bro-lithology";
import {
  PLOT_MARGINS,
  createWatermarkMark,
  depthYAxisConfig,
  filterLayersByPixelHeight,
  hiddenXAxisConfig,
} from "../../util/plot-config";
import { Card, CardTitle } from "../card";
import { PlotDownloadButtons } from "../plot-download-buttons";
import { SoilLegend } from "../soil-legend";
const id = "bhrg-plot";

/** BHR-G layers carry their BRO soil name in the NEN5104 field. */
const soilNameOf = (layer: BHRGBoreLayer): string =>
  formatCode(layer.soil?.soilNameNEN5104) ?? "";

const isAnthropogenic = (layer: BHRGBoreLayer): boolean =>
  layer.anthropogenic === "ja";
const isRooted = (layer: BHRGBoreLayer): boolean => layer.rooted === "ja";

interface BHRGPlotProps {
  layers: Array<BHRGBoreLayer>;
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

    // Split each layer into proportional soil-composition bands (main soil +
    // admixtures), coloured by soil type with a hatch overlay per band — the
    // same scheme as the BHR-GT bore plot.
    const soilBands = buildSoilBands(layers.map(bhrgLithology));
    const hatchedBands = soilBands.filter((b) => b.hatchId);

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
      // Pass fill values verbatim (hex colours and url(#pattern) refs)
      color: { type: "identity" },
      x: hiddenXAxisConfig,
      y: depthYAxisConfig,
      marks: [
        // Soil composition bands
        Plot.rect(soilBands, {
          x1: "x1",
          x2: "x2",
          y1: "y1",
          y2: "y2",
          fill: "color",
          stroke: "white",
          strokeWidth: 0.5,
        }),
        // Hatch overlay per band (second visual channel beyond colour)
        Plot.rect(hatchedBands, {
          x1: "x1",
          x2: "x2",
          y1: "y1",
          y2: "y2",
          fill: (d: SoilBand) => `url(#${d.hatchId})`,
          stroke: null,
        }),
        // Transparent full-width overlay carrying the per-layer tooltip
        Plot.rect(layers, {
          x1: 0,
          x2: 1,
          y1: "upperBoundary",
          y2: "lowerBoundary",
          fill: "transparent",
          title: formatBHRGLayerTitle,
          tip: true,
        }),
        // Anthropogenic indicator (hatching pattern simulation with dots)
        Plot.dot(
          layers.filter(isAnthropogenic),
          {
            x: 1.2,
            y: (d: BHRGBoreLayer) =>
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
          layers.filter(isRooted),
          {
            x: 1.1,
            y: (d: BHRGBoreLayer) =>
              d.upperBoundary + (d.lowerBoundary - d.upperBoundary) / 2,
            fill: "#228b22",
            r: 3,
            title: t("rooted"),
            symbol: "triangle",
            tip: true,
          },
        ),
        // NEN5104 soil-name labels for layers tall enough in pixels. A white
        // halo (paint-order: stroke) plus wrapping keeps names legible over
        // the narrow, dark soil bands, matching the BHR-GT plot.
        Plot.text(layersWithLabels, {
          x: 0.5,
          y: (d: BHRGBoreLayer) =>
            d.upperBoundary + (d.lowerBoundary - d.upperBoundary) / 2,
          text: soilNameOf,
          fill: "black",
          stroke: "white",
          strokeWidth: 2,
          paintOrder: "stroke",
          fontSize: 9,
          textAnchor: "middle",
          lineWidth: 8,
          lineHeight: 1,
        }),
        Plot.frame(),
        createWatermarkMark(t("madeWithBedrockBroViewer")),
      ],
    });

    // Inject the hatch <pattern> defs the bands reference via url(#…).
    const svg = (
      plot.tagName.toLowerCase() === "svg" ? plot : plot.querySelector("svg")
    ) as SVGElement | null;
    if (svg) {
      injectHatchPatterns(svg);
    }

    containerRef.current.append(plot);

    return () => {
      plot.remove();
    };
  }, [layers, width, height, t]);

  const hasAnthropogenic = layers.some(isAnthropogenic);
  const hasRooted = layers.some(isRooted);

  // Legend entries reflect only the soils actually present in this borehole.
  const legendSoils = collectSoilLegend(layers.map(bhrgLithology));

  return (
    <Card>
      <CardTitle>{t("geologicalBoreLog")}</CardTitle>

      <div className="flex justify-center">
        <div id={id} ref={containerRef}></div>
      </div>

      {/* Soil type legend */}
      <SoilLegend soils={legendSoils} idPrefix="bhrg-legend" />

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

function formatBHRGLayerTitle(layer: BHRGBoreLayer): string {
  const soil = layer.soil;
  const parts = [
    `${layer.upperBoundary.toFixed(2)} – ${layer.lowerBoundary.toFixed(2)} m`,
    `NEN5104: ${soilNameOf(layer)}`,
  ];

  const optional: Array<[string, string | null]> = [
    ["Color", formatCode(soil?.colour)],
    ["Anthropogenic", layer.anthropogenic],
    ["Rooted", layer.rooted],
    ["Organic matter", formatCode(soil?.organicMatterContentClassNEN5104)],
    ["Carbonate", formatCode(soil?.carbonateContentClass)],
    ["Gravel", formatCode(soil?.gravelContentClass)],
    ["Sand median", formatCode(soil?.sandFraction?.sandMedianClass)],
  ];

  for (const [label, value] of optional) {
    if (value) {
      parts.push(`${label}: ${value}`);
    }
  }

  return parts.join("\n");
}
