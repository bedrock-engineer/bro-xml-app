import type {
  SettlementCharacteristicsDetermination,
  SettlementDeterminationStep,
} from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PlotDownloadButtons } from "../plot-download-buttons";

interface CompressionDataPoint {
  stress: number;
  strain: number;
  stepType: string | null;
}

interface SettlementCharacteristicsDisplayProps {
  data: SettlementCharacteristicsDetermination;
  baseFilename: string;
}
export function SettlementCharacteristicsDisplay({
  data,
  baseFilename,
}: SettlementCharacteristicsDisplayProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const plotId = "settlement-plot";

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    if (data.determinationSteps.length === 0) {
      return;
    }

    // Build stress-strain data for compression curve
    const compressionData: Array<CompressionDataPoint> = data.determinationSteps.flatMap(
      (step: SettlementDeterminationStep) =>
        step.verticalStress != null && step.strainPoint24hours != null
          ? [{ stress: step.verticalStress, strain: step.strainPoint24hours, stepType: step.stepType }]
          : [],
    );

    if (compressionData.length === 0) {
      return;
    }

    const plot = Plot.plot({
      width: 600,
      height: 400,
      style: { backgroundColor: "white" },
      x: {
        type: "log",
        label: "Vertical stress σ'v (kPa)",
        grid: true,
      },
      y: {
        label: "Vertical strain ε (%)",
        reverse: true,
        grid: true,
      },
      marks: [
        Plot.frame(),
        // Loading steps
        Plot.line(
          compressionData.filter(
            (d: CompressionDataPoint) => d.stepType === "belastingstap",
          ),
          {
            x: "stress",
            y: "strain",
            stroke: "#2563eb",
            strokeWidth: 2,
          },
        ),
        Plot.dot(
          compressionData.filter(
            (d: CompressionDataPoint) => d.stepType === "belastingstap",
          ),
          {
            x: "stress",
            y: "strain",
            fill: "#2563eb",
            r: 5,
          },
        ),
        // Unloading steps
        Plot.line(
          compressionData.filter(
            (d: CompressionDataPoint) => d.stepType === "ontlastingstap",
          ),
          {
            x: "stress",
            y: "strain",
            stroke: "#dc2626",
            strokeWidth: 2,
            strokeDasharray: "4,4",
          },
        ),
        Plot.dot(
          compressionData.filter(
            (d: CompressionDataPoint) => d.stepType === "ontlastingstap",
          ),
          {
            x: "stress",
            y: "strain",
            fill: "#dc2626",
            r: 5,
          },
        ),
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
      <h4 className="font-medium mb-3">{t("settlementCharacteristics")}</h4>

      <div className="mb-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {data.determinationMethod && (
            <>
              <dt className="text-gray-500">{t("method")}</dt>
              <dd>{data.determinationMethod}</dd>
            </>
          )}
          {data.ringDiameter !== null && (
            <>
              <dt className="text-gray-500">{t("ringDiameter")}</dt>
              <dd>{data.ringDiameter} mm</dd>
            </>
          )}
          {data.temperature !== null && (
            <>
              <dt className="text-gray-500">{t("temperature")}</dt>
              <dd>{data.temperature} °C</dd>
            </>
          )}
        </dl>
      </div>

      <div className="flex justify-center">
        <div id={plotId} ref={containerRef}></div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-600"></div>
          <span>{t("loading")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-0.5 bg-red-600"
            style={{ borderTop: "2px dashed #dc2626" }}
          ></div>
          <span>{t("unloading")}</span>
        </div>
      </div>

      <PlotDownloadButtons plotId={plotId} filename={baseFilename} />
    </div>
  );
}
