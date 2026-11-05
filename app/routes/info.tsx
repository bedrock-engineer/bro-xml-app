import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { Route } from "./+types/info";
import { Card } from "../components/card";
import { PageShell } from "../components/page-shell";

export const meta: Route.MetaFunction = ({ matches }) => {
  const parentData = matches[0].loaderData as { locale?: string } | undefined;
  const locale = parentData?.locale ?? "nl";
  const title =
    locale === "nl"
      ? "Over BRO XML Viewer - CPT, BHR-GT & Boormonsteranalyses (BHR-GT-BMA)"
      : "About BRO XML Viewer - CPT, BHR-GT & Boormonsteranalyses (BHR-GT-BMA)";
  const description =
    locale === "nl"
      ? "Informatie over de Bedrock.engineer BRO XML Viewer: bekijk CPT sonderingen, BHR-GT boringen en geotechnische boormonsteranalyses (BHR-GT-BMA) uit de Basisregistratie Ondergrond."
      : "Information about the Bedrock.engineer BRO XML Viewer: view CPT soundings, BHR-GT boreholes and geotechnical borehole sample analyses (BHR-GT-BMA) from the Basisregistratie Ondergrond.";

  return [{ title }, { name: "description", content: description }];
};

export default function InfoPage() {
  const { t } = useTranslation();

  return (
    <PageShell width="3xl">
      <h1 className="text-3xl mb-8">{t("infoPageTitle")}</h1>

      <div className="space-y-8">
        <Card>
          <h2 className="text-xl font-medium mb-4">{t("whatIsBroViewer")}</h2>
          <p className="text-gray-700 mb-4">
            {t("whatIsBroViewerDescription")}
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <a href="https://basisregistratieondergrond.nl/inhoud-bro/registratieobjecten/bodem-grondonderzoek/geotechnisch-sondeeronderzoek-cpt/">
                {t("featureCpt")}
              </a>
            </li>

            <li>
              <a href="https://basisregistratieondergrond.nl/inhoud-bro/registratieobjecten/bodem-grondonderzoek/booronderzoek-bhr/geotechnisch-booronderzoek-bhr-gt/">
                {t("featureBhrGt")}
              </a>
            </li>

            <li>
              <a href="https://basisregistratieondergrond.nl/inhoud-bro/registratieobjecten/bodem-grondonderzoek/booronderzoek-bhr/geotechnisch-booronderzoek-bhr-gt#hb5f1738c-99a2-4abb-b7d1-07b33d853fe7">
                {t("featureLab")}
              </a>
            </li>

            <li>
              <a href="https://basisregistratieondergrond.nl/inhoud-bro/registratieobjecten/bodem-grondonderzoek/booronderzoek-bhr/geologisch-booronderzoek-bhr/">
                {t("featureBhrG")}
              </a>
            </li>

            <li>
              <a href="https://basisregistratieondergrond.nl/inhoud-bro/registratieobjecten/grondwatermonitoring/grondwatermonitoringput-gmw/">
                {t("featureGmw")}
              </a>
            </li>

            <li>
              <a href="https://basisregistratieondergrond.nl/inhoud-bro/registratieobjecten/grondwatermonitoring/grondwaterstandonderzoek-gld/">
                {t("featureGld")}
              </a>
            </li>
          </ul>
          <p className="text-gray-500 text-sm mt-4 italic">
            {t("otherBroTypesNote")}
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2">
            {t("loadDataTitle")}
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>{t("loadDataUpload")}</li>
            <li>
              {t("loadDataBroId")}{" "}
              <Link
                to="/CPT000000000029"
                className="text-blue-500 hover:underline font-mono"
              >
                CPT000000000029
              </Link>
              {t("loadDataBroIdSuffix")}
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2">
            {t("moreFeaturesTitle")}
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>{t("featureMap")}</li>
            <li>{t("featureExport")}</li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-xl font-medium mb-4">{t("privacyTitle")}</h2>
          <p className="text-gray-700 mb-4">{t("privacyDescription")}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>{t("privacyBullet1")}</li>

            <li>{t("privacyBullet3")}</li>

            <li>{t("privacyBullet4")}</li>

            <li>{t("privacyBullet2")}</li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-xl font-medium mb-4">{t("aboutBro")}</h2>

          <p className="text-gray-700 mb-4">{t("aboutBroDescription")}</p>

          <h3 className="text-lg font-medium mt-6 mb-2">
            {t("getBroXmlTitle")}
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li>{t("getBroXmlLoket")}</li>
            <li>{t("getBroXmlDirect")}</li>
          </ul>

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
    </PageShell>
  );
}
