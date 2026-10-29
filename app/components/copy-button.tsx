import { usePostHog } from "@posthog/react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useTransition } from "react";
import { Button } from "react-aria-components";

interface CopyButtonProps {
  value: number | string;
  label?: string;
  /** Analytics name of what is copied (bro_id, coordinates, ...). */
  field: string;
}

export function CopyButton({ value, label = "Copy", field }: CopyButtonProps) {
  const posthog = usePostHog();
  const [isPending, startTransition] = useTransition();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(String(value));
      posthog.capture("value_copied", { field });
      startTransition(async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      });
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }

  return (
    <Button
      aria-label={label}
      onPress={() => {
        handleCopy().catch(console.error);
      }}
      className="p-1 hover:bg-gray-200 data-pressed:bg-gray-300 data-pressed:text-gray-950 rounded transition-colors"
    >
      {isPending ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
    </Button>
  );
}
