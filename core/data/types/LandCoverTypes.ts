export interface LandCoverCategory {
  type: string;
  percent: number;
}

export interface LandCoverStats {
  categories: LandCoverCategory[];
}
export interface LandCoverStats {
  dominantType: string;
  coverage: number;
  forestPercent: number;
  grassPercent: number;
  scrubPercent: number;

  confidence: "low" | "medium" | "high";
  source: "mock" | "authoritative";
}
