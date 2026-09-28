import type { ReactNode } from "react";
import {
  Focusable,
  OverlayArrow,
  Tooltip,
  TooltipTrigger,
} from "react-aria-components";

interface CodeTooltipProps {
  /** Official BRO description; when absent the children render plain. */
  description: string | null | undefined;
  children: ReactNode;
}

/**
 * Reveals the official BRO description of a coded value on hover or focus,
 * using a react-aria-components Tooltip. When there is no description the
 * children render as plain text with no trigger.
 */
export function CodeTooltip({ description, children }: CodeTooltipProps) {
  if (!description) {
    return <>{children}</>;
  }

  return (
    <TooltipTrigger delay={300}>
      <Focusable>
        <span
          role="button"
          tabIndex={0}
          className="underline decoration-dotted decoration-gray-400 cursor-help"
        >
          {children}
        </span>
      </Focusable>
      <Tooltip className="max-w-xs rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg">
        <OverlayArrow>
          <svg width={8} height={8} viewBox="0 0 8 8" className="fill-gray-900">
            <path d="M0 0 L4 4 L8 0" />
          </svg>
        </OverlayArrow>
        {description}
      </Tooltip>
    </TooltipTrigger>
  );
}
