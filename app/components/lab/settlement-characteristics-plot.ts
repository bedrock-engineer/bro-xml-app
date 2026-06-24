import type {
  SettlementCharacteristicsDetermination,
  SettlementDeterminationStep,
} from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import {
  createWatermarkMark,
  type TranslateFunction,
} from "../../util/plot-config";

interface CompressionDataPoint {
  stress: number;
  strain: number;
  stepType: string | null;
}

/** Build the stress-strain compression points from the determination steps. */
function buildCompressionData(
  data: SettlementCharacteristicsDetermination,
): Array<CompressionDataPoint> {
  return data.determinationSteps.flatMap((step: SettlementDeterminationStep) =>
    step.verticalStress != null && step.strainPoint24hours != null
      ? [
          {
            stress: step.verticalStress,
            strain: step.strainPoint24hours,
            stepType: step.stepType,
          },
        ]
      : [],
  );
}

/**
 * Build the settlement compression curve (vertical strain vs vertical stress,
 * log x-axis, reversed y). Returns null when there are no compression points.
 */
export function buildSettlementCharacteristicsPlot(
  data: SettlementCharacteristicsDetermination,
  t: TranslateFunction,
): (SVGSVGElement | HTMLElement) | null {
  const compressionData = buildCompressionData(data);

  if (compressionData.length === 0) {
    return null;
  }

  const loading = compressionData.filter((d) => d.stepType === "belastingstap");
  const unloading = compressionData.filter(
    (d) => d.stepType === "ontlastingstap",
  );

  return Plot.plot({
    width: 600,
    height: 400,
    style: { backgroundColor: "white" },
    x: {
      type: "log",
      label: t("verticalStressAxisLabel"),
      grid: true,
    },
    y: {
      label: t("verticalStrainAxisLabel"),
      reverse: true,
      grid: true,
    },
    marks: [
      Plot.frame(),
      // Loading steps
      Plot.line(loading, {
        x: "stress",
        y: "strain",
        stroke: "#2563eb",
        strokeWidth: 2,
      }),
      Plot.dot(loading, {
        x: "stress",
        y: "strain",
        fill: "#2563eb",
        r: 5,
      }),
      // Unloading steps
      Plot.line(unloading, {
        x: "stress",
        y: "strain",
        stroke: "#dc2626",
        strokeWidth: 2,
        strokeDasharray: "4,4",
      }),
      Plot.dot(unloading, {
        x: "stress",
        y: "strain",
        fill: "#dc2626",
        r: 5,
      }),
      createWatermarkMark(t("madeWithBedrockBroViewer"), {
        frameAnchor: "top-right",
        dx: -5,
        dy: 5,
      }),
    ],
  });
}
