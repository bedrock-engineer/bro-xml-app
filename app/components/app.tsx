import { BROParser, XMLAdapter } from "@bedrock-engineer/bro-xml-parser";
import type { TFunction } from "i18next";
import {
  GithubIcon,
  InfoIcon,
  LinkedinIcon,
  MailIcon,
  MessageSquareIcon,
  TrashIcon,
  UploadIcon,
} from "lucide-react";
import { Suspense, useState, useTransition } from "react";
import { Button, FileTrigger } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { Link, useFetcher } from "react-router";
import {
  type BROData,
  isBHRGData,
  isBHRGTData,
  isCPTData,
} from "~/types/bro-data";
import { detectChartAxes } from "~/util/chart-axes";
import { CompactBHRGHeader, DetailedBHRGHeaders } from "./bhr-g-header-items";
import { BHRGPlot } from "./bhr-g-plot";
import { CompactBHRGTHeader, DetailedBoreHeaders } from "./bhr-gt-header-items";
import { BHRGTPlot } from "./bhr-gt-plot";
import { BROMap } from "./map.client";
import { Card } from "./card";
import { CompactCptHeader, DetailedCptHeaders } from "./cpt-header-items";
import { CptPlots } from "./cpt-plot";
import { DownloadGeoJSONButton } from "./download-geojson-button";
import { FileTable } from "./file-table";
import { InstallInstructions } from "./install-instructions";
import { LaboratoryAnalysis } from "./laboratory-analysis";

function translateWarning(warning: string, t: TFunction): string {
  const parts = warning.split(":");
  const key = parts[0];

  switch (key) {
    case "schemaVersionMismatch": {
      return t("schemaVersionMismatch", {
        expected: parts[1],
        found: parts[2],
      });
    }
    case "unknownNamespace": {
      return t("unknownNamespace", { namespace: parts[1] });
    }
    default: {
      return warning;
    }
  }
}

function translateError(error: string, t: TFunction): string {
  // Handle BROParseError codes
  if (error === "UNKNOWN_DATA_TYPE" || error === "unknownBROFileType") {
    return t("unknownBROFileType");
  }
  if (error === "INVALID_XML" || error === "invalidXML") {
    return t("invalidXML");
  }
  if (error === "MISSING_NAMESPACE") {
    return t("unknownBROFileType");
  }
  if (error === "UNSUPPORTED_SCHEMA") {
    return t("unknownBROFileType");
  }
  return error;
}

/**
 * Parse a BRO XML file and return the parsed data
 */
async function parseBROFile(file: File): Promise<BROData> {
  const text = await file.text();
  const parser = new BROParser(new XMLAdapter());
  return parser.parse(text);
}

