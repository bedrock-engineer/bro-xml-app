import { useTranslation } from "react-i18next";

export function InstallInstructions() {
  const { t } = useTranslation();

  if (globalThis.window === undefined) {
    return t("installInstructionsDesktop");
  }

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = ua.includes("Android");

  if (isIOS) {
    return t("installInstructionsIOS");
  }

  if (isAndroid) {
    return t("installInstructionsAndroid");
  }

  return t("installInstructionsDesktop");
}
