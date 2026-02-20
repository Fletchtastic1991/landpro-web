import { JournalEntry } from "./JournalEntry";
import { LandProEvent, EventType } from "../events/EventTypes";

/**
 * In-memory journal store (replaceable later with persistence)
 */
const journal: JournalEntry[] = [];

/**
 * Write a new journal entry.
 * This is the ONLY way history enters the system.
 */
export function writeJournalEntry(
  event: LandProEvent
): JournalEntry {
  const entry: JournalEntry = {
    id: crypto.randomUUID(),
    event,
    writtenAt: new Date().toISOString(),
    status: "active"
  };

  journal.push(entry);
  return entry;
}

/**
 * Undo a prior journal entry.
 * Does NOT delete history.
 */
export function undoJournalEntry(
  targetEntryId: string
): JournalEntry | null {
  const target = journal.find(j => j.id === targetEntryId);

  if (!target) return null;

  target.status = "undone";

  const undoEvent: LandProEvent = {
    id: crypto.randomUUID(),
    type: EventType.USER_UNDO,
    targetEventId: target.event.id,
    timestamp: new Date().toISOString(),
    source: "user",
    parcelId: target.event.parcelId
  };

  const undoEntry: JournalEntry = {
    id: crypto.randomUUID(),
    event: undoEvent,
    writtenAt: new Date().toISOString(),
    status: "active"
  };

  journal.push(undoEntry);
  return undoEntry;
}

/**
 * Mark reports as superseded when geometry changes
 */
export function supersedeReports(parcelId: string) {
  journal.forEach(entry => {
    if (
      entry.event.parcelId === parcelId &&
      entry.event.type === EventType.REPORT_GENERATED
    ) {
      entry.status = "superseded";
    }
  });
}

/**
 * Read-only access to journal
 */
export function getJournal(): readonly JournalEntry[] {
  return journal;
}
