/**
 * LandPro — Pricing
 * src/engines/pricing.ts
 *
 * Turns a WORK ESTIMATE (how many hours, what crew, which add-ons) into a
 * PRICE using the contractor's own PricingProfile.
 *
 *   work estimate  →  priceJob(work, profile)  →  line items + low/high total
 *
 * Pure functions only: no React, no network, no randomness — easy to test.
 * With DEFAULT_PRICING_PROFILE the result is identical to the old hard-coded
 * math ($150/hr machine + $50/hr per crew member, no fees, no markup).
 */

export type PricingMode = "hourly" | "per_acre" | "daily" | "lump_sum";
export type Vegetation  = "light" | "medium" | "heavy";

export interface PricingProfile {
  mode:                  PricingMode;
  machineRatePerHr:      number;   // hourly mode: $ per machine hour
  laborRatePerHr:        number;   // hourly mode: $ per crew member per hour
  perAcreRate:           Record<Vegetation, number>; // per-acre mode: $ per acre by vegetation
  dailyRate:             number;   // daily mode: $ per work day (machine + crew)
  productiveHoursPerDay: number;   // used for the days estimate (and daily billing)
  lumpSum:               number;   // lump-sum mode: your all-in clearing price
  mobilizationFee:       number;   // flat $ to haul equipment in/out (0 = none)
  minimumCharge:         number;   // smallest total you'll accept (0 = none)
  markupPct:             number;   // % added on top of everything (overhead/profit)
}

export const DEFAULT_PRICING_PROFILE: PricingProfile = {
  mode:                  "hourly",
  machineRatePerHr:      150,
  laborRatePerHr:        50,
  // Example values only (not used unless you pick per-acre mode) — replace with your own.
  perAcreRate:           { light: 2000, medium: 4000, heavy: 6000 },
  dailyRate:             2400,     // example value — replace with your own
  productiveHoursPerDay: 8,
  lumpSum:               0,
  mobilizationFee:       0,
  minimumCharge:         0,
  markupPct:             0,
};

export const PRICING_MODE_LABELS: Record<PricingMode, string> = {
  hourly:   "Hourly (machine + labor)",
  per_acre: "Per acre",
  daily:    "Daily rate",
  lump_sum: "Lump sum (fixed bid)",
};

/** What the job takes, independent of how the contractor charges for it. */
export interface WorkEstimate {
  acreage:    number;
  vegetation: Vegetation;
  hours:      { min: number; max: number };   // machine hours (one machine)
  crewSize:   number;
  addons:     { label: string; low: number; high: number }[];
}

export interface LineItem {
  kind:   "clearing" | "mobilization" | "addon" | "markup" | "minimum";
  label:  string;
  detail: string;     // how it was calculated, e.g. "12.5–25 hrs × $150/hr"
  low:    number;
  high:   number;
}

