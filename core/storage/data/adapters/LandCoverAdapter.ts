import { LandCoverStats } from "../types/LandCoverTypes";

export interface LandCoverAdapter {
  getLandCoverStats(
    geometryId: string
  ): LandCoverStats;
}
