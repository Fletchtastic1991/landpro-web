import { MockElevationAdapter } from "../storage/data/mocks/MockElevationAdapter.js";
import { MockLandCoverAdapter } from "../storage/data/mocks/MockLandCoverAdapter.js";
import { MockStructureAdapter } from "../storage/data/mocks/MockStructureAdapter.js";

console.log("ELEVATION:");
console.log(MockElevationAdapter.getSlopeStats("geom-123"));

console.log("LAND COVER:");
console.log(MockLandCoverAdapter.getLandCover("geom-123"));

console.log("STRUCTURES:");
console.log(MockStructureAdapter.getStructures("geom-123"));
