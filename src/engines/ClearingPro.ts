/**
 * LandPro — ClearingPro Engine
 * src/engines/ClearingPro.ts
 *
 * PURE LOGIC — no UI, no formatting, no React
 * Input: field selections + acreage
 * Output: hours, costs, equipment, confidence
 *
 * Multipliers sourced from pricingConfig.ts (single source of truth)
 */

import { DEFAULT_PRICING_CONFIG } from "@/lib/pricingConfig";

// ─── Input ────────────────────────────────────────────────────────────────────

export interface ClearingProInput {
  acreage:        number;
  vegetation:     "light" | "medium" | "heavy";
  terrain:        "flat" | "slight_slope" | "steep";
  accessibility:  "easy" | "moderate" | "difficult";
  water:          "none" | "pond_or_creek" | "wetland";
  debris:         "none" | "light" | "heavy";
  structures:     "none" | "fencing" | "buildings_utilities";
  productionRate: "conservative" | "standard" | "aggressive";
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface ClearingAddon {
  label:  string;
  low:    number;
  high:   number;
}

export interface ClearingProResult {
  status:           "available" | "blocked";
  reasonIfBlocked?: string;

  hours: {
    base:     { min: number; max: number };  // before condition multipliers
    adjusted: { min: number; max: number };  // after all multipliers
    factors:  { terrain: number; access: number; water: number };
  };

  crew: {
    size:       number;
    difficulty: "Standard" | "Moderate" | "Challenging";
  };

  cost: {
    machine: { min: number; max: number };
    labor:   { min: number; max: number };
    addons:  ClearingAddon[];
    total:   { min: number; max: number };
  };

  materials: {
    landscapedSqFt:    number;
    mulchCubicYards:   number;
    assumedLandscapePct: number;
  };

  equipment: string[];

