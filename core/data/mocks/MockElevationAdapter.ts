import { ElevationAdapter } from "../adapters/ElevationAdapter";

export const MockElevationAdapter: ElevationAdapter = {
  getSlopeStats(geometryId: string) {
    return {
      avgSlopePercent: 7.8,
      maxSlopePercent: 18.3,
      steepAreaPercent: 10,

      confidence: "low",
      source: "mock"
    };
  }
};
