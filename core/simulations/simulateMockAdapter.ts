import { MockElevationAdapter } from "../data/mocks/MockElevationAdapter";
import { MockLandCoverAdapter } from "../data/mocks/MockLandCoverAdapter";
import { MockStructureAdapter } from "../data/mocks/MockStructureAdapter";

console.log("ELEVATION:");
console.log(MockElevationAdapter.getSlopeStats("geom-123"));

console.log("LAND COVER:");
console.log(MockLandCoverAdapter.getLandCover("geom-123"));

console.log("STRUCTURES:");
console.log(MockStructureAdapter.getStructures("geom-123"));
