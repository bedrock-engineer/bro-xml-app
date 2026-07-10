import type { TFunction } from "i18next";
import type { Location } from "@bedrock-engineer/bro-xml-parser";
import type { HeaderItem } from "../types/header-types";
import { formatDeliveredLocation, formatStandardizedLocation } from "./format";

interface LocationData {
  deliveredLocation?: Location | null;
  standardizedLocation?: Location | null;
  deliveredVerticalPositionOffset: number | null;
  deliveredVerticalPositionDatum?: string | null;
  deliveredVerticalPositionReferencePoint?: string | null;
}

/**
 * Get location-related header items for any BRO data type
 */
export function getLocationItems(
  data: LocationData,
  t: TFunction
): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.deliveredLocation) {
    items.push({
      label: t("deliveredLocation"),
      value: formatDeliveredLocation(data.deliveredLocation),
    });
  }

  if (data.standardizedLocation) {
    items.push({
      label: t("standardizedLocation"),
      value: formatStandardizedLocation(data.standardizedLocation),
    });
  }

  if (data.deliveredVerticalPositionOffset !== null) {
    items.push({
      label: t("verticalOffset"),
      value: `${data.deliveredVerticalPositionOffset.toFixed(2)} m`,
    });
  }

  if (data.deliveredVerticalPositionDatum) {
    items.push({
      label: t("verticalDatum"),
      value: data.deliveredVerticalPositionDatum.toLocaleUpperCase(),
    });
  }

  if (data.deliveredVerticalPositionReferencePoint) {
    items.push({
      label: t("referencePoint"),
      value: data.deliveredVerticalPositionReferencePoint,
    });
  }

  return items;
}
