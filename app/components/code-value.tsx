import type { Coded } from "@bedrock-engineer/bro-xml-parser";
import { describeCode, formatCode } from "../util/format";

interface CodeValueProps {
  coded: Coded | null | undefined;
}

/**
 * A BRO coded value as a readable label, with the official description on hover
 */
export function CodeValue({ coded }: CodeValueProps) {
  if (!coded) {
    return null;
  }

  const description = describeCode(coded);

  return (
    <span
      title={description ?? undefined}
      className={
        description
          ? "underline decoration-dotted decoration-gray-400 cursor-help"
          : undefined
      }
    >
      {formatCode(coded)}
    </span>
  );
}
