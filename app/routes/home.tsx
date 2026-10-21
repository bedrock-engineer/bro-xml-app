import { useTranslation } from "react-i18next";
import { data, isRouteErrorResponse, Link, redirect } from "react-router";
import { localeCookie } from "~/middleware/i18next";
import { type BROFileType, getFileType, parseBRO } from "~/types/bro-data";
import { sessionFilesStore } from "~/state/session-files";
import {
    type BroRouteErrorData,
    captureObjectLoaded,
    type RouteObjectResult,
    resolveFlight,
} from "~/types/bro-route";
import { broIdPattern } from "~/util/bro-id";
import {
    BROFetchError,
    fetchBROXml,
    type WorkerExecutionContext,
} from "~/util/bro-api.server";
import { documentHeaders } from "~/util/cache";
import { App } from "../components/app";
import type { Route } from "./+types/home";

const siteUrl = "https://bro.bedrock.engineer";

const metaDataTranslations = {
  en: {
    title:
      "BRO XML Viewer - CPT, BHR-G, BHR-GT & Boormonsteranalyses (BHR-GT-BMA) | Bedrock.engineer",
    description:
      "Free online BRO XML viewer for geotechnical engineers. View, analyze and export CPT, BHR-GT, geotechnical borehole sample analyses (BHR-GT-BMA) and BHR-G data from Basisregistratie Ondergrond. Works directly in your browser.",
    siteName: "Bedrock.engineer Geotechnical BRO/XML viewer",
    imageAlt:
      "Bedrock.engineer Geotechnical BRO/XML viewer - Geotechnical data visualization",
  },
  nl: {
    title:
      "BRO XML Viewer - Sonderingen (CPT), Boringen (BHR-GT, BHR-G) & Boormonsteranalyses (BHR-GT-BMA) | Bedrock.engineer",
    description:
      "Gratis online BRO XML viewer voor geotechnisch ingenieurs. Bekijk, analyseer, en exporteer CPT, BHR-GT, geotechnische boormonsteranalyses (BHR-GT-BMA) en BHR-G gegevens van de Basisregistratie Ondergrond. Werkt direct in je browser zonder installatie.",
    siteName: "Bedrock.engineer geotechniek BRO/XML viewer",
    imageAlt:
      "Bedrock.engineer geotechniek BRO/XML viewer - Geotechnische data visualisatie",
  },
};

const objectTypeLabels: Record<BROFileType, { en: string; nl: string }> = {
  CPT: { en: "Cone penetration test (CPT)", nl: "Sondering (CPT)" },
  "BHR-GT": {
    en: "Geotechnical borehole (BHR-GT)",
    nl: "Geotechnische boring (BHR-GT)",
  },
  "BHR-G": {
    en: "Geological borehole (BHR-G)",
    nl: "Geologische boring (BHR-G)",
  },
  GMW: {
    en: "Groundwater monitoring well (GMW)",
    nl: "Grondwatermonitoringput (GMW)",
  },
  GLD: {
    en: "Groundwater level dossier (GLD)",
    nl: "Grondwaterstandonderzoek (GLD)",
  },
};

export function headers({ errorHeaders }: Route.HeadersArgs) {
  // Error responses carry their own cache policy (no-store for upstream
  // failures, a short negative cache for 404s); successes use the default.
  if (errorHeaders?.has("Cache-Control")) {
    return errorHeaders;
  }
  return documentHeaders();
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const rawId = params.broId;
  if (rawId === undefined) {
    return { object: null };
  }

  const broId = rawId.toUpperCase();
  if (!broIdPattern.test(broId)) {
    throw data(
      { kind: "invalid", broId: rawId } satisfies BroRouteErrorData,
      { status: 404, headers: { "Cache-Control": "public, max-age=3600" } },
    );
  }
  if (broId !== rawId) {
    throw redirect(`/${broId}`, 308);
  }

  // context.cloudflare is set in workers/app.ts (same pattern as feedback.tsx)
  const { cloudflare } = context as unknown as {
    cloudflare?: { ctx: WorkerExecutionContext };
  };

  try {
    const xml = await fetchBROXml(broId, cloudflare?.ctx);
    const object = await parseBRO(xml);
    return { object: { broId, data: object } };
  } catch (error) {
    throw errorResponse(error, broId);
  }
}

