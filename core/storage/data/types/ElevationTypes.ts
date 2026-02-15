export interface ElevationStats {
  avgSlopePercent: number;
  maxSlopePercent: number;
  steepAreaPercent: number;

  confidence: "low" | "medium" | "high";
  source: "mock" | "authoritative";
}
