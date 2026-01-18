import { LandCoverAdapter } from "../adapters/LandCoverAdapter"
import { LandCoverStats } from "../types/LandCoverTypes";

export const MockLandCoverAdapter: LandCoverAdapter = {
  getLandCover(geometryId: string): LandCoverStats {
    return {
  categories: [
    { type: "forest", percent: 62 },
    { type: "grass", percent: 25 },
    { type: "bare", percent: 13 }
  ],
  dominantType: "forest",
  coverage: 62,
  forestPercent: 62,
  grassPercent: 25,
  scrubPercent: 13,
  confidence: "low",
  source: "mock"
};
  }
};
