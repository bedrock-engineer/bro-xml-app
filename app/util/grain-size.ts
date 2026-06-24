/**
 * Sand grain-size helpers for the BHR-GT details table's grain-size sparkline.
 *
 * The median grain size of a sand layer is reported as an ordinal BRO
 * `sandMedianClass` code (e.g. "middelgrof300tot420um"). Each code's official
 * description embeds its µm range ("De zandmediaan ligt tussen 300 en 420 µm
 * ..."), so we parse the range straight from the parser's authoritative
 * codelist — no hand-maintained table to drift out of sync.
 */
import { getBhrgtSandMedianClassDescription } from "@bedrock-engineer/bro-xml-parser";

/** Sand grain-size axis domain (µm) — the NEN-EN-ISO 14688 sand range. */
export const SAND_MEDIAN_DOMAIN: [number, number] = [63, 2000];

/** Tick positions (µm) for the axis: the fijn | middelgrof | grof boundaries. */
export const SAND_MEDIAN_TICKS = [63, 200, 630, 2000];

/** Internal class breaks (µm), drawn as faint reference lines in each cell. */
export const SAND_MEDIAN_BREAKS = [200, 630];

export interface GrainSizeRange {
  min: number;
  max: number;
  /** Representative size: geometric mean (log scale suits grain sizes). */
  mid: number;
}

const RANGE_RE = /tussen\s+(\d+)\s+en\s+(\d+)/i;

/**
 * Median grain-size range (µm) for a BRO `sandMedianClass` code, read from the
 * parser's codelist description. Returns null for non-sand layers or codes
 * whose description carries no µm range.
 */
export function sandMedianRange(
  code: string | null | undefined,
): GrainSizeRange | null {
  if (!code) {
    return null;
  }
  const description = getBhrgtSandMedianClassDescription(code);
  const match = description ? RANGE_RE.exec(description) : null;
  if (!match) {
    return null;
  }
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (min <= 0 || max <= 0 || max < min) {
    return null;
  }
  return { min, max, mid: Math.sqrt(min * max) };
}
