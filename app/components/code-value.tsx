import type { Coded } from "@bedrock-engineer/bro-xml-parser";
import { describeCode, formatCode } from "../util/format";
import { CodeTooltip } from "./code-tooltip";

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

  return (
    <CodeTooltip description={describeCode(coded)}>
      {formatCode(coded)}
    </CodeTooltip>
  );
}
