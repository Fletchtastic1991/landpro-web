import { LandProEvent, EventType } from "../events/EventTypes";
import { writeJournalEntry, supersedeReports } from "../journal/JournalWriter";

/**
 * Central event dispatcher.
 * This is the ONLY place where events trigger side effects.
 */
export function dispatchEvent(event: LandProEvent) {
  // 1. Write to journal (always first)
  writeJournalEntry(event);

  // 2. React based on event type
  switch (event.type) {
    case EventType.GEOMETRY_CREATED:
    case EventType.GEOMETRY_UPDATED:
    case EventType.GEOMETRY_DELETED:
      // Geometry changes invalidate reports
      supersedeReports(event.parcelId);
      break;

    case EventType.REPORT_GENERATED:
      // Nothing else reacts to reports yet
      break;

    case EventType.USER_UNDO:
      // Undo effects are already recorded
      break;

    case EventType.CONFLICT_DETECTED:
    case EventType.ACTION_BLOCKED:
      // Logged for audit only
      break;

    default:
      // Exhaustiveness safety
      const _exhaustive: never = event;
      return _exhaustive;
  }
}