function errorResponse(error: unknown, broId: string) {
  if (error instanceof BROFetchError) {
    const payload: BroRouteErrorData = {
      kind: error.kind,
      broId,
      reason: error.kind === "rejected" ? error.message : undefined,
    };
    switch (error.kind) {
      case "unsupported": {
        return data(payload, {
          status: 404,
          headers: { "Cache-Control": "public, max-age=3600" },
        });
      }
      case "rejected": {
        return data(payload, {
          status: 404,
          headers: { "Cache-Control": "public, max-age=60" },
        });
      }
      case "rate-limited": {
        return data(payload, {
          status: 503,
          headers: { "Retry-After": "60", "Cache-Control": "no-store" },
        });
      }
      case "unavailable": {
        return data(payload, {
          status: 502,
          headers: { "Cache-Control": "no-store" },
        });
      }
    }
  }
  // Unexpected (e.g. the document failed to parse)
  return data({ kind: "error", broId } satisfies BroRouteErrorData, {
    status: 500,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * On client navigations: serve already-loaded objects from the session store
 * (no server roundtrip, no re-parse), and turn loader failures into
 * error-as-data so the App — and every loaded file in its state — stays
 * mounted. Document requests skip this and render the ErrorBoundary with a
 * real 4xx/5xx status. This is also where load-completion events live
 * (camera-flight resolution, analytics): the clientLoader runs exactly once
 * per load, unlike render effects.
 */
export async function clientLoader({
  params,
  serverLoader,
}: Route.ClientLoaderArgs): Promise<{ object: RouteObjectResult | null }> {
  if (params.broId === undefined) {
    return { object: null };
  }
  const broId = params.broId.toUpperCase();

  const cached = sessionFilesStore.get(broId);
  if (cached) {
    resolveFlight(broId, cached.data);
    return { object: { broId, data: cached.data } };
  }

  try {
    const result = await serverLoader();
    if (result.object) {
      sessionFilesStore.set(result.object.broId, { data: result.object.data });
      captureObjectLoaded(result.object.data, broId);
      resolveFlight(broId, result.object.data);
    }
    return result;
  } catch (error) {
    resolveFlight(broId, null);
    // Let redirects (e.g. lower-case ID canonicalization) pass through.
    if (error instanceof Response) {
      throw error;
    }
    if (isRouteErrorResponse(error)) {
      const payload = error.data as BroRouteErrorData | null;
      return {
        object: {
          broId,
          error: { kind: payload?.kind ?? "error", reason: payload?.reason },
        },
      };
    }
    return { object: { broId, error: { kind: "error" } } };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const newLang = formData.get("lang") as string;

  return redirect("/", {
    headers: {
      "Set-Cookie": await localeCookie.serialize(newLang),
    },
  });
}

export function meta({ matches, loaderData }: Route.MetaArgs) {
  const locale = matches[0].loaderData.locale as "nl" | "en";
  const metadata = metaDataTranslations[locale];
  const ogLocale = locale === "nl" ? "nl_NL" : "en_US";
  const altLocale = locale === "nl" ? "en_US" : "nl_NL";

  const object = loaderData?.object;
  let title = metadata.title;
  let description = metadata.description;
  let url = siteUrl;
  if (object && "data" in object) {
    const typeLabel = objectTypeLabels[getFileType(object.data)][locale];
    title = `${object.broId} – ${typeLabel} | Bedrock.engineer`;
    description = `${typeLabel} ${object.broId} – ${metadata.description}`;
    url = `${siteUrl}/${object.broId}`;
  }

  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "index, follow" },
    {
      name: "application-name",
      content: "Bedrock.engineer Geotechnical BRO/XML viewer",
    },
    // Language alternates
    { tagName: "link", rel: "alternate", hrefLang: "nl", href: url },
    { tagName: "link", rel: "alternate", hrefLang: "en", href: url },
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: url },
    // Open Graph
    { property: "og:site_name", content: metadata.siteName },
    { property: "og:url", content: url },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:locale", content: ogLocale },
    { property: "og:locale:alternate", content: altLocale },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image", content: `${siteUrl}/og-image.png` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: metadata.imageAlt },
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { property: "twitter:domain", content: "bro.bedrock.engineer" },
    { property: "twitter:url", content: url },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:creator", content: "@Mega_Jules" },
    { name: "twitter:image", content: `${siteUrl}/og-image.png` },
    { name: "twitter:image:alt", content: metadata.imageAlt },
  ];
}

/**
 * Rendered for document-request failures (shared links to missing or
 * unavailable objects) and unexpected render errors. In-app navigation
 * failures never land here; the clientLoader converts those to
 * error-as-data so the App keeps its loaded files.
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useTranslation();

  let message: string = t("broErrorGeneric");
  let reason: string | undefined;
  let retryable = true;
  if (isRouteErrorResponse(error)) {
    const payload = error.data as BroRouteErrorData | null;
    switch (payload?.kind) {
      case "rejected": {
        message = t("broErrorRejected", { broId: payload.broId });
        reason = payload.reason;
        retryable = false;
        break;
      }
      case "unsupported": {
        message = t("broErrorUnsupported");
        retryable = false;
        break;
      }
      case "rate-limited": {
        message = t("broErrorRateLimited");
        break;
      }
      case "unavailable": {
        message = t("broErrorUnavailable");
        break;
      }
      default: {
        message = t("broErrorNotFound");
        retryable = false;
      }
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full p-6 bg-red-50 border border-red-200 rounded-sm space-y-4">
        <h1 className="text-lg font-semibold text-red-800">{message}</h1>
        {reason !== undefined && (
          <p className="text-sm text-red-700">{reason}</p>
        )}
        <div className="flex items-center gap-4">
          {retryable && (
            <button
              className="button"
              onClick={() => {
                globalThis.location.reload();
              }}
            >
              {t("broErrorRetry")}
            </button>
          )}
          <Link className="text-blue-600 underline" to="/">
            {t("broErrorBackToApp")}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <App routeObject={loaderData.object} />;
}
