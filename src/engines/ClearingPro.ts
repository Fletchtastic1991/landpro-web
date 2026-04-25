/**
 * LandPro — ClearingPro Engine
 * src/engines/ClearingPro.ts
 *
 * PURE LOGIC — no UI, no formatting, no React
 *
 * CONFIDENCE RULE (matches SitePro philosophy):
 * - Medium is the MAXIMUM for any field estimate
 * - High is never awarded — a field estimate from 3 toggles
 *   cannot be High confidence by definition
 * - This is intentional, not a bug
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
  label: string;
  low:   number;
  high:  number;
}

export interface ClearingRiskFactor {
  label:    string;       // short label for display
  detail:   string;       // full explanation
  severity: "high" | "medium" | "low";
}

export interface ClearingProResult {
  status:           "available" | "blocked";
  reasonIfBlocked?: string;

  hours: {
    base:     { min: number; max: number };
    adjusted: { min: number; max: number };
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
    landscapedSqFt:       number;
    mulchCubicYards:      number;
    assumedLandscapePct:  number;
  };

  equipment: string[];

  // Confidence: Medium is the ceiling for a field estimate
  confidence: {
    level:   "Medium" | "Low";   // High is intentionally excluded
    reasons: string[];
    disclaimer: string;
  };

  // Dedicated risk factors — shown prominently in report
  riskFactors: ClearingRiskFactor[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MACHINE_RATE = 150; // $/hr
const LABOR_RATE   = 50;  // $/hr per operator

const PROD_HOURS = {
  conservative: { light: [12, 20], medium: [28, 50], heavy: [60, 100] },
  standard:     { light: [8,  16], medium: [18, 36], heavy: [40, 80]  },
  aggressive:   { light: [5,  10], medium: [12, 24], heavy: [28, 55]  },
} as const;

// Hour multipliers sourced from pricingConfig (single source of truth)
const TERRAIN_HRS: Record<ClearingProInput["terrain"], number> = {
  flat:         1.0,
  slight_slope: DEFAULT_PRICING_CONFIG.terrain.slight_slope,
  steep:        DEFAULT_PRICING_CONFIG.terrain.steep,
};

const ACCESS_HRS: Record<ClearingProInput["accessibility"], number> = {
  easy:      1.0,
  moderate:  DEFAULT_PRICING_CONFIG.accessibility.moderate,
  difficult: DEFAULT_PRICING_CONFIG.accessibility.difficult,
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
      status:          "blocked",
      reasonIfBlocked: "Acreage must be greater than zero",
      hours:      { base: { min: 0, max: 0 }, adjusted: { min: 0, max: 0 }, factors: { terrain: 1, access: 1, water: 1 } },
      crew:       { size: 0, difficulty: "Standard" },
      cost:       { machine: { min: 0, max: 0 }, labor: { min: 0, max: 0 }, addons: [], total: { min: 0, max: 0 } },
      materials:  { landscapedSqFt: 0, mulchCubicYards: 0, assumedLandscapePct: 20 },
      equipment:  [],
      confidence: { level: "Low", reasons: ["No acreage defined"], disclaimer: "Cannot estimate without acreage." },
      riskFactors: [],
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

  const crewSize: number  = input.vegetation === "light" ? 2 : input.vegetation === "medium" ? 3 : 5;
  const difficulty: "Standard" | "Moderate" | "Challenging" =
    input.vegetation === "heavy" || input.terrain === "steep" || input.accessibility === "difficult"
      ? "Challenging"
      : input.vegetation === "medium" || input.terrain === "slight_slope"
      ? "Moderate" : "Standard";

  // ── Cost ───────────────────────────────────────────────────────────────────

  const machineMin = Math.round(adjMin * MACHINE_RATE);
  const machineMax = Math.round(adjMax * MACHINE_RATE);
  const laborMin   = Math.round(adjMin * crewSize * LABOR_RATE);
  const laborMax   = Math.round(adjMax * crewSize * LABOR_RATE);

  const addons    = buildAddons(input);
  const addonMin  = addons.reduce((s, a) => s + a.low,  0);
  const addonMax  = addons.reduce((s, a) => s + a.high, 0);
  const totalMin  = Math.round((machineMin + laborMin + addonMin) / 100) * 100;
  const totalMax  = Math.round((machineMax + laborMax + addonMax) / 100) * 100;

  // ── Materials ──────────────────────────────────────────────────────────────

  const pct            = 20;
  const landscapedSqFt = Math.round(input.acreage * 43560 * (pct / 100));
  const mulchCuYds     = Math.round(((landscapedSqFt * (3 / 12)) / 27) * 10) / 10;

  // ── Risk factors (dedicated, prominent) ───────────────────────────────────

  const riskFactors = buildRiskFactors(input);

  // ── Confidence (Medium ceiling — intentional) ─────────────────────────────

  const confidence = buildConfidence(input, riskFactors);

  return {
    status: "available",
    hours: {
      base:     { min: +(baseMin * input.acreage).toFixed(1), max: +(baseMax * input.acreage).toFixed(1) },
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
      mulchCubicYards:     mulchCuYds,
      assumedLandscapePct: pct,
    },
    equipment:   buildEquipment(input),
    confidence,
    riskFactors,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAddons(input: ClearingProInput): ClearingAddon[] {
  const a: ClearingAddon[] = [];
  if (input.debris === "light")               a.push({ label: "Light debris haul-off",               low: 500,  high: 1500  });
  if (input.debris === "heavy")               a.push({ label: "Heavy debris haul-off",               low: 2000, high: 6000  });
  if (input.water === "pond_or_creek")        a.push({ label: "Erosion control / silt fencing",      low: 300,  high: 800   });
  if (input.water === "wetland")              a.push({ label: "Wetland erosion control + consultant", low: 1500, high: 5000  });
  if (input.accessibility === "difficult")    a.push({ label: "Equipment mobilization",              low: 1000, high: 3000  });
  if (input.structures === "fencing")         a.push({ label: "Remove existing fencing",             low: 300,  high: 1000  });
  if (input.structures === "buildings_utilities") a.push({ label: "Utility locate + demo",           low: 500,  high: 2500  });
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

function buildRiskFactors(input: ClearingProInput): ClearingRiskFactor[] {
  const r: ClearingRiskFactor[] = [];

  // Always-present risks (every field estimate)
  r.push({
    label:    "Hours estimate is pre-site-visit",
    detail:   "Machine hours are based on acreage and reported conditions only. Actual density, stump diameter, and ground conditions can vary significantly.",
    severity: "medium",
  });
  r.push({
    label:    "Permitting requirements unknown",
    detail:   "County clearing permits, burn regulations, and disposal requirements vary. Verify before mobilizing equipment.",
    severity: "medium",
  });

  // Condition-specific risks
  if (input.vegetation === "heavy") {
    r.push({ label: "Dense canopy conceals ground hazards", detail: "Stumps, debris piles, sinkholes, and unmarked features may not be visible until clearing begins. Budget for discovery time.", severity: "high" });
    r.push({ label: "Timber value assessment recommended", detail: "Merchantable timber present. A timber cruise before clearing may recover value that offsets clearing cost.", severity: "medium" });
  }
  if (input.terrain === "steep") {
    r.push({ label: "Steep slope — rollover risk", detail: "Slopes above 15% require track-mounted equipment and certified operators. OSHA regulations apply.", severity: "high" });
    r.push({ label: "Erosion control plan required", detail: "Most counties require an erosion control plan for land disturbance on slopes. This is not included in base estimate.", severity: "high" });
  }
  if (input.terrain === "slight_slope") {
    r.push({ label: "Monitor for erosion at drainage breaks", detail: "Slight slopes can concentrate runoff during and after clearing. Silt fencing at low points is recommended.", severity: "low" });
  }
  if (input.water === "wetland") {
    r.push({ label: "Wetland disturbance may require federal permit", detail: "Army Corps of Engineers Section 404 permit may be required. Clearing near wetland boundary could be restricted by law.", severity: "high" });
  }
  if (input.water === "pond_or_creek") {
    r.push({ label: "Sediment runoff into waterway", detail: "Erosion control and setback requirements apply near ponds and creeks. Check local buffer ordinances.", severity: "high" });
    r.push({ label: "Equipment access near water edge", detail: "Soft ground near water can limit machine access and increase per-hour cost.", severity: "medium" });
  }
  if (input.accessibility === "difficult") {
    r.push({ label: "Remote access — mobilization cost unpredictable", detail: "Haul road construction or temporary access work may be required before any clearing begins. Not included in base estimate.", severity: "high" });
  }
  if (input.structures === "buildings_utilities") {
    r.push({ label: "Call 811 before any ground disturbance", detail: "Underground utilities must be located before excavation. Damage to utilities creates liability and project delays.", severity: "high" });
  }
  if (input.debris === "heavy") {
    r.push({ label: "Hazardous material inspection recommended", detail: "Heavy debris sites may contain tires, chemicals, or construction waste requiring special disposal.", severity: "high" });
  }

  // Clearing hours disclaimer
  r.push({
    label:    "Hours exclude debris haul-off time",
    detail:   "Machine clearing hours shown do not include loading and hauling time for removed material. Add 20–40% for haul-off depending on disposal distance.",
    severity: "medium",
  });

  return r;
}

function buildConfidence(
  input: ClearingProInput,
  riskFactors: ClearingRiskFactor[]
): ClearingProResult["confidence"] {
  // RULE: Medium is the ceiling for any field estimate
  // We never award High — a preliminary estimate from 3 toggles
  // cannot be High confidence by definition (matches SitePro philosophy)

  const highSeverityCount = riskFactors.filter(r => r.severity === "high").length;

  const reasons: string[] = [];
  if (input.vegetation === "heavy")               reasons.push("Heavy vegetation — density varies significantly across parcel");
  if (input.terrain === "steep")                  reasons.push("Steep terrain — equipment efficiency hard to predict");
  if (input.accessibility === "difficult")        reasons.push("Difficult access — mobilization costs vary by site");
  if (input.water === "wetland")                  reasons.push("Wetland — regulatory scope unknown");
  if (input.water === "pond_or_creek")            reasons.push("Water present — erosion scope unknown");
  if (input.structures === "buildings_utilities") reasons.push("Utilities present — below-grade unknown");
  if (input.debris === "heavy")                   reasons.push("Heavy debris — disposal cost unpredictable");

  // Always add the fundamental disclaimer
  reasons.push("Field estimate only — site visit required to confirm");

  const level: "Medium" | "Low" = highSeverityCount >= 2 ? "Low" : "Medium";

  const disclaimer = level === "Low"
    ? "Multiple high-severity risk factors present. This estimate has wide uncertainty. On-site assessment strongly recommended before quoting."
    : "This is a preliminary field estimate. Actual costs depend on conditions found on-site. Use for budgeting only — not for final bid.";

  return { level, reasons, disclaimer };
}