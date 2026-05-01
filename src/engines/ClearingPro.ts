/**
 * LandPro — ClearingPro Engine
 * src/engines/ClearingPro.ts
 *
 * CONFIDENCE RULE: Medium is the ceiling. High is never awarded.
 * A field estimate from toggles cannot be High confidence by definition.
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
  consequence: string;
  severity:    "high" | "medium" | "low";
}

export interface ConfidenceBreakdown {
  geometry:       { level: "High" | "Medium" | "Low"; note: string };
  siteConditions: { level: "High" | "Medium" | "Low"; note: string };
  costModel:      { level: "High" | "Medium" | "Low"; note: string };
}

// Cost driver — explains WHY the estimate is what it is
export interface CostDriver {
  label:  string;   // short label: "Heavy vegetation"
  impact: string;   // what it does: "Requires D6/D7 dozer + forestry mulcher"
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
    assumption:     string;
    justification:  string;   // why this crew size — kills the "overkill" objection
  };

  cost: {
    machine:     { min: number; max: number };
    labor:       { min: number; max: number };
    addons:      ClearingAddon[];
    total:       { min: number; max: number };
    perAcre:     { min: number; max: number };
    perAcreNote: string;
  };

  // Centralized cost drivers — shown above total cost
  costDrivers: CostDriver[];

  // Reality anchor — grounds the estimate against a baseline
  realityAnchor: {
    baselineRange:  string;   // e.g. "$2,000–$6,000/acre"
    baselineLabel:  string;   // "Typical open, dry land clearing"
    exceedsBy:      string | null;  // "This site exceeds baseline due to..."
    exceedsReasons: string[];
  };

  equipment: string[];

  riskFactors: ClearingRiskFactor[];

  // Diagnosis-level flags — not warnings, explanations of WHY math breaks
  nonLinearFlags: string[];

  confidence: {
    level:      "Medium" | "Low";
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

// Crew anchored to vegetation — visible, justifiable
const CREW_BY_VEGETATION = {
  light:  {
    size:          2,
    assumption:    "2 operators — light brush, skid steer + mower",
    justification: "Light vegetation can be handled by 2 operators efficiently. Additional crew adds cost without proportional time savings at this density.",
  },
  medium: {
    size:          3,
    assumption:    "3 operators — mixed stand, mulcher + dozer + support",
    justification: "Mixed stands require simultaneous mulching and material management. A 3-operator spread keeps machines moving without bottlenecks.",
  },
  heavy:  {
    size:          5,
    assumption:    "5 operators — heavy clearing, full equipment spread",
    justification: "Heavy clearing requires concurrent felling, mulching, debris management, and equipment support. Fewer operators would cause machine idle time and significantly extend project duration, raising total cost.",
  },
} as const;

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

// Baseline for reality anchor
const BASELINE = {
  label: "Typical open, dry land clearing (light vegetation, flat, easy access)",
  perAcreMin: 2000,
  perAcreMax: 6000,
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export function runClearingPro(input: ClearingProInput): ClearingProResult {
  if (input.acreage <= 0) {
    return blockedResult("Acreage must be greater than zero");
  }

  const [baseMin, baseMax] = PROD_HOURS[input.productionRate][input.vegetation];
  const tFac = TERRAIN_HRS[input.terrain];
  const aFac = ACCESS_HRS[input.accessibility];
  const wFac = WATER_HRS[input.water];

  // Count how many multipliers are stacked — degrades confidence
  const stackedMultipliers =
    (tFac > 1 ? 1 : 0) +
    (aFac > 1 ? 1 : 0) +
    (wFac > 1 ? 1 : 0);

  const adjMin = +((baseMin * input.acreage * tFac * aFac * wFac).toFixed(1));
  const adjMax = +((baseMax * input.acreage * tFac * aFac * wFac).toFixed(1));

  const crewDef  = CREW_BY_VEGETATION[input.vegetation];
  const crewSize = crewDef.size;
  const difficulty: "Standard" | "Moderate" | "Challenging" =
    input.vegetation === "heavy" || input.terrain === "steep" || input.accessibility === "difficult"
      ? "Challenging"
      : input.vegetation === "medium" || input.terrain === "slight_slope"
      ? "Moderate" : "Standard";

  const machineMin = Math.round(adjMin * MACHINE_RATE);
  const machineMax = Math.round(adjMax * MACHINE_RATE);
  const laborMin   = Math.round(adjMin * crewSize * LABOR_RATE);
  const laborMax   = Math.round(adjMax * crewSize * LABOR_RATE);

  const addons   = buildAddons(input);
  const addonMin = addons.reduce((s, a) => s + a.low,  0);
  const addonMax = addons.reduce((s, a) => s + a.high, 0);

  const totalMin = Math.round((machineMin + laborMin + addonMin) / 100) * 100;
  const totalMax = Math.round((machineMax + laborMax + addonMax) / 100) * 100;

  const perAcreMin = Math.round(totalMin / input.acreage / 100) * 100;
  const perAcreMax = Math.round(totalMax / input.acreage / 100) * 100;

  const costDrivers    = buildCostDrivers(input, stackedMultipliers);
  const realityAnchor  = buildRealityAnchor(input, perAcreMin, perAcreMax);
  const nonLinearFlags = buildNonLinearFlags(input);
  const riskFactors    = buildRiskFactors(input);
  const confidence     = buildConfidence(input, riskFactors, stackedMultipliers);

  return {
    status: "available",
    hours: {
      base:     { min: +(baseMin * input.acreage).toFixed(1), max: +(baseMax * input.acreage).toFixed(1) },
      adjusted: { min: adjMin, max: adjMax },
      factors:  { terrain: tFac, access: aFac, water: wFac },
    },
    crew: {
      size:          crewSize,
      difficulty,
      assumption:    crewDef.assumption,
      justification: crewDef.justification,
    },
    cost: {
      machine:     { min: machineMin, max: machineMax },
      labor:       { min: laborMin,   max: laborMax   },
      addons,
      total:       { min: totalMin,   max: totalMax   },
      perAcre:     { min: perAcreMin, max: perAcreMax },
      perAcreNote: buildPerAcreNote(input),
    },
    costDrivers,
    realityAnchor,
    equipment:      buildEquipment(input),
    riskFactors,
    nonLinearFlags,
    confidence,
  };
}

// ─── Cost drivers ─────────────────────────────────────────────────────────────

function buildCostDrivers(input: ClearingProInput, stackedMultipliers: number): CostDriver[] {
  const drivers: CostDriver[] = [];

  if (input.vegetation === "heavy") {
    drivers.push({ label: "Heavy vegetation", impact: "Requires D6/D7 dozer + forestry mulcher — heaviest equipment class, highest hourly rate" });
  } else if (input.vegetation === "medium") {
    drivers.push({ label: "Medium vegetation", impact: "Mixed stand requires forestry mulcher and material management simultaneously" });
  }

  if (input.acreage < 2) {
    drivers.push({ label: `Small parcel (${input.acreage} ac)`, impact: "Mobilization, setup, and teardown costs don't scale down — fixed costs dominate small jobs" });
  }

  if (input.terrain === "steep") {
    drivers.push({ label: "Steep terrain", impact: "Track equipment required, slower production rate, specialized operators" });
  } else if (input.terrain === "slight_slope") {
    drivers.push({ label: "Sloped terrain", impact: "Reduced equipment efficiency — terrain factor applied to all hours" });
  }

  if (input.water === "wetland") {
    drivers.push({ label: "Wetland area", impact: "Wetland-rated equipment required, consultant likely needed, regulatory compliance adds scope" });
  } else if (input.water === "pond_or_creek") {
    drivers.push({ label: "Water present", impact: "Soft ground near water, erosion controls required, may restrict equipment access zones" });
  }

  if (input.accessibility === "difficult") {
    drivers.push({ label: "Difficult access", impact: "Mobilization add-on applied — remote haul road or specialized transport likely needed" });
  }

  if (input.debris === "heavy") {
    drivers.push({ label: "Heavy debris", impact: "Haul-off add-on applied — licensed disposal required for heavy material" });
  }

  if (stackedMultipliers >= 2) {
    drivers.push({ label: "Multiple compounding conditions", impact: `${stackedMultipliers} condition multipliers stacked — effects interact non-linearly in the field` });
  }

  return drivers;
}

// ─── Reality anchor ───────────────────────────────────────────────────────────

function buildRealityAnchor(
  input: ClearingProInput,
  perAcreMin: number,
  perAcreMax: number
): ClearingProResult["realityAnchor"] {
  const exceedsReasons: string[] = [];
  const isAboveBaseline = perAcreMin > BASELINE.perAcreMax;

  if (isAboveBaseline) {
    if (input.vegetation === "heavy")             exceedsReasons.push("heavy vegetation (vs. open land)");
    if (input.terrain !== "flat")                 exceedsReasons.push("sloped terrain");
    if (input.water !== "none")                   exceedsReasons.push("water presence");
    if (input.accessibility !== "easy")           exceedsReasons.push("access difficulty");
    if (input.acreage < 2)                        exceedsReasons.push("small parcel size");
    if (input.debris !== "none")                  exceedsReasons.push("debris disposal");
  }

  return {
    baselineRange:  `$${BASELINE.perAcreMin.toLocaleString()}–$${BASELINE.perAcreMax.toLocaleString()}/acre`,
    baselineLabel:  BASELINE.label,
    exceedsBy:      isAboveBaseline
      ? `This site runs $${perAcreMin.toLocaleString()}–$${perAcreMax.toLocaleString()}/acre`
      : null,
    exceedsReasons,
  };
}

// ─── Non-linear diagnosis flags ───────────────────────────────────────────────

function buildNonLinearFlags(input: ClearingProInput): string[] {
  const flags: string[] = [];

  if (input.vegetation === "heavy" && input.water !== "none") {
    flags.push(
      "DIAGNOSIS — Heavy vegetation + water: Linear math underestimates this job. Wet ground under dense canopy causes machines to bog down. The clearing method itself may need to change from mulch-in-place to cut-and-pile — a fundamentally different operation. Expect actual hours to exceed the model by 20–50%."
    );
  }

  if (input.terrain === "steep" && input.vegetation === "heavy") {
    flags.push(
      "DIAGNOSIS — Steep terrain + heavy vegetation: This combination can require hand-felling before machine clearing begins. That's a separate labor crew, separate scheduling, and separate cost not captured in any per-acre model. If slope exceeds 30%, treat this estimate as a floor, not a range."
    );
  }

  if (input.accessibility === "difficult" && input.vegetation === "heavy") {
    flags.push(
      "DIAGNOSIS — Remote site + heavy clearing: Haul road construction may need to happen before clearing starts — potentially as a separate mobilization event. This can cost as much as the clearing itself. The estimates above begin at the property line, not the nearest road."
    );
  }

  if (input.water === "wetland") {
    flags.push(
      "DIAGNOSIS — Wetland on parcel: Permitting, mitigation banking, and compliance costs exist independently of clearing cost and can exceed it. The clearing estimate is only one part of the total project cost on a wetland site."
    );
  }

  return flags;
}

// ─── Risk factors ─────────────────────────────────────────────────────────────

function buildRiskFactors(input: ClearingProInput): ClearingRiskFactor[] {
  const r: ClearingRiskFactor[] = [];

  r.push({
    label:       "Hours are pre-site-visit",
    consequence: "Actual stump density, root depth, and ground conditions aren't visible from the map. A denser-than-reported stand or unexpected stumps can double machine hours without warning.",
    severity:    "medium",
  });
  r.push({
    label:       "Permitting not included",
    consequence: "County clearing, burning, and disposal permits vary widely. Some require pre-clearing inspection. Not reflected in cost or timeline.",
    severity:    "medium",
  });

  if (input.vegetation === "heavy") {
    r.push({ label: "Dense canopy hides ground hazards",   consequence: "Stumps, debris piles, sinkholes, old structures won't be visible until clearing begins. Budget 10–20% additional machine time for discovery.", severity: "high" });
    r.push({ label: "Timber may have resale value",        consequence: "A timber cruise before clearing could recover $500–$5,000+ depending on species. Skip it and you leave money on the ground.", severity: "medium" });
  }
  if (input.terrain === "steep") {
    r.push({ label: "Slope increases rollover risk",       consequence: "OSHA requires certified operators on slopes above 15%. Specialist crews cost 20–40% more per hour.", severity: "high" });
    r.push({ label: "Erosion control plan required",       consequence: "Most counties require an approved E&S plan before ground disturbance on slopes. Without it, work can be stopped mid-project with fines.", severity: "high" });
  }
  if (input.terrain === "slight_slope") {
    r.push({ label: "Drainage concentration at slope breaks", consequence: "Clearing removes vegetation that absorbs runoff. Silt fencing at natural drainage lines recommended — typical cost $200–$600 not included above.", severity: "low" });
  }
  if (input.water === "wetland") {
    r.push({ label: "Federal permit likely required",      consequence: "Army Corps Section 404 permit required for wetland disturbance. Permit timeline 60–120 days minimum. Work without it risks stop-work orders and $25k+ fines.", severity: "high" });
  }
  if (input.water === "pond_or_creek") {
    r.push({ label: "Waterway setback may restrict area",  consequence: "Most counties require 25–100 ft vegetated buffers from waterways. You may not be able to clear the full acreage shown — verify before quoting.", severity: "high" });
    r.push({ label: "Soft ground limits machine access",   consequence: "Heavy equipment near water edges can sink, requiring additional equipment or manual clearing. Adds cost not captured in per-acre rates.", severity: "medium" });
  }
  if (input.accessibility === "difficult") {
    r.push({ label: "Haul road may be needed first",       consequence: "Without equipment access, clearing can't begin. Road construction ($3k–$15k depending on length) must happen first — separate from clearing cost.", severity: "high" });
  }
  if (input.structures === "buildings_utilities") {
    r.push({ label: "Underground utilities — call 811",    consequence: "Hitting a buried line stops the job instantly and creates liability. Unexpected utility work can add $2k–$10k+ to the project.", severity: "high" });
  }
  if (input.debris === "heavy") {
    r.push({ label: "Hazardous material possible",         consequence: "Tires, chemicals, or construction waste require licensed disposal — not standard landfill. Discovery on-site adds $1k–$5k+ and causes delays.", severity: "high" });
  }
  r.push({
    label:       "Hours exclude haul-off time",
    consequence: "Clearing hours above don't include loading and hauling. Add 20–40% to total hours if debris is hauled off-site rather than chipped in place.",
    severity:    "medium",
  });

  // Sort: high → medium → low
  const rank: Record<string, number> = { high: 3, medium: 2, low: 1 };
  return r.sort((a, b) => rank[b.severity] - rank[a.severity]);
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

function buildPerAcreNote(input: ClearingProInput): string {
  if (input.acreage < 2) return `Small parcel (${input.acreage} ac) — mobilization and setup costs don't scale down, raising per-acre rate.`;
  if (input.acreage < 5) return "Per-acre rate shown — fixed costs spread across fewer acres on smaller jobs.";
  return "Per-acre rate shown for comparison with contractor quotes.";
}

function buildConfidence(
  input: ClearingProInput,
  riskFactors: ClearingRiskFactor[],
  stackedMultipliers: number
): ClearingProResult["confidence"] {
  const highRiskCount = riskFactors.filter(r => r.severity === "high").length;

  const geometry: ConfidenceBreakdown["geometry"] = {
    level: "High",
    note:  "Acreage from drawn boundary — geometry is the most reliable input. Note: drawn boundary may differ from actual clearing area due to setbacks or site constraints.",
  };

  const hasComplexConditions =
    input.vegetation === "heavy" || input.terrain === "steep" ||
    input.water !== "none" || input.accessibility === "difficult";

  const siteConditions: ConfidenceBreakdown["siteConditions"] = {
    level: hasComplexConditions ? "Low" : "Medium",
    note:  hasComplexConditions
      ? "User-reported conditions with high variability — on-site verification required"
      : "User-reported conditions — moderate variability expected",
  };

  // Degrade cost model confidence if multipliers are stacking
  const costModelLevel: "Medium" | "Low" =
    highRiskCount >= 2 || stackedMultipliers >= 2 ? "Low" : "Medium";

  const costModel: ConfidenceBreakdown["costModel"] = {
    level: costModelLevel,
    note:  stackedMultipliers >= 2
      ? `${stackedMultipliers} condition multipliers stacked — compounding effects exceed what linear math captures`
      : highRiskCount >= 2
      ? "Multiple high-risk conditions — cost model may underestimate significantly"
      : "Hours × rates model — reasonable for budgeting, not for final bid",
  };

  const worst = [geometry.level, siteConditions.level, costModel.level];
  const level: "Medium" | "Low" = worst.includes("Low") ? "Low" : "Medium";

  const disclaimer = level === "Low"
    ? "Multiple high-severity conditions present. This estimate has wide uncertainty and should not be used for bidding. An on-site assessment is strongly recommended before quoting."
    : "Preliminary field estimate. Use for budgeting and initial conversations — not for final bid submission. Conditions must be verified on-site.";

  return { level, breakdown: { geometry, siteConditions, costModel }, disclaimer };
}

function blockedResult(reason: string): ClearingProResult {
  const emptyBreakdown: ConfidenceBreakdown = {
    geometry:       { level: "Low", note: "" },
    siteConditions: { level: "Low", note: "" },
    costModel:      { level: "Low", note: "" },
  };
  return {
    status: "blocked", reasonIfBlocked: reason,
    hours:         { base: { min: 0, max: 0 }, adjusted: { min: 0, max: 0 }, factors: { terrain: 1, access: 1, water: 1 } },
    crew:          { size: 0, difficulty: "Standard", assumption: "", justification: "" },
    cost:          { machine: { min: 0, max: 0 }, labor: { min: 0, max: 0 }, addons: [], total: { min: 0, max: 0 }, perAcre: { min: 0, max: 0 }, perAcreNote: "" },
    costDrivers:   [],
    realityAnchor: { baselineRange: "", baselineLabel: "", exceedsBy: null, exceedsReasons: [] },
    equipment:     [], riskFactors: [], nonLinearFlags: [],
    confidence:    { level: "Low", breakdown: emptyBreakdown, disclaimer: "" },
  };
}