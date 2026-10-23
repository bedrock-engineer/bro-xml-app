import type {
  Coded,
  Location,
  Measure,
} from "@bedrock-engineer/bro-xml-parser";
import type { TFunction } from "i18next";
import type { BROData } from "../types/bro-data";
import type { HeaderItem } from "../types/header-types";
import { formatKvkParty } from "./bronhouders";
import {
  codeItem,
  formatDate,
  formatDeliveredLocation,
  formatMeasure,
  formatStandardizedLocation,
} from "./format";

// The positioning fields differ per object type (GMW lacks dates/operators,
// CPT stores operators as a bare KvK string, the borehole types as an
// organization object). These structural types cover every variant so one
// helper can render them all.
type KvkParty = string | { chamberOfCommerceNumber: string | null } | null;

interface DeliveredLocationFields {
  location?: Location | null;
  horizontalPositioningDate?: string | null;
  horizontalPositioningMethod?: Coded | null;
  horizontalPositioningOperator?: KvkParty;
}

interface StandardizedLocationFields {
  location?: Location | null;
  coordinateTransformation?: Coded | null;
}

interface VerticalPositionFields {
  localVerticalReferencePoint?: Coded | null;
  offset?: Measure | null;
  waterDepth?: Measure | null;
  verticalDatum?: Coded | null;
  verticalPositioningDate?: string | null;
  verticalPositioningMethod?: Coded | null;
  verticalPositioningOperator?: KvkParty;
  groundLevelPositioningMethod?: Coded | null;
}

function kvkNumberOf(party: KvkParty | undefined): string | null {
  if (!party) {
    return null;
  }
  return typeof party === "string" ? party : party.chamberOfCommerceNumber;
}

/**
 * Get location-related header items for any BRO data type
 */
export function getLocationItems(
  data: BROData,
  t: TFunction,
): Array<HeaderItem> {
  const items: Array<HeaderItem> = [];
  const delivered = (
    "deliveredLocation" in data ? data.deliveredLocation : null
  ) as DeliveredLocationFields | null;
  const standardized = (
    "standardizedLocation" in data ? data.standardizedLocation : null
  ) as StandardizedLocationFields | null;
  const vertical = (
    "deliveredVerticalPosition" in data ? data.deliveredVerticalPosition : null
  ) as VerticalPositionFields | null;

  if (delivered?.location) {
    items.push({
      label: t("deliveredLocation"),
      value: formatDeliveredLocation(delivered.location),
    });
  }
  if (delivered?.horizontalPositioningDate) {
    items.push({
      label: t("horizontalPositioningDate"),
      value: formatDate(delivered.horizontalPositioningDate),
    });
  }
  if (delivered?.horizontalPositioningMethod) {
    items.push(
      codeItem(
        t("horizontalPositioningMethod"),
        delivered.horizontalPositioningMethod,
      ),
    );
  }
  const horizontalOperator = kvkNumberOf(
    delivered?.horizontalPositioningOperator,
  );
  if (horizontalOperator) {
    items.push({
      label: t("horizontalPositioningOperator"),
      value: formatKvkParty(horizontalOperator),
    });
  }

  if (standardized?.location) {
    items.push({
      label: t("standardizedLocation"),
      value: formatStandardizedLocation(standardized.location),
    });
  }
  if (standardized?.coordinateTransformation) {
    items.push(
      codeItem(
        t("coordinateTransformation"),
        standardized.coordinateTransformation,
      ),
    );
  }

  if (vertical?.offset != null) {
    items.push({
      label: t("verticalOffset"),
      value: formatMeasure(vertical.offset, 2),
    });
  }
  if (vertical?.waterDepth != null) {
    items.push({
      label: t("waterDepth"),
      value: formatMeasure(vertical.waterDepth, 2),
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
  if (vertical?.verticalPositioningDate) {
    items.push({
      label: t("verticalPositioningDate"),
      value: formatDate(vertical.verticalPositioningDate),
    });
  }
  if (vertical?.verticalPositioningMethod) {
    items.push(
      codeItem(
        t("verticalPositioningMethod"),
        vertical.verticalPositioningMethod,
      ),
    );
  }
  const verticalOperator = kvkNumberOf(vertical?.verticalPositioningOperator);
  if (verticalOperator) {
    items.push({
      label: t("verticalPositioningOperator"),
      value: formatKvkParty(verticalOperator),
    });
  }
  if (vertical?.groundLevelPositioningMethod) {
    items.push(
      codeItem(
        t("groundLevelPositioningMethod"),
        vertical.groundLevelPositioningMethod,
      ),
    );
  }

  return items;
}
