import type { SaturatedPermeabilityDetermination } from "@bedrock-engineer/bro-xml-parser";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TranslateFunction } from "../../util/plot-config";
import { PlotFigure } from "../plot-figure";
import { buildPermeabilityPlot, type PermeabilityPoint } from "./permeability-plot";

interface PermeabilityDisplayProps {
  data: SaturatedPermeabilityDetermination;
  baseFilename: string;
}
export function PermeabilityDisplay({
  data,
  baseFilename,
}: PermeabilityDisplayProps) {
  const { t } = useTranslation();

  const permeabilityData = useMemo<Array<PermeabilityPoint>>(
    () =>
      data.saturatedPermeabilityAtSpecificDensity.filter(
        (item): item is PermeabilityPoint =>
          item.dryVolumetricMassDensity != null &&
          item.saturatedPermeability != null,
      ),
    [data.saturatedPermeabilityAtSpecificDensity],
  );

  return (
    <div className="border border-gray-200 rounded p-4">
      <h4 className="font-medium mb-3">{t("saturatedPermeability")}</h4>

      {data.determinationMethod && (
        <p className="text-sm text-gray-600 mb-3">
          {t("method")}: {data.determinationMethod}
        </p>
      )}

      {permeabilityData.length > 0 && (
        <div className="mb-4">
          <PlotFigure
            render={() =>
              buildPermeabilityPlot(permeabilityData, t as TranslateFunction)
            }
            deps={[permeabilityData, t]}
            filename={baseFilename}
          />
        </div>
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
