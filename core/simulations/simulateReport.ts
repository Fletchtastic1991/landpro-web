import { generateLandClearingReport } from "../reports/LandClearingReport.js";

const report = generateLandClearingReport("parcel-123");

console.log("LAND CLEARING REPORT:");
console.dir(report, { depth: null });
