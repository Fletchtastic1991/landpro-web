/**
 * SitePro v0 - Type Definitions
 * 
 * LOCKED CONTRACT:
 * - Reads ONLY from Memory Core
 * - Outputs exactly ONE of three outcomes
 * - Never recommends, never implies approval, never guesses
 * - Conservative bias: if unsure → Inconclusive
 */

import type { MemoryRecord, MemoryCategory, MemoryConfidence } from '@/lib/memory/types';

/**
 * SitePro outcome - exactly one of three values
 */
export type SiteProOutcome = 
  | 'potentially_suitable'  // 🟢
  | 'inconclusive'          // 🟡
  | 'blocked';              // 🔴

/**
 * SitePro confidence - Low or Medium ONLY (never High for preliminary assessment)
 */
export type SiteProConfidence = 'Low' | 'Medium';

/**
 * A known fact used in evaluation
 */
export interface SiteProKnownFact {
  category: MemoryCategory;
  value: unknown;
  source: string;
  confidence: MemoryConfidence;
  timestamp: string;
}

/**
 * An explicit unknown affecting the assessment
 */
export interface SiteProUnknown {
  category: MemoryCategory;
  source: string;
  impact: string; // Plain-language description of why this matters
}

/**
 * Internal evaluation area (NEVER exposed as scores)
 */
export type EvaluationArea = 
  | 'physical_feasibility'
  | 'legal_constraints'
  | 'basic_accessibility'
  | 'data_completeness';

/**
 * Internal evaluation result per area (private, not in output)
 */
export interface AreaEvaluation {
  area: EvaluationArea;
  hasBlocker: boolean;
  hasCriticalUnknown: boolean;
  notes: string[];
}

/**
 * Complete SitePro v0 result
 * All fields are REQUIRED
 */
export interface SiteProResult {
  /** Unique identifier for this evaluation */
  evaluation_id: string;
  
  /** Parcel being evaluated */
  parcel_id: string;
  
  /** Exactly one of: potentially_suitable, inconclusive, blocked */
  outcome: SiteProOutcome;
  
  /** Plain-language reasoning for the outcome */
  reasoning: string;
  
  /** All known facts used in this evaluation */
  known_facts: SiteProKnownFact[];
  
  /** All explicit unknowns affecting this assessment */
  unknowns: SiteProUnknown[];
  
  /** Low or Medium only - never High for preliminary assessment */
  confidence: SiteProConfidence;
  
  /** All data sources referenced */
  sources_referenced: string[];
  
  /** When this evaluation was performed */
  evaluated_at: string;
}

/**
 * Outcome display labels
 */
export const OUTCOME_LABELS: Record<SiteProOutcome, { emoji: string; label: string }> = {
  potentially_suitable: { emoji: '🟢', label: 'Potentially Suitable (Preliminary)' },
  inconclusive: { emoji: '🟡', label: 'Inconclusive' },
  blocked: { emoji: '🔴', label: 'Blocked' },
} as const;
