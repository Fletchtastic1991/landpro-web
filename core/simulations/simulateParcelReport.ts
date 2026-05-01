import { generateParcelReport } from "../reports/ParcelReport.js";

const report = generateParcelReport("parcel-123");

console.log("FULL PARCEL REPORT:");
console.dir(report, { depth: null });
