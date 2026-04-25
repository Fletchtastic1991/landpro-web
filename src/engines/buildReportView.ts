/**
 * LandPro — buildReportView
 * src/engines/buildReportView.ts
 *
 * UI ADAPTER — the only file allowed to format engine output for display.
 * Takes raw LandProEngineOutput → returns display-ready ReportView.
 *
 * Rules:
 * - No business logic here — only formatting and null safety
 * - All dollar amounts formatted here, not in components
 * - All null/undefined defaults handled here, not in components
 * - JobReport.tsx reads ONLY from ReportView — never from engine directly
 */

import { LandProEngineOutput } from "./LandProEngine";
import { LandSelections } from "@/components/LandSelectors";

// ─── Display types ────────────────────────────────────────────────────────────

export interface CostRow {
  label: string;
  value: string;
  dim?:  boolean;
  bold?: boolean;
}

export interface ReportViewFence {
  available:        boolean;
  fenceTypeLabel:   string;
  isRealBoundary:   boolean;
  perimeterFt:      string;   // formatted: "685 ft"
  effectiveFenceFt: string;
  gateDeductionFt:  string | null;  // null if no gates
  cornerCount:      number;
  posts: {
    line:   number;
    corner: number;
    gate:   number;
    total:  number;
  };
  spacingFt:          number;
  materials: {
    concreteBags:     string;
    railLinearFt:     string | null;  // null if not applicable
    wireLinearFt:     string | null;
    fenceMaterialFt:  string;
    concretePerPost:  number;
    railsPerSpan:     number;
    wireStrands:      number;
  };
  labor: {
    basePostsPerDay:     number;
    terrainFactor:       number;
    adjustedPostsPerDay: number;
    daysRange:           string;      // "3–4 days"
    laborCostRange:      string;      // "$3,600 – $4,800"
    materialCost:        string;
    markupPct:           number;
  };
  costRange:   string;                // "$4,200 – $5,800"
  warnings:    string[];
}

export interface ReportViewClearing {
  available:      boolean;
  productionRate: string;
  hours: {
    base:     string;     // "3.8–7.6 hrs"
    adjusted: string;     // "4.7–9.5 hrs"
    factors:  string[];   // ["Terrain ×1.25", "Water ×1.15"]
  };
  crew: {
    size:       number;
    difficulty: string;
  };
  cost: {
    machineRange: string;
    laborRange:   string;
    addons: { label: string; range: string }[];
    totalRange:   string;
  };
  materials: {
    landscapedSqFt:  string;
    mulchCubicYards: string;
    assumedPct:      number;
  };
  equipment:  string[];
  confidence: {
    level:   "High" | "Medium" | "Low";
    reasons: string[];
    color:   string;   // hex for report styling
  };
}

