export interface LandCoverCategory {
  type: string;
  percent: number;
}

export interface LandCoverStats {
  categories: LandCoverCategory[];
}
export interface LandCoverStats {
  dominantType: string;
  coveragePercent: number;
  forestPercent: number;
  grassPercent: number;
  scrubPercent: number;

  confidence: "low" | "medium" | "high";
  source: "mock" | "authoritative";
}
