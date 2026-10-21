import type { TFunction } from "i18next";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  type BROData,
  getDissipationTests,
  getRemovedLayers,
  getSurfaceLevel,
  isBHRGData,
  isBHRGTData,
  isCPTData,
  isGLDData,
  isGMWData,
} from "~/types/bro-data";
import { detectChartAxes } from "~/util/chart-axes";
import {
  CompactBHRGHeader,
  DetailedBHRGHeaders,
} from "./bhr-g/bhr-g-header-items";
import { BHRGPlot } from "./bhr-g/bhr-g-plot";
import {
  CompactBHRGTHeader,
  DetailedBoreHeaders,
} from "./bhr-gt/bhr-gt-header-items";
import { BHRGTPlot } from "./bhr-gt/bhr-gt-plot";
import { LaboratoryAnalysis } from "./bhr-gt/laboratory-analysis";
import { CompactCptHeader, DetailedCptHeaders } from "./cpt/cpt-header-items";
import { CptPlots } from "./cpt/cpt-plot";
import { DissipationTestPlots } from "./cpt/dissipation-test-plot";
import { RemovedLayersPlot } from "./cpt/removed-layers-plot";
import { GldChart } from "./gld/gld-chart";
import { CompactGldHeader, DetailedGldHeaders } from "./gld/gld-header-items";
import { CompactGmwHeader, DetailedGmwHeaders } from "./gmw/gmw-header-items";
import { GmwSchematic } from "./gmw/gmw-schematic";

function translateWarning(warning: string, t: TFunction): string {
  const parts = warning.split(":");
  const key = parts[0];

  switch (key) {
    case "schemaVersionMismatch": {
      return t("schemaVersionMismatch", {
        expected: parts[1] ?? "?",
        found: parts[2] ?? "?",
      });
    }
    case "unknownNamespace": {
      return t("unknownNamespace", { namespace: parts[1] ?? "?" });
    }
    default: {
      return warning;
    }
  }
}

interface SelectedObjectPanelProps {
  file: BROData;
  filename: string;
}

/**
 * The detail view of the selected object: parse warnings plus the
 * type-specific headers, plots, and tables. Memoized so the heavy plot
 * subtrees don't re-render on unrelated App state changes (the pending
 * indicator, failed-files list, etc.); both props have stable identities.
 */
export const SelectedObjectPanel = memo(function SelectedObjectPanel({
  file,
  filename,
}: SelectedObjectPanelProps) {
  const { t } = useTranslation();
  const baseFilename = filename.replace(/\.xml$/i, "");

  // Memoized because detectChartAxes maps the measurement rows (adding the
  // derived NAP elevation column); a fresh array every render would remake
  // the plots.
  const chartAxes = useMemo(
    () => (isCPTData(file) ? detectChartAxes(file, t) : null),
    [file, t],
  );

  return (
    <div className="space-y-6 max-w-full">
      {file.meta.warnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm">
          <h2 className="text-amber-800 font-semibold mb-2">
            {t("warning", { count: file.meta.warnings.length })}
          </h2>

          <ul className="space-y-1">
            {file.meta.warnings.map((warning, index) => (
              <li key={index} className="text-sm text-amber-700">
                {translateWarning(warning, t)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isCPTData(file) && (
        <>
          <CompactCptHeader filename={filename} data={file} />

          {chartAxes?.xAxis && chartAxes.yAxis && (
            <CptPlots
              data={chartAxes.data}
              xAxis={chartAxes.xAxis}
              yAxis={chartAxes.yAxis}
              availableChartColumns={chartAxes.availableColumns}
              yAxisOptions={chartAxes.yAxisOptions}
              baseFilename={baseFilename}
            />
          )}

          {getRemovedLayers(file).length > 0 && (
            <RemovedLayersPlot
              layers={getRemovedLayers(file)}
              baseFilename={baseFilename}
            />
          )}

          {getDissipationTests(file).length > 0 && (
            <DissipationTestPlots
              tests={getDissipationTests(file)}
              baseFilename={baseFilename}
            />
          )}

          <DetailedCptHeaders data={file} />
        </>
      )}

      {isBHRGTData(file) && (
        <>
          <CompactBHRGTHeader filename={filename} data={file} />
          <BHRGTPlot
            data={file}
            baseFilename={baseFilename}
            analysis={file.boreholeSampleAnalysis}
            groundwaterLevel={file.boring?.groundwaterLevel?.value ?? null}
            surfaceNap={getSurfaceLevel(file)?.value ?? null}
          />
          {file.boreholeSampleAnalysis && (
            <LaboratoryAnalysis
              analysis={file.boreholeSampleAnalysis}
              baseFilename={baseFilename}
            />
          )}
          <DetailedBoreHeaders data={file} />
        </>
      )}

      {isBHRGData(file) && (
        <>
          <CompactBHRGHeader filename={filename} data={file} />
          <BHRGPlot data={file} baseFilename={baseFilename} />
          <DetailedBHRGHeaders data={file} />
        </>
      )}

      {isGMWData(file) && (
        <>
          <CompactGmwHeader filename={filename} data={file} />
          <GmwSchematic data={file} baseFilename={baseFilename} />
          <DetailedGmwHeaders data={file} />
        </>
      )}

      {isGLDData(file) && (
        <>
          <CompactGldHeader filename={filename} data={file} />
          <GldChart observations={file.observation} baseFilename={baseFilename} />
          <DetailedGldHeaders data={file} />
        </>
      )}
    </div>
  );
});
