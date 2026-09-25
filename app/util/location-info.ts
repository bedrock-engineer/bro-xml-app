import type { TFunction } from "i18next";
import type { BROData } from "../types/bro-data";
import type { HeaderItem } from "../types/header-types";
import {
  codeItem,
  formatDeliveredLocation,
  formatStandardizedLocation,
} from "./format";

/**
 * Get location-related header items for any BRO data type
 */
export function getLocationItems(
  data: BROData,
  t: TFunction,
): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const delivered = data.deliveredLocation;
  const standardized = data.standardizedLocation;
  const vertical = data.deliveredVerticalPosition;

  if (delivered?.location) {
    items.push({
      label: t("deliveredLocation"),
      value: formatDeliveredLocation(delivered.location),
    });
  }

  if (standardized?.location) {
    items.push({
      label: t("standardizedLocation"),
      value: formatStandardizedLocation(standardized.location),
    });
  }

  if (vertical?.offset != null) {
    items.push({
      label: t("verticalOffset"),
      value: `${vertical.offset.toFixed(2)} m`,
    });
  }

  if (vertical?.verticalDatum) {
    items.push({
      label: t("verticalDatum"),
      value: vertical.verticalDatum.code,
    });
  }

  if (vertical?.localVerticalReferencePoint) {
    items.push(
      codeItem(t("referencePoint"), vertical.localVerticalReferencePoint),
    );
  }

  return items;
}
