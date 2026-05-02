/**
 * LandPro — buildReportView
 * src/engines/buildReportView
 *
 * UI ADAPTER — shapes raw engine output for display.
 * No logic here — only formatting, null safety, and label mapping.
 */

import { LandProEngineOutput } from "./LandProEngine";
import { LandSelections } from "@/components/LandSelectors";

// ─── Display types ────────────────────────────────────────────────────────────

export interface ReportViewCostDriver {
  label:  string;
  impact: string;
}

export interface ReportViewRealityAnchor {
  baselineRange:  string;
  baselineLabel:  string;
  exceedsBy:      string | null;
  exceedsReasons: string[];
}

export interface ReportViewRiskFactor {
  label:       string;
  consequence: string;
  severity:    "high" | "medium" | "low";
  color:       string;
  bgColor:     string;
  borderColor: string;
}

export interface ReportViewConfidence {
  level:   "Medium" | "Low";
  color:   string;
  breakdown: {
    geometry:       { level: string; note: string };
    siteConditions: { level: string; note: string };
    costModel:      { level: string; note: string };
  };
  disclaimer: string;
}

export interface ReportViewFence {
  available:        boolean;
  fenceTypeLabel:   string;
  isRealBoundary:   boolean;
  perimeterFt:      string;
  effectiveFenceFt: string;
  gateDeductionFt:  string | null;
  cornerCount:      number;
  posts: {
    line:   number;
    corner: number;
    gate:   number;
    total:  number;
  };
  spacingFt: number;
  materials: {
    concreteBags:    string;
    railLinearFt:    string | null;
    wireLinearFt:    string | null;
    fenceMaterialFt: string;
    concretePerPost: number;
    railsPerSpan:    number;
    wireStrands:     number;
  };
  labor: {
    basePostsPerDay:     number;
    terrainFactor:       number;
    adjustedPostsPerDay: number;
    daysRange:           string;
    laborCostRange:      string;
    materialCost:        string;
    markupPct:           number;
  };
  costRange: string;
  warnings:  string[];
}

export interface ReportViewClearing {
  available:      boolean;
  productionRate: string;

  hours: {
    base:     string;
    adjusted: string;
    factors:  string[];
  };

  crew: {
    size:          number;
    difficulty:    string;
    assumption:    string;
    justification: string;  // why this crew size
  };

  cost: {
    machineRange: string;
    laborRange:   string;
    addons:       { label: string; range: string }[];
    totalRange:   string;
    perAcreRange: string;
    perAcreNote:  string;
  };

  // Fix #1 — centralized cost drivers shown above total
  costDrivers: ReportViewCostDriver[];

  // Fix #4 — reality anchor
  realityAnchor: ReportViewRealityAnchor;

  equipment:  string[];
  riskFactors: ReportViewRiskFactor[];

  // Fix #3 — diagnosis-level flags
  nonLinearFlags: string[];

  confidence: ReportViewConfidence;
}

export interface ReportView {
  hasData:  boolean;
  fence:    ReportViewFence | null;
  clearing: ReportViewClearing | null;
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

// Severity → display colors (bg, text, border)
const SEVERITY_DISPLAY: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  high:   { color: "#f87171", bgColor: "#1f0a0a", borderColor: "#7f1d1d" },
  medium: { color: "#fcd34d", bgColor: "#1c1208", borderColor: "#854d0e" },
  low:    { color: "#60a5fa", bgColor: "#0c1929", borderColor: "#1e3a5f" },
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

  // ── Fence ──────────────────────────────────────────────────────────────────

  let fence: ReportViewFence | null = null;

  if (engine.fence?.status === "available") {
    const f = engine.fence;
    const g = f.geometry;
    const p = f.posts;
    const m = f.materials;
    const l = f.labor;

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
        railLinearFt:    m.railLinearFt > 0 ? `${m.railLinearFt.toLocaleString()} linear ft` : null,
        wireLinearFt:    m.wireLinearFt > 0 ? `${m.wireLinearFt.toLocaleString()} linear ft` : null,
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
      warnings:  f.warnings ?? [],
    };
  }

  // ── Clearing ───────────────────────────────────────────────────────────────

  let clearing: ReportViewClearing | null = null;

  if (engine.clearing?.status === "available") {
    const c = engine.clearing;

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
        size:          c.crew.size,
        difficulty:    c.crew.difficulty,
        assumption:    c.crew.assumption   ?? "",
        justification: c.crew.justification ?? "",
      },

      cost: {
        machineRange: fmtRange$(c.cost.machine.min, c.cost.machine.max),
        laborRange:   fmtRange$(c.cost.labor.min,   c.cost.labor.max),
        addons: (c.cost.addons ?? []).map(a => ({ label: a.label, range: fmtRange$(a.low, a.high) })),
        totalRange:   fmtRange$(c.cost.total.min,   c.cost.total.max),
        perAcreRange: fmtRange$(c.cost.perAcre?.min ?? 0, c.cost.perAcre?.max ?? 0),
        perAcreNote:  c.cost.perAcreNote ?? "",
      },

      // Fix #1 — cost drivers
      costDrivers: (c.costDrivers ?? []).map(d => ({
        label:  d.label,
        impact: d.impact,
      })),

      // Fix #4 — reality anchor
      realityAnchor: {
        baselineRange:  c.realityAnchor?.baselineRange  ?? "",
        baselineLabel:  c.realityAnchor?.baselineLabel  ?? "",
        exceedsBy:      c.realityAnchor?.exceedsBy      ?? null,
        exceedsReasons: c.realityAnchor?.exceedsReasons ?? [],
      },

      equipment: c.equipment ?? [],

      // Already sorted high → medium → low in engine
      riskFactors: (c.riskFactors ?? []).map(r => ({
        label:       r.label,
        consequence: r.consequence,
        severity:    r.severity,
        color:       SEVERITY_DISPLAY[r.severity]?.color       ?? "#9ca3af",
        bgColor:     SEVERITY_DISPLAY[r.severity]?.bgColor     ?? "#0d1f13",
        borderColor: SEVERITY_DISPLAY[r.severity]?.borderColor ?? "#1f3829",
      })),

      // Fix #3 — diagnosis flags
      nonLinearFlags: c.nonLinearFlags ?? [],

      confidence: {
        level:   c.confidence.level,
        color:   CONF_COLORS[c.confidence.level] ?? "#9ca3af",
        breakdown: {
          geometry:       c.confidence.breakdown.geometry,
          siteConditions: c.confidence.breakdown.siteConditions,
          costModel:      c.confidence.breakdown.costModel,
        },
        disclaimer: c.confidence.disclaimer,
      },
    };
  }

  return {
    hasData:  fence !== null || clearing !== null,
    fence,
    clearing,
  };
}