  confidence: {
    level:   "High" | "Medium" | "Low";
    reasons: string[];
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MACHINE_RATE_PER_HR = 150; // $/hr
const LABOR_RATE_PER_HR   = 50;  // $/hr per operator

// Production hours per acre by vegetation × production rate
const PROD_HOURS = {
  conservative: { light: [12, 20], medium: [28, 50], heavy: [60, 100] },
  standard:     { light: [8,  16], medium: [18, 36], heavy: [40, 80]  },
  aggressive:   { light: [5,  10], medium: [12, 24], heavy: [28, 55]  },
} as const;

// Condition multipliers on HOURS (not price) — sourced from pricingConfig
const TERRAIN_HRS: Record<ClearingProInput["terrain"], number> = {
  flat:         1.0,
  slight_slope: DEFAULT_PRICING_CONFIG.terrain.slight_slope,  // 1.25
  steep:        DEFAULT_PRICING_CONFIG.terrain.steep,         // 1.75
};

const ACCESS_HRS: Record<ClearingProInput["accessibility"], number> = {
  easy:      1.0,
  moderate:  DEFAULT_PRICING_CONFIG.accessibility.moderate,   // 1.25
  difficult: DEFAULT_PRICING_CONFIG.accessibility.difficult,  // 1.5
};

const WATER_HRS = {
  none:          1.0,
  pond_or_creek: 1.15,
  wetland:       1.30,
} as const;

// ─── Engine ───────────────────────────────────────────────────────────────────

export function runClearingPro(input: ClearingProInput): ClearingProResult {
  if (input.acreage <= 0) {
    return {
      status:           "blocked",
      reasonIfBlocked:  "Acreage must be greater than zero",
      hours:            { base: { min: 0, max: 0 }, adjusted: { min: 0, max: 0 }, factors: { terrain: 1, access: 1, water: 1 } },
      crew:             { size: 0, difficulty: "Standard" },
      cost:             { machine: { min: 0, max: 0 }, labor: { min: 0, max: 0 }, addons: [], total: { min: 0, max: 0 } },
      materials:        { landscapedSqFt: 0, mulchCubicYards: 0, assumedLandscapePct: 20 },
      equipment:        [],
      confidence:       { level: "Low", reasons: ["No acreage defined"] },
    };
  }

  // ── Hours ──────────────────────────────────────────────────────────────────

  const [baseMin, baseMax] = PROD_HOURS[input.productionRate][input.vegetation];
  const tFac = TERRAIN_HRS[input.terrain];
  const aFac = ACCESS_HRS[input.accessibility];
  const wFac = WATER_HRS[input.water];

  const adjMin = +((baseMin * input.acreage * tFac * aFac * wFac).toFixed(1));
  const adjMax = +((baseMax * input.acreage * tFac * aFac * wFac).toFixed(1));

  // ── Crew ───────────────────────────────────────────────────────────────────

  const crewSize  = input.vegetation === "light" ? 2 : input.vegetation === "medium" ? 3 : 5;
  const difficulty: "Standard" | "Moderate" | "Challenging" =
    input.vegetation === "heavy" || input.terrain === "steep" || input.accessibility === "difficult"
      ? "Challenging"
      : input.vegetation === "medium" || input.terrain === "slight_slope"
      ? "Moderate"
      : "Standard";

  // ── Cost ───────────────────────────────────────────────────────────────────

  const machineMin = Math.round(adjMin * MACHINE_RATE_PER_HR);
  const machineMax = Math.round(adjMax * MACHINE_RATE_PER_HR);
  const laborMin   = Math.round(adjMin * crewSize * LABOR_RATE_PER_HR);
  const laborMax   = Math.round(adjMax * crewSize * LABOR_RATE_PER_HR);

  const addons: ClearingAddon[] = buildAddons(input);
  const addonMin = addons.reduce((s, a) => s + a.low,  0);
  const addonMax = addons.reduce((s, a) => s + a.high, 0);

  const totalMin = Math.round((machineMin + laborMin + addonMin) / 100) * 100;
  const totalMax = Math.round((machineMax + laborMax + addonMax) / 100) * 100;

  // ── Materials ──────────────────────────────────────────────────────────────

  const pct            = 20;
  const landscapedSqFt = Math.round(input.acreage * 43560 * (pct / 100));
  const mulchCuYds     = Math.round(((landscapedSqFt * (3 / 12)) / 27) * 10) / 10;

  // ── Equipment ─────────────────────────────────────────────────────────────

  const equipment = buildEquipment(input);

  // ── Confidence ────────────────────────────────────────────────────────────

  const confidence = buildConfidence(input);

  return {
    status: "available",

    hours: {
      base:     { min: Math.round(baseMin * input.acreage * 10) / 10, max: Math.round(baseMax * input.acreage * 10) / 10 },
      adjusted: { min: adjMin, max: adjMax },
      factors:  { terrain: tFac, access: aFac, water: wFac },
    },

    crew: { size: crewSize, difficulty },

    cost: {
      machine: { min: machineMin, max: machineMax },
      labor:   { min: laborMin,   max: laborMax   },
      addons,
      total:   { min: totalMin,   max: totalMax   },
    },

    materials: {
      landscapedSqFt,
      mulchCubicYards: mulchCuYds,
      assumedLandscapePct: pct,
    },

    equipment,
    confidence,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAddons(input: ClearingProInput): ClearingAddon[] {
  const a: ClearingAddon[] = [];
  if (input.debris === "light")               a.push({ label: "Light debris haul-off",              low: 500,  high: 1500  });
  if (input.debris === "heavy")               a.push({ label: "Heavy debris haul-off",              low: 2000, high: 6000  });
  if (input.water === "pond_or_creek")        a.push({ label: "Erosion control / silt fencing",     low: 300,  high: 800   });
  if (input.water === "wetland")              a.push({ label: "Wetland erosion control + consultant", low: 1500, high: 5000  });
  if (input.accessibility === "difficult")    a.push({ label: "Equipment mobilization (remote site)", low: 1000, high: 3000  });
  if (input.structures === "fencing")         a.push({ label: "Remove existing fencing",            low: 300,  high: 1000  });
  if (input.structures === "buildings_utilities") a.push({ label: "Utility locate + demo",          low: 500,  high: 2500  });
  return a;
}

function buildEquipment(input: ClearingProInput): string[] {
  const eq: string[] = [];
  if (input.vegetation === "light")        eq.push("Skid steer with brush cutter", "Disc mower or rotary cutter");
  else if (input.vegetation === "medium")  eq.push("Forestry mulcher", "Skid steer with grapple", "Mid-size bulldozer (D4–D5)");
  else                                     eq.push("Heavy-duty bulldozer (D6/D7)", "Excavator with thumb (20–30 ton)", "Forestry mulcher or tub grinder", "Haul trucks for debris removal");
  if (input.terrain === "steep")           eq.push("Track-mounted equipment only", "Erosion control materials");
  if (input.accessibility === "difficult") eq.push("Low-ground-pressure equipment");
  if (input.water === "pond_or_creek")     eq.push("Silt fencing / sediment barriers");
  if (input.water === "wetland")           eq.push("Wetland-rated equipment", "Environmental consultant required");
  if (input.structures === "buildings_utilities") eq.push("Utility locate service (call 811 first)");
  if (input.debris === "heavy")            eq.push("Dumpsters / additional haul trucks");
  return eq;
}

function buildConfidence(input: ClearingProInput): ClearingProResult["confidence"] {
  const reasons: string[] = [];
  if (input.vegetation === "heavy")               reasons.push("Heavy vegetation — density varies significantly");
  if (input.terrain === "steep")                  reasons.push("Steep terrain — equipment efficiency unpredictable");
  if (input.accessibility === "difficult")        reasons.push("Difficult access — mobilization costs vary");
  if (input.water === "wetland")                  reasons.push("Wetland — regulatory and scope uncertainty");
  if (input.water === "pond_or_creek")            reasons.push("Water present — erosion control scope unknown");
  if (input.structures === "buildings_utilities") reasons.push("Utilities present — below-grade conditions unknown");
  if (input.debris === "heavy")                   reasons.push("Heavy debris — disposal cost varies by material");
  reasons.push("Site visit required to confirm all conditions");

  const level: "High" | "Medium" | "Low" =
    reasons.length <= 2 ? "High" :
    reasons.length <= 4 ? "Medium" : "Low";

  return { level, reasons };
}