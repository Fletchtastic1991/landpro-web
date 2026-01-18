import { getJournal } from "../journal/JournalWriter";
import { GeometryEvent, EventType } from "../events/EventTypes";

export interface LandClearingReport {
  parcelId: string;
  hasUserDrawnGeometry: boolean;
  geometryIds: string[];
}

export function generateLandClearingReport(parcelId: string): LandClearingReport {
  const journal = getJournal();

  const geometryEvents = journal
    .filter(entry => entry.event.parcelId === parcelId)
    .filter(entry => entry.event.type === EventType.GEOMETRY_CREATED);

  return {
    parcelId,
    hasUserDrawnGeometry: geometryEvents.length > 0,
    geometryIds: geometryEvents.map(e => (e.event as GeometryEvent).geometryId)
  };
}
