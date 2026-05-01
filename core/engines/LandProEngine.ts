import { generateBaseParcelReport } from "../reports/BaseParcelReport.js";
import { runSiteProEngine } from "./SiteProEngine.js";
import { runClearingProEngine } from "./ClearingProEngine.js";
import { runLenses, buildLensProject, buildFenceInputs } from "@/lib/lenses/registry.js";

export function runLandProEngine(propertyData: any, selections: any) {
  const parcelId = "parcel-123";

  const base = generateBaseParcelReport(parcelId);

  const site = runSiteProEngine(base);

  const clearing = runClearingProEngine(
    propertyData.acreage,
    selections,
    site
  );

  const lensProject = buildLensProject(propertyData, selections);
  const fenceInputs = buildFenceInputs(selections);

  const lenses = runLenses(
    lensProject,
    { fencing: true },
    { fencing: fenceInputs }
  );

  return {
    base,
    site,
    clearing,
    lenses: {
      fence: lenses["fencing"]
    }
  };
}