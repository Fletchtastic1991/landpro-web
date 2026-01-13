/**
 * LandPro Readiness Computer v0
 * 
 * PURE DERIVED COMPUTATION from Memory Core
 * 
 * STRICT RULES:
 * 1. One-Way Data Flow - Memory Core is the sole source of truth
 * 2. Explicit Memory Only - Only user-declared entries affect readiness
 * 3. Whitelisted Milestones - Only specific milestone types advance readiness
 * 4. Conditional Readiness Logic - Missing prerequisites = conditional/incomplete
 * 5. No Auto-Promotion - Analysis reruns NEVER change readiness
 * 6. Explainability - Output lists supporting/missing entries
 * 7. Safety Default - Ambiguity defaults to LOWER readiness
 * 
 * INVARIANT: This function is PURE - same input = same output
 * INVARIANT: Readiness is NEVER written to Memory Core
 * INVARIANT: Analysis output CANNOT be input to this function
 */

import type {
  ReadinessResult,
  ReadinessLevel,
  ReadinessMilestone,
  SupportingEntry,
  MissingRequirement,
  Blocker,
  ReadinessInput,
  MemoryRecordForReadiness,
} from './types';

import {
  MILESTONE_LABELS,
  BUILD_READY_REQUIREMENTS,
  EARLY_STAGE_REQUIREMENTS,
  BLOCKING_MILESTONES,
} from './types';

/**
 * Extract milestone from a memory record value
 * Returns null if record doesn't represent a valid milestone
 */
function extractMilestone(record: MemoryRecordForReadiness): ReadinessMilestone | null {
  // Only 'observation' and 'metadata' categories can contain milestones
  if (record.category !== 'observation' && record.category !== 'metadata') {
    return null;
  }
  
  // Value must be an object with a 'milestone' field
  if (typeof record.value !== 'object' || record.value === null) {
    return null;
  }
  
  const value = record.value as Record<string, unknown>;
  
  // Check for explicit milestone field
  if (typeof value.milestone === 'string') {
    const milestone = value.milestone as string;
    if (milestone in MILESTONE_LABELS) {
      return milestone as ReadinessMilestone;
    }
  }
  
  // Check for milestone_type field (alternative format)
  if (typeof value.milestone_type === 'string') {
    const milestone = value.milestone_type as string;
    if (milestone in MILESTONE_LABELS) {
      return milestone as ReadinessMilestone;
    }
  }
  
  return null;
}

/**
 * Compute readiness from Memory Core records
 * 
 * This is a PURE function - same input always produces same output
 * It NEVER modifies Memory Core or persists anything
 * 
 * @param input - Parcel ID and memory records (from Memory Core ONLY)
 * @returns ReadinessResult - derived computation, NOT a fact
 */
