/**
 * LandPro OS — Canonical Event Types
 * Version: v0.1
 *
 * This file defines ALL allowed events in the LandPro system.
 * Events are immutable facts about something that happened.
 *
 * Rules:
 * - Events describe what occurred, not what should happen
 * - Events do not contain interpretation
 * - Undeclared events are forbidden
 */

export enum EventType {
  // ─────────────────────────────────────────────
  // Geometry & Map Interaction
  // ─────────────────────────────────────────────
  GEOMETRY_CREATED = "GEOMETRY_CREATED",
  GEOMETRY_UPDATED = "GEOMETRY_UPDATED",
  GEOMETRY_DELETED = "GEOMETRY_DELETED",

  // ─────────────────────────────────────────────
  // User Decisions & Declarations
  // ─────────────────────────────────────────────
  USER_DECLARATION_ADDED = "USER_DECLARATION_ADDED",
  USER_OVERRIDE_APPLIED = "USER_OVERRIDE_APPLIED",
  USER_UNDO = "USER_UNDO",

  // ─────────────────────────────────────────────
  // Journal & Memory
  // ─────────────────────────────────────────────
  JOURNAL_ENTRY_WRITTEN = "JOURNAL_ENTRY_WRITTEN",

  // ─────────────────────────────────────────────
  // Report Lifecycle
  // ─────────────────────────────────────────────
  REPORT_GENERATED = "REPORT_GENERATED",
  REPORT_REPLACED = "REPORT_REPLACED",

  // ─────────────────────────────────────────────
  // System & Validation
  // ─────────────────────────────────────────────
  CONFLICT_DETECTED = "CONFLICT_DETECTED",
  ACTION_BLOCKED = "ACTION_BLOCKED"
}

/**
 * Base shape for all events.
 * No event may bypass this contract.
 */
export interface BaseEvent {
  id: string;              // unique event id
  type: EventType;         // one of the above
  timestamp: string;       // ISO string
  source: "user" | "system";
  parcelId: string;
}

/**
 * Geometry-related events
 */
export interface GeometryEvent extends BaseEvent {
  type:
    | EventType.GEOMETRY_CREATED
    | EventType.GEOMETRY_UPDATED
    | EventType.GEOMETRY_DELETED;
  geometryId: string;
  geometry?: unknown;
}

/**
 * User decision events
 */
export interface UserDecisionEvent extends BaseEvent {
  type:
    | EventType.USER_DECLARATION_ADDED
    | EventType.USER_OVERRIDE_APPLIED
    | EventType.USER_UNDO;
  targetEventId?: string; // used for undo
}

/**
 * Report events
 */
export interface ReportEvent extends BaseEvent {
  type:
    | EventType.REPORT_GENERATED
    | EventType.REPORT_REPLACED;
  reportId: string;
  supersedesReportId?: string;
}

/**
 * System blocking / conflict events
 */
export interface SystemEvent extends BaseEvent {
  type:
    | EventType.CONFLICT_DETECTED
    | EventType.ACTION_BLOCKED;
  reason: string;
}

/**
 * Union of all allowed LandPro events
 */
export type LandProEvent =
  | GeometryEvent
  | UserDecisionEvent
  | ReportEvent
  | SystemEvent;
