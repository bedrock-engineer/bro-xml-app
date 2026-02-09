import type { InvestigatedInterval } from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { PlotDownloadButtons } from "../plot-download-buttons";

type DirectShearDetermination = NonNullable<
  InvestigatedInterval["shearStressChangeDuringHorizontalDeformationDetermination"]
>[number];

// Color palette for multiple tests
const SHEAR_COLORS = [
  "#2563eb", // blue
  "#dc2626", // red
  "#16a34a", // green
  "#9333ea", // purple
  "#ea580c", // orange
  "#0891b2", // cyan
];

interface PeakData {
  normalStress: number;
  peakShearStress: number;
  testIndex: number;
  color: string;
}

interface DirectShearDisplayProps {
  tests: Array<DirectShearDetermination>;
  baseFilename: string;
}

export function DirectShearDisplay({
  tests,
  baseFilename,
}: DirectShearDisplayProps) {
  const { t } = useTranslation();

  const stressDisplacementRef = useRef<HTMLDivElement>(null);
  const stressDisplacementPlotId = "direct-shear-stress-displacement-plot";

  const envelopeRef = useRef<HTMLDivElement>(null);
  const envelopePlotId = "direct-shear-envelope-plot";

  const heightChangeRef = useRef<HTMLDivElement>(null);
  const heightChangePlotId = "direct-shear-height-change-plot";

  // Extract peak data for each test (for failure envelope)
  const peakData: Array<PeakData> = tests
    .map((test, testIndex) => {
      const data =
        test.shearStage?.shearStressChangeDuringHorizontalDeformation;
      if (!data || data.length === 0) {return null;}

      let peakShearStress = 0;
      let normalStress = 0;
      for (const point of data) {
        if (point.shearStress > peakShearStress) {
          peakShearStress = point.shearStress;
          normalStress = point.verticalStress;
        }
      }

      if (peakShearStress === 0) {return null;}

      return {
        normalStress,
        peakShearStress,
        testIndex,
        color: SHEAR_COLORS[testIndex % SHEAR_COLORS.length],
      };
    })
    .filter((d): d is PeakData => d !== null);

  // Check if any test has height change data
  const hasHeightChangeData = tests.some((test) =>
    test.shearStage?.shearStressChangeDuringHorizontalDeformation?.some(
      (p) => p.heightChange != null,
    ),
  );

  // Chart 1: Shear Stress vs Horizontal Displacement
  useEffect(
    function drawStressDisplacementPlot() {
      if (!stressDisplacementRef.current) {return;}

      const allData: Array<{
        displacement: number;
        stress: number;
        testIndex: number;
      }> = [];

      for (const [testIndex, test] of tests.entries()) {
        const data =
          test.shearStage?.shearStressChangeDuringHorizontalDeformation;
        if (!data || data.length === 0) {continue;}

        for (const point of data) {
          allData.push({
            displacement: point.horizontalDisplacement,
            stress: point.shearStress,
            testIndex,
          });
        }
      }

      if (allData.length === 0) {return;}

      const testGroups = tests
        .map((_, index) => allData.filter((d) => d.testIndex === index))
        .filter((group) => group.length > 0);

      const plot = Plot.plot({
        width: 500,
        height: 350,
        style: { backgroundColor: "white" },
        x: {
          label: "Horizontal displacement δh (mm)",
          grid: true,
        },
        y: {
          label: "Shear stress τ (kPa)",
          grid: true,
        },
        marks: [
          Plot.frame(),
          ...testGroups.flatMap((group, index) => [
            Plot.line(group, {
              x: "displacement",
              y: "stress",
              stroke: SHEAR_COLORS[index % SHEAR_COLORS.length],
              strokeWidth: 2,
            }),
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

      stressDisplacementRef.current.append(plot);
      return () => {
        plot.remove();
      };
    },
    [tests, t],
  );

  // Chart 2: Failure Envelope (τf vs σn) with linear regression
  useEffect(
    function drawFailureEnvelope() {
      if (!envelopeRef.current || peakData.length < 2) {return;}

      // Linear regression: τ = c + σ·tan(φ)
      const n = peakData.length;
      const sumX = peakData.reduce((s, d) => s + d.normalStress, 0);
      const sumY = peakData.reduce((s, d) => s + d.peakShearStress, 0);
      const sumXY = peakData.reduce(
        (s, d) => s + d.normalStress * d.peakShearStress,
        0,
      );
      const sumX2 = peakData.reduce(
        (s, d) => s + d.normalStress * d.normalStress,
        0,
      );

      const denom = n * sumX2 - sumX * sumX;
      const cohesion = denom === 0 ? 0 : (sumY * sumX2 - sumX * sumXY) / denom;
      const tanPhi = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
      const phi = (Math.atan(tanPhi) * 180) / Math.PI;

      const maxSigma = Math.max(...peakData.map((d) => d.normalStress)) * 1.2;

      // Line data for regression
      const lineData = [
        { x: 0, y: cohesion },
        { x: maxSigma, y: cohesion + tanPhi * maxSigma },
      ];

      const plot = Plot.plot({
        width: 500,
        height: 350,
        style: { backgroundColor: "white" },
        x: {
          label: "Normal stress σn (kPa)",
          domain: [0, maxSigma],
          grid: true,
        },
        y: {
          label: "Peak shear stress τf (kPa)",
          grid: true,
        },
        marks: [
          Plot.frame(),
          // Regression line
          Plot.line(lineData, {
            x: "x",
            y: "y",
            stroke: "#6b7280",
            strokeWidth: 1.5,
            strokeDasharray: "6,3",
          }),
          // Data points
          Plot.dot(peakData, {
            x: "normalStress",
            y: "peakShearStress",
            fill: "color",
            r: 6,
            tip: true,
            title: (d: PeakData) =>
              `σn = ${d.normalStress.toFixed(1)} kPa\nτf = ${d.peakShearStress.toFixed(1)} kPa`,
          }),
          // c and φ label
          Plot.text(
            [`c = ${cohesion.toFixed(1)} kPa, φ = ${phi.toFixed(1)}°`],
            {
              frameAnchor: "top-left",
              dx: 10,
              dy: 10,
              fill: "#374151",
              fontSize: 11,
              fontWeight: "bold",
            },
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

      envelopeRef.current.append(plot);
      return () => {
        plot.remove();
      };
    },
    [peakData, t],
  );

  // Chart 3: Height Change vs Displacement (optional)
  useEffect(
    function drawHeightChangePlot() {
      if (!heightChangeRef.current || !hasHeightChangeData) {return;}

      const allData: Array<{
        displacement: number;
        heightChange: number;
        testIndex: number;
      }> = [];

      for (const [testIndex, test] of tests.entries()) {
        const data =
          test.shearStage?.shearStressChangeDuringHorizontalDeformation;
        if (!data) {continue;}

        for (const point of data) {
          if (point.heightChange != null) {
            allData.push({
              displacement: point.horizontalDisplacement,
              heightChange: point.heightChange,
              testIndex,
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
        height: 300,
        style: { backgroundColor: "white" },
        x: {
          label: "Horizontal displacement δh (mm)",
          grid: true,
        },
        y: {
          label: "Height change (mm)",
          grid: true,
        },
        marks: [
          Plot.frame(),
          ...testGroups.flatMap((group, index) => [
            Plot.line(group, {
              x: "displacement",
              y: "heightChange",
              stroke: SHEAR_COLORS[index % SHEAR_COLORS.length],
              strokeWidth: 1,
            }),
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

      heightChangeRef.current.append(plot);
      return () => {
        plot.remove();
      };
    },
    [tests, hasHeightChangeData, t],
  );

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
              <div className="flex justify-center">
                <div
                  id={stressDisplacementPlotId}
                  ref={stressDisplacementRef}
                ></div>
              </div>
              <PlotDownloadButtons
                plotId={stressDisplacementPlotId}
                filename={`${baseFilename}-stress-displacement`}
              />
            </div>

            {/* Failure envelope */}
            {peakData.length >= 2 && (
              <div>
                <h5 className="text-sm font-medium mb-2 text-center">
                  {t("failureEnvelope")}
                </h5>
                <div className="flex justify-center">
                  <div id={envelopePlotId} ref={envelopeRef}></div>
                </div>
                <PlotDownloadButtons
                  plotId={envelopePlotId}
                  filename={`${baseFilename}-envelope`}
                />
              </div>
            )}
          </div>

          {/* Height change chart (full width, only if data exists) */}
          {hasHeightChangeData && (
            <div className="mb-4">
              <h5 className="text-sm font-medium mb-2 text-center">
                {t("heightChangeVsDisplacement")}
              </h5>
              <div className="flex justify-center">
                <div id={heightChangePlotId} ref={heightChangeRef}></div>
              </div>
              <PlotDownloadButtons
                plotId={heightChangePlotId}
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
                      backgroundColor:
                        SHEAR_COLORS[index % SHEAR_COLORS.length],
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
                  backgroundColor: SHEAR_COLORS[index % SHEAR_COLORS.length],
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
