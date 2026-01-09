/**
 * LandPro Event Logging v0.9 - Exports
 * 
 * Minimal internal event logging for observability.
 */

export * from './types';
export { 
  logParcelEvaluated, 
  logReportGenerated, 
  logErrorOccurred,
  getEventLog,
  getEventCounts,
} from './eventLogger';
