import type { InvestigatedInterval } from "@bedrock-engineer/bro-xml-parser";

/**
 * Lab test category definitions for visualization
 * Categories group related determinations together for plotting
 */
export const LAB_TEST_CATEGORIES = {
  basic: {
    color: "#2563eb", // blue
    determinations: [
      "waterContentDetermination",
      "volumetricMassDensityDetermination",
      "organicMatterContentDetermination",
      "carbonateContentDetermination",
      "volumetricMassDensityOfSolidsDetermination",
    ],
  },
  particleSize: {
    color: "#eab308", // yellow
    determinations: ["particleSizeDistributionDetermination"],
  },
  atterberg: {
    color: "#dc2626", // red
    determinations: ["consistencyLimitsDetermination"],
  },
  settlement: {
    color: "#16a34a", // green
    determinations: ["settlementCharacteristicsDetermination"],
  },
  triaxial: {
    color: "#9333ea", // purple
    determinations: ["shearStressChangeDuringLoadingDetermination"],
  },
  permeability: {
    color: "#0891b2", // cyan
    determinations: ["saturatedPermeabilityDetermination"],
  },
  undrainedShearStrength: {
    color: "#ea580c", // orange
    determinations: ["maximumUndrainedShearStrengthDetermination"],
  },
  directShear: {
    color: "#d946ef", // fuchsia
    determinations: [
      "shearStressChangeDuringHorizontalDeformationDetermination",
    ],
  },
} as const;

export type LabTestCategory = keyof typeof LAB_TEST_CATEGORIES;

/**
 * Individual determination types for detailed display
 */
const DETERMINATION_TYPES = {
  waterContentDetermination: "Water Content",
  organicMatterContentDetermination: "Organic Matter",
  carbonateContentDetermination: "Carbonate",
  volumetricMassDensityDetermination: "Density",
  volumetricMassDensityOfSolidsDetermination: "Density of Solids",
  particleSizeDistributionDetermination: "Particle Size",
  consistencyLimitsDetermination: "Atterberg Limits",
  settlementCharacteristicsDetermination: "Settlement",
  saturatedPermeabilityDetermination: "Permeability",
  shearStressChangeDuringLoadingDetermination: "Triaxial",
  maximumUndrainedShearStrengthDetermination: "Undrained Shear Strength",
  shearStressChangeDuringHorizontalDeformationDetermination: "Direct Shear",
} as const;

// type DeterminationKey = keyof typeof DETERMINATION_TYPES;

/**
 * Get lab test categories present in an interval (for plotting)
 */
export function getLabTestCategories(
  interval: InvestigatedInterval
): Array<LabTestCategory> {
  const categories: Array<LabTestCategory> = [];

  for (const [category, config] of Object.entries(LAB_TEST_CATEGORIES)) {
    const hasAny = config.determinations.some((det) => {
      const value = interval[det as keyof InvestigatedInterval];
      // Handle both boolean-like values and arrays
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== null && value !== undefined;
    });

    if (hasAny) {
      categories.push(category as LabTestCategory);
    }
  }

  return categories;
}

/**
 * Get individual determination types present in an interval (for display)
 */
export function getDeterminationTypes(
  interval: InvestigatedInterval
): Array<string> {
  const types: Array<string> = [];

  for (const [key, label] of Object.entries(DETERMINATION_TYPES)) {
    const value = interval[key as keyof InvestigatedInterval];
    // Handle both boolean-like values and arrays
    if (Array.isArray(value)) {
      if (value.length > 0) {
        types.push(label);
      }
    } else if (value !== null && value !== undefined) {
      types.push(label);
    }
  }

  return types;
}

/**
 * Get unique determination types across all intervals
 */
export function getUniqueDeterminationTypes(
  intervals: Array<InvestigatedInterval>
): Array<string> {
  const allTypes = intervals.flatMap((interval) => getDeterminationTypes(interval));
  return [...new Set(allTypes)];
}
