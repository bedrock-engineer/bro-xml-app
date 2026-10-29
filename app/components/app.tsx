import { usePostHog } from "@posthog/react";
import type { TFunction } from "i18next";
import {
  GithubIcon,
  InfoIcon,
  LinkedinIcon,
  MailIcon,
  MessageSquareIcon,
  TrashIcon,
} from "lucide-react";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { Button } from "react-aria-components";
import { useTranslation } from "react-i18next";
import {
  Link,
  useFetcher,
  useLocation,
  useNavigate,
  useNavigation,
  useRevalidator,
} from "react-router";
import { type SessionFile, sessionFilesStore } from "~/state/session-files";
import { type BROData, getFileType, parseBRO } from "~/types/bro-data";
import {
  type RouteObjectResult,
  registerFlight,
  rememberLoadSource,
  resolveFlight,
} from "~/types/bro-route";
import { broIdPattern } from "~/util/bro-id";
import { downloadFile } from "~/util/download";
import { recordLoadedFiles } from "~/util/person-file-stats";
import { Card } from "./card";
import { FileTable } from "./file-table";
import { InstallInstructions } from "./install-instructions";
import { MapSection } from "./map-section";
import { SelectedObjectPanel } from "./selected-object-panel";
import { UploadCard } from "./upload-card";

