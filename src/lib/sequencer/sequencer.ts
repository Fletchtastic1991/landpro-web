/**
 * LandPro Sequencing Logic v0 - Core Sequencer
 * 
 * Orchestrates linear evaluation of parcels through the Decision Engine.
 * Sequence: Load Memory → Invoke Decision Engine → Collect Result → Next Parcel
 * 
 * Constraints:
 * - Linear execution: one parcel at a time
 * - No parallel Pro evaluation
 * - No side effects: never writes conclusions
 * - If Blocked, continue to next parcel
 */

import { executeDecisionEngine } from '@/lib/decision-engine';
import { memoryCore } from '@/lib/memory';
import { logErrorOccurred } from '@/lib/events';
import type { SequencerInput, SequencerOutput, SequencerParcelResult } from './types';

/**
 * Generate unique sequence ID
 */
function generateSequenceId(): string {
  return `seq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Execute the Sequencing Logic v0
 * 
 * Evaluates parcels linearly in the order provided.
 * Each parcel goes through: Memory → Decision Engine → SitePro → result
 * 
 * @param input - Parcel IDs and active Pros
 * @returns Ordered sequence of results
 */
export async function executeSequencer(input: SequencerInput): Promise<SequencerOutput> {
  const sequence_id = generateSequenceId();
  const started_at = new Date().toISOString();
  
  // Filter to SitePro only for v0
  const v0_pros = input.active_pros.filter(pro => pro === 'SitePro');
  
  const results: SequencerParcelResult[] = [];
  let successful_count = 0;
  let partial_count = 0;
  let blocked_count = 0;
  let failed_count = 0;

  // Linear execution: evaluate parcels one at a time
  for (let i = 0; i < input.parcel_ids.length; i++) {
    const parcel_id = input.parcel_ids[i];
    
    try {
      // Step 1: Load Memory records for parcel
      const { records } = await memoryCore.readRecords(parcel_id);
      const { conflicts } = await memoryCore.listConflicts(parcel_id);
      
      // Step 2: Invoke Decision Engine
      const engineOutput = executeDecisionEngine({
        parcel_id,
        memory_records: records,
        memory_conflicts: conflicts,
        active_pros: v0_pros,
      });
      
      // Step 3: Check if Decision Engine returned error or result
      if ('error' in engineOutput) {
        results.push({
          parcel_id,
          sequence_index: i,
          result: null,
          error: engineOutput.error.message,
        });
        failed_count++;
        continue;
      }
      
      // Step 4: Collect result and update counts
      const result = engineOutput.result;
      results.push({
        parcel_id,
        sequence_index: i,
        result,
        error: null,
      });
      
      // Update status counts
      switch (result.status) {
        case 'success':
          successful_count++;
          break;
        case 'partial':
          partial_count++;
          break;
        case 'blocked':
          blocked_count++;
          // Continue to next parcel - do not attempt remedial actions
          break;
      }
      
    } catch (err) {
      // Pre-Decision Engine failure (e.g., Memory fetch failed)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading parcel data';
      
      // Log error event (non-blocking, silent)
      logErrorOccurred('SEQUENCER_PARCEL_FAILED', errorMessage, parcel_id);
      
      results.push({
        parcel_id,
        sequence_index: i,
        result: null,
        error: errorMessage,
      });
      
      failed_count++;
      // Continue to next parcel
    }
  }

  const completed_at = new Date().toISOString();

  return {
    sequence_id,
    results,
    total_parcels: input.parcel_ids.length,
    successful_count,
    partial_count,
    blocked_count,
    failed_count,
    started_at,
    completed_at,
  };
}
