import { generateParcelReport } from "../reports/ParcelReport";

console.log("SITEPRO BLOCKED CHECK:");
console.dir(generateParcelReport("parcel-123"), { depth: null });
