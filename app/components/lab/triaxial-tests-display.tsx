import type { ShearStressChangeDuringLoadingDetermination } from "@bedrock-engineer/bro-xml-parser";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatCode } from "../../util/format";
import { CHART_COLORS, type TranslateFunction } from "../../util/plot-config";
import { PlotFigure } from "../plot-figure";
import {
  buildPorePressureStrainPlot,
  buildStressPathPlot,
  buildTriaxialMohrCirclesPlot,
  buildTriaxialStressStrainPlot,
  computeMohrCircles,
} from "./triaxial-tests-plots";
import {
  booleanRow,
  ConditionRows,
  measureRow,
  TestConditions,
} from "./test-conditions";

interface TriaxialTestsDisplayProps {
  tests: Array<ShearStressChangeDuringLoadingDetermination>;
  baseFilename: string;
}
export function TriaxialTestsDisplay({
  tests,
  baseFilename,
}: TriaxialTestsDisplayProps) {
  const { t } = useTranslation();

  // Mohr circle data per test (also drives the legend and details below)
  const mohrCircles = useMemo(() => computeMohrCircles(tests), [tests]);

  const testsWithData = tests.filter(
    (test) => test.loadStage?.shearStressChangeDuringLoading.length,
  );

  const hasPorePressureData = testsWithData.some((test) =>
    test.loadStage?.shearStressChangeDuringLoading.some(
      (p) => p.porePressure != null,
    ),
  );

  return (
    <div className="border border-gray-200 rounded p-4">
      <h4 className="font-medium mb-3">{t("triaxialTests")}</h4>

      <p className="text-sm text-gray-600 mb-4">
        {tests.length} {t("testsPerformed")}
      </p>

      {testsWithData.length > 0 && (
        <>
          {/* Two charts side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Stress-strain chart */}
            <div>
              <h5 className="text-sm font-medium mb-2 text-center">
                {t("stressStrainCurves")}
              </h5>

              <PlotFigure
                render={() =>
                  buildTriaxialStressStrainPlot(tests, t as TranslateFunction)
                }
                deps={[tests, t]}
                filename={`${baseFilename}-stress-strain`}
              />
            </div>

            {/* Mohr circles chart */}
            {mohrCircles.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2 text-center">
                  {t("mohrCircles")}
                </h5>

                <PlotFigure
                  render={() =>
                    buildTriaxialMohrCirclesPlot(
                      mohrCircles,
                      t as TranslateFunction,
                    )
                  }
                  deps={[mohrCircles, t]}
                  filename={`${baseFilename}-mohr`}
                />
              </div>
            )}

            {/* Pore pressure chart (undrained tests) */}
            {hasPorePressureData && (
              <div>
                <h5 className="text-sm font-medium mb-2 text-center">
                  {t("porePressure")}
                </h5>

                <PlotFigure
                  render={() =>
                    buildPorePressureStrainPlot(tests, t as TranslateFunction)
                  }
                  deps={[tests, t]}
                  filename={`${baseFilename}-pore-pressure`}
                />
              </div>
            )}

            {/* Effective stress paths (needs pore pressure) */}
            {hasPorePressureData && (
              <div>
                <h5 className="text-sm font-medium mb-2 text-center">
                  {t("effectiveStressPaths")}
                </h5>

                <PlotFigure
                  render={() =>
                    buildStressPathPlot(tests, t as TranslateFunction)
                  }
                  deps={[tests, t]}
                  filename={`${baseFilename}-stress-path`}
                />
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 justify-center text-sm mb-4">
            {testsWithData.map((test, index) => {
              const cellPressure =
                test.loadStage?.shearStressChangeDuringLoading[0]?.cellPressure;
              const originalIndex = tests.indexOf(test);
              return (
                <div key={index} className="flex items-center gap-2">
                  <div
                    aria-hidden="true"
                    className="w-4 h-0.5"
                    style={{
                      backgroundColor:
                        CHART_COLORS[originalIndex % CHART_COLORS.length],
                    }}
                  ></div>
                  <span>
                    σ₃ = {cellPressure ?? "?"} kPa
                    {test.determinationMethod
                      ? ` (${formatCode(test.determinationMethod)})`
                      : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Test details */}
      <div className="mt-4 space-y-3">
        {tests.map((test, index) => {
          const circle = mohrCircles.find((c) => c.testIndex === index);
          const saturation = test.saturationStageAtLoading;
          const consolidation = test.consolidationStageAtLoading;
          const specimen = test.madeSpecimenForLoading;
          return (
            <div key={index} className="p-3 bg-gray-50 rounded text-sm">
              <div className="flex items-center gap-2 mb-2">
                <div
                  aria-hidden="true"
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                  }}
                ></div>
                <span className="font-medium">
                  {t("test")} {index + 1}
                  {test.determinationMethod
                    ? `: ${formatCode(test.determinationMethod)}`
                    : ""}
                </span>
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <ConditionRows
                  rows={[
                    measureRow(t("specimenDiameter"), test.beginDiameter),
                    measureRow(t("specimenHeight"), test.beginHeight),
                    circle && {
                      label: "σ₃ / σ₁",
                      value: `${circle.sigma3} / ${circle.sigma1.toFixed(0)} kPa`,
                    },
                    measureRow(t("waterContent"), specimen?.waterContent, 1),
                    measureRow(
                      t("bulkDensity"),
                      specimen?.volumetricMassDensity,
                      3,
                    ),
                    measureRow(
                      t("dryBulkDensity"),
                      specimen?.dryVolumetricMassDensity,
                      3,
                    ),
                    measureRow(t("backPressure"), saturation?.backPressure),
                    measureRow(
                      t("effectivePressure"),
                      saturation?.effectivePressure,
                    ),
                    measureRow(
                      t("skemptonBCoefficient"),
                      saturation?.skemptonBCoefficient,
                      2,
                    ),
                    measureRow(
                      t("verticalConsolidationStress"),
                      consolidation?.verticalConsolidationStress,
                    ),
                    measureRow(
                      t("horizontalConsolidationStress"),
                      consolidation?.horizontalConsolidationStress,
                    ),
                    measureRow(
                      t("lateralEarthPressureCoefficient"),
                      consolidation?.lateralEarthPressureCoefficient,
                      2,
                    ),
                    measureRow(
                      t("strainAfterConsolidation"),
                      consolidation?.verticalStrain,
                      2,
                    ),
                    test.loadStage && {
                      label: t("dataPoints"),
                      value:
                        test.loadStage.shearStressChangeDuringLoading.length,
                    },
                  ]}
                />
              </dl>

              <TestConditions
                rows={[
                  booleanRow(t("filterPaperUsed"), test.filterPaperUsed, t),
                  booleanRow(
                    t("apparatusDeformationApplied"),
                    test.apparatusDeformationApplied,
                    t,
                  ),
                  booleanRow(t("specimenDisturbed"), test.specimenDisturbed, t),
                  booleanRow(t("specimenTrimmed"), test.specimenTrimmed, t),
                  booleanRow(t("topCapTiltable"), test.topCapTiltable, t),
                  booleanRow(
                    t("drainageStripsUsed"),
                    test.drainageStripsUsed,
                    t,
                  ),
                  booleanRow(
                    t("membraneSaturatedBefore"),
                    test.membraneSaturatedBefore,
                    t,
                  ),
                  booleanRow(
                    t("cellDeformationApplied"),
                    test.cellDeformationApplied,
                    t,
                  ),
                  measureRow(
                    t("membraneThickness"),
                    test.membraneCorrection?.thickness,
                  ),
                  booleanRow(t("porousDiscWet"), saturation?.porousDiscWet, t),
                  booleanRow(
                    t("porousDiscRough"),
                    saturation?.porousDiscRough,
                    t,
                  ),
                  booleanRow(
                    t("constantHeight"),
                    saturation?.constantHeight,
                    t,
                  ),
                  booleanRow(
                    t("disturbanceInduced"),
                    saturation?.disturbanceInduced,
                    t,
                  ),
                  booleanRow(
                    t("cellPressureAutomaticallyControlled"),
                    saturation?.cellPressureAutomaticallyControlled,
                    t,
                  ),
                  measureRow(
                    t("stressDifference"),
                    saturation?.stressDifference,
                  ),
                  measureRow(
                    t("strainAfterSaturation"),
                    saturation?.verticalStrain,
                    2,
                  ),
                  booleanRow(
                    t("drainageTwoSided"),
                    consolidation?.drainageTwoSided,
                    t,
                  ),
                ]}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
