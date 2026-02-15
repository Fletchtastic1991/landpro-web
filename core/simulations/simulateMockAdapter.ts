import { MockElevationAdapter } from "../storage/data/mocks/MockElevationAdapter";
import { MockLandCoverAdapter } from "../storage/data/mocks/MockLandCoverAdapter";
import { MockStructureAdapter } from "../storage/data/mocks/MockStructureAdapter";

console.log("ELEVATION:");
console.log(MockElevationAdapter.getSlopeStats("geom-123"));

console.log("LAND COVER:");
console.log(MockLandCoverAdapter.getLandCover("geom-123"));

console.log("STRUCTURES:");
console.log(MockStructureAdapter.getStructures("geom-123"));
