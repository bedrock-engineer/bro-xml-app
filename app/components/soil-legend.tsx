import { useTranslation } from "react-i18next";
import { patternMarkup, type SoilLegendEntry } from "../util/bro-lithology";
import type { TranslateFunction } from "../util/plot-config";

interface SoilLegendProps {
  soils: Array<SoilLegendEntry>;
  /** Prefix for pattern ids, unique per plot so multiple legends can coexist. */
  idPrefix: string;
}

// Legend for soil-log style plots (bore log, pre-excavation): one swatch per
// soil actually present, mirroring the plot's colour + hatch conventions.
export function SoilLegend({ soils, idPrefix }: SoilLegendProps) {
  const { t } = useTranslation();

  if (soils.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        {t("soilTypes")}
      </h4>
      <div className="flex flex-wrap gap-3 text-xs">
        {soils.map((soil) => (
          <SoilLegendItem
            key={soil.key}
            entry={soil}
            idPrefix={idPrefix}
            label={
              soil.i18nKey
                ? (t as TranslateFunction)(soil.i18nKey)
                : (soil.rawLabel ?? "")
            }
          />
        ))}
      </div>
    </div>
  );
}

// Soil legend swatch: solid colour with the soil's hatch overlaid, mirroring
// the bands in the plot so colour + texture stay in sync.
function SoilLegendItem({
  entry,
  idPrefix,
  label,
}: {
  entry: SoilLegendEntry;
  idPrefix: string;
  label: string;
}) {
  const patternId = `${idPrefix}-hatch-${entry.key}`;
  const hatch = entry.hatchSoil ? patternMarkup(entry.hatchSoil, patternId) : "";
  return (
    <div className="flex items-center gap-1">
      <svg
        width="16"
        height="16"
        className="border border-gray-300 block flex-shrink-0"
        aria-hidden="true"
      >
        {hatch && <defs dangerouslySetInnerHTML={{ __html: hatch }} />}
        <rect width="16" height="16" fill={entry.color} />
        {hatch && <rect width="16" height="16" fill={`url(#${patternId})`} />}
      </svg>
      <span className="text-gray-600">{label}</span>
    </div>
  );
}
