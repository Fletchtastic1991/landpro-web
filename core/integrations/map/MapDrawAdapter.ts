import { createGeometryCommand } from "../../commands/CreateGeometryCommand.js";
import { CommandResult } from "../../commands/CommandResult.js";
import type { GeoJSON } from "geojson";

export interface MapDrawInput {
  parcelId: string;
  geometry: unknown;
  source: "user" | "system";
  featureFlags: {
    MAP_DRAW: boolean;
  };
}

export class MapDrawAdapter {
  static handle(input: MapDrawInput): CommandResult {
    const { parcelId, geometry, source, featureFlags } = input;

    if (!parcelId) {
      return { status: "BLOCKED", reason: "Missing parcelId" };
    }

    if (!geometry) {
      return { status: "BLOCKED", reason: "Missing geometry" };
    }

    return createGeometryCommand({
      parcelId,
      geometryId: geometry as GeoJSON.GeoJSON,
      source,
      featureFlags,
    });
  }
}