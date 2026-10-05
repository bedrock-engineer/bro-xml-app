import type {
  BoreholeSampleAnalysis,
  InvestigatedInterval,
} from "@bedrock-engineer/bro-xml-parser";
import type { TFunction } from "i18next";
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
import { Card, CardTitle } from "../card";
import { CodeValue } from "../code-value";
import { formatCode, formatDate, formatMeasure } from "../../util/format";
import {
  booleanRow,
  codedListRow,
  codedRow,
  ConditionRows,
  type OptionalRow,
  TestConditions,
} from "../lab/test-conditions";
import { BasicDeterminationsDepthPlots } from "../lab/basic-determinations-depth-plots";
import { ConsistencyLimitsDisplay } from "../lab/consistency-limits-display";
import { ParticleSizeDistributionPlot } from "../lab/particle-size-distribution-plot";
import { PermeabilityDisplay } from "../lab/permeability-display";
import { SettlementCharacteristicsDisplay } from "../lab/settlement-characteristics-display";
import { DirectShearDisplay } from "../lab/direct-shear-display";
import { TriaxialTestsDisplay } from "../lab/triaxial-tests-display";

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

  const intervals = analysis.investigatedInterval;
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
              <dd>{formatDate(analysis.analysisReportDate)}</dd>
            </>
          )}
          {analysis.analysisProcedure && (
            <>
              <dt className="text-gray-500">{t("analysisProcedure")}</dt>
              <dd>
                <CodeValue coded={analysis.analysisProcedure} />
              </dd>
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
          value={selectedInterval}
          onChange={(key) => {
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
                  {interval.beginDepth?.value.toFixed(2) ?? "–"} –{" "}
                  {formatMeasure(interval.endDepth, 2) ?? "–"}{" "}
                  {formatCode(interval.analysisType)}
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
          {t("interval")}: {interval.beginDepth?.value.toFixed(2) ?? "–"} -{" "}
          {formatMeasure(interval.endDepth, 2) ?? "–"}
        </h4>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {interval.sampleQuality && (
            <>
              <dt className="text-gray-500">{t("sampleQuality")}</dt>
              <dd>
                <CodeValue coded={interval.sampleQuality} />
              </dd>
            </>
          )}
          {interval.analysisType && (
            <>
              <dt className="text-gray-500">{t("analysisType")}</dt>
              <dd>
                <CodeValue coded={interval.analysisType} />
              </dd>
            </>
          )}
          <InvestigatedMaterialRows interval={interval} />
        </dl>
      </div>

      <BasicDeterminationsTable interval={interval} />

      {interval.particleSizeDistributionDetermination && (
        <ParticleSizeDistributionPlot
          data={interval.particleSizeDistributionDetermination}
          baseFilename={`${baseFilename}-psd-${intervalIndex}`}
        />
      )}

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

      {/* Direct shear tests */}
      {interval.shearStressChangeDuringHorizontalDeformationDetermination &&
        interval.shearStressChangeDuringHorizontalDeformationDetermination
          .length > 0 && (
          <DirectShearDisplay
            tests={
              interval.shearStressChangeDuringHorizontalDeformationDetermination
            }
            baseFilename={`${baseFilename}-directshear-${intervalIndex}`}
          />
        )}
    </div>
  );
}

interface InvestigatedMaterialRowsProps {
  interval: InvestigatedInterval;
}

/** Description of the investigated material, as rows inside the interval dl. */
function InvestigatedMaterialRows({ interval }: InvestigatedMaterialRowsProps) {
  const { t } = useTranslation();
  const material = interval.investigatedMaterial;

  if (!material) {
    return null;
  }

  return (
    <ConditionRows
      rows={[
        codedRow(t("geotechnicalSoilName"), material.geotechnicalSoilName),
        codedRow(t("specialMaterial"), material.specialMaterial),
        codedRow(t("colour"), material.colour),
        codedRow(t("carbonateContentClass"), material.carbonateContentClass),
        codedRow(
          t("organicMatterContentClass"),
          material.organicMatterContentClass,
        ),
        codedRow(t("gravelMedianClass"), material.gravelMedianClass),
        codedRow(t("sandMedianClass"), material.sandMedianClass),
        codedListRow(t("tertiaryConstituent"), material.tertiaryConstituent),
      ]}
    />
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
      value: formatMeasure(waterContent, 1),
    });
  }

  const organicMatter =
    interval.organicMatterContentDetermination?.organicMatterContent;
  if (organicMatter != null) {
    rows.push({
      label: t("organicMatterContent"),
      value: formatMeasure(organicMatter, 1),
    });
  }

  const carbonate = interval.carbonateContentDetermination?.carbonateContent;
  if (carbonate != null) {
    rows.push({
      label: t("carbonateContent"),
      value: formatMeasure(carbonate, 1),
    });
  }

  const bulkDensity =
    interval.volumetricMassDensityDetermination?.volumetricMassDensity;
  if (bulkDensity != null) {
    rows.push({
      label: t("bulkDensity"),
      value: formatMeasure(bulkDensity, 3),
    });
  }

  const particleDensity =
    interval.volumetricMassDensityOfSolidsDetermination
      ?.volumetricMassDensityOfSolids;
  if (particleDensity != null) {
    rows.push({
      label: t("particleDensity"),
      value: formatMeasure(particleDensity, 3),
    });
  }

  const shearStrength = interval.maximumUndrainedShearStrengthDetermination;
  if (shearStrength?.maximumUndrainedShearStrength != null) {
    rows.push({
      label: t("undrainedShearStrength"),
      value: formatMeasure(shearStrength.maximumUndrainedShearStrength, 1),
    });
  }
  const lowestStrength = shearStrength?.lowestMaximumUndrainedShearStrength;
  const highestStrength = shearStrength?.highestMaximumUndrainedShearStrength;
  if (lowestStrength != null && highestStrength != null) {
    rows.push({
      label: t("undrainedShearStrengthRange"),
      value: `${lowestStrength.value.toFixed(1)} – ${formatMeasure(highestStrength, 1)}`,
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
              <th
                scope="row"
                className="py-2 text-left font-normal text-gray-500"
              >
                {row.label}
              </th>
              <td className="py-2 text-right font-mono">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <TestConditions rows={basicDeterminationConditions(interval, t)} />
    </div>
  );
}

const prefixed = (determination: string, label: string) =>
  `${determination} · ${label}`;

/**
 * Procedural metadata of the basic determinations, each row prefixed with the
 * determination it belongs to.
 */
function basicDeterminationConditions(
  interval: InvestigatedInterval,
  t: TFunction,
): Array<OptionalRow> {
  const water = interval.waterContentDetermination;
  const organic = interval.organicMatterContentDetermination;
  const carbonate = interval.carbonateContentDetermination;
  const density = interval.volumetricMassDensityDetermination;
  const solids = interval.volumetricMassDensityOfSolidsDetermination;
  const strength = interval.maximumUndrainedShearStrengthDetermination;

  const determinedFlags: Array<[string, boolean | null]> = [
    [t("waterContent"), interval.waterContentDetermined],
    [t("organicMatterContent"), interval.organicMatterContentDetermined],
    [t("carbonateContent"), interval.carbonateContentDetermined],
    [t("bulkDensity"), interval.volumetricMassDensityDetermined],
    [t("particleDensity"), interval.volumetricMassDensitySolidsDetermined],
  ];
  const determined = determinedFlags
    .filter(([, flag]) => flag === true)
    .map(([label]) => label);

  // One method row per determination, from its method (or procedure) code
  const methodRows = (
    [
      [t("waterContent"), water],
      [t("organicMatterContent"), organic],
      [t("carbonateContent"), carbonate],
      [t("bulkDensity"), density],
      [t("particleDensity"), solids],
      [t("undrainedShearStrength"), strength],
    ] as const
  ).map(([label, determination]) =>
    codedRow(
      prefixed(label, t("method")),
      determination?.determinationMethod ??
        determination?.determinationProcedure,
    ),
  );

  return [
    booleanRow(t("described"), interval.described, t),
    determined.length > 0
      ? { label: t("determined"), value: determined.join(", ") }
      : null,
    ...methodRows,
    codedRow(
      prefixed(t("waterContent"), t("sampleMoistness")),
      water?.sampleMoistness,
    ),
    codedListRow(
      prefixed(t("waterContent"), t("removedMaterial")),
      water?.removedMaterial,
    ),
    codedRow(
      prefixed(t("waterContent"), t("dryingTemperature")),
      water?.dryingTemperature,
    ),
    codedRow(
      prefixed(t("waterContent"), t("dryingPeriod")),
      water?.dryingPeriod,
    ),
    codedRow(
      prefixed(t("waterContent"), t("saltCorrectionMethod")),
      water?.saltCorrectionMethod,
    ),
    codedListRow(
      prefixed(t("waterContent"), t("performanceIrregularity")),
      water?.performanceIrregularity,
    ),
    booleanRow(
      prefixed(t("organicMatterContent"), t("lutumCorrectionApplied")),
      organic?.lutumCorrectionApplied,
      t,
    ),
    codedListRow(
      prefixed(t("organicMatterContent"), t("removedMaterial")),
      organic?.removedMaterial,
    ),
    codedListRow(
      prefixed(t("carbonateContent"), t("removedMaterial")),
      carbonate?.removedMaterial,
    ),
    codedRow(
      prefixed(t("bulkDensity"), t("sampleMoistness")),
      density?.sampleMoistness,
    ),
    codedRow(
      prefixed(t("particleDensity"), t("liquidUsed")),
      solids?.liquidUsed,
    ),
    codedRow(
      prefixed(t("particleDensity"), t("sampleContainerVolume")),
      solids?.sampleContainerVolume,
    ),
    codedRow(
      prefixed(t("undrainedShearStrength"), t("determinationDiameter")),
      strength?.determinationDiameter,
    ),
    booleanRow(
      prefixed(t("undrainedShearStrength"), t("verticallyDetermined")),
      strength?.verticallyDetermined,
      t,
    ),
  ];
}
