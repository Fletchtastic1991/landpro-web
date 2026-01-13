/**
 * LandPro Readiness Types v0
 * 
 * STRICT RULES:
 * 1. Readiness is a PURE DERIVED COMPUTATION from Memory Core
 * 2. Readiness MUST NOT be written to Memory Core or persisted as fact
 * 3. Only explicit user-declared memory entries may affect readiness
 * 4. Analysis output, inference, or confidence scoring MUST NOT affect readiness
 */

/**
 * Whitelisted milestones that can advance readiness
 * Only these explicit memory entries may affect readiness state
 */
export type ReadinessMilestone =
  | 'boundary_survey_completed'
  | 'topographic_survey_completed'
  | 'environmental_survey_completed'
  | 'clearing_completed'
  | 'perc_test_passed'
  | 'perc_test_failed'
  | 'soil_test_completed'
  | 'driveway_installed'
  | 'utilities_confirmed'
  | 'utilities_unavailable'
  | 'septic_approved'
  | 'well_approved'
  | 'grading_completed'
  | 'erosion_control_installed'
  | 'permit_obtained'
  | 'permit_denied';

/**
 * Mapping of milestone keys to human-readable labels
 */
export const MILESTONE_LABELS: Record<ReadinessMilestone, string> = {
  boundary_survey_completed: 'Boundary survey completed',
  topographic_survey_completed: 'Topographic survey completed',
  environmental_survey_completed: 'Environmental survey completed',
  clearing_completed: 'Clearing completed',
  perc_test_passed: 'Perc test passed',
  perc_test_failed: 'Perc test failed',
  soil_test_completed: 'Soil test completed',
  driveway_installed: 'Driveway installed',
  utilities_confirmed: 'Utilities confirmed',
  utilities_unavailable: 'Utilities unavailable',
  septic_approved: 'Septic approved',
  well_approved: 'Well approved',
  grading_completed: 'Grading completed',
  erosion_control_installed: 'Erosion control installed',
  permit_obtained: 'Permit obtained',
  permit_denied: 'Permit denied',
};

/**
 * Required milestones for Build-Ready status
 * ALL must be present for Build-Ready
 */
export const BUILD_READY_REQUIREMENTS: ReadinessMilestone[] = [
  'boundary_survey_completed',
  'clearing_completed',
  'utilities_confirmed',
];

/**
 * Required milestones for Early-Stage status
 * At least one must be present
 */
export const EARLY_STAGE_REQUIREMENTS: ReadinessMilestone[] = [
  'boundary_survey_completed',
  'topographic_survey_completed',
  'environmental_survey_completed',
];

/**
 * Blocking milestones - if present, cannot advance to Build-Ready
 */
export const BLOCKING_MILESTONES: ReadinessMilestone[] = [
  'perc_test_failed',
  'utilities_unavailable',
  'permit_denied',
];

/**
 * Readiness levels - strictly ordered
 */
export type ReadinessLevel = 
  | 'not_ready'      // No decisions recorded
  | 'raw'            // Some baseline work started
  | 'early_stage'    // Initial surveys/assessments done
  | 'conditional'    // Progress made but missing requirements
  | 'blocked';       // Explicit blocker present (failed test, denied permit)

// Note: 'build_ready' is NOT a valid ReadinessLevel - it's a DECISION STATE
// that requires explicit user confirmation beyond milestone completion

/**
 * Readiness computation result
 * Pure derivation from Memory Core - NEVER persisted
 */
export interface ReadinessResult {
  /** Current readiness level */
  level: ReadinessLevel;
  
  /** Human-readable status label */
  label: string;
  
  /** Memory entries that support this readiness level */
  supporting_entries: SupportingEntry[];
  
  /** Required milestones that are missing */
  missing_requirements: MissingRequirement[];
  
  /** Explicit blockers preventing advancement */
  blockers: Blocker[];
  
  /** Conditional statement for UI display */
  conditional_statement: string;
  
  /** Timestamp of computation (not persistence) */
  computed_at: string;
}

/**
 * A memory entry that supports the readiness level
 */
export interface SupportingEntry {
  /** The milestone this entry represents */
  milestone: ReadinessMilestone;
  
  /** Original memory record ID */
  record_id: string;
  
  /** When the memory entry was recorded */
  recorded_at: string;
  
  /** Source of the memory entry */
  source: string;
}

/**
 * A required milestone that is missing
 */
export interface MissingRequirement {
  /** The required milestone */
  milestone: ReadinessMilestone;
  
  /** Human-readable label */
  label: string;
  
  /** Why this is required */
  reason: string;
}

/**
 * An explicit blocker preventing advancement
 */
export interface Blocker {
  /** The blocking milestone */
  milestone: ReadinessMilestone;
  
  /** Human-readable label */
  label: string;
  
  /** Original memory record ID */
  record_id: string;
  
  /** When the blocker was recorded */
  recorded_at: string;
}

/**
 * Readiness computation input
 * Derived from Memory Core records
 */
export interface ReadinessInput {
  parcel_id: string;
  memory_records: MemoryRecordForReadiness[];
}

/**
 * Subset of MemoryRecord needed for readiness computation
 */
export interface MemoryRecordForReadiness {
  record_id: string;
  category: string;
  value: unknown;
  source: string;
  timestamp: string;
}
