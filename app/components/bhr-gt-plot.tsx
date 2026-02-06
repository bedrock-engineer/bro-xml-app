import * as Plot from "@observablehq/plot";
import { max, min } from "d3-array";
import { scaleBand } from "d3-scale";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import type {
  BHRGTLayer,
  BoreholeSampleAnalysis,
} from "@bedrock-engineer/bro-xml-parser";
import { getSoilColor } from "@bedrock-engineer/bro-xml-parser";
import {
  LAB_TEST_CATEGORIES,
  getLabTestCategories,
  type LabTestCategory,
} from "../util/determination-types";
import {
  PLOT_MARGINS,
  depthYAxisConfig,
  hiddenXAxisConfig,
  createWatermarkMark,
  filterLayersByPixelHeight,
} from "../util/plot-config";
import { Card, CardTitle } from "./card";
import { LegendItem } from "./legend-item";
import { PlotDownloadButtons } from "./plot-download-buttons";

const id = "boreplot";

/** Default color when layer has no BRO color specified */
const DEFAULT_LAYER_COLOR = "#b0b0b0";

/**
 * Get hex color for a bore layer
 * Uses the BRO color field if available, otherwise falls back to default
 */
function getLayerColor(layer: BHRGTLayer): string {
  if (layer.color) {
    return getSoilColor(layer.color, DEFAULT_LAYER_COLOR);
  }
  return DEFAULT_LAYER_COLOR;
}

// Derived from LAB_TEST_CATEGORIES to ensure they stay in sync
const CATEGORY_ORDER = Object.keys(
  LAB_TEST_CATEGORIES,
) as Array<LabTestCategory>;

/** Band scale for positioning sample indicator columns by category */
const sampleCategoryScale = scaleBand<LabTestCategory>()
  .domain(CATEGORY_ORDER)
  .range([1.01, 1.01 + CATEGORY_ORDER.length * 0.053])
  .paddingInner(0.06)
  .paddingOuter(0);

interface SampleLine {
  beginDepth: number;
  endDepth: number;
  category: LabTestCategory;
  intervalIndex: number;
}

interface BhrgtPlotProps {
  layers: Array<BHRGTLayer>;
  baseFilename: string;
  analysis?: BoreholeSampleAnalysis;
  width?: number;
  height?: number;
}

export function BHRGTPlot({
  layers,
  width = 350,
  height = 800,
  baseFilename,
  analysis,
}: BhrgtPlotProps) {
  const { t } = useTranslation();

  // Build sample lines from analysis data
  const sampleLines: Array<SampleLine> = useMemo(() => {
    const sampleLines: Array<SampleLine> = [];

    if (analysis?.investigatedIntervals) {
      for (const [intervalIndex, interval] of analysis.investigatedIntervals.entries()) {
        const categories = getLabTestCategories(interval);
        for (const category of categories) {
          sampleLines.push({
            beginDepth: interval.beginDepth,
            endDepth: interval.endDepth,
            category,
            intervalIndex,
          });
        }
      }
    }

    return sampleLines;
  }, [analysis]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current === null || layers.length === 0) {
      return;
    }

    // Calculate the depth range
    const minDepth = min(layers.map((l) => l.upperBoundary)) ?? 0;
    const maxDepth = max(layers.map((l) => l.lowerBoundary)) ?? 0;
    const plotHeight = height - PLOT_MARGINS.top - PLOT_MARGINS.bottom - 20;

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
          fill: (d: BHRGTLayer) => getLayerColor(d),
          stroke: "white",
          strokeWidth: 0.5,
          title: (d: BHRGTLayer) =>
            formatBHRGTLayerTitle(d, t as TranslateFunction),
          tip: true,
        }),
        // Soil name labels for layers tall enough in pixels
        Plot.text(layersWithLabels, {
          x: 0.5,
          y: (d: BHRGTLayer) =>
            d.upperBoundary + (d.lowerBoundary - d.upperBoundary) / 2,
          text: (d: BHRGTLayer) => {
            // Truncate long names
            const name = d.geotechnicalSoilName;
            return name.length > 15 ? name.slice(0, 12) + "..." : name;
          },
          fill: "black",
          fontSize: 9,
          textAnchor: "middle",
        }),
        // Additional details displayed to the right of rectangles
        // Plot.text(layers, {
        //   x: 1,
        //   y: (d: BHRGTLayer) =>
        //     d.upperBoundary + (d.lowerBoundary - d.upperBoundary) / 2,
        //   text: (d: BHRGTLayer) => formatLayerDetails(d),
        //   fill: "black",
        //   fontSize: 9,
        //   textAnchor: "start",
        //   // dx: sampleLines.length > 0 ? 55 : 5,
        //   dx: 5,
        // }),
        // Sample interval lines showing lab test locations
        ...(sampleLines.length > 0
          ? [
              Plot.rect(sampleLines, {
                x1: (d: SampleLine) => sampleCategoryScale(d.category) ?? 1.01,
                x2: (d: SampleLine) =>
                  (sampleCategoryScale(d.category) ?? 1.01) +
                  sampleCategoryScale.bandwidth(),
                y1: "beginDepth",
                y2: "endDepth",
                fill: (d: SampleLine) => LAB_TEST_CATEGORIES[d.category].color,
                stroke: "white",
                strokeWidth: 0.5,
                title: (d: SampleLine) =>
                  `${t(`labTestType.${d.category}`)}\n${d.beginDepth.toFixed(2)} – ${d.endDepth.toFixed(2)} m`,
                tip: true,
              }),
            ]
          : []),
        Plot.frame(),
        createWatermarkMark(t("madeWithBedrockBroViewer")),
      ],
    });

    containerRef.current.append(plot);

    return () => {
      plot.remove();
    };
  }, [layers, width, height, t, sampleLines]);

  return (
    <Card>
      <CardTitle>{t("boreLog")}</CardTitle>

      <div className="flex justify-center">
        <div id={id} ref={containerRef}></div>
      </div>

      {/* Lab test sample legend */}
      {sampleLines.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {t("labTestSamples")}
          </h4>
          <div className="flex flex-wrap gap-3 text-xs">
            {CATEGORY_ORDER.filter((category) =>
              sampleLines.some((line) => line.category === category),
            ).map((category) => (
              <LegendItem
                key={category}
                color={LAB_TEST_CATEGORIES[category].color}
                label={t(`labTestType.${category}`)}
              />
            ))}
          </div>
        </div>
      )}

      <PlotDownloadButtons plotId={id} filename={`${baseFilename}-boorstaat`} />
    </Card>
  );
}

