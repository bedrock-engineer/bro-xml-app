import type {
  DissipationMeasurement,
  DissipationTest,
} from "@bedrock-engineer/bro-xml-parser";
import * as Plot from "@observablehq/plot";
import { useEffect, useRef, useState } from "react";
import { Label, Radio, RadioGroup } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { createWatermarkMark } from "~/util/plot-config";
import { Card, CardTitle } from "./card";
import { PlotDownloadButtons } from "./plot-download-buttons";

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
        : availableSeries
            .filter((series) => m[series.key] != null)
            .map((series) => ({
              elapsedTime: m.elapsedTime,
              pressure: m[series.key] as number,
              series: series.label,
            })),
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
      <RadioGroup
        value={timeScale}
        onChange={(v) => {
          setTimeScale(v as TimeScale);
        }}
        orientation="horizontal"
        className="flex items-center gap-3 mb-3"
      >
        <Label className="text-sm font-medium text-gray-700">
          {t("timeScale")}
        </Label>
        <div className="flex gap-1">
          {options.map((option) => (
            <Radio
              key={option.value}
              value={option.value}
              className="cursor-pointer rounded-sm border border-gray-300 px-2.5 py-1 text-sm text-gray-700 transition-colors data-[selected]:border-blue-600 data-[selected]:bg-blue-600 data-[selected]:text-white hover:bg-gray-50 data-[selected]:hover:bg-blue-700"
            >
              {option.label}
            </Radio>
          ))}
        </div>
      </RadioGroup>
      <div id={plotId} ref={containerRef}></div>
    </div>
  );
}
