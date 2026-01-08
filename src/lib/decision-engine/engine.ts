/**
 * LandPro Decision Engine v0
 * 
 * PURPOSE:
 * Coordinates parcel evaluation strictly through SitePro, reading Memory Core v0 only.
 * It does not evaluate, infer, modify Memory, or take actions.
 * It only sequences and packages outputs.
 * 
 * PROCESS:
 * 1. Load all Memory records for the parcel
 * 2. Invoke SitePro v0 using the Memory records
 * 3. Collect SitePro output
 * 4. Package result
 * 5. Stop — do not call any other Pro or perform any evaluation beyond SitePro
 * 
 * CONSTRAINTS:
 * - Decision Engine reads Memory Core v0 only; it never writes conclusions as factual records
 * - No inferences or assumptions
 * - No scoring, ranking, or aggregation
 * - All outputs must comply with LandPro OS Core Invariants
 * - Sequence is strictly linear: Memory → SitePro → result package → stop
 * - No other Pros invoked in v0
 */

import { evaluateParcel } from '@/lib/sitepro';
import type { MemoryRecord, MemoryConflict } from '@/lib/memory/types';
import type { SiteProResult } from '@/lib/sitepro/types';
import type {
  DecisionEngineInput,
  DecisionEngineResult,
  DecisionEngineStatus,
  DecisionEngineError,
  ActivePro,
} from './types';

/**
 * Generate unique execution ID
 */
function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Determine execution status based on SitePro result
 */
function determineStatus(
  siteProResult: SiteProResult,
  memoryRecords: MemoryRecord[]
): DecisionEngineStatus {
  // If no memory records, partial execution
  if (memoryRecords.length === 0) {
    return 'partial';
  }

  // If SitePro blocked, propagate blocked status
  if (siteProResult.outcome === 'blocked') {
    return 'blocked';
  }

  // If there are explicit unknowns, partial execution
  if (siteProResult.unknowns.length > 0) {
    return 'partial';
  }

  // Otherwise, success
  return 'success';
}

/**
 * Execute Decision Engine v0
 * 
 * Strictly linear sequence:
 * Memory → SitePro → result package → stop
 * 
 * @param input - Decision engine input with parcel ID, memory records, and active pros
 * @returns Either a result or an error - never throws
 */
export function executeDecisionEngine(
  input: DecisionEngineInput
): { result: DecisionEngineResult } | { error: DecisionEngineError } {
  const { parcel_id, memory_records, memory_conflicts, active_pros } = input;

  // STEP 0: Validate inputs
  if (!parcel_id) {
    return {
      error: {
        code: 'NO_PARCEL_ID',
        message: 'Parcel ID is required',
      },
    };
  }

  // v0: Validate only SitePro is in active pros
  const validPros: ActivePro[] = active_pros.filter((p) => p === 'SitePro');
  if (validPros.length === 0) {
    // Default to SitePro for v0
    validPros.push('SitePro');
  }

  // STEP 1: Memory records are already provided (loaded by caller)
  // Decision Engine does NOT fetch from database - it receives records
  
  // STEP 2: Invoke SitePro v0 using Memory records
  let siteProResult: SiteProResult;
  try {
    siteProResult = evaluateParcel(parcel_id, memory_records);
  } catch (e) {
    return {
      error: {
        code: 'SITEPRO_FAILED',
        message: 'SitePro evaluation failed',
        details: e instanceof Error ? e.message : 'Unknown error',
      },
    };
  }

  // STEP 3: Collect SitePro output (already in siteProResult)
  // - Outcome: Potentially Suitable / Inconclusive / Blocked
  // - Reasoning: Plain-language explanation linked to Memory sources
  // - List of explicit unknowns
  // - Data sources and confidence

  // STEP 4: Package result
  const status = determineStatus(siteProResult, memory_records);

  const result: DecisionEngineResult = {
    execution_id: generateExecutionId(),
    parcel_id,
    status,
    
    // Pass through SitePro output unchanged
    outcome: siteProResult.outcome,
    reasoning: siteProResult.reasoning,
    unknowns: siteProResult.unknowns,
    known_facts: siteProResult.known_facts,
    sources: siteProResult.sources_referenced,
    confidence: siteProResult.confidence,
    
    // Include visible conflicts (never resolved by Decision Engine)
    conflicts_visible: memory_conflicts,
    
    // Track which Pros were invoked
    pros_invoked: validPros,
    
    // Timestamp
    executed_at: new Date().toISOString(),
    
    // Raw SitePro result for full traceability
    sitepro_result: siteProResult,
  };

  // STEP 5: Stop — do not call any other Pro or perform any evaluation
  return { result };
}

/**
 * V0 COMPLETION CRITERIA CHECK:
 * ✓ Decision Engine correctly sequences parcels through SitePro
 * ✓ Outputs link to Memory and show all unknowns and conflicts
 * ✓ No other evaluations or side-effects occur
 * ✓ System complies with all LandPro OS Core Invariants
 */
