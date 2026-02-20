import { EventType, GeometryEvent } from "../events/EventTypes";
import { CommandResult } from "./CommandResult";
import type { GeoJSON } from "geojson";

/**
 * Input required to create geometry
 */
interface CreateGeometryInput {
  parcelId: string;
  geometryId: GeoJSON;
  source: "user" | "system";
  featureFlags: {
    MAP_DRAW: boolean;
  };
}

/**
 * Command: Create Geometry
 *
 * Rules enforced:
 * - MAP_DRAW must be enabled
 * - Geometry may only be created by explicit user action
 */
export function createGeometryCommand(
  input: CreateGeometryInput
): CommandResult {
  // Feature flag gate
  if (!input.featureFlags.MAP_DRAW) {
    return {
      status: "BLOCKED",
      reason: "MAP_DRAW feature is disabled"
    };
  }

  // System is not allowed to create geometry autonomously
  if (input.source !== "user") {
    return {
      status: "BLOCKED",
      reason: "Geometry creation requires explicit user action"
    };
  }

  const event: GeometryEvent = {
    id: crypto.randomUUID(),
    type: EventType.GEOMETRY_CREATED,
    timestamp: new Date().toISOString(),
    source: "user",
    parcelId: input.parcelId,
    geometryId: crypto.randomUUID(),
    geometry: input.geometryId
  };

  return {
    status: "ALLOWED",
    events: [event]
  };
}
