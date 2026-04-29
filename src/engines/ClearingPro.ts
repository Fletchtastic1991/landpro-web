/**
 * LandPro — ClearingPro Engine
 * src/engines/ClearingPro.ts
 *
 * CONFIDENCE RULE (matches SitePro philosophy):
 * Medium is the MAXIMUM for any field estimate.
 * High is never awarded — a field estimate from toggles
 * cannot be High confidence by definition.
 */

import { DEFAULT_PRICING_CONFIG } from "@/lib/pricingConfig.ts";

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
  label:       string;
  consequence: string;  // "what happens to YOUR job" — not just a fact
  severity:    "high" | "medium" | "low";
}

// Confidence breakdown — 3 independent dimensions
export interface ConfidenceBreakdown {
  geometry: { level: "High" | "Medium" | "Low"; note: string };
  siteConditions: { level: "High" | "Medium" | "Low"; note: string };
  costModel: { level: "High" | "Medium" | "Low"; note: string };
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
    size:           number;
    difficulty:     "Standard" | "Moderate" | "Challenging";
    // Visible assumption — contractor can sanity-check this
    assumption:     string;
  };

  cost: {
    machine:  { min: number; max: number };
    labor:    { min: number; max: number };
    addons:   ClearingAddon[];
    total:    { min: number; max: number };
    // Cost per acre equivalent — sanity anchor
    perAcre:  { min: number; max: number };
    perAcreNote: string;
  };

  equipment: string[];

  riskFactors: ClearingRiskFactor[];

  // Non-linear condition flags — honest guardrails when math breaks down
  nonLinearFlags: string[];

  confidence: {
    level:      "Medium" | "Low";  // High intentionally excluded
    breakdown:  ConfidenceBreakdown;
    disclaimer: string;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MACHINE_RATE = 150;
const LABOR_RATE   = 50;

const PROD_HOURS = {
  conservative: { light: [12, 20], medium: [28, 50], heavy: [60, 100] },
  standard:     { light: [8,  16], medium: [18, 36], heavy: [40, 80]  },
  aggressive:   { light: [5,  10], medium: [12, 24], heavy: [28, 55]  },
} as const;

// Crew size anchored to vegetation — visible assumption
const CREW_BY_VEGETATION = {
  light:  { size: 2, assumption: "2 operators — light brush, standard equipment" },
  medium: { size: 3, assumption: "3 operators — mixed stand, forestry mulcher + dozer" },
  heavy:  { size: 5, assumption: "5 operators — heavy clearing, full equipment spread" },
} as const;

// Hour multipliers from pricingConfig (single source of truth)
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
    return blockedResult("Acreage must be greater than zero");
  }

  // ── Hours ──────────────────────────────────────────────────────────────────

  const [baseMin, baseMax] = PROD_HOURS[input.productionRate][input.vegetation];
  const tFac = TERRAIN_HRS[input.terrain];
  const aFac = ACCESS_HRS[input.accessibility];
  const wFac = WATER_HRS[input.water];

  const adjMin = +((baseMin * input.acreage * tFac * aFac * wFac).toFixed(1));
  const adjMax = +((baseMax * input.acreage * tFac * aFac * wFac).toFixed(1));

  // ── Crew (anchored to vegetation, visible assumption) ─────────────────────

  const crewDef   = CREW_BY_VEGETATION[input.vegetation];
  const crewSize  = crewDef.size;
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

  const addons   = buildAddons(input);
  const addonMin = addons.reduce((s, a) => s + a.low,  0);
  const addonMax = addons.reduce((s, a) => s + a.high, 0);

  const totalMin = Math.round((machineMin + laborMin + addonMin) / 100) * 100;
  const totalMax = Math.round((machineMax + laborMax + addonMax) / 100) * 100;

  // Cost per acre — sanity anchor for the contractor
  const perAcreMin = Math.round(totalMin / input.acreage / 100) * 100;
  const perAcreMax = Math.round(totalMax / input.acreage / 100) * 100;
  const perAcreNote = buildPerAcreNote(input);

  // ── Non-linear condition flags ────────────────────────────────────────────
  // Math is linear. Reality isn't. Flag when they diverge.

  const nonLinearFlags = buildNonLinearFlags(input);

  // ── Risk factors (consequences, not observations) ─────────────────────────

  const riskFactors = buildRiskFactors(input);

  // ── Confidence breakdown ──────────────────────────────────────────────────

  const confidence = buildConfidence(input, riskFactors);

  return {
    status: "available",

    hours: {
      base:     { min: +(baseMin * input.acreage).toFixed(1), max: +(baseMax * input.acreage).toFixed(1) },
      adjusted: { min: adjMin, max: adjMax },
      factors:  { terrain: tFac, access: aFac, water: wFac },
    },

    crew: {
      size:       crewSize,
      difficulty,
      assumption: crewDef.assumption,
    },

    cost: {
      machine:     { min: machineMin, max: machineMax },
      labor:       { min: laborMin,   max: laborMax   },
      addons,
      total:       { min: totalMin,   max: totalMax   },
      perAcre:     { min: perAcreMin, max: perAcreMax },
      perAcreNote,
    },

    equipment:      buildEquipment(input),
    riskFactors,
    nonLinearFlags,
    confidence,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blockedResult(reason: string): ClearingProResult {
  return {
    status: "blocked", reasonIfBlocked: reason,
    hours: { base: { min: 0, max: 0 }, adjusted: { min: 0, max: 0 }, factors: { terrain: 1, access: 1, water: 1 } },
    crew: { size: 0, difficulty: "Standard", assumption: "" },
    cost: { machine: { min: 0, max: 0 }, labor: { min: 0, max: 0 }, addons: [], total: { min: 0, max: 0 }, perAcre: { min: 0, max: 0 }, perAcreNote: "" },
    equipment: [], riskFactors: [], nonLinearFlags: [],
    confidence: { level: "Low", breakdown: { geometry: { level: "Low", note: "No acreage defined" }, siteConditions: { level: "Low", note: "No conditions" }, costModel: { level: "Low", note: "No inputs" } }, disclaimer: "" },
  };
}

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

function buildPerAcreNote(input: ClearingProInput): string {
  // Small parcels always cost more per acre — explain this proactively
  if (input.acreage < 2) {
    return `Small parcels (${ input.acreage } ac) typically run higher per acre — mobilization and setup costs don't scale down.`;
  }
  if (input.acreage < 5) {
    return "Per-acre rate shown. Mobilization costs are spread across fewer acres on smaller jobs.";
  }
  return "Per-acre rate shown for comparison with contractor quotes.";
}

function buildNonLinearFlags(input: ClearingProInput): string[] {
  const flags: string[] = [];

  // Heavy vegetation + water: machines may get stuck, method may change entirely
  if (input.vegetation === "heavy" && input.water !== "none") {
    flags.push("Heavy vegetation near water: wet ground may cause machines to bog down — clearing method may need to change from mulching to cut-and-pile, which significantly increases time and cost beyond what this model shows.");
  }

  // Steep + heavy: not just slow — may require completely different approach
  if (input.terrain === "steep" && input.vegetation === "heavy") {
    flags.push("Steep terrain + heavy vegetation: tracked equipment required at minimum. If slope exceeds 30%, hand-felling before machine clearing may be necessary — this is not modeled in hour estimates.");
  }

  // Difficult access + heavy: mobilization alone can be a major cost
  if (input.accessibility === "difficult" && input.vegetation === "heavy") {
    flags.push("Remote site + heavy clearing: haul road construction before clearing may be required. This can cost as much as the clearing itself and is not included in estimates above.");
  }

  // Wetland: regulatory scope can dwarf clearing cost
  if (input.water === "wetland") {
    flags.push("Wetland present: permitting, mitigation, and compliance costs can exceed the clearing cost entirely. The estimates above do not include these — verify with a wetland consultant before budgeting.");
  }

  return flags;
}

function buildRiskFactors(input: ClearingProInput): ClearingRiskFactor[] {
  const r: ClearingRiskFactor[] = [];

  // Always present
  r.push({
    label:       "Hours are pre-site-visit",
    consequence: "Actual stump density, root depth, and ground conditions aren't visible from the map. A denser-than-reported stand or unexpected stumps can double machine hours without warning.",
    severity:    "medium",
  });
  r.push({
    label:       "Permitting not included",
    consequence: "County clearing, burning, and disposal permits vary widely. Some counties require a pre-clearing inspection. This is not reflected in cost or timeline.",
    severity:    "medium",
  });

  // Condition-specific consequences
  if (input.vegetation === "heavy") {
    r.push({
      label:       "Dense canopy hides ground hazards",
      consequence: "Stumps, debris piles, sinkholes, and old structures won't be visible until clearing begins. Budget for discovery delays — typically 10–20% additional machine time.",
      severity:    "high",
    });
    r.push({
      label:       "Timber may have resale value",
      consequence: "A timber cruise before clearing could recover $500–$5,000+ depending on species and diameter. This offsets clearing cost — skip it and you leave money on the ground.",
      severity:    "medium",
    });
  }

  if (input.terrain === "steep") {
    r.push({
      label:       "Slope increases rollover risk",
      consequence: "OSHA requires certified operators on slopes above 15%. Standard equipment operators may refuse steep terrain — specialist crews cost 20–40% more per hour.",
      severity:    "high",
    });
    r.push({
      label:       "Erosion control plan required",
      consequence: "Most counties require an approved E&S plan before ground disturbance on slopes. Without it, work can be stopped mid-project with fines. Plan preparation is not included in estimates.",
      severity:    "high",
    });
  }

  if (input.terrain === "slight_slope") {
    r.push({
      label:       "Drainage concentration at slope breaks",
      consequence: "Clearing removes vegetation that absorbs runoff. Silt fencing at natural drainage lines is needed to prevent offsite sediment — typical cost $200–$600 not included above.",
      severity:    "low",
    });
  }

  if (input.water === "wetland") {
    r.push({
      label:       "Federal permit may be required",
      consequence: "Army Corps Section 404 permit is required for wetland disturbance. Permit timeline is 60–120 days minimum. Work without a permit risks stop-work orders and $25k+ fines.",
      severity:    "high",
    });
  }

  if (input.water === "pond_or_creek") {
    r.push({
      label:       "Waterway setback may restrict clearing area",
      consequence: "Most counties require 25–100 ft vegetated buffers from waterways. You may not be able to clear the full acreage shown — verify boundary before quoting.",
      severity:    "high",
    });
    r.push({
      label:       "Soft ground near water limits machine access",
      consequence: "Heavy equipment near water edges can sink, requiring additional equipment or manual clearing. Adds cost and time not captured in per-acre rates.",
      severity:    "medium",
    });
  }

  if (input.accessibility === "difficult") {
    r.push({
      label:       "Haul road may be required before clearing starts",
      consequence: "Without equipment access, clearing can't begin. Haul road construction ($3k–$15k depending on length) must happen first — this is a separate line item from clearing.",
      severity:    "high",
    });
  }

  if (input.structures === "buildings_utilities") {
    r.push({
      label:       "Underground utilities must be located first",
      consequence: "Hitting a buried line stops the job instantly and creates liability. Call 811 before any ground disturbance. Unexpected utility work can add $2k–$10k+ to the project.",
      severity:    "high",
    });
  }

  if (input.debris === "heavy") {
    r.push({
      label:       "Hazardous material may require special disposal",
      consequence: "Tires, chemicals, or construction waste in the debris require licensed disposal — not standard landfill. Discovery on-site can add $1k–$5k+ and cause project delays.",
      severity:    "high",
    });
  }

  r.push({
    label:       "Hours exclude haul-off time",
    consequence: "Clearing hours above don't include loading and hauling removed material. Add 20–40% to total hours if debris is hauled off-site rather than chipped/mulched in place.",
    severity:    "medium",
  });

  return r;
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

function buildConfidence(
  input: ClearingProInput,
  riskFactors: ClearingRiskFactor[]
): ClearingProResult["confidence"] {

  const highRiskCount = riskFactors.filter(r => r.severity === "high").length;

  // Geometry dimension: how reliable is the area measurement?
  const geometry: ConfidenceBreakdown["geometry"] = {
    level: "High",  // acreage from drawn polygon is reliable
    note:  "Acreage derived from drawn boundary — geometry is the most reliable input",
  };

  // Site conditions dimension: user-reported, not verified
  const hasComplexConditions =
    input.vegetation === "heavy" || input.terrain === "steep" ||
    input.water !== "none" || input.accessibility === "difficult";

  const siteConditions: ConfidenceBreakdown["siteConditions"] = {
    level: hasComplexConditions ? "Low" : "Medium",
    note:  hasComplexConditions
      ? "User-reported conditions with high variability — on-site verification needed"
      : "User-reported conditions — moderate variability expected",
  };

  // Cost model dimension: linear math on non-linear reality
  const costModel: ConfidenceBreakdown["costModel"] = {
    level: highRiskCount >= 2 ? "Low" : "Medium",
    note:  highRiskCount >= 2
      ? "Multiple high-risk conditions present — cost model may underestimate significantly"
      : "Derived from hours × rates — reasonable for budgeting, not for final bid",
  };

  // Overall level: take the worst dimension
  const worst = [geometry.level, siteConditions.level, costModel.level];
  const level: "Medium" | "Low" = worst.includes("Low") ? "Low" : "Medium";

  const disclaimer = level === "Low"
    ? "Multiple high-severity conditions present. This estimate has wide uncertainty and should not be used for bidding. An on-site assessment is strongly recommended."
    : "Preliminary field estimate. Use for budgeting and initial conversations only — not for final bid submission. Conditions must be verified on-site.";

  return { level, breakdown: { geometry, siteConditions, costModel }, disclaimer };
}