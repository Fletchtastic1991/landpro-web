import { LandCoverStats } from "../types/LandCoverTypes";

export interface LandCoverAdapter {
  getLandCover(geometryId: string): LandCoverStats;
}
