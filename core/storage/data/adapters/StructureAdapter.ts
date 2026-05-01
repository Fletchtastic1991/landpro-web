import { StructureStats } from "../types/StructureTypes.js";

export interface StructureAdapter {
  getStructureStats(
    geometryId: string
  ): StructureStats;
}
