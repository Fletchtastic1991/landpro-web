import { LandCoverStats } from "../types/LandCoverTypes.js";

export interface LandCoverAdapter {
  getLandCoverStats(
    geometryId: string
  ): LandCoverStats;
}
