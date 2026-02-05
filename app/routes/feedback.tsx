import { useTranslation } from "react-i18next";
import { Link, redirect, useFetcher } from "react-router";
import { Button, TextArea, Label, Input } from "react-aria-components";
import type { Route } from "./+types/feedback";
import { Card } from "../components/card";

export const meta: Route.MetaFunction = ({ matches }) => {
  const parentData = matches[0]?.loaderData as { locale?: string } | undefined;
  const locale = parentData?.locale ?? "nl";
  const title = locale === "nl" ? "Feedback - BRO XML Viewer" : "Feedback - BRO XML Viewer";
  const description =
    locale === "nl"
      ? "Geef feedback over de Bedrock BRO XML Viewer"
      : "Give feedback about the Bedrock BRO XML Viewer";

  return [
    { title },
    { name: "description", content: description },
  ];
};

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    throw new Error("Invalid request method");
  }

  const formData = await request.formData();
  const currentTools = formData.get("currentTools");
  const improvements = formData.get("improvements");
  const interestedInCustomTools = formData.get("interestedInCustomTools");
  const email = formData.get("email");
  const additionalComments = formData.get("additionalComments");

  const feedback = {
    currentTools: String(currentTools ?? ""),
    improvements: String(improvements ?? ""),
    interestedInCustomTools: String(interestedInCustomTools ?? ""),
    email: String(email ?? ""),
    additionalComments: String(additionalComments ?? ""),
    submittedAt: new Date().toISOString(),
    userAgent: request.headers.get("user-agent") ?? "",
  };

  // Store in KV if available (context.cloudflare is set in workers/app.ts)
  const cloudflareContext = context as unknown as {
    cloudflare?: { env?: { FEEDBACK_KV?: { put(key: string, value: string): Promise<void> } } };
  };
  if (cloudflareContext.cloudflare?.env?.FEEDBACK_KV) {
    const key = `feedback:${Date.now()}:${crypto.randomUUID()}`;
    await cloudflareContext.cloudflare.env.FEEDBACK_KV.put(key, JSON.stringify(feedback));
  } else {
    // Log feedback for now if KV is not configured
    console.log("Feedback received:", feedback);
  }

  return redirect("/feedback?success=true");
}

export default function FeedbackPage() {
  const { t } = useTranslation();
  const fetcher = useFetcher();

  // Check for success in URL
  const isSuccess = typeof globalThis.window !== "undefined" && new URLSearchParams(globalThis.window.location.search).get("success") === "true";

  if (isSuccess) {
    return (
      <div className="pancake">
        <header className="mb-6 border-b border-gray-300 py-4 px-2">
          <div
            style={{ maxWidth: "clamp(360px, 100%, 1800px)" }}
            className="mx-auto"
          >
            <Link to="/" className="text-2xl flex gap-2 items-center hover:opacity-80">
              <img src="/bedrock.svg" width={30} alt="Bedrock logo" /> {t("appTitle")}
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <div className="text-center py-8">
              <div className="text-5xl mb-4">&#10003;</div>
              <h1 className="text-2xl font-bold mb-4">{t("feedbackThankYou")}</h1>
              <p className="text-gray-600 mb-6">{t("feedbackThankYouMessage")}</p>
              <Link
                to="/"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                {t("backToViewer")}
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="pancake">
      <header className="mb-6 border-b border-gray-300 py-4 px-2">
        <div
          style={{ maxWidth: "clamp(360px, 100%, 1800px)" }}
          className="mx-auto"
        >
          <Link to="/" className="text-2xl flex gap-2 items-center hover:opacity-80">
            <img src="/bedrock.svg" width={30} alt="Bedrock logo" /> {t("appTitle")}
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">{t("feedbackTitle")}</h1>
        <p className="text-gray-600 mb-8">{t("feedbackSubtitle")}</p>

        <fetcher.Form method="post" className="space-y-6">
          <Card>
            <div className="space-y-6">
              {/* Question 1: Current tools */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("feedbackQ1")} <span className="text-red-500">*</span>
                </Label>
                <TextArea
                  name="currentTools"
                  required
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y min-h-24"
                  placeholder={t("feedbackQ1Placeholder")}
                />
              </div>

              {/* Question 2: Improvements */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("feedbackQ2")} <span className="text-red-500">*</span>
                </Label>
                <TextArea
                  name="improvements"
                  required
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y min-h-24"
                  placeholder={t("feedbackQ2Placeholder")}
                />
              </div>

              {/* Question 3: Interest in custom tools */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("feedbackQ3")} <span className="text-red-500">*</span>
                </Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="interestedInCustomTools"
                      value="yes"
                      required
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>{t("feedbackQ3Yes")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="interestedInCustomTools"
                      value="maybe"
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>{t("feedbackQ3Maybe")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="interestedInCustomTools"
                      value="no"
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>{t("feedbackQ3No")}</span>
                  </label>
                </div>
              </div>

              {/* Email capture */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("feedbackEmail")}
                </Label>
                <Input
                  type="email"
                  name="email"
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder={t("feedbackEmailPlaceholder")}
                />
                <p className="text-xs text-gray-500 mt-1">{t("feedbackEmailNote")}</p>
              </div>

              {/* Additional comments */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("feedbackAdditional")}
                </Label>
                <TextArea
                  name="additionalComments"
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y min-h-20"
                  placeholder={t("feedbackAdditionalPlaceholder")}
                />
              </div>
            </div>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              isDisabled={fetcher.state === "submitting"}
              className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fetcher.state === "submitting" ? t("feedbackSubmitting") : t("feedbackSubmit")}
            </Button>
            <Link
              to="/"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
            >
              {t("cancel")}
            </Link>
          </div>
        </fetcher.Form>
      </main>

      <footer className="mt-8 py-6 border-t border-gray-300 text-center text-sm text-gray-500">
        <p>{t("disclaimer")}</p>
      </footer>
    </div>
  );
}
