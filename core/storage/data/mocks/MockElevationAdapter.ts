import { ElevationAdapter } from "../adapters/ElevationAdapter.js";

export const MockElevationAdapter: ElevationAdapter = {
  getElevationStats(geometryId: string) {
    return {
      averageSlopePercent: 7.8,
      maxSlopePercent: 18.3,
      steepAreaPercent: 10,
      confidence: "low",
      source: "mock"
    };
  }
};
