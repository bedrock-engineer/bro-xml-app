import type { SaturatedPermeabilityDetermination } from "@bedrock-engineer/bro-xml-parser";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CodeValue } from "../code-value";
import type { TranslateFunction } from "../../util/plot-config";
import { PlotFigure } from "../plot-figure";
import {
  buildPermeabilityPlot,
  type PermeabilityPoint,
} from "./permeability-plot";
import { booleanRow, measureRow, TestConditions } from "./test-conditions";

interface PermeabilityDisplayProps {
  data: SaturatedPermeabilityDetermination;
  baseFilename: string;
}
export function PermeabilityDisplay({
  data,
  baseFilename,
}: PermeabilityDisplayProps) {
  const { t } = useTranslation();

  const byDensity = useMemo<Array<PermeabilityPoint>>(
    () =>
      // k must be positive for the log axis; a malformed zero/negative value
      // would otherwise break the whole plot rather than drop the point.
      data.saturatedPermeabilityAtSpecificDensity.flatMap((item) =>
        item.dryVolumetricMassDensity != null &&
        item.saturatedPermeability != null &&
        item.saturatedPermeability.value > 0
          ? [
              {
                x: item.dryVolumetricMassDensity.value,
                saturatedPermeability: item.saturatedPermeability.value,
              },
            ]
          : [],
      ),
    [data.saturatedPermeabilityAtSpecificDensity],
  );

  const byLoad = useMemo<Array<PermeabilityPoint>>(
    () =>
      data.saturatedPermeabilityAtSpecificLoad.flatMap((item) =>
        item.load != null &&
        item.saturatedPermeability != null &&
        item.saturatedPermeability.value > 0
          ? [
              {
                x: item.load.value,
                saturatedPermeability: item.saturatedPermeability.value,
              },
            ]
          : [],
      ),
    [data.saturatedPermeabilityAtSpecificLoad],
  );

  return (
    <div className="border border-gray-200 rounded p-4">
      <h4 className="font-medium mb-3">{t("saturatedPermeability")}</h4>

      {data.determinationMethod && (
        <p className="text-sm text-gray-600 mb-3">
          {t("method")}: <CodeValue coded={data.determinationMethod} />
        </p>
      )}

      {byDensity.length > 0 && (
        <PermeabilitySection
          title={t("permeabilityVsDensity")}
          points={byDensity}
          xHeader="ρd (g/cm³)"
          xAxisLabel={t("dryDensityAxisLabel")}
          filename={`${baseFilename}-density`}
        />
      )}

      {byLoad.length > 0 && (
        <PermeabilitySection
          title={t("permeabilityVsLoad")}
          points={byLoad}
          xHeader="σv (kPa)"
          xAxisLabel={t("loadAxisLabel")}
          filename={`${baseFilename}-load`}
        />
      )}

      <TestConditions
        rows={[
          measureRow(t("temperature"), data.temperature),
          booleanRow(t("verticallyDetermined"), data.verticallyDetermined, t),
          booleanRow(t("porousDiscWet"), data.porousDiscWet, t),
          booleanRow(t("swellObserved"), data.swellObserved, t),
          booleanRow(t("specimenMade"), data.specimenMade, t),
          booleanRow(t("saturatedWithCO2"), data.saturatedWithCO2, t),
          booleanRow(t("currentDownwards"), data.currentDownwards, t),
          booleanRow(t("waterDegassed"), data.waterDegassed, t),
          booleanRow(t("ringWaterRepellent"), data.ringWaterRepellent, t),
          measureRow(t("maximumGradient"), data.maximumGradient),
          measureRow(
            t("waterContentAfterwards"),
            data.waterContentAfterwards,
            1,
          ),
        ]}
      />
    </div>
  );
}

interface PermeabilitySectionProps {
  title: string;
  points: Array<PermeabilityPoint>;
  /** Column header for the condition the permeability was determined at */
  xHeader: string;
  xAxisLabel: string;
  filename: string;
}

/** One permeability dataset: plot plus the underlying value table. */
function PermeabilitySection({
  title,
  points,
  xHeader,
  xAxisLabel,
  filename,
}: PermeabilitySectionProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4">
      <h5 className="text-sm font-medium mb-2 text-center">{title}</h5>
      <PlotFigure
        render={() =>
          buildPermeabilityPlot(points, xAxisLabel, t as TranslateFunction)
        }
        deps={[points, xAxisLabel, t]}
        filename={filename}
      />

      <table className="w-full text-sm mt-4">
        <thead>
          <tr className="border-b border-gray-200">
            <th scope="col" className="py-2 text-left text-gray-500">
              {xHeader}
            </th>
            <th scope="col" className="py-2 text-right text-gray-500">
              k (m/s)
            </th>
          </tr>
        </thead>
        <tbody>
          {points.map((item, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-2">{item.x}</td>
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
