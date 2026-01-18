import { generateBaseParcelReport } from "../reports/BaseParcelReport";

const report = generateBaseParcelReport("parcel-123");

console.log("BASE PARCEL REPORT:");
console.dir(report, { depth: null });
