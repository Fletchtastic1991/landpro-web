import { LandCoverAdapter } from "../adapters/LandCoverAdapter.js";
import { LandCoverStats } from "../types/LandCoverTypes.js";

export const MockLandCoverAdapter: LandCoverAdapter = {
  getLandCoverStats(geometryId: string): LandCoverStats {
    return {
      categories: [
        { type: "forest", percent: 62 },
        { type: "grass", percent: 25 },
        { type: "scrub", percent: 13 }
      ],

      dominantType: "forest",
      coveragePercent: 100,      
      forestPercent: 62,
      grassPercent: 25,
      scrubPercent: 13,

      confidence: "low",
      source: "mock"
    };
  }
};
