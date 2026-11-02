import { redirect } from "react-router";
import { localeCookie } from "~/middleware/i18next";
import { readFormData } from "~/util/form-data";
import type { PostHogContext } from "~/middleware/posthog";
import type { Route } from "./+types/set-language";

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await readFormData(request);
  const locale = formData.get("locale");

  console.log({ locale });

  if (typeof locale !== "string") {
    throw new TypeError("Invalid locale");
  }

  (context as PostHogContext).posthog?.capture({
    event: "language_changed",
    properties: { locale },
  });

  return redirect("/", {
    headers: {
      "Set-Cookie": await localeCookie.serialize(locale),
    },
  });
}
