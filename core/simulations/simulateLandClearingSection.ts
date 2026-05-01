import { generateBaseParcelReport } from "../reports/BaseParcelReport.js";
import { generateLandClearingSection } from "../reports/LandClearingSection.js";

const base = generateBaseParcelReport("parcel-123");
const section = generateLandClearingSection(base);

console.log("LAND CLEARING SECTION:");
console.dir(section, { depth: null });
