import type { TFunction } from "i18next";
import type { Location } from "@bedrock-engineer/bro-xml";
import type { HeaderItem } from "../types/header-types";
import { formatDeliveredLocation, formatStandardizedLocation } from "./format";

interface LocationData {
  delivered_location?: Location | null;
  standardized_location?: Location | null;
  delivered_vertical_position_offset: number | null;
  delivered_vertical_position_datum?: string | null;
  delivered_vertical_position_reference_point?: string | null;
}

/**
 * Get location-related header items for any BRO data type
 */
export function getLocationItems(
  data: LocationData,
  t: TFunction
): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];

  if (data.delivered_location) {
    items.push({
      label: t("deliveredLocation"),
      value: formatDeliveredLocation(data.delivered_location),
    });
  }

  if (data.standardized_location) {
    items.push({
      label: t("standardizedLocation"),
      value: formatStandardizedLocation(data.standardized_location),
    });
  }

  if (data.delivered_vertical_position_offset !== null) {
    items.push({
      label: t("verticalOffset"),
      value: `${data.delivered_vertical_position_offset.toFixed(2)} m`,
    });
  }

  if (data.delivered_vertical_position_datum) {
    items.push({
      label: t("verticalDatum"),
      value: data.delivered_vertical_position_datum.toLocaleUpperCase(),
    });
  }

  if (data.delivered_vertical_position_reference_point) {
    items.push({
      label: t("referencePoint"),
      value: data.delivered_vertical_position_reference_point,
    });
  }

  return items;
}
