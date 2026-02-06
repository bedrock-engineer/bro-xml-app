import type {
  BHRGData,
  BHRGTData,
  BROData,
  CPTData
} from "@bedrock-engineer/bro-xml-parser";

// Re-export union types from the library
export type { BROData, BROFileType } from "@bedrock-engineer/bro-xml-parser";

/**
 * Type guard for CPT data
 */
export function isCPTData(data: BROData): data is CPTData {
  return data.meta.dataType === "CPT";
}

/**
 * Type guard for BHR-GT (geotechnical borehole) data
 */
export function isBHRGTData(data: BROData): data is BHRGTData {
  return data.meta.dataType === "BHR-GT";
}

/**
 * Type guard for BHR-G (geological borehole) data
 */
export function isBHRGData(data: BROData): data is BHRGData {
  return data.meta.dataType === "BHR-G";
}

/**
 * Get the final depth from any BRO data type
 */
export function getFinalDepth(data: BROData): number | null {
  if (isCPTData(data)) {
    return data.final_depth;
  }
  // Both BHRGTData and BHRGData have final_bore_depth
  return data.final_bore_depth;
}
