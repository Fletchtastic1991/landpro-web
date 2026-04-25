import { generateBaseParcelReport } from "../reports/BaseParcelReport";
import { runSiteProEngine } from "./SiteProEngine";
import { runClearingProEngine } from "./ClearingProEngine";
import { runLenses, buildLensProject, buildFenceInputs } from "@/lib/lenses/registry";

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