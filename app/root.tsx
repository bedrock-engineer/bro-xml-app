import { useEffect } from "react";
import { I18nProvider } from "react-aria-components";
import { useTranslation } from "react-i18next";
import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import {
  getLocale,
  i18nextMiddleware,
  localeCookie,
} from "~/middleware/i18next";
import type { Route } from "./+types/root";
import "./app.css";

export const middleware = [i18nextMiddleware];

export async function loader({ context }: Route.LoaderArgs) {
  const locale = getLocale(context);
  return data(
    { locale },
    { headers: { "Set-Cookie": await localeCookie.serialize(locale) } },
  );
}

export const links: Route.LinksFunction = () => {
  return [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossOrigin: "anonymous" as const,
    },
    {
      href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,100..700;1,100..700&family=IBM+Plex+Sans:ital,wght@0,100..700;1,100..700&display=swap",
      rel: "stylesheet",
    },
    {
      href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@400;500&display=swap",
      rel: "stylesheet",
    },
    { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
    { rel: "icon", href: "/favicon-512x512.png", sizes: "512x512" },
    { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    // Other icons
    { rel: "apple-touch-icon", href: "/favicon-180x180.png" },
    {
      rel: "manifest",
      href: `${import.meta.env.BASE_URL}manifest.nl.json`,
    },
    { rel: "canonical", href: "https://bro.bedrock.engineer/" },
  ];
};

interface LayoutProps {
  children: React.ReactNode;
  loaderData?: Route.ComponentProps["loaderData"];
}

export function Layout({ children, loaderData }: LayoutProps) {
  const { i18n } = useTranslation();
  const locale = loaderData?.locale ?? i18n.language;

  return (
    <html lang={locale}>
      <head>
        {process.env.NODE_ENV === "production" && (
          <>
            <script
              id="init-counterscale"
              dangerouslySetInnerHTML={{
                __html:
                  '(function () { window.counterscale = { q: [["set", "siteId", "bro.bedrock.engineer"], ["trackPageview"]], };})();',
              }}
            />
            <script
              id="counterscale-script"
              src="https://counterscale.julesb.workers.dev/tracker.js"
              defer
            />
          </>
        )}
        <meta charSet="utf-8" />
        <meta name="author" content="Jules Blom @ Bedrock.engineer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="View and visualize BRO (Basisregistratie Ondergrond) XML files in your browser. Analyze CPT, BHR-GT and BHR-G data instantly."
        />
        <meta
          name="keywords"
          content="BRO, Basisregistratie Ondergrond, BRO/XML viewer, BRO XML, sondering, sondeergegevens, CPT, cone penetration test, grondonderzoek, boringen, boorprofielen, geotechniek, geotechnical engineering, BHR-GT, BHR-G, geotechnische boring, geologische boring, sondeerdata, grondmechanica, funderingsonderzoek, geotechnisch rapport, online BRO/XML viewer, Nederlandse geotechniek, civil engineering Nederland, geotechnisch adviesbureau, laboratoriumanalyse"
        />
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#5d7a5a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta
          name="apple-mobile-web-app-title"
          content="Bedrock BRO/XML viewer"
        />
        <Meta />
        <Links />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Bedrock.engineer BRO/XML viewer",
              alternateName: "BRO/XML viewer",
              url: "https://bro.bedrock.engineer",
              description:
                "Free online BRO XML viewer for geotechnical engineers. View, analyze and export CPT, BHR-GT and BHR-G data from Basisregistratie Ondergrond.",
              applicationCategory: "UtilityApplication",
              operatingSystem: "Any",
              browserRequirements: "Requires JavaScript",
              inLanguage: ["nl-NL", "en-US"],
              audience: {
                "@type": "ProfessionalAudience",
                audienceType: "Geotechnical Engineers",
              },
              featureList: [
                "View BRO/XML CPT files",
                "View BRO/XML BHR-GT files (geotechnical boreholes)",
                "View BRO/XML BHR-G files (geological boreholes)",
                "CPT data visualization",
                "Bore log visualization",
                "Laboratory analysis visualization",
                "Export to CSV",
                "Export to JSON",
                "Export locations to GeoJSON",
                "Browser-based viewer",
              ],
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "EUR",
              },
              keywords:
                "BRO, Basisregistratie Ondergrond, BRO XML, sondering, CPT, grondonderzoek, boringen, BHR-GT, BHR-G, geotechniek, geotechnical engineering, sondeergegevens, boorprofielen",
              creator: {
                "@type": "Organization",
                name: "Bedrock.engineer",
                url: "https://bedrock.engineer",
              },
            }),
          }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData: { locale } }: Route.ComponentProps) {
  const { i18n } = useTranslation();

  useEffect(
    function syncLanguage() {
      if (i18n.language !== locale) {
        void i18n.changeLanguage(locale);
      }
    },
    [locale, i18n],
  );

  return (
    <I18nProvider locale={i18n.language}>
      <Outlet />
    </I18nProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Error";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1 className="text-xl">{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