export interface PriceQuote {
  mode:           PricingMode;
  lineItems:      LineItem[];
  machine:        { min: number; max: number };  // hourly mode only, else 0
  labor:          { min: number; max: number };  // hourly mode only, else 0
  total:          { min: number; max: number };  // rounded to nearest $100
  perAcre:        { min: number; max: number };
  days:           { min: number; max: number };  // hours ÷ productive hours/day, 1 decimal
  minimumApplied: { low: boolean; high: boolean };
  addonsIncluded: boolean;
  profile:        PricingProfile;   // the (cleaned-up) rates actually used
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const round100 = (n: number) => Math.round(n / 100) * 100;
const money    = (n: number) => `$${n.toLocaleString()}`;

function num(value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** Cleans up a profile (e.g. from localStorage or a form): fills gaps, no negatives. */
export function sanitizeProfile(p: Partial<PricingProfile> | null | undefined): PricingProfile {
  const d = DEFAULT_PRICING_PROFILE;
  const src = p ?? {};
  const mode = (Object.keys(PRICING_MODE_LABELS) as PricingMode[]).includes(src.mode as PricingMode)
    ? (src.mode as PricingMode) : d.mode;
  return {
    mode,
    machineRatePerHr:      num(src.machineRatePerHr, d.machineRatePerHr),
    laborRatePerHr:        num(src.laborRatePerHr,   d.laborRatePerHr),
    perAcreRate: {
      light:  num(src.perAcreRate?.light,  d.perAcreRate.light),
      medium: num(src.perAcreRate?.medium, d.perAcreRate.medium),
      heavy:  num(src.perAcreRate?.heavy,  d.perAcreRate.heavy),
    },
    dailyRate:             num(src.dailyRate, d.dailyRate),
    productiveHoursPerDay: num(src.productiveHoursPerDay, d.productiveHoursPerDay, 1, 24),
    lumpSum:               num(src.lumpSum, d.lumpSum),
    mobilizationFee:       num(src.mobilizationFee, d.mobilizationFee),
    minimumCharge:         num(src.minimumCharge, d.minimumCharge),
    markupPct:             num(src.markupPct, d.markupPct, 0, 1000),
  };
}

// ─── The pricing function ─────────────────────────────────────────────────────

export function priceJob(work: WorkEstimate, profileIn: PricingProfile = DEFAULT_PRICING_PROFILE): PriceQuote {
  const p = sanitizeProfile(profileIn);
  const { hours, crewSize, acreage } = work;
  const items: LineItem[] = [];
  let machine = { min: 0, max: 0 };
  let labor   = { min: 0, max: 0 };

  // 1. Clearing work — depends on the pricing mode
  if (p.mode === "hourly") {
    machine = { min: Math.round(hours.min * p.machineRatePerHr), max: Math.round(hours.max * p.machineRatePerHr) };
    labor   = { min: Math.round(hours.min * crewSize * p.laborRatePerHr), max: Math.round(hours.max * crewSize * p.laborRatePerHr) };
    items.push({ kind: "clearing", label: "Machine time", detail: `${hours.min}–${hours.max} hrs × ${money(p.machineRatePerHr)}/hr`, low: machine.min, high: machine.max });
    items.push({ kind: "clearing", label: "Crew labor",   detail: `${hours.min}–${hours.max} hrs × ${crewSize} crew × ${money(p.laborRatePerHr)}/hr`, low: labor.min, high: labor.max });
  } else if (p.mode === "per_acre") {
    const rate = p.perAcreRate[work.vegetation];
    const amount = Math.round(acreage * rate);
    items.push({ kind: "clearing", label: "Clearing (per acre)", detail: `${acreage} ac × ${money(rate)}/acre (${work.vegetation} vegetation)`, low: amount, high: amount });
  } else if (p.mode === "daily") {
    const daysLow  = Math.ceil(hours.min / p.productiveHoursPerDay);   // bill whole days
    const daysHigh = Math.ceil(hours.max / p.productiveHoursPerDay);
    items.push({ kind: "clearing", label: "Clearing (daily rate)", detail: `${daysLow}–${daysHigh} billed days × ${money(p.dailyRate)}/day`, low: daysLow * p.dailyRate, high: daysHigh * p.dailyRate });
  } else {
    items.push({ kind: "clearing", label: "Clearing (lump sum)", detail: "Your fixed bid for the clearing work", low: p.lumpSum, high: p.lumpSum });
  }

  // 2. Mobilization (only if the contractor set one)
  if (p.mobilizationFee > 0) {
    items.push({ kind: "mobilization", label: "Mobilization", detail: "Haul equipment in and out (flat fee)", low: p.mobilizationFee, high: p.mobilizationFee });
  }

  // 3. Site add-ons (debris, erosion control, ...). A lump sum is treated as all-in, so add-ons are skipped.
  const addonsIncluded = p.mode !== "lump_sum";
  if (addonsIncluded) {
    for (const a of work.addons) items.push({ kind: "addon", label: a.label, detail: "Site condition add-on", low: a.low, high: a.high });
  }

  // 4. Markup on everything above
  const sum = (key: "low" | "high") => items.reduce((s, i) => s + i[key], 0);
  if (p.markupPct > 0) {
    const low = Math.round(sum("low") * p.markupPct / 100);
    const high = Math.round(sum("high") * p.markupPct / 100);
    items.push({ kind: "markup", label: `Markup (${p.markupPct}%)`, detail: "Overhead and profit", low, high });
  }

  // 5. Round to nearest $100, then lift up to the minimum job charge if needed
  const roundedLow  = round100(sum("low"));
  const roundedHigh = round100(sum("high"));
  const totalMin = Math.max(roundedLow,  p.minimumCharge);
  const totalMax = Math.max(roundedHigh, p.minimumCharge);
  const minimumApplied = { low: totalMin > roundedLow, high: totalMax > roundedHigh };
  if (minimumApplied.low || minimumApplied.high) {
    items.push({
      kind: "minimum", label: "Minimum job charge adjustment",
      detail: `Brings the total up to your ${money(p.minimumCharge)} minimum`,
      low:  minimumApplied.low  ? Math.max(0, p.minimumCharge - sum("low"))  : 0,
      high: minimumApplied.high ? Math.max(0, p.minimumCharge - sum("high")) : 0,
    });
  }

  return {
    mode: p.mode,
    lineItems: items,
    machine,
    labor,
    total:   { min: totalMin, max: totalMax },
    perAcre: { min: round100(totalMin / acreage), max: round100(totalMax / acreage) },
    days:    { min: +(hours.min / p.productiveHoursPerDay).toFixed(1), max: +(hours.max / p.productiveHoursPerDay).toFixed(1) },
    minimumApplied,
    addonsIncluded,
    profile: p,
  };
}