export interface ReportView {
  hasData:   boolean;
  fence:     ReportViewFence | null;
  clearing:  ReportViewClearing | null;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const FENCE_TYPE_LABELS: Record<string, string> = {
  wood:       "Wood",
  chain_link: "Chain Link",
  farm:       "Farm / Agricultural",
};

const RATE_LABELS: Record<string, string> = {
  conservative: "Conservative",
  standard:     "Standard",
  aggressive:   "Aggressive",
};

const CONF_COLORS: Record<string, string> = {
  High:   "#4ade80",
  Medium: "#fbbf24",
  Low:    "#f87171",
};

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt$(n: number): string {
  return `$${n.toLocaleString()}`;
}

function fmtRange$(low: number, high: number): string {
  return `${fmt$(low)} – ${fmt$(high)}`;
}

function fmtFt(n: number): string {
  return `${n.toLocaleString()} ft`;
}

function fmtHrs(min: number, max: number): string {
  return `${min}–${max} hrs`;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildReportView(
  engine: LandProEngineOutput | null,
  selections: LandSelections
): ReportView {
  if (!engine) {
    return { hasData: false, fence: null, clearing: null };
  }

  const fenceType = (selections as any).fenceType ?? "farm";

  // ── Fence view ─────────────────────────────────────────────────────────

  let fence: ReportViewFence | null = null;

  if (engine.fence.status === "available") {
    const f  = engine.fence;
    const g  = f.geometry;
    const p  = f.posts;
    const m  = f.materials;
    const l  = f.labor;

    fence = {
      available:        true,
      fenceTypeLabel:   FENCE_TYPE_LABELS[fenceType] ?? fenceType,
      isRealBoundary:   g.isRealBoundary,
      perimeterFt:      fmtFt(g.perimeterFt),
      effectiveFenceFt: fmtFt(g.effectiveFenceFt),
      gateDeductionFt:  g.totalGateWidthFt > 0 ? fmtFt(g.totalGateWidthFt) : null,
      cornerCount:      g.cornerCount,
      posts: {
        line:   p.linePosts,
        corner: p.cornerPosts,
        gate:   p.gatePosts,
        total:  p.total,
      },
      spacingFt: p.spacingFt,
      materials: {
        concreteBags:    `${m.concreteBags} bags`,
        railLinearFt:    m.railLinearFt > 0    ? `${m.railLinearFt.toLocaleString()} linear ft` : null,
        wireLinearFt:    m.wireLinearFt > 0    ? `${m.wireLinearFt.toLocaleString()} linear ft` : null,
        fenceMaterialFt: fmtFt(m.fenceMaterialFt),
        concretePerPost: m.fenceTypeRules.concretePerPost,
        railsPerSpan:    m.fenceTypeRules.railsPerSpan,
        wireStrands:     m.fenceTypeRules.wireStrands,
      },
      labor: {
        basePostsPerDay:     l.basePostsPerDay,
        terrainFactor:       l.terrainFactor,
        adjustedPostsPerDay: l.adjustedPostsPerDay,
        daysRange:           `${l.daysLow}–${l.daysHigh} days`,
        laborCostRange:      fmtRange$(l.laborCostLow, l.laborCostHigh),
        materialCost:        fmt$(l.materialCostBase),
        markupPct:           l.rates.markupPct,
      },
      costRange: fmtRange$(f.cost.low, f.cost.high),
      warnings:  f.warnings,
    };
  }

  // ── Clearing view ──────────────────────────────────────────────────────

  let clearing: ReportViewClearing | null = null;

  if (engine.clearing.status === "available") {
    const c = engine.clearing;

    // Build factor strings — only show factors that actually applied
    const factors: string[] = [];
    if (c.hours.factors.terrain > 1) factors.push(`Terrain ×${c.hours.factors.terrain}`);
    if (c.hours.factors.access  > 1) factors.push(`Access ×${c.hours.factors.access}`);
    if (c.hours.factors.water   > 1) factors.push(`Water ×${c.hours.factors.water}`);

    clearing = {
      available:      true,
      productionRate: RATE_LABELS[selections.productionRate] ?? selections.productionRate,
      hours: {
        base:     fmtHrs(c.hours.base.min,     c.hours.base.max),
        adjusted: fmtHrs(c.hours.adjusted.min, c.hours.adjusted.max),
        factors,
      },
      crew: {
        size:       c.crew.size,
        difficulty: c.crew.difficulty,
      },
      cost: {
        machineRange: fmtRange$(c.cost.machine.min, c.cost.machine.max),
        laborRange:   fmtRange$(c.cost.labor.min,   c.cost.labor.max),
        addons: c.cost.addons.map(a => ({
          label: a.label,
          range: fmtRange$(a.low, a.high),
        })),
        totalRange: fmtRange$(c.cost.total.min, c.cost.total.max),
      },
      materials: {
        landscapedSqFt:  c.materials.landscapedSqFt.toLocaleString(),
        mulchCubicYards: `${c.materials.mulchCubicYards} cy`,
        assumedPct:      c.materials.assumedLandscapePct,
      },
      equipment: c.equipment,
      confidence: {
        level:   c.confidence.level,
        reasons: c.confidence.reasons,
        color:   CONF_COLORS[c.confidence.level] ?? "#9ca3af",
      },
    };
  }

  return {
    hasData:  fence !== null || clearing !== null,
    fence,
    clearing,
  };
}