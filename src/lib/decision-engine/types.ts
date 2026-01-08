/**
 * LandPro Decision Engine v0 - Type Definitions
 * 
 * LOCKED CONTRACT:
 * - Coordinates parcel evaluation through SitePro ONLY
 * - Reads Memory Core v0 only; never writes conclusions as factual records
 * - Sequence is strictly linear: Memory → SitePro → result package → stop
 * - No inferences, no assumptions, no scoring, no ranking, no aggregation
 * - All outputs comply with LandPro OS Core Invariants
 */

import type { MemoryRecord, MemoryConflict } from '@/lib/memory/types';
import type { SiteProResult, SiteProOutcome, SiteProConfidence } from '@/lib/sitepro/types';

/**
 * Decision Engine execution status
 */
export type DecisionEngineStatus = 
  | 'success'   // All steps completed, SitePro produced result
  | 'partial'   // Execution completed with missing data
  | 'blocked';  // Execution could not complete

/**
 * Active Pro list for v0 (SitePro only)
 */
export type ActivePro = 'SitePro';

/**
 * Decision Engine v0 input
 */
export interface DecisionEngineInput {
  /** Parcel ID to evaluate */
  parcel_id: string;
  
  /** Memory Core v0 records for the parcel */
  memory_records: MemoryRecord[];
  
  /** Memory conflicts (visible, never resolved) */
  memory_conflicts: MemoryConflict[];
  
  /** Active Pro list - v0: SitePro only */
  active_pros: ActivePro[];
}

/**
 * Decision Engine v0 output
 * 
 * Packaged result from SitePro - no modifications, no additions
 */
export interface DecisionEngineResult {
  /** Unique execution ID */
  execution_id: string;
  
  /** Parcel that was evaluated */
  parcel_id: string;
  
  /** Execution status */
  status: DecisionEngineStatus;
  
  /** SitePro outcome (passed through unchanged) */
  outcome: SiteProOutcome;
  
  /** Plain-language reasoning linked to Memory sources */
  reasoning: string;
  
  /** Explicit unknowns from SitePro */
  unknowns: SiteProResult['unknowns'];
  
  /** Known facts from SitePro */
  known_facts: SiteProResult['known_facts'];
  
  /** Data sources referenced */
  sources: string[];
  
  /** Confidence level from SitePro */
  confidence: SiteProConfidence;
  
  /** Memory conflicts visible in this evaluation */
  conflicts_visible: MemoryConflict[];
  
  /** Which Pros were invoked (v0: SitePro only) */
  pros_invoked: ActivePro[];
  
  /** When execution completed */
  executed_at: string;
  
  /** Raw SitePro result (for traceability) */
  sitepro_result: SiteProResult;
}

/**
 * Decision Engine execution error
 */
export interface DecisionEngineError {
  code: 'NO_PARCEL_ID' | 'NO_MEMORY_RECORDS' | 'SITEPRO_FAILED' | 'UNKNOWN';
  message: string;
  details?: string;
}
