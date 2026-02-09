import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { Route } from "./+types/info";
import { Card } from "../components/card";

export const meta: Route.MetaFunction = ({ matches }) => {
  const parentData = matches[0].loaderData as { locale?: string } | undefined;
  const locale = parentData?.locale ?? "nl";
  const title =
    locale === "nl" ? "Over - BRO XML Viewer" : "About - BRO XML Viewer";
  const description =
    locale === "nl"
      ? "Informatie over de Bedrock BRO XML Viewer"
      : "Information about the Bedrock BRO XML Viewer";

  return [{ title }, { name: "description", content: description }];
};

export default function InfoPage() {
  const { t } = useTranslation();

  return (
    <div className="pancake">
      <header className="mb-6 border-b border-gray-300 py-4 px-2">
        <div
          style={{ maxWidth: "clamp(360px, 100%, 1800px)" }}
          className="mx-auto"
        >
          <Link
            to="/"
            className="text-2xl flex gap-2 items-center hover:opacity-80"
          >
            <img src="/bedrock.svg" width={30} alt="Bedrock logo" />{" "}
            {t("appTitle")}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl mb-8">{t("infoPageTitle")}</h1>

        <div className="space-y-8">
          <Card>
            <h2 className="text-xl font-medium mb-4">{t("whatIsBroViewer")}</h2>
            <p className="text-gray-700 mb-4">
              {t("whatIsBroViewerDescription")}
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>{t("featureCpt")}</li>
              <li>{t("featureBhrGt")}</li>
              <li>{t("featureLab")}</li>
              <li>{t("featureBhrG")}</li>
            </ul>
            <p className="text-gray-500 text-sm mt-4 italic">
              {t("otherBroTypesNote")}
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-medium mb-4">
              Ondersteunde Geoetecnische Boormonsteranalyse tests
            </h2>
            <p>
              De volgende tests zijn ondersteund.Heb je verzoeken of suggesties
              hiervoor, bijvoorbeeld voor betere grafieken en tabellen. of beter
              vertoon? Laat het ons weten via de{" "}
              <Link to="/feedback" className="text-blue-500 hover:underline">
                Feedback
              </Link>
              pagina.
            </p>
            <ul>
              <li>basisparameter</li>
              <li>korrelgrootteverdeling</li>
              <li>maximaleSchuifsterkte</li>
              <li>schuifspanningsverloopBelasting</li>
              <li>zetting</li>
              <li>consistentie</li>
              <li>consistentieKorrelverdeling</li>
              <li>schuifspanningsverloopHorVervorming</li>
              <li>waterdoorlatendheid</li>
              <li>schuifspanningsverloopBelastingPlus</li>
              <li>schuifsterktePlus</li>
              <li>schuifspanningsverloopHorVervormingPlus</li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-xl font-medium mb-4">{t("privacyTitle")}</h2>
            <p className="text-gray-700 mb-4">{t("privacyDescription")}</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>{t("privacyBullet1")}</li>
              <li>{t("privacyBullet2")}</li>
              <li>{t("privacyBullet3")}</li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-xl font-medium mb-4">{t("aboutBro")}</h2>
            <p className="text-gray-700 mb-4">{t("aboutBroDescription")}</p>
            <a
              href="https://www.broloket.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {t("visitBroLoket")}
            </a>
          </Card>

          <Card>
            <h2 className="text-xl font-medium mb-4">{t("aboutBedrock")}</h2>
            <p className="text-gray-700 mb-4">{t("aboutBedrockDescription")}</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>{t("customWebApps")}</li>
              <li>{t("bimCadIntegrations")}</li>
              <li>{t("pythonAutomation")}</li>
            </ul>
            <a
              href="https://bedrock.engineer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Bedrock.engineer
            </a>
          </Card>
        </div>

        <div className="mt-8 flex gap-4">
          <Link
            to="/"
            className="px-4 py-2 bg-green-800 text-white rounded-sm hover:bg-green-900 transition-colors"
          >
            {t("backToViewer")}
          </Link>

          <Link
            to="/feedback"
            className="px-4 py-2 border border-green-700 text-green-700 rounded-sm hover:bg-green-50 transition-colors"
          >
            {t("giveFeedback")}
          </Link>
        </div>
      </main>

      <footer className="mt-8 py-6 border-t border-gray-300 text-center text-sm text-gray-500">
        <p>{t("disclaimer")}</p>
      </footer>
    </div>
  );
}
