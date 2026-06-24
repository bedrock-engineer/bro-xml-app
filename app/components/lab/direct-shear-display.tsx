import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CHART_COLORS, type TranslateFunction } from "../../util/plot-config";
import { PlotFigure } from "../plot-figure";
import {
  buildFailureEnvelopePlot,
  buildHeightChangePlot,
  buildStressDisplacementPlot,
  type DirectShearDetermination,
  extractPeakData,
  hasHeightChangeData,
} from "./direct-shear-plots";

interface DirectShearDisplayProps {
  tests: Array<DirectShearDetermination>;
  baseFilename: string;
}

export function DirectShearDisplay({
  tests,
  baseFilename,
}: DirectShearDisplayProps) {
  const { t } = useTranslation();

  // Peak data per test drives the failure envelope, legend and details
  const peakData = useMemo(() => extractPeakData(tests), [tests]);
  const showHeightChange = useMemo(() => hasHeightChangeData(tests), [tests]);

  const testsWithData = tests.filter(
    (test) =>
      test.shearStage?.shearStressChangeDuringHorizontalDeformation?.length,
  );

  return (
    <div className="border border-gray-200 rounded p-4">
      <h4 className="font-medium mb-3">{t("directShearTests")}</h4>

      <p className="text-sm text-gray-600 mb-4">
        {tests.length} {t("testsPerformed")}
      </p>

      {testsWithData.length > 0 && (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Shear stress vs displacement */}
            <div>
              <h5 className="text-sm font-medium mb-2 text-center">
                {t("shearStressVsDisplacement")}
              </h5>
              <PlotFigure
                render={() =>
                  buildStressDisplacementPlot(tests, t as TranslateFunction)
                }
                deps={[tests, t]}
                filename={`${baseFilename}-stress-displacement`}
              />
            </div>

            {/* Failure envelope */}
            {peakData.length >= 2 && (
              <div>
                <h5 className="text-sm font-medium mb-2 text-center">
                  {t("failureEnvelope")}
                </h5>
                <PlotFigure
                  render={() =>
                    buildFailureEnvelopePlot(peakData, t as TranslateFunction)
                  }
                  deps={[peakData, t]}
                  filename={`${baseFilename}-envelope`}
                />
              </div>
            )}
          </div>

          {/* Height change chart (full width, only if data exists) */}
          {showHeightChange && (
            <div className="mb-4">
              <h5 className="text-sm font-medium mb-2 text-center">
                {t("heightChangeVsDisplacement")}
              </h5>
              <PlotFigure
                render={() =>
                  buildHeightChangePlot(tests, t as TranslateFunction)
                }
                deps={[tests, t]}
                filename={`${baseFilename}-height-change`}
              />
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 justify-center text-sm mb-4">
            {testsWithData.map((test, index) => {
              const firstPoint =
                test.shearStage
                  ?.shearStressChangeDuringHorizontalDeformation?.[0];
              return (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-4 h-0.5"
                    style={{
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  ></div>
                  <span>σn = {firstPoint?.verticalStress ?? "?"} kPa</span>
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
              {test.drained != null && (
                <>
                  <dt className="text-gray-500">{t("drained")}</dt>
                  <dd>{test.drained ? t("yes") : t("no")}</dd>
                </>
              )}
              {test.specimenDisturbed != null && (
                <>
                  <dt className="text-gray-500">{t("specimenDisturbed")}</dt>
                  <dd>{test.specimenDisturbed ? t("yes") : t("no")}</dd>
                </>
              )}
              {test.shearStage?.deformationRate != null && (
                <>
                  <dt className="text-gray-500">{t("deformationRate")}</dt>
                  <dd>{test.shearStage.deformationRate} mm/min</dd>
                </>
              )}
              {peakData.find((p) => p.testIndex === index) && (
                <>
                  <dt className="text-gray-500">
                    {t("normalStress")} / {t("peakShearStress")}
                  </dt>
                  <dd>
                    {peakData
                      .find((p) => p.testIndex === index)
                      ?.normalStress.toFixed(1)}{" "}
                    /{" "}
                    {peakData
                      .find((p) => p.testIndex === index)
                      ?.peakShearStress.toFixed(1)}{" "}
                    kPa
                  </dd>
                </>
              )}
              {test.shearStage?.shearStressChangeDuringHorizontalDeformation
                ?.length != null && (
                <>
                  <dt className="text-gray-500">{t("dataPoints")}</dt>
                  <dd>
                    {
                      test.shearStage
                        .shearStressChangeDuringHorizontalDeformation.length
                    }
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
