import type { Coded } from "@bedrock-engineer/bro-xml-parser";
import type { TFunction } from "i18next";
import type { HeaderItem } from "../types/header-types";
import { formatKvkParty } from "./bronhouders";
import { codeItem, formatDate, formatIndication } from "./format";

/** Registration history shared by every BRO object type. */
interface RegistrationHistory {
  objectRegistrationTime: string | null;
  registrationStatus: Coded | null;
  latestAdditionTime: string | null;
  registrationCompletionTime: string | null;
  corrected: boolean | null;
  latestCorrectionTime: string | null;
  underReview: boolean | null;
  underReviewTime: string | null;
  deregistered: boolean | null;
  deregistrationTime: string | null;
  reregistered: boolean | null;
  reregistrationTime: string | null;
}

interface RegistrationData {
  registrationHistory: RegistrationHistory | null;
  objectIdAccountableParty: string | null;
  deliveryResponsibleParty: string | null;
}

/**
 * Registration section items shared by all five object types: the
 * administrative identifiers plus the complete registration history.
 */
export function getRegistrationItems(
  data: RegistrationData,
  t: TFunction,
): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.objectIdAccountableParty) {
    items.push({
      label: t("objectIdAccountableParty"),
      value: data.objectIdAccountableParty,
    });
  }
  if (data.deliveryResponsibleParty) {
    items.push({
      label: t("deliveryResponsibleParty"),
      value: formatKvkParty(data.deliveryResponsibleParty),
    });
  }

  const history = data.registrationHistory;
  if (!history) {
    return items;
  }

  if (history.registrationStatus) {
    items.push(codeItem(t("registrationStatus"), history.registrationStatus));
  }
  if (history.objectRegistrationTime) {
    items.push({
      label: t("registrationTime"),
      value: formatDate(history.objectRegistrationTime),
    });
  }
  if (history.latestAdditionTime) {
    items.push({
      label: t("latestAdditionTime"),
      value: formatDate(history.latestAdditionTime),
    });
  }
  if (history.registrationCompletionTime) {
    items.push({
      label: t("registrationCompletionTime"),
      value: formatDate(history.registrationCompletionTime),
    });
  }
  if (history.corrected !== null) {
    items.push({
      label: t("corrected"),
      value: formatIndication(history.corrected, t),
    });
  }
  if (history.latestCorrectionTime) {
    items.push({
      label: t("latestCorrectionTime"),
      value: formatDate(history.latestCorrectionTime),
    });
  }
  if (history.underReview !== null) {
    items.push({
      label: t("underReview"),
      value: formatIndication(history.underReview, t),
    });
  }
  if (history.underReviewTime) {
    items.push({
      label: t("underReviewTime"),
      value: formatDate(history.underReviewTime),
    });
  }
  if (history.deregistered !== null) {
    items.push({
      label: t("deregistered"),
      value: formatIndication(history.deregistered, t),
    });
  }
  if (history.deregistrationTime) {
    items.push({
      label: t("deregistrationTime"),
      value: formatDate(history.deregistrationTime),
    });
  }
  if (history.reregistered !== null) {
    items.push({
      label: t("reregistered"),
      value: formatIndication(history.reregistered, t),
    });
  }
  if (history.reregistrationTime) {
    items.push({
      label: t("reregistrationTime"),
      value: formatDate(history.reregistrationTime),
    });
  }

  return items;
}
