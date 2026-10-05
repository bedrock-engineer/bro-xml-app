import type {
  Measure,
  SettlementCharacteristicsDetermination,
} from "@bedrock-engineer/bro-xml-parser";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatIndication, formatUom } from "../../util/format";
import type { TranslateFunction } from "../../util/plot-config";
import { PlotDownloadButtons } from "../plot-download-buttons";
import { PlotFigure } from "../plot-figure";
import {
  buildSettlementCharacteristicsPlot,
  buildSettlementHeightPlot,
  buildSettlementTimeSeriesPlot,
} from "./settlement-characteristics-plot";
import {
  booleanRow,
  codedRow,
  ConditionRows,
  measureRow,
  TestConditions,
} from "./test-conditions";

interface SettlementCharacteristicsDisplayProps {
  data: SettlementCharacteristicsDetermination;
  baseFilename: string;
}
export function SettlementCharacteristicsDisplay({
  data,
  baseFilename,
}: SettlementCharacteristicsDisplayProps) {
  const { t } = useTranslation();
  const plotRef = useRef<HTMLDivElement>(null);
  const saturation = data.saturationStageAtCompression;
  const hasStrainSeries = data.determinationSteps.some((step) =>
    step.stressChangeDuringSettlement.some(
      (point) => point.elapsedTime != null && point.verticalStrain != null,
    ),
  );
  const hasHeightSeries = data.determinationSteps.some((step) =>
    step.heightChangeDuringSettlement.some(
      (point) => point.time != null && point.height != null,
    ),
  );

  return (
    <div className="border border-gray-200 rounded p-4">
      <h4 className="font-medium mb-3">{t("settlementCharacteristics")}</h4>

      <div className="mb-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <ConditionRows
            rows={[
              codedRow(t("method"), data.determinationMethod),
              measureRow(t("ringDiameter"), data.ringDiameter),
              measureRow(t("temperature"), data.temperature),
              measureRow(
                t("maximumStressDifference"),
                saturation?.maximumStressDifference,
              ),
              measureRow(t("maximumStrain"), saturation?.maximumStrain, 2),
            ]}
          />
        </dl>
      </div>

      <StepsTable data={data} />

      <PlotFigure
        containerRef={plotRef}
        render={() =>
          buildSettlementCharacteristicsPlot(data, t as TranslateFunction)
        }
        deps={[data, t]}
      />

      {/* Legend */}
      <div className="mt-3 flex gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div aria-hidden="true" className="w-4 h-0.5 bg-blue-600"></div>
          <span>{t("loading")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            aria-hidden="true"
            className="w-4 h-0.5 bg-red-600"
            style={{ borderTop: "2px dashed #dc2626" }}
          ></div>
          <span>{t("unloading")}</span>
        </div>
      </div>

      <PlotDownloadButtons containerRef={plotRef} filename={baseFilename} />

      {/* Per-step consolidation curves (strain or height vs log time) */}
      {hasStrainSeries && (
        <div className="mt-4">
          <h5 className="text-sm font-medium mb-2 text-center">
            {t("settlementTimeCurves")}
          </h5>
          <PlotFigure
            render={() =>
              buildSettlementTimeSeriesPlot(data, t as TranslateFunction)
            }
            deps={[data, t]}
            filename={`${baseFilename}-time-series`}
          />
        </div>
      )}
      {hasHeightSeries && (
        <div className="mt-4">
          <h5 className="text-sm font-medium mb-2 text-center">
            {t("settlementHeightCurves")}
          </h5>
          <PlotFigure
            render={() =>
              buildSettlementHeightPlot(data, t as TranslateFunction)
            }
            deps={[data, t]}
            filename={`${baseFilename}-height`}
          />
        </div>
      )}

      <TestConditions
        rows={[
          booleanRow(t("filterPaperUsed"), data.filterPaperUsed, t),
          booleanRow(
            t("apparatusDeformationApplied"),
            data.apparatusDeformationApplied,
            t,
          ),
          booleanRow(
            t("bearingFrictionCorrectionApplied"),
            data.bearingFrictionCorrectionApplied,
            t,
          ),
          booleanRow(t("irregularResult"), data.irregularResult, t),
          booleanRow(t("porousDiscWet"), saturation?.porousDiscWet, t),
          measureRow(t("backPressure"), saturation?.backPressure),
          booleanRow(t("constantHeight"), saturation?.constantHeight, t),
          measureRow(
            t("specimenHeightAfterwards"),
            saturation?.specimenHeightAfterwards,
          ),
          booleanRow(
            t("disturbanceInduced"),
            saturation?.disturbanceInduced,
            t,
          ),
        ]}
      />
    </div>
  );
}

interface StepsTableProps {
  data: SettlementCharacteristicsDetermination;
}

const withUnit = (label: string, unit: string | null) =>
  unit === null ? label : `${label} (${unit})`;

/** Summary table of the load steps: stress, 24h strain, rate and flags. */
function StepsTable({ data }: StepsTableProps) {
  const { t } = useTranslation();
  const steps = data.determinationSteps;

  if (steps.length === 0) {
    return null;
  }

  const hasRate = steps.some((step) => step.deformationRate != null);
  const hasSwell = steps.some((step) => step.swellObserved != null);
  const hasWet = steps.some((step) => step.wetPerformed != null);

  // The unit is constant per column (fixed by the BRO catalogue), so it is
  // stated once in the header and the cells hold bare numbers.
  const unitOf = (
    get: (step: (typeof steps)[number]) => Measure | null,
  ): string | null => {
    for (const step of steps) {
      const measure = get(step);
      if (measure) {
        return formatUom(measure.uom);
      }
    }
    return null;
  };
  const stressUnit = unitOf((step) => step.verticalStress);
  const strainUnit = unitOf((step) => step.strainPoint24hours);
  const rateUnit = unitOf((step) => step.deformationRate);

  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-300">
            <th
              scope="col"
              className="py-2 px-2 text-left text-gray-500 font-medium"
            >
              {t("step")}
            </th>
            <th
              scope="col"
              className="py-2 px-2 text-right text-gray-500 font-medium"
            >
              {withUnit("σv", stressUnit)}
            </th>
            <th
              scope="col"
              className="py-2 px-2 text-right text-gray-500 font-medium"
            >
              {withUnit("ε (24h)", strainUnit)}
            </th>
            {hasRate && (
              <th
                scope="col"
                className="py-2 px-2 text-right text-gray-500 font-medium"
              >
                {withUnit(t("deformationRate"), rateUnit)}
              </th>
            )}
            {hasSwell && (
              <th
                scope="col"
                className="py-2 px-2 text-right text-gray-500 font-medium"
              >
                {t("swellObserved")}
              </th>
            )}
            {hasWet && (
              <th
                scope="col"
                className="py-2 px-2 text-right text-gray-500 font-medium"
              >
                {t("wetPerformed")}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {steps.map((step, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-2 px-2">{step.stepNumber ?? index + 1}</td>
              <td className="py-2 px-2 text-right font-mono">
                {step.verticalStress?.value ?? "–"}
              </td>
              <td className="py-2 px-2 text-right font-mono">
                {step.strainPoint24hours?.value.toFixed(2) ?? "–"}
              </td>
              {hasRate && (
                <td className="py-2 px-2 text-right font-mono">
                  {step.deformationRate?.value ?? "–"}
                </td>
              )}
              {hasSwell && (
                <td className="py-2 px-2 text-right">
                  {formatIndication(step.swellObserved, t) ?? "–"}
                </td>
              )}
              {hasWet && (
                <td className="py-2 px-2 text-right">
                  {formatIndication(step.wetPerformed, t) ?? "–"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
