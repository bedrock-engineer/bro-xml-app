import * as Sentry from "@sentry/react-router/cloudflare";
import { type ComponentProps, lazy, Suspense, use } from "react";
import { browser } from "react-dom";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import type { BROData } from "~/types/bro-data";
import { DownloadGeoJSONButton } from "./download-geojson-button";

// Lazy-loaded so maplibre-gl (~1 MB) is split out of the initial bundle; the
// ClientMap gate below keeps the chunk from ever loading during SSR.
const BROMap = lazy(() =>
  import("./map/map.client").then((module) => ({ default: module.BROMap })),
);

/**
 * Client-only gate for the map: use(browser()) suspends during SSR so the
 * Suspense fallback is server-rendered (map.client.tsx is an empty module on
 * the server), and resolves after hydration so the lazy chunk only ever
 * loads in the browser.
 */
function ClientMap(props: ComponentProps<typeof BROMap>) {
  use(browser());
  return <BROMap {...props} />;
}

interface MapSectionProps {
  broData: Record<string, BROData>;
  selectedFileName: string;
  /** The BRO ID currently being fetched by a route navigation, if any. */
  pendingBroId: string | null;
  onSelectFile: (filename: string) => void;
  onPickLocation: (broId: string) => void;
  onSearchBroId: (
    broId: string,
  ) => Promise<{ lat: number; lon: number } | null>;
}

/** The map with its loading/error placeholders and the GeoJSON download. */
export function MapSection({
  broData,
  selectedFileName,
  pendingBroId,
  onSelectFile,
  onPickLocation,
  onSearchBroId,
}: MapSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-6 mt-2">
      <h2 className="text-xl font-semibold mb-1">{t("map")}</h2>

      <ErrorBoundary
        fallback={
          <div className="w-full h-[600px] rounded-sm border border-gray-300 bg-gray-100 flex items-center justify-center">
            <span className="text-gray-500">{t("mapError")}</span>
          </div>
        }
        onError={(error) => Sentry.captureException(error)}
      >
        <Suspense
          fallback={
            <div className="w-full h-[600px] rounded-sm border border-gray-300 bg-gray-100 flex items-center justify-center">
              <span className="text-gray-500">{t("loadingMap")}</span>
            </div>
          }
        >
          <ClientMap
            broData={broData}
            selectedFileName={selectedFileName}
            onMarkerClick={onSelectFile}
            onPickLocation={onPickLocation}
            onSearchBroId={onSearchBroId}
          />
        </Suspense>
      </ErrorBoundary>

      {pendingBroId !== null && (
        <p className="text-xs text-blue-600 mb-1">
          {t("fetchingFromBro", { broIds: pendingBroId })}
        </p>
      )}

      {Object.keys(broData).length > 0 && (
        <DownloadGeoJSONButton broData={broData} />
      )}
    </div>
  );
}
