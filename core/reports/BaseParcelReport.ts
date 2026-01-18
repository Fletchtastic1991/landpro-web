import { getJournal } from "../journal/JournalWriter";
import { GeometryEvent, EventType } from "../events/EventTypes";

export interface BaseParcelReport {
  parcelId: string;

  geometry: {
    hasUserDrawnGeometry: boolean;
    geometryIds: string[];
    source: "user" | "none";
  };

  dataAvailability: {
    parcelBoundary: "user-drawn" | "not-provided";
  };

  generatedAt: string;
}

/**
 * BaseParcelReport
 *
 * Purpose:
 * - Establish what is known
 * - Declare what is missing
 * - Provide a stable foundation for all Pro sections
 *
 * This report makes NO interpretations.
 */
export function generateBaseParcelReport(
  parcelId: string
): BaseParcelReport {
  const journal = getJournal();

  const geometryEvents = journal.filter(
    entry =>
      entry.event.type === EventType.GEOMETRY_CREATED &&
      entry.event.parcelId === parcelId
  )as { event: GeometryEvent }[];

  const geometryIds = geometryEvents.map(
    entry => entry.event.geometryId
  );

  const hasUserDrawnGeometry = geometryIds.length > 0;

  return {
    parcelId,

    geometry: {
      hasUserDrawnGeometry,
      geometryIds,
      source: hasUserDrawnGeometry ? "user" : "none"
    },

    dataAvailability: {
      parcelBoundary: hasUserDrawnGeometry
        ? "user-drawn"
        : "not-provided"
    },

    generatedAt: new Date().toISOString()
  };
}
