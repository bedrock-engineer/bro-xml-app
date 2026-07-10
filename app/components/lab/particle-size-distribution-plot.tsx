import type { ParticleSizeDistributionDetermination } from "@bedrock-engineer/bro-xml-parser";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TranslateFunction } from "../../util/plot-config";
import { PlotDownloadButtons } from "../plot-download-buttons";
import { PlotFigure } from "../plot-figure";
import { buildParticleSizeDistributionPlot } from "./particle-size-distribution-plot-render";

export interface ParticleSizeDistributionPlotProps {
  data: ParticleSizeDistributionDetermination;
  baseFilename: string;
}

export function ParticleSizeDistributionPlot({
  data,
  baseFilename,
}: ParticleSizeDistributionPlotProps) {
  const { t } = useTranslation();
  const plotRef = useRef<HTMLDivElement>(null);

  return (
    <div className="border border-gray-200 rounded p-4">
      <h4 className="font-medium mb-3">{t("particleSizeDistribution")}</h4>

      <PlotFigure
        containerRef={plotRef}
        render={() =>
          buildParticleSizeDistributionPlot(data, t as TranslateFunction)
        }
        deps={[data, t]}
      />

      <div className="mt-3 text-sm text-gray-600">
        {data.determinationMethod && (
          <p>
            {t("method")}: {data.determinationMethod}
          </p>
        )}
        {data.fractionSmaller63um !== null && (
          <p>
            {t("finesFraction")} (&lt;63μm):{" "}
            {data.fractionSmaller63um.toFixed(1)}%
          </p>
        )}
      </div>

      <PlotDownloadButtons containerRef={plotRef} filename={baseFilename} />
    </div>
  );
}
