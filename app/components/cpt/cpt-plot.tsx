import * as Plot from "@observablehq/plot";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  CheckboxButton,
  CheckboxField,
  CheckboxGroup,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from "react-aria-components";
import { useTranslation } from "react-i18next";
import type { ChartColumn, CPTChartRow } from "~/util/chart-axes";
import { createWatermarkMark } from "~/util/plot-config";
import { Card, CardTitle } from "../card";
import { PlotDownloadButtons } from "../plot-download-buttons";
import { RadioButtonGroup } from "../radio-button-group";
import { ClassicCptPlot } from "./classic-cpt-plot";

function isDepthChartColumn(col: ChartColumn): boolean {
  return (
    col.key === "penetrationLength" ||
    col.key === "depth" ||
    col.key === "elevationNAP"
  );
}

interface CptPlotsProps {
  data: Array<CPTChartRow>;
  xAxis: ChartColumn;
  yAxis: ChartColumn;
  availableChartColumns: Array<ChartColumn>;
  yAxisOptions?: Array<ChartColumn>;
  width?: number;
  height?: number;
  baseFilename: string;
}

export function CptPlots({
  data,
  xAxis: initialXAxis,
  yAxis: initialYAxis,
  availableChartColumns,
  yAxisOptions = [],
  width = 300,
  height = 800,
  baseFilename,
}: CptPlotsProps) {
  const { t } = useTranslation();
  const [selectedAxes, setSelectedAxes] = useState([initialXAxis.key]);
  const [selectedYAxis, setSelectedYAxis] = useState(initialYAxis.key);
  const [showClassic, setShowClassic] = useState(false);
  const [fixedDomains, setFixedDomains] = useState(false);

  const xAxisOptions = availableChartColumns.filter(
    (col) => !isDepthChartColumn(col),
  );

  const currentYAxis =
    yAxisOptions.find((opt) => opt.key === selectedYAxis) ?? initialYAxis;

  return (
    <Card>
      <CardTitle>{t("graphs")}</CardTitle>

      <div className="mb-4 grid gap-2">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <RadioButtonGroup
            value={showClassic ? "classic" : "columns"}
            onChange={(v) => {
              setShowClassic(v === "classic");
            }}
            label={t("chartType")}
            options={[
              { value: "columns", label: t("columnCharts") },
              { value: "classic", label: t("classicCptChart") },
            ]}
            className="text-sm text-gray-700"
          />

          <RadioButtonGroup
            value={fixedDomains ? "fixed" : "auto"}
            onChange={(v) => {
              setFixedDomains(v === "fixed");
            }}
            label={t("axisRanges")}
            options={[
              { value: "auto", label: t("autoDomains") },
              { value: "fixed", label: t("fixedDomains") },
            ]}
            className="text-sm text-gray-700"
          />
        </div>

        <CheckboxGroup
          value={selectedAxes as Array<string>}
          onChange={(v) => {
            setSelectedAxes(v as Array<keyof CPTChartRow>);
          }}
          isDisabled={showClassic}
          className="data-disabled:opacity-50"
        >
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            {t("columns")}
          </Label>
          <div className="flex flex-wrap gap-x-4 gapy-y-1">
            {xAxisOptions.map((x) => (
              <CheckboxField key={x.key} value={x.key}>
                <CheckboxButton className="flex items-center gap-2 group data-disabled:cursor-not-allowed">
                  <div className="w-4 h-4 border-2 border-gray-300 rounded flex items-center justify-center group-data-selected:bg-blue-600 group-data-selected:border-blue-600 group-data-hovered:border-gray-400 group-data-selected:group-data-hovered:bg-blue-700 group-data-pressed:scale-95 transition-all">
                    <svg
                      viewBox="0 0 18 18"
                      className="w-3 h-3 fill-none stroke-white stroke-2 opacity-0 group-data-selected:opacity-100"
                    >
                      <polyline points="1 9 7 14 15 4" />
                    </svg>
                  </div>

                  <span className="text-sm text-gray-700">
                    {x.name} ({x.unit})
                  </span>
                </CheckboxButton>
              </CheckboxField>
            ))}
          </div>
        </CheckboxGroup>

        <div className="flex-1">
          {yAxisOptions.length > 1 ? (
            <Select
              value={selectedYAxis}
              onChange={(key) => {
                setSelectedYAxis(key as keyof CPTChartRow);
              }}
              className="w-full max-w-2xs"
            >
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                {t("yAxisVertical")}
              </Label>

              <Button className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm text-gray-700 text-left flex justify-between items-center hover:bg-gray-50">
                <SelectValue />
                <span aria-hidden="true">▼</span>
              </Button>

              <Popover className="w-[--trigger-width] bg-white border border-gray-300 rounded-sm shadow-lg">
                <ListBox className="max-h-60 overflow-auto p-1">
                  {yAxisOptions.map((opt) => (
                    <ListBoxItem
                      key={opt.key}
                      id={opt.key}
                      className="px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-blue-50 rounded data-selected:bg-blue-100"
                    >
                      {opt.name} ({opt.unit})
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Popover>
            </Select>
          ) : (
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">
                {t("yAxisVertical")}
              </span>

              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-sm text-sm text-gray-700">
                {currentYAxis.name} ({currentYAxis.unit})
              </div>
            </div>
          )}
        </div>
      </div>

      {showClassic ? (
        <div className="flex justify-center flex-wrap">
          <ClassicCptPlot
            data={data}
            yAxis={currentYAxis}
            availableChartColumns={xAxisOptions}
            height={height}
            baseFilename={baseFilename}
            fixedDomains={fixedDomains}
          />
        </div>
      ) : (
        <div className="flex justify-center flex-wrap">
          {selectedAxes.map((k) => {
            const xAxis = xAxisOptions.find((c) => c.key === k);

            if (!xAxis) {
              return null;
            }

            const plotId = `cpt-plot-${k}`;
            return (
              <div
                key={`${k}-${selectedYAxis}`}
                className="flex flex-col flex-wrap items-center"
              >
                <CptPlot
                  plotId={plotId}
                  data={data}
                  height={height}
                  width={width}
                  yAxis={currentYAxis}
                  xAxis={xAxis}
                  reverseY={!currentYAxis.increasesUpward}
                  fixedDomain={fixedDomains ? xAxis.fixedDomain : undefined}
                />

                <PlotDownloadButtons
                  plotId={plotId}
                  filename={`${baseFilename}-${xAxis.name}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

interface CptPlotProps {
  data: Array<CPTChartRow>;
  xAxis: ChartColumn;
  yAxis: ChartColumn;
  width: number;
  height: number;
  reverseY?: boolean;
  plotId: string;
  /** When set, the x-scale uses this domain instead of the data extent. */
  fixedDomain?: [number, number];
}

function CptPlot({
  height,
  width,
  xAxis,
  yAxis,
  data,
  reverseY = true,
  plotId,
  fixedDomain,
}: CptPlotProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current === null || data.length === 0) {
      return;
    }

    const plot = Plot.plot({
      height,
      width,
      marginRight: 40,
      style: {
        backgroundColor: "white",
        overflow: "visible",
      },
      x: {
        label: `${xAxis.name} (${xAxis.unit})`,
        grid: true,
        domain: fixedDomain,
      },
      y: {
        grid: true,
        reverse: reverseY,
        label: `${yAxis.name} (${yAxis.unit})`,
      },
      marks: [
        Plot.frame(),
        Plot.lineX(data, {
          x: xAxis.key,
          y: yAxis.key,
          filter: (d: CPTChartRow) =>
            d[xAxis.key] != null && d[yAxis.key] != null,
          // Values outside a fixed domain (e.g. qc spikes above 30 MPa)
          // should clip at the frame instead of drawing past the axis.
          clip: fixedDomain !== undefined,
        }),
        Plot.crosshair(data, {
          x: xAxis.key,
          y: yAxis.key,
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
  }, [data, xAxis, yAxis, width, height, reverseY, fixedDomain, t]);

  return <div id={plotId} ref={containerRef}></div>;
}
