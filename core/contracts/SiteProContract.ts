export type SiteProStatus = "AVAILABLE" | "BLOCKED";

export interface SiteProSection {
  status: SiteProStatus;

  // Present only when status === "AVAILABLE"
  elevation?: {
    averageSlopePercent: number;
    maxSlopePercent: number;
  };

  landCover?: {
    dominantType: string;
    coveragePercent: number;
  };

  structures?: {
    detected: boolean;
    types: string[];
  };

  // Present only when status === "BLOCKED"
  reasonIfBlocked?: string;
}

/**
 * SITEPRO v0.1 BEHAVIOR CONTRACT
 *
 * RULES:
 * - SitePro MUST be BLOCKED if no user-drawn parcel boundary exists
 * - SitePro MUST NOT infer structures, slopes, or cover without geometry
 * - SitePro MAY report partial data if adapters return partial data
 * - SitePro MUST be deterministic for the same geometry set
 * - SitePro MUST NOT guess, hallucinate, or smooth missing data
 */
