import { createGeometryCommand } from "../commands/CreateGeometryCommand";
import { dispatchEvent } from "../dispatcher/EventDispatcher";
import { getJournal } from "../journal/JournalWriter";

// --- Simulated runtime state ---
const featureFlags = {
  MAP_DRAW: true
};

const parcelId = "parcel-123";
const geometryId = "geom-abc";

// 1. User attempts to draw geometry
const commandResult = createGeometryCommand({
  parcelId,
  geometryId,
  source: "user",
  featureFlags
});

console.log("COMMAND RESULT:", commandResult);

// 2. If allowed, dispatch resulting events
if (commandResult.status === "ALLOWED" && commandResult.events) {
  commandResult.events.forEach(event => {
    dispatchEvent(event);
  });
}

// 3. Inspect journal state
console.log("JOURNAL STATE:");
console.dir(getJournal(), { depth: null });
