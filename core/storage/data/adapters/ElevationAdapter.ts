import { ElevationStats } from "../types/ElevationTypes.js";

export interface MockElevationAdapter {
  getSlopeStats(geometryId: string): ElevationStats;
}
export interface ElevationAdapter {
  getElevationStats(geometryId: string): {
    averageSlopePercent: number;
    maxSlopePercent: number;
  };
}
