/**
 * LandPro Parcel State Object & Reality Event Types v1
 * 
 * This module defines the type contracts for the Parcel State Object (PSO)
 * and Reality Events. These are foundational, append-only persistence layers
 * that work alongside (NOT replacing) the Memory Core.
 * 
 * Key Invariants:
 * - PSO is append-only (no overwrites, no deletions)
 * - Reality Events are immutable once recorded
 * - Events are labeled as reported/observed, NOT guaranteed truth
 * - These NEVER override regulatory, legal, or environmental constraints
 * - These NEVER change feasibility conclusions or remove risk flags
 * 
 * Safe Influence Rules (CRITICAL):
 * ALLOWED:
 *   - Referencing past actions in explanations
 *   - Adjusting narrative context to avoid repetition
 *   - Informing recommended next steps
 *   - Clarifying what remains unresolved
 *   - Stating when prior actions do NOT change constraints
 * 
 * NOT ALLOWED:
 *   - Removing or downgrading risk flags
 *   - Overriding regulatory/legal/environmental constraints
 *   - Changing feasibility conclusions
 *   - Suppressing warnings
 *   - Increasing certainty beyond available data
 */

// ============================================================================
// Reality Event Source (who/what recorded this event)
// ============================================================================

/**
 * Source of a Reality Event
 * - user: Manually reported by the parcel owner/user
 * - system: Automatically recorded by LandPro system
 * - pro: Recorded by a Pro evaluation (e.g., SitePro)
 * - sensor: Future: recorded by external sensor/IoT device
 */
export type RealityEventSource = 'user' | 'system' | 'pro' | 'sensor';

/**
 * All valid reality event sources
 */
export const REALITY_EVENT_SOURCES: readonly RealityEventSource[] = [
  'user',
  'system', 
  'pro',
  'sensor',
] as const;

// ============================================================================
// Verification Status
// ============================================================================

/**
 * Verification status of a Reality Event
 * - unverified: Default state, event is acknowledged but not independently verified
 * - verified: Event has been independently verified (future use)
 * 
 * Note: Even "verified" events do NOT override hard constraints
 */
export type VerificationStatus = 'unverified' | 'verified';

export const VERIFICATION_STATUSES: readonly VerificationStatus[] = [
  'unverified',
  'verified',
] as const;

// ============================================================================
// Confidence Level (reusing Memory Core's confidence levels)
// ============================================================================

/**
 * Confidence level for Reality Events
 * Reuses the same levels as Memory Core for consistency
 */
export type RealityEventConfidence = 'High' | 'Medium' | 'Low';

export const REALITY_EVENT_CONFIDENCE_LEVELS: readonly RealityEventConfidence[] = [
  'High',
  'Medium',
  'Low',
] as const;

// ============================================================================
// Event Types (what kind of occurrence is this)
// ============================================================================

/**
 * Common event types for Reality Events
 * This list can be extended but these are the core v1 types
 */
export type RealityEventType =
  | 'site_visit'           // Physical visit to the parcel
  | 'clearing_reported'    // Clearing activity reported
  | 'observation_noted'    // General observation recorded
  | 'report_generated'     // LandPro report was generated
  | 'boundary_updated'     // Parcel boundary was modified
  | 'analysis_completed'   // Analysis workflow completed
  | 'constraint_identified' // New constraint was identified
  | 'improvement_noted'    // Site improvement was noted
  | 'issue_reported'       // Issue or problem reported
  | 'custom';              // Custom/other event type

export const REALITY_EVENT_TYPES: readonly RealityEventType[] = [
  'site_visit',
  'clearing_reported',
  'observation_noted',
  'report_generated',
  'boundary_updated',
  'analysis_completed',
  'constraint_identified',
  'improvement_noted',
  'issue_reported',
  'custom',
] as const;

// ============================================================================
// Reality Event
// ============================================================================

/**
 * Location data for a Reality Event
 * Can be absolute (lat/lng) or parcel-relative
 */
export interface RealityEventLocation {
  lat?: number;
  lng?: number;
  parcel_relative?: string; // e.g., "northeast corner", "along access road"
}

/**
 * A single Reality Event - an acknowledged occurrence related to the parcel
 * 
 * Reality Events are:
 * - Explicitly labeled as reported or observed, NOT guaranteed truth
 * - Immutable once recorded
 * - Stored only as historical acknowledgements
 */
export interface RealityEvent {
  /** Unique identifier for this event */
  event_id: string;
  
  /** Reference to the parent Parcel State Object */
  parcel_state_id: string;
  
  /** When this event occurred or was recorded */
  timestamp: string;
  
  /** Who/what recorded this event */
  source: RealityEventSource;
  
  /** Type of event */
  event_type: RealityEventType | string;
  
  /** Optional location of the event */
  location: RealityEventLocation | null;
  
  /** Plain-language, non-assertive description */
  description: string;
  
  /** Confidence level of this event */
  confidence_level: RealityEventConfidence;
  
  /** Whether this event has been independently verified */
  verification_status: VerificationStatus;
}

/**
 * Input for creating a new Reality Event
 */
export interface RealityEventInput {
  source: RealityEventSource;
  event_type: RealityEventType | string;
  description: string;
  location?: RealityEventLocation;
  confidence_level?: RealityEventConfidence;
  // verification_status is always 'unverified' on creation
}

// ============================================================================
// Parcel State Object (PSO)
// ============================================================================

/**
 * Derived state computed from Reality Events
 * This is a summary/snapshot, NOT the source of truth
 */
export interface DerivedState {
  /** Number of site visits recorded */
  total_site_visits?: number;
  
  /** Last reported activity on the parcel */
  last_activity_date?: string;
  
  /** Types of events that have occurred */
  event_types_present?: string[];
  
  /** Any custom derived data */
  custom?: Record<string, unknown>;
}

/**
 * Reference to a linked report
 */
export interface LinkedReport {
  report_id: string;
  linked_at: string;
}

/**
 * The Parcel State Object (PSO) - canonical record of parcel history
 * 
 * The PSO:
 * - Is uniquely associated with a parcel_id
 * - Is append-only (no overwrites, no deletions)
 * - Persists across sessions
 * - Acts as the canonical record of parcel history
 * 
 * The PSO does NOT:
 * - Replace existing Memory Core
 * - Modify or invalidate prior reports
 * - Change parcel feasibility classifications
 * - Override regulatory, legal, environmental, or zoning constraints
 */
export interface ParcelStateObject {
  /** Unique identifier for this PSO */
  id: string;
  
  /** Reference to the parcel (project) */
  parcel_id: string;
  
  /** When this PSO was created */
  created_at: string;
  
  /** When this PSO was last updated (auto-updated on event insert) */
  last_updated: string;
  
  /** Computed summary of parcel state (optional) */
  derived_state: DerivedState | null;
  
  /** References to linked reports */
  linked_reports: LinkedReport[];
  
  /** Reality Events history (loaded separately for efficiency) */
  history?: RealityEvent[];
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of fetching or creating a PSO
 */
export interface ParcelStateResult {
  pso: ParcelStateObject | null;
  error?: string;
}

/**
 * Result of fetching Reality Events
 */
export interface RealityEventsResult {
  events: RealityEvent[];
  error?: string;
}

/**
 * Result of appending a Reality Event
 */
export interface AppendEventResult {
  event: RealityEvent | null;
  error?: string;
}

/**
 * Result of updating derived state
 */
export interface UpdateDerivedStateResult {
  success: boolean;
  error?: string;
}

/**
 * Result of linking a report
 */
export interface LinkReportResult {
  success: boolean;
  error?: string;
}
