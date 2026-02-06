import type { ShearStressChangeDuringLoadingDetermination } from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { PlotDownloadButtons } from "../plot-download-buttons";

// Color palette for multiple tests
const TRIAXIAL_COLORS = [
  "#2563eb", // blue
  "#dc2626", // red
  "#16a34a", // green
  "#9333ea", // purple
  "#ea580c", // orange
  "#0891b2", // cyan
];
interface MohrCircleData {
  sigma3: number; // confining pressure
  sigma1: number; // major principal stress at failure
  color: string;
  testIndex: number;
}
interface TriaxialTestsDisplayProps {
  tests: Array<ShearStressChangeDuringLoadingDetermination>;
  baseFilename: string;
}
export function TriaxialTestsDisplay({
  tests, baseFilename,
}: TriaxialTestsDisplayProps) {
  const { t } = useTranslation();
  
  const stressStrainRef = useRef<HTMLDivElement>(null);
  const stressStrainPlotId = "triaxial-stress-strain-plot";

  const mohrRef = useRef<HTMLDivElement>(null);
  const mohrPlotId = "triaxial-mohr-plot";

  // Calculate Mohr circle data for each test
  const mohrCircles: Array<MohrCircleData> = tests
    .map((test, testIndex) => {
      const loadStageData = test.loadStage?.shearStressChangeDuringLoading;
      if (!loadStageData || loadStageData.length === 0) {
        return null;
      }

      // Find peak deviator stress
      let maxDeviator = 0;
      let sigma3 = loadStageData[0]?.cellPressure ?? 0;

      for (const point of loadStageData) {
        if (point.deviatorStress != null &&
          point.deviatorStress > maxDeviator) {
          maxDeviator = point.deviatorStress;
          sigma3 = point.cellPressure;
        }
      };

      if (maxDeviator === 0) {
        return null;
      }

      return {
        sigma3,
        sigma1: sigma3 + maxDeviator, // σ1 = σ3 + (σ1 - σ3)
        color: TRIAXIAL_COLORS[testIndex % TRIAXIAL_COLORS.length],
        testIndex,
      };
    })
    .filter((c): c is MohrCircleData => c !== null);

  useEffect(
    function drawStressStrainPlot() {
      if (!stressStrainRef.current) {
        return;
      }

      const allData: Array<{
        strain: number;
        stress: number;
        testIndex: number;
        cellPressure: number;
      }> = [];

      for (const [testIndex, test] of tests.entries()) {
        const loadStageData = test.loadStage?.shearStressChangeDuringLoading;
        if (!loadStageData || loadStageData.length === 0) {
          continue;
        }

        for (const point of loadStageData) {
          if (point.axialStrain != null && point.deviatorStress != null) {
            allData.push({
              strain: point.axialStrain,
              stress: point.deviatorStress,
              testIndex,
              cellPressure: point.cellPressure,
            });
          }
        }
      }

      if (allData.length === 0) {
        return;
      }

      const testGroups = tests
        .map((_, index) => allData.filter((d) => d.testIndex === index))
        .filter((group) => group.length > 0);

      const plot = Plot.plot({
        width: 500,
        height: 350,
        style: { backgroundColor: "white" },
        x: {
          label: "Axial strain ε₁ (%)",
          grid: true,
        },
        y: {
          label: "Deviator stress q (kPa)",
          grid: true,
        },
        marks: [
          Plot.frame(),
          ...testGroups.flatMap((group, index) => [
            Plot.line(group, {
              x: "strain",
              y: "stress",
              stroke: TRIAXIAL_COLORS[index % TRIAXIAL_COLORS.length],
              strokeWidth: 2,
            }),
            // Plot.dot(group, {
            //   x: "strain",
            //   y: "stress",
            //   fill: TRIAXIAL_COLORS[i % TRIAXIAL_COLORS.length],
            //   r: 0.5,
            // }),
          ]),
          Plot.text([t("madeWithBedrockBroViewer")], {
            frameAnchor: "top-right",
            dx: -5,
            dy: 5,
            fill: "gray",
            fontSize: 8,
          }),
        ],
      });

      stressStrainRef.current.append(plot);
      return () => {
        plot.remove();
      };
    },
    [tests, t]
  );

  // Mohr circles plot
  useEffect(
    function drawMohrCircles() {
      if (!mohrRef.current || mohrCircles.length === 0) {
        return;
      }

      // Generate circle points for each test
      const circlePoints: Array<{ x: number; y: number; testIndex: number; }> = [];

      for (const circle of mohrCircles) {
        const center = (circle.sigma1 + circle.sigma3) / 2;
        const radius = (circle.sigma1 - circle.sigma3) / 2;

        // Generate points around the semicircle (top half only for Mohr circle)
        for (let angle = 0; angle <= Math.PI; angle += Math.PI / 50) {
          circlePoints.push({
            x: center + radius * Math.cos(angle),
            y: radius * Math.sin(angle),
            testIndex: circle.testIndex,
          });
        }
      }

      // Calculate domains for equal visual scaling (so circles appear circular)
      const plotWidth = 500;
      const plotHeight = 350;
      const plotAspect = plotHeight / plotWidth;

      const dataMaxSigma = Math.max(...mohrCircles.map((c) => c.sigma1)) * 1.1;
      const dataMaxTau = Math.max(...mohrCircles.map((c) => (c.sigma1 - c.sigma3) / 2)) * 1.2;

      // For equal scaling: yDomainRange / xDomainRange = plotHeight / plotWidth
      // We need xDomain >= dataMaxSigma and yDomain >= dataMaxTau
      let xDomainMax: number;
      let yDomainMax: number;

      if (dataMaxTau <= dataMaxSigma * plotAspect) {
        // x constraint is binding
        xDomainMax = dataMaxSigma;
        yDomainMax = dataMaxSigma * plotAspect;
      } else {
        // y constraint is binding
        yDomainMax = dataMaxTau;
        xDomainMax = dataMaxTau / plotAspect;
      }

      const plot = Plot.plot({
        width: plotWidth,
        height: plotHeight,
        style: { backgroundColor: "white" },
        x: {
          label: "Normal stress σ (kPa)",
          domain: [0, xDomainMax],
          grid: true,
        },
        y: {
          label: "Shear stress τ (kPa)",
          domain: [0, yDomainMax],
          grid: true,
        },
        marks: [
          Plot.frame(),
          // Draw each Mohr circle
          ...mohrCircles.map((circle) => {
            const circleData = circlePoints.filter(
              (p) => p.testIndex === circle.testIndex
            );
            return Plot.line(circleData, {
              x: "x",
              y: "y",
              stroke: circle.color,
              strokeWidth: 2,
            });
          }),
          // Mark σ3 and σ1 points on x-axis
          ...mohrCircles.flatMap((circle) => [
            Plot.dot([{ x: circle.sigma3, y: 0 }], {
              x: "x",
              y: "y",
              fill: circle.color,
              r: 5,
            }),
            Plot.dot([{ x: circle.sigma1, y: 0 }], {
              x: "x",
              y: "y",
              fill: circle.color,
              r: 5,
            }),
          ]),
          // Label σ3 values
          ...mohrCircles.map((circle) => Plot.text(
            [
              {
                x: circle.sigma3,
                y: -yDomainMax * 0.05,
                text: `σ₃=${circle.sigma3}`,
              },
            ],
            {
              x: "x",
              y: "y",
              text: "text",
              fontSize: 9,
              fill: circle.color,
            }
          )
          ),
          Plot.text([t("madeWithBedrockBroViewer")], {
            frameAnchor: "top-right",
            dx: -5,
            dy: 5,
            fill: "gray",
            fontSize: 8,
          }),
        ],
      });

      mohrRef.current.append(plot);
      return () => {
        plot.remove();
      };
    },
    [mohrCircles, t]
  );

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

              <div className="flex justify-center">
                <div id={stressStrainPlotId} ref={stressStrainRef}></div>
              </div>

              <PlotDownloadButtons
                plotId={stressStrainPlotId}
                filename={`${baseFilename}-stress-strain`} />
            </div>

            {/* Mohr circles chart */}
            {mohrCircles.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2 text-center">
                  Mohr Circles
                </h5>

                <div className="flex justify-center">
                  <div id={mohrPlotId} ref={mohrRef}></div>
                </div>

                <PlotDownloadButtons
                  plotId={mohrPlotId}
                  filename={`${baseFilename}-mohr`} />
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
                      backgroundColor: TRIAXIAL_COLORS[index % TRIAXIAL_COLORS.length],
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
                  backgroundColor: TRIAXIAL_COLORS[index % TRIAXIAL_COLORS.length],
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
