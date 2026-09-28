import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { GMWData } from "../../types/bro-data";
import type { TranslateFunction } from "../../util/plot-config";
import { Card, CardTitle } from "../card";
import { PlotDownloadButtons } from "../plot-download-buttons";
import {
  buildGmwSchematic,
  PLAIN_TUBE_COLOR,
  SCREEN_COLOR,
  SEDIMENT_SUMP_COLOR,
} from "./gmw-schematic-render";

const id = "gmw-schematic";

interface GmwSchematicProps {
  data: GMWData;
  baseFilename: string;
  height?: number;
}

export function GmwSchematic({
  data,
  baseFilename,
  height = 640,
}: GmwSchematicProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Give each tube its own column; keep a sensible minimum for single-tube wells.
  const tubeCount = data.monitoringTube.length;
  const width = Math.max(360, tubeCount * 120 + 140);

  useEffect(() => {
    if (containerRef.current === null) {
      return;
    }
    const plot = buildGmwSchematic({
      data,
      t: t as TranslateFunction,
      width,
      height,
    });
    if (plot === null) {
      return;
    }
    containerRef.current.append(plot);
    return () => {
      plot.remove();
    };
  }, [data, width, height, t]);

  const legendEntries: Array<{ color: string; label: string }> = [
    { color: PLAIN_TUBE_COLOR, label: t("plainTubePart") },
    { color: SCREEN_COLOR, label: t("screen") },
    { color: SEDIMENT_SUMP_COLOR, label: t("sedimentSump") },
  ];

  return (
    <Card>
      <CardTitle>{t("wellSchematic")}</CardTitle>

      <div className="flex justify-center">
        <div id={id} ref={containerRef}></div>
      </div>

      <div className="flex flex-wrap gap-4 mt-2 text-xs">
        {legendEntries.map((entry) => (
          <div key={entry.label} className="flex items-center gap-1">
            <div className="w-3 h-3" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600">{entry.label}</span>
          </div>
        ))}
      </div>

      <PlotDownloadButtons plotId={id} filename={`${baseFilename}-putschema`} />
    </Card>
  );
}
