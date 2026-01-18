import { dispatchEvent } from "../dispatcher/EventDispatcher";
import { createGeometryCommand } from "../commands/CreateGeometryCommand";
import { generateParcelReport } from "../reports/ParcelReport";

// ---- Simulated runtime flags ----
const featureFlags = {
  MAP_DRAW: true
};

const parcelId = "parcel-123";
const geometryId = "geom-happy-001";

// ---- 1. User draws geometry on map ----
const commandResult = createGeometryCommand({
  parcelId,
  geometryId,
  source: "user",
  featureFlags
});

if (commandResult.status === "ALLOWED" && commandResult.events) {
  commandResult.events.forEach(event => dispatchEvent(event));
}

// ---- 2. Generate full parcel report ----
const report = generateParcelReport(parcelId);

console.log("HAPPY PATH PARCEL REPORT:");
console.dir(report, { depth: null });
