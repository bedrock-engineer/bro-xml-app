import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import type {
  BHRGTLayer,
  BoreholeSampleAnalysis,
} from "@bedrock-engineer/bro-xml-parser";
import {
  LAB_TEST_CATEGORIES,
  getLabTestCategories,
} from "./determination-types";
import { Card, CardTitle } from "../card";
import { LegendItem } from "../legend-item";
import {
  BhrgtDetailsTable,
  DETAILS_HEADER_HEIGHT,
  type DetailsTableLayout,
} from "./bhr-gt-details-table";
import { PlotDownloadButtons } from "../plot-download-buttons";
import {
  buildBhrgtPlot,
  CATEGORY_ORDER,
  type SampleLine,
  type TranslateFunction,
} from "./bhr-gt-plot-render";

import { SoilLegend } from "../soil-legend";
import { collectSoilLegend } from "~/util/bro-lithology";

const id = "boreplot";

interface BhrgtPlotProps {
  layers: Array<BHRGTLayer>;
  baseFilename: string;
  analysis?: BoreholeSampleAnalysis;
  /** Groundwater depth during drilling (m below surface) */
  groundwaterLevel?: number | null;
  /** Surface elevation (m NAP), enables the m-NAP depth-axis toggle. */
  surfaceNap?: number | null;
  width?: number;
  height?: number;
}

export function BHRGTPlot({
  layers,
  width = 300,
  height = 800,
  baseFilename,
  analysis,
  groundwaterLevel,
  surfaceNap,
}: BhrgtPlotProps) {
  const { t } = useTranslation();
  const [napMode, setNapMode] = useState(false);
  const [tableLayout, setTableLayout] = useState<DetailsTableLayout>("scaled");

  // Build sample lines from analysis data
  const sampleLines: Array<SampleLine> = useMemo(() => {
    const sampleLines: Array<SampleLine> = [];

    if (analysis?.investigatedIntervals) {
      for (const [
        intervalIndex,
        interval,
      ] of analysis.investigatedIntervals.entries()) {
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
    if (containerRef.current === null) {
      return;
    }

    const plot = buildBhrgtPlot({
      layers,
      sampleLines,
      groundwaterLevel,
      surfaceNap,
      napMode,
      width,
      height,
      t: t as TranslateFunction,
    });
    if (plot === null) {
      return;
    }

    containerRef.current.append(plot);

    return () => {
      plot.remove();
    };
  }, [
    layers,
    width,
    height,
    t,
    sampleLines,
    groundwaterLevel,
    surfaceNap,
    napMode,
  ]);

  const canShowNap = surfaceNap != null;

  // Legend entries reflect only the soils actually present in this borehole.
  const legendSoils = collectSoilLegend(layers);

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <CardTitle>{t("boreLog")}</CardTitle>
        <div className="flex items-center gap-2">
          <ToggleButtonGroup
            aria-label={t("tableLayout")}
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[tableLayout]}
            onSelectionChange={(keys) => {
              setTableLayout(keys.has("rows") ? "rows" : "scaled");
            }}
            className="inline-flex overflow-hidden rounded border border-gray-300 text-xs"
          >
            <ToggleButton
              id="scaled"
              className="cursor-pointer px-2 py-0.5 text-gray-600 transition-colors data-[selected]:bg-gray-700 data-[selected]:text-white hover:bg-gray-50 data-[selected]:hover:bg-gray-700"
            >
              {t("tableLayoutScaled")}
            </ToggleButton>

            <ToggleButton
              id="rows"
              className="cursor-pointer border-l border-gray-300 px-2 py-0.5 text-gray-600 transition-colors data-[selected]:bg-gray-700 data-[selected]:text-white hover:bg-gray-50 data-[selected]:hover:bg-gray-700"
            >
              {t("tableLayoutRows")}
            </ToggleButton>
          </ToggleButtonGroup>

          {canShowNap && (
            <ToggleButtonGroup
              aria-label={t("verticalReference")}
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[napMode ? "nap" : "mv"]}
              onSelectionChange={(keys) => {
                setNapMode(keys.has("nap"));
              }}
              className="inline-flex overflow-hidden rounded border border-gray-300 text-xs"
            >
              <ToggleButton
                id="mv"
                className="cursor-pointer px-2 py-0.5 text-gray-600 transition-colors data-[selected]:bg-gray-700 data-[selected]:text-white hover:bg-gray-50 data-[selected]:hover:bg-gray-700"
              >
                m -mv
              </ToggleButton>

              <ToggleButton
                id="nap"
                className="cursor-pointer border-l border-gray-300 px-2 py-0.5 text-gray-600 transition-colors data-[selected]:bg-gray-700 data-[selected]:text-white hover:bg-gray-50 data-[selected]:hover:bg-gray-700"
              >
                m NAP
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-2">
        {/* Spacer matches the table's header band so the chart's flush plot
            frame lines up with the table body on the same depths. */}
        <div className="flex flex-col">
          <div
            className="flex items-end px-1 pb-0.5 text-[10px] font-semibold text-gray-500"
            style={{ height: DETAILS_HEADER_HEIGHT }}
          >
            {napMode ? "m NAP" : "m -mv"}
          </div>

          <div id={id} ref={containerRef}></div>
        </div>

        <BhrgtDetailsTable
          layers={layers}
          height={height}
          surfaceNap={surfaceNap}
          napMode={napMode}
          layout={tableLayout}
        />
      </div>

      {/* Soil type legend */}
      <SoilLegend soils={legendSoils} idPrefix="boreplot-legend" />

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
