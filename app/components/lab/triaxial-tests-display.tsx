import type { ShearStressChangeDuringLoadingDetermination } from "@bedrock-engineer/bro-xml-parser";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CHART_COLORS, type TranslateFunction } from "../../util/plot-config";
import { PlotFigure } from "../plot-figure";
import {
  buildTriaxialMohrCirclesPlot,
  buildTriaxialStressStrainPlot,
  computeMohrCircles,
} from "./triaxial-tests-plots";

interface TriaxialTestsDisplayProps {
  tests: Array<ShearStressChangeDuringLoadingDetermination>;
  baseFilename: string;
}
export function TriaxialTestsDisplay({
  tests, baseFilename,
}: TriaxialTestsDisplayProps) {
  const { t } = useTranslation();

  // Mohr circle data per test (also drives the legend and details below)
  const mohrCircles = useMemo(() => computeMohrCircles(tests), [tests]);

  const testsWithData = tests.filter(
    (test) => test.loadStage?.shearStressChangeDuringLoading.length
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
                Stress-Strain Curves
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
                  Mohr Circles
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
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 justify-center text-sm mb-4">
            {testsWithData.map((test, index) => {
              const cellPressure = test.loadStage?.shearStressChangeDuringLoading?.[0]
                ?.cellPressure;
              return (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-4 h-0.5"
                    style={{
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  ></div>
                  <span>
                    σ₃ = {cellPressure ?? "?"} kPa
                    {test.determinationMethod
                      ? ` (${test.determinationMethod})`
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
        {tests.map((test, index) => (
          <div key={index} className="p-3 bg-gray-50 rounded text-sm">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                }}
              ></div>
              <span className="font-medium">
                Test {index + 1}
                {test.determinationMethod
                  ? `: ${test.determinationMethod}`
                  : ""}
              </span>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              {test.beginDiameter != null && (
                <>
                  <dt className="text-gray-500">{t("specimenDiameter")}</dt>
                  <dd>{test.beginDiameter} mm</dd>
                </>
              )}
              {test.beginHeight != null && (
                <>
                  <dt className="text-gray-500">{t("specimenHeight")}</dt>
                  <dd>{test.beginHeight} mm</dd>
                </>
              )}
              {mohrCircles[index] && (
                <>
                  <dt className="text-gray-500">σ₃ / σ₁</dt>
                  <dd>
                    {mohrCircles[index].sigma3} / {mohrCircles[index].sigma1.toFixed(0)}{" "}
                    kPa
                  </dd>
                </>
              )}
              {test.loadStage?.shearStressChangeDuringLoading.length !=
                null && (
                  <>
                    <dt className="text-gray-500">Data points</dt>
                    <dd>
                      {test.loadStage.shearStressChangeDuringLoading.length}
                    </dd>
                  </>
                )}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
