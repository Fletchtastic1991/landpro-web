import { StructureStats } from "../types/StructureTypes";

export interface StructureAdapter {
  getStructures(geometryId: string): StructureStats;
}
