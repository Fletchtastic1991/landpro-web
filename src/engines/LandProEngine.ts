/**
 * LandPro — LandProEngine
 * src/engines/LandProEngine.ts
 *
 * ORCHESTRATOR ONLY — no logic, no formatting
 * Calls ClearingPro + FencePro and returns raw results.
 * UI never calls engines directly — only calls this.
 */

import { runClearingPro, ClearingProInput, ClearingProResult } from "./ClearingPro.js";
import { runFencePro, FenceProInput, FenceProResult, FenceType } from "./FencePro.js";
import { LandSelections } from "@/components/LandSelectors.js";

// ─── Input ────────────────────────────────────────────────────────────────────

export interface LandProEngineInput {
  acreage:    number;
  boundary?:  GeoJSON.Polygon | null;
  selections: LandSelections;
}

// ─── Output (raw — no formatting) ────────────────────────────────────────────

export interface LandProEngineOutput {
  clearing: ClearingProResult;
  fence:    FenceProResult;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function runLandProEngine(input: LandProEngineInput): LandProEngineOutput {
  const { acreage, boundary, selections } = input;

  // Build ClearingPro input from selections
  const clearingInput: ClearingProInput = {
    acreage,
    vegetation:     selections.vegetation,
    terrain:        selections.terrain,
    accessibility:  selections.accessibility,
    water:          selections.water,
    debris:         selections.debris,
    structures:     selections.structures,
    productionRate: selections.productionRate,
  };

  // Build FencePro input from selections
  const gateCount   = selections.gateCount   ?? 0;
  const gateWidthFt = selections.gateWidthFt ?? 12;
  const gates       = Array.from({ length: gateCount }, () => ({ widthFt: gateWidthFt }));

  const fenceInput: FenceProInput = {
    boundary,
    acreage,
    fenceType:     (selections.fenceType as FenceType) ?? "farm",
    spacingFt:     selections.fenceSpacingFt ?? 8,
    gates,
    terrain:       selections.terrain,
    accessibility: selections.accessibility,
    water:         selections.water,
  };

  return {
    clearing: runClearingPro(clearingInput),
    fence:    runFencePro(fenceInput),
  };
}