type TranslateFunction = (key: string) => string;

function formatBHRGTLayerTitle(layer: BHRGTLayer, t: TranslateFunction): string {
  const parts = [
    `${layer.upperBoundary.toFixed(2)} – ${layer.lowerBoundary.toFixed(2)} m`,
    layer.geotechnicalSoilName,
  ];

  if (layer.color) {
    parts.push(`${t("layerColor")}: ${layer.color}`);
  }

  if (layer.organicMatterContentClass) {
    parts.push(`${t("organicMatter")}: ${layer.organicMatterContentClass}`);
  }

  if (layer.carbonateContentClass) {
    parts.push(`${t("carbonateContentClass")}: ${layer.carbonateContentClass}`);
  }

  if (layer.sandMedianClass) {
    parts.push(`${t("sandMedian")}: ${layer.sandMedianClass}`);
  }

  if (layer.tertiaryConstituent) {
    parts.push(`${t("tertiaryConstituent")}: ${layer.tertiaryConstituent}`);
  }

  if (
    layer.dispersedInhomogeneity !== null &&
    layer.dispersedInhomogeneity !== undefined
  ) {
    parts.push(
      `${t("dispersedInhomogeneity")}: ${layer.dispersedInhomogeneity ? t("yes") : t("no")}`,
    );
  }

  if (layer.fineSoilConsistency) {
    parts.push(`${t("fineSoilConsistency")}: ${layer.fineSoilConsistency}`);
  }

  if (layer.organicSoilConsistency) {
    parts.push(
      `${t("organicSoilConsistency")}: ${layer.organicSoilConsistency}`,
    );
  }

  if (layer.organicSoilTexture) {
    parts.push(`${t("organicSoilTexture")}: ${layer.organicSoilTexture}`);
  }

  if (layer.peatTensileStrength) {
    parts.push(`${t("peatTensileStrength")}: ${layer.peatTensileStrength}`);
  }

  if (layer.grainshape) {
    if (layer.grainshape.angularity) {
      parts.push(`${t("angularity")}: ${layer.grainshape.angularity}`);
    }
    if (layer.grainshape.sphericity) {
      parts.push(`${t("sphericity")}: ${layer.grainshape.sphericity}`);
    }
  }

  if (layer.anthropogenic !== null && layer.anthropogenic !== undefined) {
    parts.push(
      `${t("anthropogenic")}: ${layer.anthropogenic ? t("yes") : t("no")}`,
    );
  }

  if (layer.bedded !== null && layer.bedded !== undefined) {
    parts.push(`${t("bedded")}: ${layer.bedded ? t("yes") : t("no")}`);
  }

  if (layer.mixed !== null && layer.mixed !== undefined) {
    parts.push(`${t("mixed")}: ${layer.mixed ? t("yes") : t("no")}`);
  }

  if (layer.mottled !== null && layer.mottled !== undefined) {
    parts.push(`${t("mottled")}: ${layer.mottled ? t("yes") : t("no")}`);
  }

  return parts.join("\n");
}
