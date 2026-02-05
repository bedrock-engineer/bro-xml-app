import type { SaturatedPermeabilityDetermination } from "@bedrock-engineer/bro-xml";
import * as Plot from "@observablehq/plot";
import { useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PlotDownloadButtons } from "../plot-download-buttons";

interface PermeabilityDisplayProps {
  data: SaturatedPermeabilityDetermination;
  baseFilename: string;
}
export function PermeabilityDisplay({
  data,
  baseFilename,
}: PermeabilityDisplayProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const plotId = "permeability-plot";

  const permeabilityData = useMemo(
    () =>
      data.saturatedPermeabilityAtSpecificDensity.filter(
        (
          item,
        ): item is {
          dryVolumetricMassDensity: number;
          saturatedPermeability: number;
        } =>
          item.dryVolumetricMassDensity != null &&
          item.saturatedPermeability != null,
      ),
    [data.saturatedPermeabilityAtSpecificDensity],
  );

  useEffect(() => {
    if (!containerRef.current || permeabilityData.length === 0) {
      return;
    }

    const plot = Plot.plot({
      width: 500,
      height: 300,
      style: { backgroundColor: "white" },
      x: {
        label: "Dry density ρd (g/cm³)",
        grid: true,
      },
      y: {
        type: "log",
        label: "Permeability k (m/s)",
        grid: true,
      },
      marks: [
        Plot.frame(),
        Plot.line(permeabilityData, {
          x: "dryVolumetricMassDensity",
          y: "saturatedPermeability",
          stroke: "#2563eb",
          strokeWidth: 2,
        }),
        Plot.dot(permeabilityData, {
          x: "dryVolumetricMassDensity",
          y: "saturatedPermeability",
          fill: "#2563eb",
          r: 6,
        }),
        // Label each point
        Plot.text(permeabilityData, {
          x: "dryVolumetricMassDensity",
          y: "saturatedPermeability",
          text: (d: { saturatedPermeability: number }) =>
            d.saturatedPermeability.toExponential(1),
          dy: -12,
          fontSize: 10,
        }),
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
  }, [permeabilityData, t]);

  return (
    <div className="border border-gray-200 rounded p-4">
      <h4 className="font-medium mb-3">{t("saturatedPermeability")}</h4>

      {data.determinationMethod && (
        <p className="text-sm text-gray-600 mb-3">
          {t("method")}: {data.determinationMethod}
        </p>
      )}

      {permeabilityData.length > 0 && (
        <>
          <div className="flex justify-center mb-4">
            <div id={plotId} ref={containerRef}></div>
          </div>
          <PlotDownloadButtons plotId={plotId} filename={baseFilename} />
        </>
      )}

      {/* Data table */}
      <table className="w-full text-sm mt-4">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 text-left text-gray-500">ρd (g/cm³)</th>
            <th className="py-2 text-right text-gray-500">k (m/s)</th>
          </tr>
        </thead>
        <tbody>
          {permeabilityData.map((item, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-2">
                {item.dryVolumetricMassDensity.toFixed(3)}
              </td>
              <td className="py-2 text-right font-mono">
                {item.saturatedPermeability.toExponential(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
