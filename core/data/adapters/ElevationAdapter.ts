import { ElevationStats } from "../types/ElevationTypes";

export interface ElevationAdapter {
  getSlopeStats(geometryId: string): ElevationStats;
}
