/**
 * LandPro Event Logging v0.9 - Types
 * 
 * Minimal internal event logging for observability.
 * Append-only, non-blocking, silent.
 */

export type EventType = 
  | 'parcel_evaluated'
  | 'report_generated'
  | 'error_occurred';

export interface BaseEvent {
  /** Event type identifier */
  type: EventType;
  /** ISO timestamp of when event occurred */
  timestamp: string;
  /** Anonymous session identifier */
  session_id: string;
}

export interface ParcelEvaluatedEvent extends BaseEvent {
  type: 'parcel_evaluated';
  parcel_id: string;
  /** Optional execution ID from Decision Engine */
  execution_id?: string;
  /** Outcome from SitePro */
  outcome?: 'potentially_suitable' | 'inconclusive' | 'blocked';
}

export interface ReportGeneratedEvent extends BaseEvent {
  type: 'report_generated';
  report_id: string;
  parcel_id?: string;
}

export interface ErrorOccurredEvent extends BaseEvent {
  type: 'error_occurred';
  parcel_id?: string;
  report_id?: string;
  error_code?: string;
  error_message?: string;
}

export type LandProEvent = 
  | ParcelEvaluatedEvent 
  | ReportGeneratedEvent 
  | ErrorOccurredEvent;
