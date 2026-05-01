import { SiteProResult } from "./SiteProEngine.js";

export interface ClearingResult {
  status: "AVAILABLE" | "BLOCKED";

  production: {
    hours: { min: number; max: number };
    crewSize: number;
  };

  cost: {
    totalMin: number;
    totalMax: number;
  };

  materials: {
    sqFt: number;
    mulchCubicYards: number;
  };

  equipment: string[];

  confidence: {
    level: "Low" | "Medium" | "High";
    reasons: string[];
  };
}

export function runClearingProEngine(
  acres: number,
  selections: any,
  site: SiteProResult
): ClearingResult {

  if (site.status === "BLOCKED") {
    return { status: "BLOCKED" } as ClearingResult;
  }

  // --- Base hours ---
  const baseHoursPerAcre = {
    light: { min: 8, max: 16 },
    medium: { min: 18, max: 36 },
    heavy: { min: 40, max: 80 }
  };

  const base = baseHoursPerAcre[selections.vegetation];

  const min = base.min * acres;
  const max = base.max * acres;

  // --- Crew ---
  const crew =
    selections.vegetation === "light" ? 2 :
    selections.vegetation === "medium" ? 3 : 5;

  // --- Cost ---
  const MACHINE = 150;
  const LABOR = 50;

  const totalMin = Math.round((min * MACHINE + min * crew * LABOR) / 100) * 100;
  const totalMax = Math.round((max * MACHINE + max * crew * LABOR) / 100) * 100;

  // --- Materials ---
  const sqFt = Math.round(acres * 43560 * 0.2);
  const mulch = Math.round(((sqFt * (3/12)) / 27) * 10) / 10;

  // --- Equipment ---
  const equipment =
    selections.vegetation === "light"
      ? ["Skid steer", "Brush cutter"]
      : ["Bulldozer", "Excavator"];

  // --- Confidence ---
  const reasons = ["Site visit required"];

  return {
    status: "AVAILABLE",

    production: {
      hours: { min, max },
      crewSize: crew
    },

    cost: {
      totalMin,
      totalMax
    },

    materials: {
      sqFt,
      mulchCubicYards: mulch
    },

    equipment,

    confidence: {
      level: "High",
      reasons
    }
  };
}