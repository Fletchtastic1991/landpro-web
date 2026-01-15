import { LandProEvent } from "../events/EventTypes";

/**
 * JournalEntry
 * Immutable, append-only record of system history.
 */
export interface JournalEntry {
  id: string;
  event: LandProEvent;
  writtenAt: string;
  status: "active" | "undone" | "superseded";
}
