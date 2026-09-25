import type { Coded, Location } from "@bedrock-engineer/bro-xml-parser";
import type { TFunction } from "i18next";
import type { HeaderItem } from "../types/header-types";
import {
  describe,
  prettifyBroCode,
} from "@bedrock-engineer/bro-xml-parser/reference-codes";

/**
 * Format a BRO date or dateTime to its calendar date (YYYY-MM-DD).
 * BRO dates are ISO strings that may be partial (YYYY-MM, YYYY); those are
 * returned as-is. The calendar date of a dateTime is its Dutch-local date,
 * so we cut the string rather than converting through Date (which would
 * shift late-evening times to the previous UTC day).
 */
export function formatDate(date: string): string {
  return date.split("T")[0] ?? date;
}

/**
 * Short readable label for a BRO coded value ("kleiigZand" → "Kleiig zand")
 */
export function formatCode(coded: Coded | null | undefined): string | null {
  return coded ? prettifyBroCode(coded.code) : null;
}

/**
 * Readable labels for a list of coded values, comma separated
 */
export function formatCodes(
  codes: ReadonlyArray<Coded | null> | null | undefined,
): string | null {
  const labels = (codes ?? []).map(formatCode).filter((l) => l !== null);
  return labels.length > 0 ? labels.join(", ") : null;
}

/**
 * Distinct coded values (by code), in first-seen order
 */
export function uniqueCodes(
  codes: ReadonlyArray<Coded | null>,
): Array<Coded> {
  const seen = new Map<string, Coded>();
  for (const coded of codes) {
    if (coded && !seen.has(coded.code)) {
      seen.set(coded.code, coded);
    }
  }
  return [...seen.values()];
}

/**
 * Official (Dutch) BRO description of a coded value
 */
export function describeCode(coded: Coded | null | undefined): string | null {
  return describe(coded);
}

/**
 * Header item for a coded value: readable label, official description on hover
 */
export function codeItem(label: string, coded: Coded): HeaderItem {
  return { label, value: formatCode(coded), description: describe(coded) };
}

/**
 * BRO quality class ("klasse2") → number, other codes ("nvt", "onbekend") → label
 */
export function formatQualityClass(
  coded: Coded | null | undefined,
): string | null {
  if (!coded) {
    return null;
  }
  const match = /^klasse(\d)$/.exec(coded.code);
  return match?.[1] ?? prettifyBroCode(coded.code);
}

/**
 * Format location for detailed header display (with EPSG prefix and axis labels)
 */
export function formatDeliveredLocation(location: Location): string {
  return `${location.epsg} - X: ${location.x.toFixed(2)}, Y: ${location.y.toFixed(2)}`;
}

/**
 * Format standardized location (higher precision, no axis labels)
 */
export function formatStandardizedLocation(location: Location): string {
  return `${location.epsg} - ${location.x.toFixed(6)}, ${location.y.toFixed(6)}`;
}

/**
 * BRO yes/no/unknown indicator ("ja" | "nee" | "onbekend"), or a plain boolean
 */
export function formatIndication(
  value: string | boolean | null | undefined,
  t: TFunction,
): string | null {
  switch (value) {
    case true:
    case "ja": {
      return t("yes");
    }
    case false:
    case "nee": {
      return t("no");
    }
    case "onbekend": {
      return t("unknown");
    }
    default: {
      return null;
    }
  }
}