export function App() {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [broData, setBroData] = useState<Record<string, BROData>>({});
  const [selectedFileName, setSelectedFileName] = useState("");
  const [failedFiles, setFailedFiles] = useState<
    Array<{ name: string; error: string }>
  >([]);

  async function loadSampleFiles() {
    const sampleFiles = [
      "example_cpt.xml",
      "example_bhr_gt.xml",
      "example_bhr_g.xml",
      "example_bhr_gt_triaxial.xml",
      "example_bhr_gt_triaxial.xml",
      "example_bhr_gt_vol_mass_density_solids.xml",
      "example_bhr_gt_max_undrained_shear_strength.xml",
    ];

    const parser = new BROParser(new XMLAdapter());

    const parsedFiles = sampleFiles.map(async (filename) => {
      const response = await fetch(`/${filename}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      return { filename, data: parser.parse(text) };
    });
    const results = await Promise.allSettled(parsedFiles);

    const successful = results
      .filter(
        (r): r is PromiseFulfilledResult<{ filename: string; data: BROData }> =>
          r.status === "fulfilled",
      )
      .map((r) => r.value);

    const failed = results
      .map((result, index) => ({ result, filename: sampleFiles[index] }))
      .filter(
        (item): item is { result: PromiseRejectedResult; filename: string } =>
          item.result.status === "rejected",
      )
      .map(({ result, filename }) => ({
        name: filename,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      }));

    const bro = Object.fromEntries(
      successful.map(({ filename, data }) => [filename, data]),
    ) as Record<string, BROData>;

    startTransition(() => {
      setBroData((previous) => ({ ...previous, ...bro }));
      setFailedFiles((previous) => [...previous, ...failed]);
      if (successful[0]) {
        setSelectedFileName(successful[0].filename);
      }
    });
  }

  async function handleFiles(fileList: FileList | Array<File> | null) {
    const files = [...(fileList ?? [])];

    if (files.length > 0) {
      const results = await Promise.allSettled(
        files.map((file) => parseBROFile(file)),
      );

      const parsedBroFiles = results
        .filter((f) => f.status === "fulfilled")
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .map((d, index) => [files[index]!.name, d.value]);

      const failed = results
        .map((result, index) => ({ result, file: files[index] }))
        .filter(
          (item): item is { result: PromiseRejectedResult; file: File } =>
            item.result.status === "rejected",
        )
        .map(({ result, file }) => ({
          name: file.name,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        }));

      const bro = Object.fromEntries(parsedBroFiles) as Record<string, BROData>;

      startTransition(() => {
        setBroData((previous) => ({ ...previous, ...bro }));
        setFailedFiles((previous) => [...previous, ...failed]);

        if (files[0]) {
          setSelectedFileName(files[0].name);
        }
      });
    }
  }

  const selectedFile = selectedFileName ? broData[selectedFileName] : undefined;

  const chartAxes =
    selectedFile && isCPTData(selectedFile)
      ? detectChartAxes(selectedFile)
      : null;

  return (
    <div className="pancake">
      <Header />

      <main className="main-grid px-2">
        <div className="mb-2">
          <div className="mb-8">
            <FileTrigger
              acceptedFileTypes={[".xml", ".XML"]}
              allowsMultiple
              onSelect={(fileList) => {
                handleFiles(fileList).catch((error: unknown) => {
                  console.error(error);
                });
              }}
            >
              <Button
                isPending={isPending}
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
                onPress={() => {
                  loadSampleFiles().catch((error: unknown) => {
                    console.error(error);
                  });
                }}
              >
                {t("loadSampleFiles")}
              </Button>
            </div>
          </div>

          {failedFiles.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-sm">
              <h2 className="text-red-800 font-semibold mb-2">
                {t("failedToParse", { count: failedFiles.length })}
              </h2>
              <ul className="space-y-1">
                {failedFiles.map(({ name, error }) => (
                  <li key={name} className="text-sm text-red-700">
                    <span className="font-medium">{name}</span>:{" "}
                    {translateError(error, t)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <FileTable
            broData={broData}
            selectedFileName={selectedFileName}
            onSelectionChange={setSelectedFileName}
            onFileDrop={(files) => {
              handleFiles(files).catch((error: unknown) => {
                console.error(error);
              });
            }}
            onFileRemove={(filename) => {
              setBroData((previous) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [filename]: _, ...rest } = previous;
                return rest;
              });

              if (selectedFileName === filename) {
                const remaining = Object.keys(broData).find(
                  (f) => f !== filename,
                );
                setSelectedFileName(remaining ?? "");
              }
            }}
          />

          {Object.keys(broData).length > 0 && (
            <Button
              className="button mt-2 ml-auto transition-colors"
              onPress={() => {
                setBroData({});
                setSelectedFileName("");
                setFailedFiles([]);
              }}
            >
              {t("clearAllFiles")} <TrashIcon size={14} />
            </Button>
          )}

          {Object.keys(broData).length > 0 && (
            <div className="mb-6 mt-2">
              <h2 className="text-xl font-semibold mb-3">
                {Object.keys(broData).length > 1
                  ? t("allLocations")
                  : t("location")}
              </h2>

              <Suspense
                fallback={
                  <div className="w-full h-96 rounded-sm border border-gray-300 bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-500">{t("loadingMap")}</span>
                  </div>
                }
              >
                <BROMap
                  broData={broData}
                  selectedFileName={selectedFileName}
                  onMarkerClick={setSelectedFileName}
                />
              </Suspense>

              <DownloadGeoJSONButton broData={broData} />
            </div>
          )}
        </div>

        {selectedFile ? (
          <div className="space-y-6 max-w-full">
            {selectedFile.meta.warnings.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm">
                <h2 className="text-amber-800 font-semibold mb-2">
                  {t("warning", { count: selectedFile.meta.warnings.length })}
                </h2>

                <ul className="space-y-1">
                  {selectedFile.meta.warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-amber-700">
                      {translateWarning(warning, t)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isCPTData(selectedFile) && (
              <>
                <CompactCptHeader
                  filename={selectedFileName}
                  data={selectedFile}
                />

                {chartAxes?.xAxis && chartAxes.yAxis && (
                  <CptPlots
                    data={selectedFile.data}
                    xAxis={chartAxes.xAxis}
                    yAxis={chartAxes.yAxis}
                    availableChartColumns={chartAxes.availableColumns}
                    yAxisOptions={chartAxes.yAxisOptions}
                    baseFilename={selectedFileName.replace(/\.xml$/i, "")}
                  />
                )}

                <DetailedCptHeaders data={selectedFile} />
              </>
            )}

            {isBHRGTData(selectedFile) && (
              <>
                <CompactBHRGTHeader
                  filename={selectedFileName}
                  data={selectedFile}
                />
                <BHRGTPlot
                  layers={selectedFile.data}
                  baseFilename={selectedFileName.replace(/\.xml$/i, "")}
                  analysis={selectedFile.analysis}
                />
                {selectedFile.analysis && (
                  <LaboratoryAnalysis
                    analysis={selectedFile.analysis}
                    baseFilename={selectedFileName.replace(/\.xml$/i, "")}
                  />
                )}
                <DetailedBoreHeaders data={selectedFile} />
              </>
            )}

            {isBHRGData(selectedFile) && (
              <>
                <CompactBHRGHeader
                  filename={selectedFileName}
                  data={selectedFile}
                />
                <BHRGPlot
                  layers={selectedFile.data}
                  baseFilename={selectedFileName.replace(/\.xml$/i, "")}
                />
                <DetailedBHRGHeaders data={selectedFile} />
              </>
            )}
          </div>
        ) : (
          <MarketingMessage />
        )}
      </main>
      <Footer />
    </div>
  );
}

function MarketingMessage() {
  const { t } = useTranslation();
  return (
    <Card>
      <p className="text-gray-600 mb-4">{t("uploadBroFile")}</p>

      <div className="text-sm text-gray-500">
        <p className="mb-2">{t("freeToolByBedrock")}</p>

        <ul className="list-disc list-inside space-y-1 ">
          <li>{t("customWebApps")}</li>
          <li>{t("bimCadIntegrations")}</li>
          <li>{t("pythonAutomation")}</li>
        </ul>

        <p className="mt-3">
          {t("emptyStateContact")}{" "}
          <a
            href="mailto:info@bedrock.engineer"
            className="text-blue-500 hover:underline font-medium"
          >
            {t("contactUs")} info@bedrock.engineer
          </a>
        </p>
      </div>
    </Card>
  );
}

function Header() {
  const { t, i18n } = useTranslation();
  const fetcher = useFetcher();

  const handleLanguageChange = () => {
    const newLang = i18n.language === "nl" ? "en" : "nl";
    console.log({ newLang });

    return fetcher.submit(
      { locale: newLang },
      { method: "post", action: "/set-language" },
    );
  };

  return (
    <header className="mb-6 border-b border-gray-300 py-4 px-2">
      <div
        style={{ maxWidth: "clamp(360px, 100%, 1800px)" }}
        className=" mx-auto flex justify-between items-center"
      >
        <h1
          className="text-3xl flex gap-2 items-center"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <img src="bedrock.svg" width={30} /> {t("appTitle")}
        </h1>

        <button
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors"
          onClick={() => {
            handleLanguageChange()
              .then((a) => {
                console.log("Language change submitted", a);
              })
              .catch((error: unknown) => {
                console.error(error);
              });
          }}
        >
          {i18n.language === "nl" ? "English" : "Nederlands"}
        </button>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-8 py-8 border-t border-gray-300 text-sm text-gray-500">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700 mb-3">{t("about")}</h3>

            <p className="text-sm">{t("appDescription")}</p>

            <p className="text-sm">
              {t("privacyNote")} {t("offlineNote")}{" "}
            </p>

            <p>
              <Suspense fallback="Checking...">
                <InstallInstructions />
              </Suspense>
            </p>

            <a
              className="hover:underline flex gap-1 items-center text-lg mt-2"
              href="https://bedrock.engineer"
            >
              <img
                src="/bedrock.svg"
                width="16px"
                height="16px"
                alt="Bedrock logo"
              />
              Bedrock.engineer
            </a>

            <a
              className="text-blue-400 hover:underline flex gap-1 items-center text-sm mt-2"
              href="https://gef.bedrock.engineer"
            >
              Bedrock GEF viewer
            </a>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 mb-3">{t("contact")}</h3>
            <div>
              <p className="text-sm mb-1">
                {t("needSimilarApp")} {t("contactUs")}
                {"  "}
                <a
                  href="mailto:info@bedrock.engineer"
                  className="text-blue-400 hover:underline font-medium ml-1"
                >
                  info@bedrock.engineer
                </a>
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm mb-1 inline-flex">
                {t("feedbackOrRequests")}
              </p>

              <Link
                to="/feedback"
                className="flex gap-1 items-center text-blue-400 hover:underline font-medium"
              >
                <MessageSquareIcon size={14} /> {t("giveFeedback")}
              </Link>

              <a
                className="flex gap-1 items-center text-blue-400 hover:underline font-medium"
                href="https://github.com/bedrock-engineer/bro-xml-app/issues"
              >
                <GithubIcon size={14} /> Github Issues
              </a>

              <a
                href="mailto:jules.blom@bedrock.engineer"
                className="flex gap-1 items-center text-blue-400 hover:underline font-medium"
              >
                <MailIcon size={12} /> jules.blom@bedrock.engineer
              </a>

              <a
                href="https://www.linkedin.com/company/bedrock-engineer/"
                className="flex gap-1 items-center text-blue-400 hover:underline font-medium"
              >
                <LinkedinIcon size={14} />
                LinkedIn
              </a>
            </div>

            <div className="pt-2">
              <Link
                to="/info"
                className="flex gap-1 items-center text-blue-400 hover:underline font-medium"
              >
                <InfoIcon size={14} /> {t("info")}
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-300">
          <p className="text-gray-400 text-xs text-center">{t("disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
