/**
 * LandPro Event Logger v0.9
 * 
 * Minimal internal event logging for observability.
 * - Append-only
 * - Non-blocking
 * - Silent (no UI exposure)
 * - Does NOT affect sequencing, evaluation, or performance
 */

import type { 
  LandProEvent, 
  ParcelEvaluatedEvent, 
  ReportGeneratedEvent, 
  ErrorOccurredEvent 
} from './types';

// Generate anonymous session ID (persists for browser session only)
function getSessionId(): string {
  const key = 'landpro_session_id';
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    try {
      sessionStorage.setItem(key, sessionId);
    } catch {
      // Silent fail - sessionStorage may be unavailable
    }
  }
  return sessionId;
}

// In-memory event store (append-only)
const eventStore: LandProEvent[] = [];

/**
 * Log an event (non-blocking, silent)
 */
function logEvent(event: LandProEvent): void {
  try {
    eventStore.push(event);
    // Silent console log for dev visibility only
    if (import.meta.env.DEV) {
      console.debug('[LandPro Event]', event.type, event);
    }
  } catch {
    // Silent fail - logging must never throw
  }
}

/**
 * Log parcel evaluation event
 */
export function logParcelEvaluated(
  parcelId: string,
  executionId?: string,
  outcome?: 'potentially_suitable' | 'inconclusive' | 'blocked'
): void {
  const event: ParcelEvaluatedEvent = {
    type: 'parcel_evaluated',
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    parcel_id: parcelId,
    execution_id: executionId,
    outcome,
  };
  logEvent(event);
}

/**
 * Log report generation event
 */
export function logReportGenerated(
  reportId: string,
  parcelId?: string
): void {
  const event: ReportGeneratedEvent = {
    type: 'report_generated',
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    report_id: reportId,
    parcel_id: parcelId,
  };
  logEvent(event);
}

/**
 * Log error event
 */
export function logErrorOccurred(
  errorCode?: string,
  errorMessage?: string,
  parcelId?: string,
  reportId?: string
): void {
  const event: ErrorOccurredEvent = {
    type: 'error_occurred',
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    parcel_id: parcelId,
    report_id: reportId,
    error_code: errorCode,
    error_message: errorMessage,
  };
  logEvent(event);
}

/**
 * Get all logged events (read-only, for debugging)
 */
export function getEventLog(): readonly LandProEvent[] {
  return [...eventStore];
}

/**
 * Get event count by type (for debugging)
 */
export function getEventCounts(): Record<string, number> {
  return eventStore.reduce((counts, event) => {
    counts[event.type] = (counts[event.type] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
}