export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const { parcel_id, memory_records } = input;
  const computedAt = new Date().toISOString();
  
  // Extract all valid milestones from memory records
  const foundMilestones = new Map<ReadinessMilestone, MemoryRecordForReadiness>();
  
  for (const record of memory_records) {
    const milestone = extractMilestone(record);
    if (milestone) {
      // Keep the most recent record for each milestone
      const existing = foundMilestones.get(milestone);
      if (!existing || new Date(record.timestamp) > new Date(existing.timestamp)) {
        foundMilestones.set(milestone, record);
      }
    }
  }
  
  // Build supporting entries
  const supportingEntries: SupportingEntry[] = [];
  for (const [milestone, record] of foundMilestones) {
    supportingEntries.push({
      milestone,
      record_id: record.record_id,
      recorded_at: record.timestamp,
      source: record.source,
    });
  }
  
  // Check for blockers
  const blockers: Blocker[] = [];
  for (const blockingMilestone of BLOCKING_MILESTONES) {
    const record = foundMilestones.get(blockingMilestone);
    if (record) {
      blockers.push({
        milestone: blockingMilestone,
        label: MILESTONE_LABELS[blockingMilestone],
        record_id: record.record_id,
        recorded_at: record.timestamp,
      });
    }
  }
  
  // Check for missing build-ready requirements
  const missingRequirements: MissingRequirement[] = [];
  for (const required of BUILD_READY_REQUIREMENTS) {
    if (!foundMilestones.has(required)) {
      missingRequirements.push({
        milestone: required,
        label: MILESTONE_LABELS[required],
        reason: `Required for build-ready status`,
      });
    }
  }
  
  // Determine readiness level using SAFETY DEFAULT principle
  // In all ambiguous cases, default to LOWER readiness
  let level: ReadinessLevel;
  let label: string;
  let conditionalStatement: string;
  
  // Rule: If blockers exist, status is BLOCKED
  if (blockers.length > 0) {
    level = 'blocked';
    label = 'Blocked';
    const blockerLabels = blockers.map(b => b.label).join(', ');
    conditionalStatement = `Cannot advance — ${blockerLabels}`;
  }
  // Rule: If no milestones found, status is NOT READY
  else if (foundMilestones.size === 0) {
    level = 'not_ready';
    label = 'Not Ready (No Decisions Recorded)';
    conditionalStatement = 'No user-declared milestones recorded. Readiness cannot be determined.';
  }
  // Check if ANY early-stage requirements are met
  else {
    const hasEarlyStage = EARLY_STAGE_REQUIREMENTS.some(m => foundMilestones.has(m));
    const hasBuildReadyProgress = BUILD_READY_REQUIREMENTS.some(m => foundMilestones.has(m));
    
    if (!hasEarlyStage && !hasBuildReadyProgress) {
      // Has milestones but not the key ones
      level = 'raw';
      label = 'Raw';
      conditionalStatement = 'Some activity recorded but key surveys not completed.';
    } else if (missingRequirements.length === 0) {
      // All build-ready requirements met, but NOT labeling as build-ready
      // because that's a DECISION STATE requiring explicit user confirmation
      level = 'conditional';
      label = 'Conditional';
      conditionalStatement = 'Core milestones recorded. Final readiness requires user confirmation.';
    } else if (hasEarlyStage) {
      level = 'early_stage';
      label = 'Early-Stage';
      const missingLabels = missingRequirements.map(m => m.label).join(', ');
      conditionalStatement = `Pending: ${missingLabels}`;
    } else {
      // Has some progress but missing key early-stage items
      level = 'conditional';
      label = 'Conditional';
      const missingLabels = missingRequirements.map(m => m.label).join(', ');
      conditionalStatement = `Pending verification: ${missingLabels}`;
    }
  }
  
  return {
    level,
    label,
    supporting_entries: supportingEntries,
    missing_requirements: missingRequirements,
    blockers,
    conditional_statement: conditionalStatement,
    computed_at: computedAt,
  };
}

/**
 * Type guard to check if readiness can potentially advance
 * (i.e., not blocked and not already at conditional)
 */
export function canAdvanceReadiness(result: ReadinessResult): boolean {
  return result.level !== 'blocked' && result.blockers.length === 0;
}

/**
 * Get next required milestone(s) for advancement
 */
export function getNextRequiredMilestones(result: ReadinessResult): MissingRequirement[] {
  if (!canAdvanceReadiness(result)) {
    return [];
  }
  
  // Return missing requirements ordered by importance
  // Boundary survey is typically first priority
  const priorityOrder: ReadinessMilestone[] = [
    'boundary_survey_completed',
    'topographic_survey_completed',
    'environmental_survey_completed',
    'clearing_completed',
    'utilities_confirmed',
  ];
  
  return result.missing_requirements.sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a.milestone);
    const bIndex = priorityOrder.indexOf(b.milestone);
    // Items not in priority list go to end
    const aOrder = aIndex === -1 ? 999 : aIndex;
    const bOrder = bIndex === -1 ? 999 : bIndex;
    return aOrder - bOrder;
  });
}

// Export the computer as a named constant
export const readinessComputer = {
  compute: computeReadiness,
  canAdvance: canAdvanceReadiness,
  getNextRequired: getNextRequiredMilestones,
} as const;
