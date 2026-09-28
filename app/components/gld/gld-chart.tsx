import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GLDObservation } from "../../types/bro-data";
import type { TranslateFunction } from "../../util/plot-config";
import { Card, CardTitle } from "../card";
import { PlotDownloadButtons } from "../plot-download-buttons";
import { buildGldChart } from "./gld-chart-render";

const id = "gld-chart";

interface GldChartProps {
  observations: Array<GLDObservation>;
  baseFilename: string;
  height?: number;
}

export function GldChart({
  observations,
  baseFilename,
  height = 420,
}: GldChartProps) {
  const { t } = useTranslation();
  const measureRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  // The time axis benefits from all available width, so the chart tracks its
  // container rather than using a fixed size like the depth-axis bore plots.
  useEffect(() => {
    const element = measureRef.current;
    if (element === null) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (measured) {
        setWidth(Math.max(320, Math.floor(measured)));
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (plotRef.current === null) {
      return;
    }
    const plot = buildGldChart({
      observations,
      t: t as TranslateFunction,
      width,
      height,
    });
    if (plot === null) {
      return;
    }
    plotRef.current.append(plot);
    return () => {
      plot.remove();
    };
  }, [observations, width, height, t]);

  return (
    <Card>
      <CardTitle>{t("groundwaterLevel")}</CardTitle>
      <div ref={measureRef} className="w-full">
        <div id={id} ref={plotRef}></div>
      </div>
      <PlotDownloadButtons
        plotId={id}
        filename={`${baseFilename}-grondwaterstand`}
      />
    </Card>
  );
}
