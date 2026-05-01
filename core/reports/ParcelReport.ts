import { generateBaseParcelReport } from "./BaseParcelReport.js";
import { generateLandClearingSection } from "./LandClearingSection.js";
import { generateSiteProSection } from "./SiteProSection.js";

export interface ParcelReport {
  parcelId: string;
  generatedAt: string;
  base: ReturnType<typeof generateBaseParcelReport>;
  sections: {
    sitePro: ReturnType<typeof generateSiteProSection>;
    landClearing: ReturnType<typeof generateLandClearingSection>;
  };
}

export function generateParcelReport(
  parcelId: string
): ParcelReport {
  const base = generateBaseParcelReport(parcelId);

  const sitePro = generateSiteProSection(base);
  const landClearing = generateLandClearingSection(base);

  return {
    parcelId,
    generatedAt: new Date().toISOString(),
    base,
    sections: {
      sitePro,
      landClearing
    }
  };
}
