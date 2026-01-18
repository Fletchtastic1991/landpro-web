import { BaseParcelReport } from "./BaseParcelReport";
import { MockElevationAdapter } from "../data/mocks/MockElevationAdapter";
import { MockLandCoverAdapter } from "../data/mocks/MockLandCoverAdapter";
import { MockStructureAdapter } from "../data/mocks/MockStructureAdapter";

export interface SiteProSection {
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
 * - Provide facts only (no decisions, no recommendations)
 * - Act as a shared dependency for downstream Pros
 */
export function generateSiteProSection(
  base: BaseParcelReport
): SiteProSection {
  if (!base.geometry.hasUserDrawnGeometry) {
    return {
      status: "BLOCKED",
      reasonIfBlocked:
        "Site conditions require a user-drawn parcel boundary."
    };
  }

  const geometryId = base.geometry.geometryIds[0];

  const slopeStats =
    MockElevationAdapter.getSlopeStats(geometryId);

  const landCover =
    MockLandCoverAdapter.getLandCover(geometryId);

  const dominant = landCover.categories.reduce((max, curr) =>
  curr.percent > max.percent ? curr : max
);

    MockStructureAdapter.getStructures(geometryId);
const structures = MockStructureAdapter.getStructures(geometryId);

const totalDetected = structures.detections.reduce(
  (sum, d) => sum + d.count,
  0
);

const detectedTypes = structures.detections.map(d => d.type);

const hasStructures = totalDetected > 0;

  return {
    status: "AVAILABLE",

    elevation: {
      averageSlopePercent: slopeStats.avgSlopePercent,
      maxSlopePercent: slopeStats.maxSlopePercent
    },

    landCover: {
      dominantType: landCover.dominantType,
      coveragePercent: landCover.coverage
    },

    structures: {
      detected: structures.detected,
      types: structures.types
    }
  };
}
