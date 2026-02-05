import type {
  BoreholeSampleAnalysis,
  InvestigatedInterval,
} from "@bedrock-engineer/bro-xml";
import { useState } from "react";
import {
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from "react-aria-components";
import { useTranslation } from "react-i18next";
import { Card, CardTitle } from "./card";
import { BasicDeterminationsDepthPlots } from "./lab/basic-determinations-depth-plots";
import { ConsistencyLimitsDisplay } from "./lab/consistency-limits-display";
import { ParticleSizeDistributionPlot } from "./lab/particle-size-distribution-plot";
import { PermeabilityDisplay } from "./lab/permeability-display";
import { SettlementCharacteristicsDisplay } from "./lab/settlement-characteristics-display";
import { TriaxialTestsDisplay } from "./lab/triaxial-tests-display";

interface LaboratoryAnalysisProps {
  analysis: BoreholeSampleAnalysis;
  baseFilename: string;
}

export function LaboratoryAnalysis({
  analysis,
  baseFilename,
}: LaboratoryAnalysisProps) {
  const { t } = useTranslation();
  const [selectedInterval, setSelectedInterval] = useState(0);

  const intervals = analysis.investigatedIntervals;
  const currentInterval = intervals[selectedInterval];

  if (!currentInterval) {
    return null;
  }

  return (
    <Card>
      <CardTitle>{t("laboratoryAnalysis")}</CardTitle>

      {/* Analysis metadata */}
      <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {analysis.analysisReportDate && (
            <>
              <dt className="text-gray-500">{t("analysisReportDate")}</dt>
              <dd>{analysis.analysisReportDate.toISOString().split("T")[0]}</dd>
            </>
          )}
          {analysis.analysisProcedure && (
            <>
              <dt className="text-gray-500">{t("analysisProcedure")}</dt>
              <dd>{analysis.analysisProcedure}</dd>
            </>
          )}
          <dt className="text-gray-500">{t("investigatedIntervals")}</dt>
          <dd>{intervals.length}</dd>
        </dl>
      </div>

      {/* Depth profiles for basic determinations */}
      <BasicDeterminationsDepthPlots
        intervals={intervals}
        baseFilename={baseFilename}
      />

      {/* Interval selector */}
      <div className="mb-4 mt-6">
        <Select
          selectedKey={selectedInterval}
          onSelectionChange={(key) => {
            setSelectedInterval(key as number);
          }}
          className="w-full max-w-md"
        >
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            {t("selectInterval")}
          </Label>

          <Button className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm text-gray-700 text-left flex justify-between items-center hover:bg-gray-50">
            <SelectValue />
            <span aria-hidden="true">▼</span>
          </Button>

          <Popover className="w-[--trigger-width] bg-white border border-gray-300 rounded-sm shadow-lg">
            <ListBox className="max-h-60 overflow-auto p-1">
              {intervals.map((interval, index) => (
                <ListBoxItem
                  key={index}
                  id={index}
                  className="px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-blue-50 rounded data-selected:bg-blue-100"
                >
                  {interval.beginDepth.toFixed(2)} –{" "}
                  {interval.endDepth.toFixed(2)} m {interval.analysisType}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      {/* Interval details */}
      <IntervalDetails
        interval={currentInterval}
        baseFilename={baseFilename}
        intervalIndex={selectedInterval}
      />
    </Card>
  );
}

interface IntervalDetailsProps {
  interval: InvestigatedInterval;
  baseFilename: string;
  intervalIndex: number;
}

function IntervalDetails({
  interval,
  baseFilename,
  intervalIndex,
}: IntervalDetailsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Interval header */}
      <div className="p-3 bg-blue-50 rounded text-sm">
        <h4 className="font-medium mb-2">
          {t("interval")}: {interval.beginDepth.toFixed(2)} -{" "}
          {interval.endDepth.toFixed(2)} m
        </h4>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {interval.sampleQuality && (
            <>
              <dt className="text-gray-500">{t("sampleQuality")}</dt>
              <dd>{interval.sampleQuality}</dd>
            </>
          )}
          {interval.analysisType && (
            <>
              <dt className="text-gray-500">{t("analysisType")}</dt>
              <dd>{interval.analysisType}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Basic determinations table */}
      <BasicDeterminationsTable interval={interval} />

      {/* Particle size distribution */}
      {interval.particleSizeDistributionDetermination && (
        <ParticleSizeDistributionPlot
          data={interval.particleSizeDistributionDetermination}
          baseFilename={`${baseFilename}-psd-${intervalIndex}`}
        />
      )}

      {/* Atterberg limits / Consistency limits */}
      {interval.consistencyLimitsDetermination && (
        <ConsistencyLimitsDisplay
          data={interval.consistencyLimitsDetermination}
          baseFilename={`${baseFilename}-atterberg-${intervalIndex}`}
        />
      )}

      {/* Settlement characteristics */}
      {interval.settlementCharacteristicsDetermination && (
        <SettlementCharacteristicsDisplay
          data={interval.settlementCharacteristicsDetermination}
          baseFilename={`${baseFilename}-settlement-${intervalIndex}`}
        />
      )}

      {/* Permeability */}
      {interval.saturatedPermeabilityDetermination && (
        <PermeabilityDisplay
          data={interval.saturatedPermeabilityDetermination}
          baseFilename={`${baseFilename}-permeability-${intervalIndex}`}
        />
      )}

      {/* Triaxial tests */}
      {interval.shearStressChangeDuringLoadingDetermination &&
        interval.shearStressChangeDuringLoadingDetermination.length > 0 && (
          <TriaxialTestsDisplay
            tests={interval.shearStressChangeDuringLoadingDetermination}
            baseFilename={`${baseFilename}-triaxial-${intervalIndex}`}
          />
        )}
    </div>
  );
}

interface BasicDeterminationsTableProps {
  interval: InvestigatedInterval;
}

function BasicDeterminationsTable({ interval }: BasicDeterminationsTableProps) {
  const { t } = useTranslation();

  const rows: Array<{ label: string; value: string }> = [];

  const waterContent = interval.waterContentDetermination?.waterContent;
  if (waterContent != null) {
    rows.push({
      label: t("waterContent"),
      value: `${waterContent.toFixed(1)} %`,
    });
  }

  const organicMatter =
    interval.organicMatterContentDetermination?.organicMatterContent;
  if (organicMatter != null) {
    rows.push({
      label: t("organicMatterContent"),
      value: `${organicMatter.toFixed(1)} %`,
    });
  }

  const carbonate = interval.carbonateContentDetermination?.carbonateContent;
  if (carbonate != null) {
    rows.push({
      label: t("carbonateContent"),
      value: `${carbonate.toFixed(1)} %`,
    });
  }

  const bulkDensity =
    interval.volumetricMassDensityDetermination?.volumetricMassDensity;
  if (bulkDensity != null) {
    rows.push({
      label: t("bulkDensity"),
      value: `${bulkDensity.toFixed(3)} g/cm³`,
    });
  }

  const particleDensity =
    interval.volumetricMassDensityOfSolidsDetermination
      ?.volumetricMassDensityOfSolids;
  if (particleDensity != null) {
    rows.push({
      label: t("particleDensity"),
      value: `${particleDensity.toFixed(3)} g/cm³`,
    });
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded p-4">
      <h4 className="font-medium mb-3">{t("basicDeterminations")}</h4>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-gray-100 last:border-0">
              <td className="py-2 text-gray-500">{row.label}</td>
              <td className="py-2 text-right font-mono">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
