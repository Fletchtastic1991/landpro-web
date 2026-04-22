/// <reference types="@types/geojson" />

import { LensEngine, LensProject, LensResultMap, LensState, LensInputMap } from "./types";
import { runFenceLens }   from "./fencepro";

// ─── Registry ─────────────────────────────────────────────────────────────────
// Add new lenses here. Key = lens id.

const lensRegistry: Record<string, LensEngine<any>> = {
  fencing:  runFenceLens,
  // clearing: runClearingLens,   ← add later
  // grading:  runGradingLens,    ← add later
  // drainage: runDrainageLens,   ← add later
};

// ─── Execution Layer ─────────────────────────────────────────────────────────
// Runs only enabled lenses. Each lens is independent.

export function runLenses(
  project:   LensProject,
  lensState: LensState,
  inputs:    LensInputMap
): LensResultMap {
  const results: LensResultMap = {};

  Object.entries(lensState).forEach(([key, enabled]) => {
    if (enabled && lensRegistry[key]) {
      try {
        results[key] = lensRegistry[key](project, inputs[key]);
      } catch (err) {
        console.error(`[LensEngine] Error running lens "${key}":`, err);
        // Lens failure is isolated — other lenses still run
        results[key] = {
          id:      key,
          name:    key,
          enabled: true,
          summary: {},
          details: {},
          warnings: [`Lens "${key}" failed to execute. Check inputs.`],
        };
      }
    }
  });

  return results;
}

// ─── Helper: build LensProject from LandSelections + propertyData ────────────

import { LandSelections } from "../../components/LandSelectors";

export function buildLensProject(
  propertyData: { acreage: number | null; boundary?: GeoJSON.Polygon | null },
  selections:   LandSelections
): LensProject {
  return {
    acreage:       propertyData.acreage ?? 0,
    boundary:      propertyData.boundary ?? null,
    terrain:       selections.terrain,
    accessibility: selections.accessibility,
    water:         selections.water,
  };
}

// ─── Helper: build FencePro inputs from LandSelections ───────────────────────

import { FenceProInputs } from "./fencepro";

export function buildFenceInputs(selections: LandSelections): FenceProInputs {
  // Build gate array from count + width
  const gateCount   = selections.gateCount   ?? 0;
  const gateWidthFt = selections.gateWidthFt ?? 12;
  const gates       = Array.from({ length: gateCount }, () => ({ widthFt: gateWidthFt }));

  return {
    fenceType:  (selections as any).fenceType ?? "farm",
    spacingFt:  selections.fenceSpacingFt     ?? 8,
    gates,
  };
}
