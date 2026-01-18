import { BaseParcelReport } from "./BaseParcelReport";

export interface LandClearingSection {
  status: "AVAILABLE" | "BLOCKED";

  geometryEvaluated: {
    geometryId: string | null;
    reasonIfNull?: string;
  };

  notes: string[];
}

/**
 * LandClearingSection
 *
 * Purpose:
 * - Determine whether land clearing analysis can proceed
 * - Explicitly select geometry or refuse
 * - Provide conservative, actionable context
 */
export function generateLandClearingSection(
  base: BaseParcelReport
): LandClearingSection {
  // No geometry provided
  if (!base.geometry.hasUserDrawnGeometry) {
    return {
      status: "BLOCKED",
      geometryEvaluated: {
        geometryId: null,
        reasonIfNull: "No user-drawn parcel boundary exists"
      },
      notes: [
        "Land clearing analysis requires an explicit parcel boundary.",
        "Draw the boundary on the map to continue."
      ]
    };
  }

  // Ambiguous geometry
  if (base.geometry.geometryIds.length > 1) {
    return {
      status: "BLOCKED",
      geometryEvaluated: {
        geometryId: null,
        reasonIfNull: "Multiple parcel boundaries exist"
      },
      notes: [
        "Multiple parcel boundaries were found for this parcel.",
        "Select or remove boundaries to proceed with land clearing analysis."
      ]
    };
  }

  // Exactly one geometry → safe to evaluate
  const geometryId = base.geometry.geometryIds[0];

  return {
    status: "AVAILABLE",
    geometryEvaluated: {
      geometryId
    },
    notes: [
      "Parcel boundary provided by user.",
      "Land clearing analysis may proceed for this boundary."
    ]
  };
}
