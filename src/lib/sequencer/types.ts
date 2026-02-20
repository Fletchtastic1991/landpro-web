/**
 * LandPro Sequencing Logic v0 - Types
 * 
 * Orchestrates the flow from Memory → Decision Engine → SitePro → output.
 * Evaluates parcels one at a time in linear order.
 * Never evaluates, infers, or writes conclusions.
 */

import type { DecisionEngineResult } from '@/lib/decision-engine/types';
import type { ActivePro } from '@/lib/decision-engine/types';

/**
 * Input for the Sequencing Logic
 */
export interface SequencerInput {
  /** Ordered list of parcel IDs to evaluate */
  parcel_ids: string[];
  /** Active Pro list (v0: SitePro only) */
  active_pros: ActivePro[];
}

/**
 * Result for a single parcel in the sequence
 */
export interface SequencerParcelResult {
  /** Parcel ID that was evaluated */
  parcel_id: string;
  /** Position in the sequence (0-indexed) */
  sequence_index: number;
  /** Decision Engine result (null if fetch failed) */
  result: DecisionEngineResult | null;
  /** Error message if evaluation failed before Decision Engine */
  error: string | null;
}

/**
 * Complete output from the Sequencing Logic
 */
export interface SequencerOutput {
  /** Unique execution ID for this sequence run */
  sequence_id: string;
  /** Ordered results for each parcel */
  results: SequencerParcelResult[];
  /** Total parcels requested */
  total_parcels: number;
  /** Count of successful evaluations */
  successful_count: number;
  /** Count of partial evaluations */
  partial_count: number;
  /** Count of blocked evaluations */
  blocked_count: number;
  /** Count of failed evaluations (pre-Decision Engine errors) */
  failed_count: number;
  /** Timestamp when sequence started */
  started_at: string;
  /** Timestamp when sequence completed */
  completed_at: string;
}
