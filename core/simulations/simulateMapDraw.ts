import { MapDrawAdapter } from "../integrations/map/MapDrawAdapter.js";

const result = MapDrawAdapter.handle({
  parcelId: "parcel-123",
  geometry: { type: "Polygon", coordinates: [] },
  source: "user",
  featureFlags: {
    MAP_DRAW: true
  }
});

console.log("MAP DRAW RESULT:", result);
