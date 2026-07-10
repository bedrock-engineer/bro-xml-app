import type { CPTData } from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import { max } from "d3-array";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  buildRemovedLayerBands,
  collectRemovedLayerLegend,
  injectHatchPatterns,
  type SoilBand,
} from "../util/bro-lithology";
import {
  createWatermarkMark,
  filterLayersByPixelHeight,
  hiddenXAxisConfig,
} from "../util/plot-config";
import { Card, CardTitle } from "./card";
import { PlotDownloadButtons } from "./plot-download-buttons";
import { SoilLegend } from "./soil-legend";

type RemovedLayer = CPTData["removedLayers"][number];

interface RemovedLayersPlotProps {
  layers: Array<RemovedLayer>;
  width?: number;
  height?: number;
  baseFilename: string;
}

const id = "removed-layers-plot";

/**
 * Pre-excavation (voorontgraving) strip: the layers removed before the CPT was
 * performed, drawn as a small soil log on its own depth scale, with a table of
 * the depth ranges and material descriptions beside it. The CPT's zero depth
 * is the surface *after* removal, so these layers matter when relating
 * penetration length to the original ground level.
 */
export function RemovedLayersPlot({
  layers,
  width = 150,
  height = 300,
  baseFilename,
}: RemovedLayersPlotProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...layers].toSorted((a, b) => a.sequenceNumber - b.sequenceNumber),
    [layers],
  );

  useEffect(() => {
    if (containerRef.current === null || sorted.length === 0) {
      return;
    }

    const marginTop = 20;
    const marginBottom = 15;
    const maxDepth = max(sorted.map((l) => l.lowerBoundary)) ?? 1;
    const plotHeight = height - marginTop - marginBottom;

    // Only label layers tall enough in pixels to carry text.
    const layersWithLabels = filterLayersByPixelHeight(
      sorted,
      plotHeight,
      0,
      maxDepth,
    );

    const bands = buildRemovedLayerBands(sorted);
    const hatchedBands = bands.filter((b) => b.hatchId);

    const plot = Plot.plot({
      style: {
        overflow: "visible",
        backgroundColor: "white",
      },
      width,
      height,
      marginLeft: 50,
      marginRight: 20,
      marginTop,
      marginBottom,
      // Pass fill values verbatim (hex colours and url(#pattern) refs)
      color: { type: "identity" },
      x: hiddenXAxisConfig,
      y: {
        reverse: true,
        label: "Depth (m)",
        grid: true,
        domain: [0, maxDepth],
      },
      marks: [
        // One band per layer, coloured by the lithology matched from the
        // description (grey for non-soil materials like tegel or asfalt).
        Plot.rect(bands, {
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
        Plot.rect(sorted, {
          x1: 0,
          x2: 1,
          y1: "upperBoundary",
          y2: "lowerBoundary",
          fill: "transparent",
          title: (d: RemovedLayer) =>
            `${d.upperBoundary.toFixed(2)} – ${d.lowerBoundary.toFixed(2)} m\n${d.description ?? ""}`,
          tip: true,
        }),
        // Description labels for layers tall enough in pixels, wrapped to the
        // band column with a white halo so they stay legible over the colours.
        Plot.text(layersWithLabels, {
          x: 0.5,
          y: (d: RemovedLayer) =>
            d.upperBoundary + (d.lowerBoundary - d.upperBoundary) / 2,
          text: (d: RemovedLayer) => d.description,
          fill: "black",
          stroke: "white",
          strokeWidth: 1.5,
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
    const svg =
      plot.tagName.toLowerCase() === "svg" ? plot : plot.querySelector("svg");
    if (svg) {
      injectHatchPatterns(svg as SVGElement);
    }

    containerRef.current.append(plot);
    return () => {
      plot.remove();
    };
  }, [sorted, width, height, t]);

  if (layers.length === 0) {
    return null;
  }

  // Legend entries reflect only the soils actually present in these layers.
  const legendSoils = collectRemovedLayerLegend(sorted);

  return (
    <Card>
      <CardTitle>{t("preExcavation")}</CardTitle>

      <p className="text-sm text-gray-600 mb-4">
        {t("preExcavationDescription")}
      </p>

      <div className="flex flex-wrap items-start justify-center gap-8">
        <div id={id} ref={containerRef}></div>

        <table className="text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-6 font-medium">{t("depthRange")} (m)</th>
              <th className="py-2 font-medium">{t("description")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((layer) => (
              <tr
                key={layer.sequenceNumber}
                className="border-b border-gray-100 last:border-0"
              >
                <td className="py-2 pr-6 font-mono">
                  {layer.upperBoundary.toFixed(2)} –{" "}
                  {layer.lowerBoundary.toFixed(2)}
                </td>
                <td className="py-2">{layer.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SoilLegend soils={legendSoils} idPrefix="removed-layers-legend" />

      <PlotDownloadButtons
        plotId={id}
        filename={`${baseFilename}-pre-excavation`}
      />
    </Card>
  );
}
