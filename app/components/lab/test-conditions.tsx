import type { Coded, Measure } from "@bedrock-engineer/bro-xml-parser";
import type { TFunction } from "i18next";
import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  formatCodes,
  formatIndication,
  formatMeasure,
} from "../../util/format";
import { CodeValue } from "../code-value";

export interface ConditionRow {
  label: string;
  value: ReactNode;
}

/** Row for a BRO coded value, null when absent so it drops out of the list. */
export function codedRow(
  label: string,
  coded: Coded | null | undefined,
): ConditionRow | null {
  return coded ? { label, value: <CodeValue coded={coded} /> } : null;
}

/** Row for a list of coded values ("removed material"), comma separated. */
export function codedListRow(
  label: string,
  codes: ReadonlyArray<Coded | null> | null | undefined,
): ConditionRow | null {
  const value = formatCodes(codes);
  return value ? { label, value } : null;
}

/** Row for a yes/no flag. */
export function booleanRow(
  label: string,
  value: boolean | null | undefined,
  t: TFunction,
): ConditionRow | null {
  return value == null ? null : { label, value: formatIndication(value, t) };
}

/** Row for a measured value, shown with the unit the XML declares. */
export function measureRow(
  label: string,
  measure: Measure | null | undefined,
  fractionDigits?: number,
): ConditionRow | null {
  return measure == null
    ? null
    : { label, value: formatMeasure(measure, fractionDigits) };
}

/** A row that may be absent: conditional expressions can yield null/false. */
export type OptionalRow = ConditionRow | null | false | undefined;

function isPresent(row: OptionalRow): row is ConditionRow {
  return row != null && row !== false;
}

/**
 * The dt/dd pairs for a list of rows, absent rows dropped. Composes inside an
 * existing definition list.
 */
export function ConditionRows({ rows }: { rows: Array<OptionalRow> }) {
  return (
    <>
      {rows
        .filter((row) => isPresent(row))
        .map((row, index) => (
          <Fragment key={index}>
            <dt className="text-gray-500">{row.label}</dt>
            <dd>{row.value}</dd>
          </Fragment>
        ))}
    </>
  );
}

interface TestConditionsProps {
  rows: Array<OptionalRow>;
}

/**
 * Collapsible list of procedural test metadata (methods, corrections,
 * specimen preparation). Renders nothing when every row is absent.
 */
export function TestConditions({ rows }: TestConditionsProps) {
  const { t } = useTranslation();
  const filled = rows.filter((row) => isPresent(row));

  if (filled.length === 0) {
    return null;
  }

  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-gray-500 hover:text-gray-700 select-none">
        {t("testConditions")} ({filled.length})
      </summary>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pl-4">
        <ConditionRows rows={filled} />
      </dl>
    </details>
  );
}
