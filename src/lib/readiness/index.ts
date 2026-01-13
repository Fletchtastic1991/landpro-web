/**
 * LandPro Readiness v0
 * 
 * Pure derived computation layer for parcel readiness state.
 * 
 * CRITICAL RULES:
 * 1. One-Way Data Flow - Memory Core → Readiness (never reverse)
 * 2. Explicit Memory Only - Only user-declared entries affect readiness
 * 3. Whitelisted Milestones - Only specific milestones advance readiness
 * 4. No Auto-Promotion - Analysis reruns NEVER change readiness
 * 5. Safety Default - Ambiguity = LOWER readiness
 * 
 * @example
 * import { readinessComputer } from '@/lib/readiness';
 * 
 * // Compute readiness from memory records
 * const result = readinessComputer.compute({
 *   parcel_id: 'xxx',
 *   memory_records: records, // from Memory Core only
 * });
 * 
 * // Check supporting entries
 * console.log(result.supporting_entries); // What supports this level
 * console.log(result.missing_requirements); // What's missing
 * console.log(result.blockers); // What's blocking
 * 
 * // Get conditional statement for UI
 * console.log(result.conditional_statement);
 */

export { readinessComputer, computeReadiness, canAdvanceReadiness, getNextRequiredMilestones } from './readinessComputer';
export * from './types';