function translateError(error: string, t: TFunction): string {
  // Classified /:broId loader failures (the BRO's own rejection reasons are
  // passed through as-is and don't take this branch)
  if (error.startsWith("bro:")) {
    switch (error.slice("bro:".length)) {
      case "rate-limited": {
        return t("broErrorRateLimited");
      }
      case "unavailable": {
        return t("broErrorUnavailable");
      }
      case "unsupported": {
        return t("broErrorUnsupported");
      }
      default: {
        return t("broErrorGeneric");
      }
    }
  }
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
 * Stable, low-cardinality label for a parse failure, for analytics: the
 * BROParseError code (UNSUPPORTED_SCHEMA, INVALID_XML, ...), the app's own
 * "unknownBROFileType" rejection, or the error's class name as a fallback.
 */
function parseErrorCode(reason: unknown): string {
  if (
    typeof reason === "object" &&
    reason !== null &&
    "code" in reason &&
    typeof reason.code === "string"
  ) {
    return reason.code;
  }
  if (reason instanceof Error) {
    return reason.message === "unknownBROFileType"
      ? reason.message
      : reason.name;
  }
  return "unknown";
}

/** Where a loaded file came from, judged by its name in the file table. */
function downloadSource(filename: string): "registry" | "sample" | "upload" {
  if (broIdPattern.test(filename)) {
    return "registry";
  }
  return filename.startsWith("example_") ? "sample" : "upload";
}

/** Lower-cased extension of a filename, or "none" when it has no extension. */
function fileExtension(filename: string): string {
  const match = /\.([^.]+)$/.exec(filename);
  return match?.[1]?.toLowerCase() ?? "none";
}

/**
 * Parse a BRO XML file and return the parsed data
 */
async function parseBROFile(file: File): Promise<BROData> {
  const text = await file.text();

  return parseBRO(text);
}

interface AppProps {
  /** Result of the /:broId route loader, or null on the bare root URL. */
  routeObject: RouteObjectResult | null;
}

export function App({ routeObject }: AppProps) {
  const { t } = useTranslation();
  const posthog = usePostHog();
  const [isPending, startTransition] = useTransition();
  // Selection among uploads; registry-object selection is the URL itself.
  const [uploadSelection, setUploadSelection] = useState("");
  const [failedFiles, setFailedFiles] = useState<
    Array<{ name: string; error: string }>
  >([]);

  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();

  // Every file loaded this session (uploads, samples, route-loaded objects)
  const sessionFiles = useSyncExternalStore(
    sessionFilesStore.subscribe,
    sessionFilesStore.getSnapshot,
    sessionFilesStore.getServerSnapshot,
  );

  // The current route object is included explicitly: on a cold hit it
  // reaches the store only after mount (the mirror effect below), and on
  // SSR the store is empty.
  const broData = useMemo(() => {
    const merged: Record<string, BROData> = {};
    for (const [name, file] of Object.entries(sessionFiles)) {
      merged[name] = file.data;
    }
    if (routeObject && "data" in routeObject) {
      merged[routeObject.broId] = routeObject.data;
    }
    return merged;
  }, [sessionFiles, routeObject]);

  // Persist a server-rendered (cold hit) route object into the session store
  // so it stays in the file table after navigating away. Pure external-store
  // sync: no state updates, and the store ignores same-value writes.
  useEffect(() => {
    if (routeObject && "data" in routeObject) {
      sessionFilesStore.set(routeObject.broId, { data: routeObject.data });
    }
  }, [routeObject]);

  // Person-level usage summary (max files at once, file types ever seen).
  // Keyed on the loaded set so uploads, samples, and route loads all count.
  useEffect(() => {
    recordLoadedFiles(posthog, Object.values(broData));
  }, [broData, posthog]);

  // Selection is derived: the URL names the selected registry object; with
  // no object in the URL the upload selection applies. A failed route load
  // selects nothing and renders an inline error card instead.
  const routeError = routeObject && "error" in routeObject ? routeObject : null;
  const selectedFileName = routeObject
    ? ("data" in routeObject
      ? routeObject.broId
      : "")
    : uploadSelection;

  // The BRO ID currently being fetched by a route navigation, if any.
  const pendingSegment =
    navigation.state === "loading"
      ? navigation.location.pathname.slice(1)
      : "";
  const pendingBroId = broIdPattern.test(pendingSegment)
    ? pendingSegment
    : null;

  /** Select a loaded file; registry objects live at /:broId, uploads at /. */
  function selectFile(filename: string) {
    if (broIdPattern.test(filename)) {
      if (location.pathname !== `/${filename}`) {
        void navigate(`/${filename}`, { preventScrollReset: true });
      }
      return;
    }
    setUploadSelection(filename);
    if (location.pathname !== "/") {
      void navigate("/", { preventScrollReset: true });
    }
  }

  /**
   * Load and select a BRO object by its ID, returning its data when it is
   * already loaded. Everything else navigates to /:broId and lets the route
   * loader fetch and parse it worker-side.
   */
  function handlePickLocation(
    broId: string,
    source: "map" | "search",
  ): BROData | null {
    const existing = Object.entries(broData).find(
      ([, data]) => data.broId === broId,
    );
    if (existing) {
      selectFile(existing[0]);
      return existing[1];
    }
    rememberLoadSource(broId, source);
    void navigate(`/${broId}`, { preventScrollReset: true });
    return null;
  }

  /**
   * Search flow for the map's search box: load the object by BRO ID and
   * return its WGS84 coordinates so the caller can fly the camera there.
   * For fresh loads the coordinates resolve in the route's clientLoader,
   * once the object's data arrives.
   */
  function handleSearchBroId(
    broId: string,
  ): Promise<{ lat: number; lon: number } | null> {
    // Registered before the navigation so the clientLoader finds the flight
    const flight = registerFlight(broId);
    const existing = handlePickLocation(broId, "search");
    if (existing) {
      // Already loaded: no clientLoader will run, so resolve directly.
      resolveFlight(broId, existing);
    }
    return flight;
  }

  async function loadSampleFiles() {
    const sampleFiles = [
      "example_cpt.xml",
      "example_bhr_gt.xml",
      "example_bhr_g.xml",
      "example_gmw.xml",
      "example_gld.xml",
      "example_bhr_gt_triaxial.xml",
      "example_bhr_gt_vol_mass_density_solids.xml",
      "example_bhr_gt_max_undrained_shear_strength.xml",
    ];

    const parsedFiles = sampleFiles.map(async (filename) => {
      const response = await fetch(`/${filename}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      return {
        filename,
        data: await parseBRO(text),
        xml: new Blob([text], { type: "application/xml" }),
      };
    });
    const results = await Promise.allSettled(parsedFiles);

    const successful = results
      .filter(
        (
          r,
        ): r is PromiseFulfilledResult<{
          filename: string;
          data: BROData;
          xml: Blob;
        }> => r.status === "fulfilled",
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
        errorCode: parseErrorCode(result.reason),
      }));

    const entries = Object.fromEntries(
      successful.map(({ filename, data, xml }) => [filename, { data, xml }]),
    ) as Record<string, SessionFile>;

    for (const { name, errorCode } of failed) {
      posthog.capture("file_upload_failed", {
        source: "sample",
        error_code: errorCode,
        file_extension: fileExtension(name),
      });
    }

    posthog.capture("files_processed", {
      source: "sample",
      file_count: sampleFiles.length,
      successful_file_count: successful.length,
      failed_file_count: failed.length,
      file_types: [...new Set(successful.map(({ data }) => getFileType(data)))],
    });

    startTransition(() => {
      sessionFilesStore.setMany(entries);
      setFailedFiles((previous) => [...previous, ...failed]);
      if (successful[0]) {
        selectFile(successful[0].filename);
      }
    });
  }

  async function handleFiles(
    fileList: FileList | Array<File> | null,
    method: "drop" | "picker",
  ) {
    const files = [...(fileList ?? [])];

    if (files.length > 0) {
      const results = await Promise.allSettled(
        files.map((file) => parseBROFile(file)),
      );

      const parsed = results
        .map((result, index) => ({ result, file: files[index] }))
        .filter(
          (
            item,
          ): item is {
            result: PromiseFulfilledResult<BROData>;
            file: File;
          } => item.result.status === "fulfilled",
        );

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
          errorCode: parseErrorCode(result.reason),
          sizeBytes: file.size,
        }));

      // A File is already a Blob, so the upload itself is the download source
      const entries = Object.fromEntries(
        parsed.map(({ result, file }) => [
          file.name,
          { data: result.value, xml: file },
        ]),
      ) as Record<string, SessionFile>;

      // One event per failure (unlike files_processed, which is per batch)
      // so the error code and file shape can be broken down directly.
      for (const { name, errorCode, sizeBytes } of failed) {
        posthog.capture("file_upload_failed", {
          source: "upload",
          error_code: errorCode,
          file_extension: fileExtension(name),
          file_size_bytes: sizeBytes,
        });
      }

      posthog.capture("files_processed", {
        source: "upload",
        upload_method: method,
        file_count: files.length,
        successful_file_count: parsed.length,
        failed_file_count: failed.length,
        file_types: [
          ...new Set(parsed.map(({ result }) => getFileType(result.value))),
        ],
      });

      startTransition(() => {
        sessionFilesStore.setMany(entries);
        setFailedFiles((previous) => [...previous, ...failed]);

        if (files[0]) {
          selectFile(files[0].name);
        }
      });
    }
  }

  const selectedFile = selectedFileName ? broData[selectedFileName] : undefined;

  return (
    <div className="pancake">
      <Header />

      <main className="main-grid px-2">
        <div className="mb-2">
          <UploadCard
            isPending={isPending}
            onFiles={(files) => {
              handleFiles(files, "picker").catch((error: unknown) => {
                console.error(error);
              });
            }}
            onLoadSamples={() => {
              loadSampleFiles().catch((error: unknown) => {
                console.error(error);
              });
            }}
          />

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
            onSelectionChange={selectFile}
            onFileDrop={(files) => {
              handleFiles(files, "drop").catch((error: unknown) => {
                console.error(error);
              });
            }}
            onFileDownload={(filename) => {
              const downloaded = broData[filename];
              posthog.capture("xml_downloaded", {
                file_type: downloaded ? getFileType(downloaded) : undefined,
                source: downloadSource(filename),
              });

              const xml = sessionFiles[filename]?.xml;
              if (xml) {
                downloadFile(
                  xml,
                  filename.toLowerCase().endsWith(".xml")
                    ? filename
                    : `${filename}.xml`,
                  "application/xml",
                );
                return;
              }
              // Route-loaded objects arrive parsed; their XML is served by
              // the (edge-cached) download endpoint instead.
              if (broIdPattern.test(filename)) {
                const anchor = document.createElement("a");
                anchor.href = `/api/bro/${filename}`;
                anchor.download = `${filename}.xml`;
                document.body.append(anchor);
                anchor.click();
                anchor.remove();
              }
            }}
            onFileRemove={(filename) => {
              const removedFile = broData[filename];
              posthog.capture("file_removed", {
                file_type: removedFile ? getFileType(removedFile) : undefined,
                remaining_file_count: Math.max(
                  Object.keys(broData).length - 1,
                  0,
                ),
              });

              sessionFilesStore.delete(filename);

              if (selectedFileName === filename) {
                const remaining = Object.keys(broData).find(
                  (f) => f !== filename,
                );
                selectFile(remaining ?? "");
              }
            }}
          />

          {Object.keys(broData).length > 0 && (
            <Button
              className="button mt-2 ml-auto transition-colors"
              onPress={() => {
                const loadedFiles = Object.values(broData);
                posthog.capture("files_cleared", {
                  file_count: loadedFiles.length,
                  file_types: [
                    ...new Set(loadedFiles.map((file) => getFileType(file))),
                  ],
                  failed_file_count: failedFiles.length,
                });
                sessionFilesStore.clear();
                selectFile("");
                setFailedFiles([]);
              }}
            >
              {t("clearAllFiles")} <TrashIcon size={14} />
            </Button>
          )}

          <MapSection
            broData={broData}
            selectedFileName={selectedFileName}
            pendingBroId={pendingBroId}
            onSelectFile={selectFile}
            onPickLocation={(broId) => {
              handlePickLocation(broId, "map");
            }}
            onSearchBroId={handleSearchBroId}
          />
        </div>

        {selectedFile ? (
          <SelectedObjectPanel
            file={selectedFile}
            filename={selectedFileName}
          />
        ) : (routeError ? (
          <RouteLoadError result={routeError} />
        ) : (
          <MarketingMessage />
        ))}
      </main>

      <Footer />
    </div>
  );
}

/**
 * Shown in the detail area when the URL names a BRO object that failed to
 * load during a client navigation. The URL deliberately stays on the failed
 * ID (a shared link to it shows the equivalent full-page error), and retry
 * revalidates the route, which re-runs the loaders.
 */
function RouteLoadError({
  result,
}: {
  result: Extract<RouteObjectResult, { error: unknown }>;
}) {
  const { t } = useTranslation();
  const revalidator = useRevalidator();
  const { broId, error } = result;
  const retryable =
    error.kind === "rate-limited" ||
    error.kind === "unavailable" ||
    error.kind === "error";
  const detail =
    error.reason ??
    (error.kind === "rejected"
      ? t("broErrorRejected", { broId })
      : translateError(`bro:${error.kind}`, t));

  return (
    <div className="self-start p-4 bg-red-50 border border-red-200 rounded-sm space-y-3">
      <h2 className="text-red-800 font-semibold">
        {t("broErrorLoadFailed", { broId })}
      </h2>
      <p className="text-sm text-red-700">{detail}</p>
      {retryable && (
        <Button
          className="button"
          isDisabled={revalidator.state === "loading"}
          onPress={() => {
            void revalidator.revalidate();
          }}
        >
          {t("broErrorRetry")}
        </Button>
      )}
    </div>
  );
}

function MarketingMessage() {
  const { t } = useTranslation();
  return (
    <Card>
      <p className="text-gray-600 mb-4">{t("uploadBroFile")}</p>

      <div className="text-sm text-gray-500">
        <p className="mb-2">
          {t("freeToolByBedrock")}{" "}
          <a
            href="https://bedrock.engineer"
            className="text-blue-500 hover:underline font-medium"
          >
            Bedrock.engineer
          </a>
          . {t("weBuild")}
        </p>

        <ul className="list-disc list-inside space-y-1 ">
          <li>{t("customWebApps")}</li>
          <li>{t("broXmlPdfReports")}</li>
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
          <img src="bedrock.svg" width={30} />
          <span style={{ color: "hsl(110 3% 53%)" }}>
            Bedrock.engineer
          </span>{" "}
          {t("appTitle")}
        </h1>

        <button
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors"
          onClick={() => {
            handleLanguageChange().catch((error: unknown) => {
              console.error("Language change error:", error);
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
              className="hover:underline flex gap-1 items-center text-md mt-2"
              href="https://bedrock.engineer"
              style={{
                color: "hsl(110 3% 53%)",
                fontFamily: "var(--font-condensed)",
              }}
            >
              <img
                src="/bedrock.svg"
                width="16px"
                height="16px"
                alt="Bedrock.engineer logo"
              />
              Bedrock.engineer
            </a>

            <a
              className="text-blue-400 hover:underline flex gap-1 items-center text-sm mt-2"
              href="https://gef.bedrock.engineer"
            >
              Bedrock.engineer GEF viewer
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
