import { StructureAdapter } from "../adapters/StructureAdapter";
import { StructureStats } from "../types/StructureTypes";

export const MockStructureAdapter: StructureAdapter = {
  getStructureStats(geometryId: string): StructureStats {
    return {
      detections: [
        { type: "building", count: 1 },
        { type: "driveway", count: 1 }
      ],
      buildingCount: 0,
      drivewayDetected: false,
      confidence: "low",
      source: "mock",
      detected: true,
      types: ["building", "driveway"]
    };
  }
};
