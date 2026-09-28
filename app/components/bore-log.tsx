import type { Coded } from "@bedrock-engineer/bro-xml-parser";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BHRGData, BHRGTData } from "~/types/bro-data";
import { getDepthRange } from "~/types/bro-data";
import { formatCode } from "~/util/format";
import { RadioButtonGroup } from "./radio-button-group";

/** The one log field the selector labels by (field vs lab description). */
interface LabelableLog {
  descriptionLocation: Coded | null;
}

interface LogSelection {
  /** Every descriptive log of the borehole. */
  logs: ReadonlyArray<LabelableLog>;
  /** Selected log index, clamped to the current borehole's log count. */
  activeLogIndex: number;
  setLogIndex: (index: number) => void;
  /** Depth extent across *all* logs, so switching logs keeps the axis fixed. */
  depthRange: [number, number];
}

/**
 * Shared log-selection state for the BHR-GT and BHR-G bore plots. A borehole
 * can carry several descriptive logs (e.g. field and lab); this tracks which is
 * selected and the depth range spanning them all.
 */
export function useLogSelection(data: BHRGTData | BHRGData): LogSelection {
  const [logIndex, setLogIndex] = useState(0);

  // The selection is state that survives file switches (same component
  // position). Reset it during render when the borehole changes — the
  // documented alternative to a setState-in-effect.
  const [selectedForData, setSelectedForData] = useState(data);
  if (selectedForData !== data) {
    setSelectedForData(data);
    setLogIndex(0);
  }

  const logs: ReadonlyArray<LabelableLog> =
    data.boreholeSampleDescription?.descriptiveBoreholeLog ?? [];
  const activeLogIndex = logIndex < logs.length ? logIndex : 0;

  return {
    logs,
    activeLogIndex,
    setLogIndex,
    depthRange: getDepthRange(data),
  };
}

interface LogSelectorProps {
  logs: ReadonlyArray<LabelableLog>;
  value: number;
  onChange: (index: number) => void;
}

/**
 * Radio to switch descriptive logs, labeled by each log's description location.
 * Renders nothing for a single-log borehole.
 */
export function LogSelector({ logs, value, onChange }: LogSelectorProps) {
  const { t } = useTranslation();

  if (logs.length <= 1) {
    return null;
  }

  return (
    <RadioButtonGroup
      className="text-sm"
      label={t("descriptionLog")}
      value={String(value)}
      onChange={(next) => {
        onChange(Number(next));
      }}
      options={logs.map((log, index) => ({
        value: String(index),
        label:
          formatCode(log.descriptionLocation) ??
          `${t("descriptionLog")} ${index + 1}`,
      }))}
    />
  );
}
