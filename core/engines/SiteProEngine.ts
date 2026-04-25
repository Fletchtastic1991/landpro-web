import { BaseParcelReport } from "../reports/BaseParcelReport";
import { MockElevationAdapter } from "../storage/data/mocks/MockElevationAdapter";
import { MockLandCoverAdapter } from "../storage/data/mocks/MockLandCoverAdapter";
import { MockStructureAdapter } from "../storage/data/mocks/MockStructureAdapter";

export interface SiteProResult {
  status: "AVAILABLE" | "BLOCKED";
  reasonIfBlocked?: string;

  slope?: {
    averagePercent: number;
    maxPercent: number;
  };

  landCover?: {
    dominant: string;
    coveragePercent: number;
  };

  structures?: {
    detected: boolean;
    types: string[];
  };
}

export function runSiteProEngine(base: BaseParcelReport): SiteProResult {
  if (!base.geometry.hasUserDrawnGeometry) {
    return {
      status: "BLOCKED",
      reasonIfBlocked: "No parcel boundary"
    };
  }

  const geometryId = base.geometry.geometryIds[0];

  const elevation = MockElevationAdapter.getElevationStats(geometryId);
  const land = MockLandCoverAdapter.getLandCoverStats(geometryId);
  const structures = MockStructureAdapter.getStructureStats(geometryId);

  return {
    status: "AVAILABLE",

    slope: {
      averagePercent: elevation.averageSlopePercent,
      maxPercent: elevation.maxSlopePercent
    },

    landCover: {
      dominant: land.dominantType,
      coveragePercent:
        land.categories.find(c => c.type === land.dominantType)?.percent ?? 0
    },

    structures: {
      detected: structures.detected,
      types: structures.types
    }
  };
}