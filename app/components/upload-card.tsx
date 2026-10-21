import { UploadIcon } from "lucide-react";
import { useId } from "react";
import { Button, FileTrigger } from "react-aria-components";
import { useTranslation } from "react-i18next";

interface UploadCardProps {
  isPending: boolean;
  onFiles: (files: FileList | null) => void;
  onLoadSamples: () => void;
}

/** The file picker, sample-files link, and supported-types note. */
export function UploadCard({
  isPending,
  onFiles,
  onLoadSamples,
}: UploadCardProps) {
  const { t } = useTranslation();
  const supportedTypesId = useId();

  return (
    <div className="mb-8">
      <FileTrigger
        acceptedFileTypes={[".xml", ".XML"]}
        allowsMultiple
        onSelect={onFiles}
      >
        <Button
          isPending={isPending}
          aria-describedby={supportedTypesId}
          className="flex gap-1 items-center justify-center w-full p-2 border border-blue-300 aria-selected:bg-blue-200 data-pressed:bg-blue-200 data-pressed:text-blue-800 rounded-sm bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
        >
          {isPending ? (
            <>
              {t("processingFiles")}{" "}
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </>
          ) : (
            <>
              {t("chooseFiles")}
              <UploadIcon size={14} />
            </>
          )}
        </Button>
      </FileTrigger>

      <div className="text-xs mt-1 text-center">
        <span className=" text-gray-500">{t("or")} </span>
        <Button
          className=" text-blue-500 hover:text-blue-800 underline"
          onPress={onLoadSamples}
        >
          {t("loadSampleFiles")}
        </Button>
      </div>

      <p
        id={supportedTypesId}
        className="text-xs mt-2 text-center text-gray-500"
      >
        {t("supportedTypes")}
      </p>
    </div>
  );
}
