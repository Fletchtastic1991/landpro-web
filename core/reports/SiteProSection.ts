import { BaseParcelReport } from "./BaseParcelReport";
import { MockElevationAdapter } from "../data/mocks/MockElevationAdapter";
import { MockLandCoverAdapter } from "../data/mocks/MockLandCoverAdapter";
import { MockStructureAdapter } from "../data/mocks/MockStructureAdapter";

export interface SiteProSectionReport {
  status: "AVAILABLE" | "BLOCKED";

  reasonIfBlocked?: string;

  elevation?: {
    averageSlopePercent: number;
    maxSlopePercent: number;
  };

  landCover?: {
    dominantType: string;
    coveragePercent: number;
  };

  structures?: {
    detected: boolean;
    types: string[];
  };
}

/**
 * SiteProSection
 *
 * Purpose:
 * - Describe physical site conditions INSIDE the parcel geometry
 * - Facts only (no decisions, no recommendations)
 * - Shared dependency for downstream Pros
 */
export function generateSiteProSection(
  base: BaseParcelReport
): SiteProSectionReport {

  // BLOCKED PATH
  if (!base.geometry.hasUserDrawnGeometry) {
    return {
      status: "BLOCKED",
      reasonIfBlocked:
        "Site conditions require a user-drawn parcel boundary."
    };
  }

  // AVAILABLE PATH
  const geometryId = base.geometry.geometryIds[0];

  const elevation =
    MockElevationAdapter.getElevationStats(geometryId);

  const landCover =
    MockLandCoverAdapter.getLandCoverStats(geometryId);

  const structures =
    MockStructureAdapter.getStructureStats(geometryId);

  return {
    status: "AVAILABLE",

    elevation: {
      averageSlopePercent: elevation.averageSlopePercent,
      maxSlopePercent: elevation.maxSlopePercent
    },

    landCover: {
      dominantType: landCover.dominantType,
      coveragePercent: landCover.categories.find(
        c => c.type === landCover.dominantType
      )?.percent ?? 0
    },

    structures: {
      detected: structures.detected,
      types: structures.types
    }
  };
}
