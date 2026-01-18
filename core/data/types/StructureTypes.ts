export interface StructureStats {
  types: string[];
  detected: boolean;
  buildingCount: number;
  drivewayDetected: boolean;

  confidence: "low" | "medium" | "high";
  source: "mock" | "authoritative";
}
export interface StructureDetection {
  type: "building" | "driveway" | "road" | "other";
  count: number;
}

export interface StructureStats {
  detections: StructureDetection[];
}
