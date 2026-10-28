import { describe, it, expect } from "vitest";
import { priceJob, DEFAULT_PRICING_PROFILE, PricingProfile, WorkEstimate, sanitizeProfile } from "../pricing";
import { runClearingPro, ClearingProInput } from "../ClearingPro";
import golden from "./clearingpro.golden.json";

// A small, easy-to-check job: 10–20 machine hours, crew of 2, one add-on.
const work: WorkEstimate = {
  acreage: 2, vegetation: "light",
  hours: { min: 10, max: 20 }, crewSize: 2,
  addons: [{ label: "Light debris haul-off", low: 500, high: 1500 }],
};
const profile = (patch: Partial<PricingProfile>): PricingProfile => ({ ...DEFAULT_PRICING_PROFILE, ...patch });

describe("defaults reproduce the old hard-coded math", () => {
  it("matches the pre-refactor engine output for 162 input combinations", () => {
    // golden.json was generated from the engine BEFORE this PR ($150/hr machine, $50/hr labor).
    for (const g of golden as any[]) {
      const r = runClearingPro(g.input as ClearingProInput);
      expect(r.hours.adjusted).toEqual(g.hours);
      expect(r.cost.machine).toEqual(g.machine);
      expect(r.cost.labor).toEqual(g.labor);
      expect(r.cost.total).toEqual(g.total);
      expect(r.cost.perAcre).toEqual(g.perAcre);
    }
  });

  it("hourly default: 10 hrs × $150 + 10 hrs × 2 × $50 + add-on, rounded to $100", () => {
    const q = priceJob(work);
    expect(q.machine).toEqual({ min: 1500, max: 3000 });
    expect(q.labor).toEqual({ min: 1000, max: 2000 });
    expect(q.total).toEqual({ min: 3000, max: 6500 });
    expect(q.lineItems.map(l => l.kind)).toEqual(["clearing", "clearing", "addon"]);
  });
});

describe("each pricing mode", () => {
  it("hourly uses the contractor's own rates", () => {
    const q = priceJob(work, profile({ machineRatePerHr: 200, laborRatePerHr: 40 }));
    expect(q.total).toEqual({ min: Math.round((2000 + 800 + 500) / 100) * 100, max: Math.round((4000 + 1600 + 1500) / 100) * 100 });
  });

  it("per acre: acreage × rate for the vegetation", () => {
    const q = priceJob(work, profile({ mode: "per_acre", perAcreRate: { light: 3000, medium: 5000, heavy: 9000 } }));
    expect(q.lineItems[0].low).toBe(6000);
    expect(q.total).toEqual({ min: 6500, max: 7500 });
    expect(q.machine).toEqual({ min: 0, max: 0 });
  });

  it("daily: whole billed days × daily rate", () => {
    // 10 hrs / 8 = 1.25 → 2 days; 20 hrs / 8 = 2.5 → 3 days
    const q = priceJob(work, profile({ mode: "daily", dailyRate: 2000, productiveHoursPerDay: 8 }));
    expect(q.lineItems[0]).toMatchObject({ low: 4000, high: 6000 });
    expect(q.total).toEqual({ min: 4500, max: 7500 });
  });

  it("lump sum: fixed bid, add-ons treated as included", () => {
    const q = priceJob(work, profile({ mode: "lump_sum", lumpSum: 5000 }));
    expect(q.total).toEqual({ min: 5000, max: 5000 });
    expect(q.addonsIncluded).toBe(false);
    expect(q.lineItems.some(l => l.kind === "addon")).toBe(false);
  });
});

describe("fees", () => {
  it("mobilization adds a flat line item", () => {
    const q = priceJob(work, profile({ mobilizationFee: 750 }));
    expect(q.lineItems.find(l => l.kind === "mobilization")).toMatchObject({ low: 750, high: 750 });
    // low = 1500 + 1000 + 500 + 750 = 3750; high = 3000 + 2000 + 1500 + 750 = 7250
    expect(q.total).toEqual({ min: Math.round(3750 / 100) * 100, max: Math.round(7250 / 100) * 100 });
  });

  it("markup applies to everything above it", () => {
    const q = priceJob(work, profile({ markupPct: 10, mobilizationFee: 500 }));
    // subtotal low = 1500 + 1000 + 500 + 500 = 3500 → markup 350
    expect(q.lineItems.find(l => l.kind === "markup")).toMatchObject({ low: 350, high: 700 });
    expect(q.total).toEqual({ min: 3900, max: 7700 });
  });

  it("minimum charge fixes the 0.01 acre → $0 problem", () => {
    const tiny = runClearingPro({ acreage: 0.01, vegetation: "light", terrain: "flat", accessibility: "easy", water: "none", debris: "none", structures: "none", productionRate: "aggressive" });
    expect(tiny.cost.total.min).toBe(0);   // old behavior, still the default
    const withMin = runClearingPro(
      { acreage: 0.01, vegetation: "light", terrain: "flat", accessibility: "easy", water: "none", debris: "none", structures: "none", productionRate: "aggressive" },
      profile({ minimumCharge: 1500 }),
    );
    expect(withMin.cost.total).toEqual({ min: 1500, max: 1500 });
    expect(withMin.quote.lineItems.some(l => l.kind === "minimum")).toBe(true);
  });

  it("minimum does nothing when the job is already bigger", () => {
    const q = priceJob(work, profile({ minimumCharge: 1000 }));
    expect(q.total).toEqual({ min: 3000, max: 6500 });
    expect(q.minimumApplied).toEqual({ low: false, high: false });
  });
});

describe("days", () => {
  it("hours ÷ productive hours per day", () => {
    expect(priceJob(work).days).toEqual({ min: 1.3, max: 2.5 });
    expect(priceJob(work, profile({ productiveHoursPerDay: 10 })).days).toEqual({ min: 1, max: 2 });
  });
});

describe("monotonicity: a bigger job is never cheaper", () => {
  const modes: Partial<PricingProfile>[] = [
    {},
    { mode: "per_acre" },
    { mode: "daily" },
    { mode: "hourly", mobilizationFee: 800, minimumCharge: 2500, markupPct: 15 },
  ];
  for (const m of modes) {
    for (const vegetation of ["light", "medium", "heavy"] as const) {
      it(`${m.mode ?? "hourly"} ${JSON.stringify(m)} ${vegetation}`, () => {
        let prev = { min: -1, max: -1 };
        for (let acreage = 0.01; acreage <= 40; acreage = +(acreage * 1.17 + 0.01).toFixed(2)) {
          const r = runClearingPro(
            { acreage, vegetation, terrain: "flat", accessibility: "easy", water: "none", debris: "none", structures: "none", productionRate: "standard" },
            profile(m),
          );
          expect(r.cost.total.min).toBeGreaterThanOrEqual(prev.min);
          expect(r.cost.total.max).toBeGreaterThanOrEqual(prev.max);
          prev = r.cost.total;
        }
      });
    }
  }
});

describe("sanitizeProfile", () => {
  it("fills gaps and rejects negatives / garbage", () => {
    const p = sanitizeProfile({ mode: "bogus" as any, machineRatePerHr: -5, laborRatePerHr: NaN, productiveHoursPerDay: 0 });
    expect(p.mode).toBe("hourly");
    expect(p.machineRatePerHr).toBe(0);
    expect(p.laborRatePerHr).toBe(50);
    expect(p.productiveHoursPerDay).toBe(1);
  });
});
