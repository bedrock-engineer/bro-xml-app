import type {
  ParticleSizeDistributionDetermination
} from "@bedrock-engineer/bro-xml";
import * as Plot from "@observablehq/plot";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { PlotDownloadButtons } from "../plot-download-buttons";

export interface ParticleSizeDistributionPlotProps {
  data: ParticleSizeDistributionDetermination;
  baseFilename: string;
}

export function ParticleSizeDistributionPlot({
  data,
  baseFilename,
}: ParticleSizeDistributionPlotProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const plotId = "psd-plot";

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // Build cumulative grain size curve data
    const sizeData: Array<{ size: number; passing: number }> = [];

    // Define size fractions in μm with their corresponding field names
    const fractions: Array<{
      size: number;
      field: keyof ParticleSizeDistributionDetermination;
    }> = [
      { size: 2, field: "fraction0to2um" },
      { size: 4, field: "fraction2to4um" },
      { size: 8, field: "fraction4to8um" },
      { size: 16, field: "fraction8to16um" },
      { size: 32, field: "fraction16to32um" },
      { size: 50, field: "fraction32to50um" },
      { size: 63, field: "fraction50to63um" },
      { size: 90, field: "fraction63to90um" },
      { size: 125, field: "fraction90to125um" },
      { size: 180, field: "fraction125to180um" },
      { size: 250, field: "fraction180to250um" },
      { size: 355, field: "fraction250to355um" },
      { size: 500, field: "fraction355to500um" },
      { size: 710, field: "fraction500to710um" },
      { size: 1000, field: "fraction710to1000um" },
      { size: 1400, field: "fraction1000to1400um" },
      { size: 2000, field: "fraction1400umto2mm" },
      { size: 4000, field: "fraction2to4mm" },
      { size: 8000, field: "fraction4to8mm" },
      { size: 16_000, field: "fraction16to31_5mm" },
      { size: 63_000, field: "fraction31_5to63mm" },
    ];

    let cumulative = 0;
    for (const { size, field } of fractions) {
      const value = data[field] as number | null | undefined;
      if (value !== null && value !== undefined) {
        cumulative += value;
        sizeData.push({ size, passing: cumulative });
      }
    }

    if (sizeData.length === 0) {
      // Use basic fractions if detailed not available
      if (data.fractionSmaller63um != null) {
        sizeData.push({ size: 63, passing: data.fractionSmaller63um });
      }
      if (data.fractionLarger63um != null) {
        sizeData.push({ size: 63_000, passing: 100 });
      }
    }

    if (sizeData.length === 0) {
      return;
    }

    const plot = Plot.plot({
      width: 600,
      height: 400,
      style: { backgroundColor: "white" },
      x: {
        type: "log",
        label: "Particle size (μm)",
        grid: true,
        domain: [1, 100_000],
      },
      y: {
        label: "Cumulative passing (%)",
        domain: [0, 100],
        grid: true,
      },
      marks: [
        Plot.frame(),
        // Soil classification boundaries
        Plot.ruleX([2], { stroke: "#ddd", strokeDasharray: "4,4" }),
        Plot.ruleX([63], { stroke: "#ddd", strokeDasharray: "4,4" }),
        Plot.ruleX([2000], { stroke: "#ddd", strokeDasharray: "4,4" }),
        // Labels for soil types
        Plot.text([{ x: 10, y: 95, text: t("clay") }], {
          x: "x",
          y: "y",
          text: "text",
          fontSize: 10,
          fill: "gray",
        }),
        Plot.text([{ x: 200, y: 95, text: t("sand") }], {
          x: "x",
          y: "y",
          text: "text",
          fontSize: 10,
          fill: "gray",
        }),
        Plot.text([{ x: 10_000, y: 95, text: t("gravel") }], {
          x: "x",
          y: "y",
          text: "text",
          fontSize: 10,
          fill: "gray",
        }),
        // Data line
        Plot.line(sizeData, {
          x: "size",
          y: "passing",
          stroke: "#2563eb",
          strokeWidth: 2,
        }),
        Plot.dot(sizeData, {
          x: "size",
          y: "passing",
          fill: "#2563eb",
          r: 2,
        }),
        // Watermark
        Plot.text([t("madeWithBedrockBroViewer")], {
          frameAnchor: "top-right",
          dx: -5,
          dy: 5,
          fill: "gray",
          fontSize: 8,
        }),
      ],
    });

    containerRef.current.append(plot);

    return () => {
      plot.remove();
    };
  }, [data, t]);

  return (
    <div className="border border-gray-200 rounded p-4">
      <h4 className="font-medium mb-3">{t("particleSizeDistribution")}</h4>

      <div className="flex justify-center">
        <div id={plotId} ref={containerRef}></div>
      </div>

      <div className="mt-3 text-sm text-gray-600">
        {data.determinationMethod && (
          <p>
            {t("method")}: {data.determinationMethod}
          </p>
        )}
        {data.fractionSmaller63um !== null && (
          <p>
            {t("finesFraction")} (&lt;63μm):{" "}
            {data.fractionSmaller63um?.toFixed(1)}%
          </p>
        )}
      </div>

      <PlotDownloadButtons plotId={plotId} filename={baseFilename} />
    </div>
  );
}

