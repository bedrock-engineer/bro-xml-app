import type { ConsistencyLimitsDetermination } from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PlotDownloadButtons } from "../plot-download-buttons";

export interface ConsistencyLimitsDisplayProps {
  data: ConsistencyLimitsDetermination;
  baseFilename: string;
}

export function ConsistencyLimitsDisplay({
  data,
  baseFilename,
}: ConsistencyLimitsDisplayProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const plotId = "atterberg-plot";

  // Casagrande plasticity chart
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    if (data.liquidLimit == null || data.plasticityIndex == null) {
      return;
    }

    // A-line: PI = 0.73 * (LL - 20)
    const a = (ll: number) => 0.73 * (ll - 20);
    // U-line: PI = 0.9 * (LL - 8)
    const u = (ll: number) => 0.9 * (ll - 8);

    const plot = Plot.plot({
      aspectRatio: 1,
      style: { backgroundColor: "white" },
      x: {
        domain: [0, 110],
        label: "Liquid Limit (%)",
        grid: true,
        ticks: 10,
      },
      y: {
        label: "Plasticity Index (%)",
        ticks: 8,
        domain: [0, 60],
        grid: true,
      },
      marks: [
        Plot.frame(),
        // U-line
        Plot.line(
          [
            [16, 0],
            [16, 7],
            [74.5, u(74.5)],
          ],
          { strokeDasharray: "8", stroke: "lightgrey" },
        ),
        // Vertical separator at LL=50 (low/high plasticity boundary)
        Plot.ruleX([50]),
        // Reference line PI = LL
        Plot.line([
          [0, 0],
          [60, 60],
        ]),
        // A-line
        Plot.line([
          [4, 4],
          [25.5, 4],
          [25.5, a(25.5)],
          [102, a(102)],
        ]),
        // Data point
        Plot.dot([data], {
          x: "liquidLimit",
          y: "plasticityIndex",
          fill: "red",
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
      <h4 className="font-medium mb-3">{t("atterbergLimits")}</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Values table */}
        <div>
          <table className="w-full text-sm">
            <tbody>
              {data.liquidLimit !== null && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500">
                    {t("liquidLimit")} (LL)
                  </td>
                  <td className="py-2 text-right font-mono">
                    {data.liquidLimit.toFixed(1)} %
                  </td>
                </tr>
              )}
              {data.plasticLimit !== null && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500">
                    {t("plasticLimit")} (PL)
                  </td>
                  <td className="py-2 text-right font-mono">
                    {data.plasticLimit.toFixed(1)} %
                  </td>
                </tr>
              )}
              {data.plasticityIndex !== null && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500">
                    {t("plasticityIndex")} (PI)
                  </td>
                  <td className="py-2 text-right font-mono">
                    {data.plasticityIndex.toFixed(1)} %
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Casagrande chart */}
        <div className="flex justify-center">
          <div id={plotId} ref={containerRef}></div>
        </div>
      </div>

      <PlotDownloadButtons plotId={plotId} filename={baseFilename} />
    </div>
  );
}
