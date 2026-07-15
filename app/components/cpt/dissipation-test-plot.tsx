import type {
  DissipationMeasurement,
  DissipationTest,
} from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createWatermarkMark } from "~/util/plot-config";
import { Card, CardTitle } from "../card";
import { PlotDownloadButtons } from "../plot-download-buttons";
import { RadioButtonGroup } from "../radio-button-group";

type TimeScale = "linear" | "log" | "sqrt";

interface DissipationTestPlotsProps {
  tests: Array<DissipationTest>;
  baseFilename: string;
}

type PorePressureKey = "porePressureU1" | "porePressureU2" | "porePressureU3";

const PORE_PRESSURE_SERIES: Array<{
  key: PorePressureKey;
  label: string;
}> = [
  { key: "porePressureU1", label: "U1" },
  { key: "porePressureU2", label: "U2" },
  { key: "porePressureU3", label: "U3" },
];

function getAvailableSeries(measurements: Array<DissipationMeasurement>) {
  return PORE_PRESSURE_SERIES.filter((series) =>
    measurements.some((m) => m[series.key] != null),
  );
}

export function DissipationTestPlots({
  tests,
  baseFilename,
}: DissipationTestPlotsProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardTitle>{t("dissipationTests")}</CardTitle>
      <div className="space-y-8">
        {tests.map((test, index) => {
          const plotId = `dissipation-plot-${index}`;
          return (
            <div key={index}>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {t("dissipationTestAtDepth", {
                  depth: test.penetrationLength,
                })}
                {test.phenomenonTime && (
                  <span className="text-gray-500 ml-2">
                    ({new Date(test.phenomenonTime).toLocaleDateString()})
                  </span>
                )}
              </h4>
              <DissipationPlot plotId={plotId} test={test} />
              <PlotDownloadButtons
                plotId={plotId}
                filename={`${baseFilename}-dissipation-${test.penetrationLength}m`}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

interface DissipationPlotProps {
  plotId: string;
  test: DissipationTest;
}

function getXScaleConfig(scale: TimeScale, label: string): Plot.ScaleOptions {
  switch (scale) {
    case "log": {
      return { type: "log", label, grid: true };
    }
    case "sqrt": {
      return { type: "pow", exponent: 0.5, label: `√ ${label}`, grid: true };
    }
    case "linear": {
      return { label, grid: true };
    }
  }
}

function DissipationPlot({ plotId, test }: DissipationPlotProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>("log");

  useEffect(() => {
    if (containerRef.current === null || test.measurements.length === 0) {
      return;
    }

    const availableSeries = getAvailableSeries(test.measurements);
    const excludeZero = timeScale !== "linear";

    // Transform to long format for multi-series plotting
    // Filter out elapsedTime <= 0 for log/sqrt scales
    const longData = test.measurements.flatMap((m) =>
      excludeZero && m.elapsedTime <= 0
        ? []
        : availableSeries.flatMap((series) => {
            const pressure = m[series.key];
            return pressure == null
              ? []
              : [{ elapsedTime: m.elapsedTime, pressure, series: series.label }];
          }),
    );

    const useColor = availableSeries.length > 1;

    const plot = Plot.plot({
      width: 640,
      height: 400,
      marginRight: 40,
      style: {
        backgroundColor: "white",
        overflow: "visible",
      },
      x: getXScaleConfig(timeScale, t("elapsedTimeSeconds")),
      y: {
        label: `${t("porePressure")} (MPa)`,
        grid: true,
      },
      ...(useColor
        ? {
            color: {
              legend: true,
            },
          }
        : {}),
      marks: [
        Plot.frame(),
        Plot.line(longData, {
          x: "elapsedTime",
          y: "pressure",
          ...(useColor ? { stroke: "series" } : {}),
        }),
        Plot.crosshair(longData, {
          x: "elapsedTime",
          y: "pressure",
        }),
        createWatermarkMark(t("madeWithBedrockBroViewer"), {
          frameAnchor: "top-right",
          dx: -5,
          dy: 5,
        }),
      ],
    });

    containerRef.current.append(plot);
    return () => {
      plot.remove();
    };
  }, [test, t, timeScale]);

  const options = [
    { value: "log", label: t("scaleLog") },
    { value: "sqrt", label: t("scaleSqrt") },
    { value: "linear", label: t("scaleLinear") },
  ] as const;

  return (
    <div>
      <RadioButtonGroup
        value={timeScale}
        onChange={setTimeScale}
        label={t("timeScale")}
        options={options}
        className="mb-3 text-sm text-gray-700"
      />
      <div id={plotId} ref={containerRef}></div>
    </div>
  );
}
