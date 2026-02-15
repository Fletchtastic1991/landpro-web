import { StructureStats } from "../types/StructureTypes";

export interface StructureAdapter {
  getStructureStats(
    geometryId: string
  ): StructureStats;
}
