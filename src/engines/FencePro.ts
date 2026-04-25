/**
 * LandPro — FencePro Engine
 * src/engines/FencePro.ts
 *
 * PURE LOGIC — no UI, no formatting, no React
 * Layer 1: Geometry  — real perimeter, gate deduction, corner detection
 * Layer 2: Structure — fence type rules
 * Layer 3: Materials — posts, concrete, rails, wire
 * Layer 4: Labor     — posts/day × terrain factor → days → cost
 */

import { DEFAULT_PRICING_CONFIG } from "@/lib/pricingConfig";

// ─── Input ────────────────────────────────────────────────────────────────────

export type FenceType = "wood" | "chain_link" | "farm";

export interface FenceGate {
  widthFt: number;
}

export interface FenceProInput {
  boundary?:     GeoJSON.Polygon | null;
  acreage:       number;
  fenceType:     FenceType;
  spacingFt:     number;
  gates:         FenceGate[];
  terrain:       "flat" | "slight_slope" | "steep";
  accessibility: "easy" | "moderate" | "difficult";
  water:         "none" | "pond_or_creek" | "wetland";
  // Overridable rates (Contractor Mode later)
  crewSize?:           number;
  dailyRateUSD?:       number;
  postCostUSD?:        number;
  concreteBagCostUSD?: number;
  markupPct?:          number;
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface FenceProResult {
  status:           "available" | "blocked";
  reasonIfBlocked?: string;

  geometry: {
    perimeterFt:      number;
    isRealBoundary:   boolean;
    totalGateWidthFt: number;
    effectiveFenceFt: number;
    cornerCount:      number;
  };

  posts: {
    linePosts:   number;
    cornerPosts: number;
    gatePosts:   number;
    total:       number;
    spacingFt:   number;
  };

  materials: {
    concreteBags:     number;
    railLinearFt:     number;
    wireLinearFt:     number;
    fenceMaterialFt:  number;
    fenceTypeRules:   FenceTypeRules;
  };

  labor: {
    basePostsPerDay:     number;
    terrainFactor:       number;
    adjustedPostsPerDay: number;
    daysLow:             number;
    daysHigh:            number;
    laborCostLow:        number;
    laborCostHigh:       number;
    materialCostBase:    number;
    rates: {
      crewSize:           number;
      dailyRateUSD:       number;
      postCostUSD:        number;
      concreteBagCostUSD: number;
      markupPct:          number;
    };
  };

  cost: {
    low:  number;
    high: number;
  };

  warnings: string[];
}

// ─── Fence type rules ─────────────────────────────────────────────────────────

export interface FenceTypeRules {
  defaultSpacingFt:  number;
  railsPerSpan:      number;
  concretePerPost:   number;
  postsPerDay:       number;
  wireStrands:       number;
  description:       string;
}

const STRUCTURE_RULES: Record<FenceType, FenceTypeRules> = {
  wood: {
    defaultSpacingFt: 6,
    railsPerSpan:     3,
    concretePerPost:  2,
    postsPerDay:      80,
    wireStrands:      0,
    description:      "Wood fence. 6 ft spacing, 3 rails per span.",
  },
  chain_link: {
    defaultSpacingFt: 10,
    railsPerSpan:     0,
    concretePerPost:  1.5,
    postsPerDay:      100,
    wireStrands:      0,
    description:      "Chain-link fence. 10 ft spacing, no rails.",
  },
  farm: {
    defaultSpacingFt: 12,
    railsPerSpan:     0,
    concretePerPost:  1,
    postsPerDay:      120,
    wireStrands:      4,
    description:      "Farm/agricultural fence. 12 ft spacing, 4 wire strands.",
  },
};

const DEFAULT_RATES = {
  crewSize:           3,
  dailyRateUSD:       1200,
  postCostUSD:        8,
  concreteBagCostUSD: 7,
  markupPct:          20,
};

// Terrain factor on posts/day — from pricingConfig
const TERRAIN_PROD: Record<FenceProInput["terrain"], number> = {
  flat:         1.0,
  slight_slope: 1 / DEFAULT_PRICING_CONFIG.terrain.slight_slope, // inverse: harder terrain = fewer posts/day
  steep:        1 / DEFAULT_PRICING_CONFIG.terrain.steep,
};

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function haversineM([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180, Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getEdgeLengthsFt(polygon: GeoJSON.Polygon): number[] {
  const coords = polygon.coordinates[0] as [number, number][];
  const pts    = coords.slice(0, coords.length - 1);
  return pts.map((pt, i) => {
    const next = pts[(i + 1) % pts.length];
    return Math.round(haversineM(pt, next) * 3.28084);
  });
}

function detectCorners(polygon: GeoJSON.Polygon, thresholdDeg = 25): number {
  const coords = polygon.coordinates[0] as [number, number][];
  const pts    = coords.slice(0, coords.length - 1);
  if (pts.length < 3) return pts.length;
  let corners = 0;
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    const v1   = [curr[0] - prev[0], curr[1] - prev[1]];
    const v2   = [next[0] - curr[0], next[1] - curr[1]];
    const dot  = v1[0]*v2[0] + v1[1]*v2[1];
    const mag  = Math.sqrt(v1[0]**2+v1[1]**2) * Math.sqrt(v2[0]**2+v2[1]**2);
    if (mag === 0) continue;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot/mag))) * 180/Math.PI;
    if (angle > thresholdDeg) corners++;
  }
  return corners;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function runFencePro(input: FenceProInput): FenceProResult {
  const rules   = STRUCTURE_RULES[input.fenceType];
  const spacing = input.spacingFt || rules.defaultSpacingFt;
  const rates   = {
    crewSize:           input.crewSize           ?? DEFAULT_RATES.crewSize,
    dailyRateUSD:       input.dailyRateUSD       ?? DEFAULT_RATES.dailyRateUSD,
    postCostUSD:        input.postCostUSD        ?? DEFAULT_RATES.postCostUSD,
    concreteBagCostUSD: input.concreteBagCostUSD ?? DEFAULT_RATES.concreteBagCostUSD,
    markupPct:          input.markupPct          ?? DEFAULT_RATES.markupPct,
  };
  const warnings: string[] = [];
  const totalGateWidthFt = input.gates.reduce((s, g) => s + g.widthFt, 0);

  // ── LAYER 1: GEOMETRY ────────────────────────────────────────────────────

  let perimeterFt:    number;
  let edgeLengthsFt:  number[];
  let isRealBoundary  = false;
  let cornerCount     = 4;

  if (input.boundary?.coordinates?.[0]?.length > 2) {
    edgeLengthsFt  = getEdgeLengthsFt(input.boundary);
    perimeterFt    = edgeLengthsFt.reduce((a, b) => a + b, 0);
    cornerCount    = detectCorners(input.boundary);
    isRealBoundary = true;
  } else {
    const side    = Math.round(Math.sqrt(input.acreage * 43560));
    perimeterFt   = side * 4;
    edgeLengthsFt = [side, side, side, side];
    warnings.push("Perimeter estimated from square-lot assumption — draw boundary for accurate numbers.");
  }

  const effectiveFenceFt = Math.max(0, perimeterFt - totalGateWidthFt);

  if (input.spacingFt && input.spacingFt !== rules.defaultSpacingFt) {
    warnings.push(`Spacing overridden to ${input.spacingFt} ft (${input.fenceType} default: ${rules.defaultSpacingFt} ft).`);
  }

  // ── LAYER 1: POST CALC (edge-by-edge) ────────────────────────────────────

  const edgePostCounts = edgeLengthsFt.map(len => {
    const scaledLen = perimeterFt > 0 ? (len * effectiveFenceFt / perimeterFt) : 0;
    return Math.floor(scaledLen / spacing);
  });

  const linePosts  = edgePostCounts.reduce((a, b) => a + b, 0);
  const gatePosts  = input.gates.length * 2;
  const totalPosts = linePosts + cornerCount + gatePosts;

  // ── LAYER 3: MATERIALS ───────────────────────────────────────────────────

  const concreteBags    = Math.ceil(totalPosts * rules.concretePerPost);
  const railLinearFt    = rules.railsPerSpan > 0 ? Math.round(effectiveFenceFt * rules.railsPerSpan) : 0;
  const wireLinearFt    = rules.wireStrands > 0  ? Math.round(effectiveFenceFt * rules.wireStrands)  : 0;
  const fenceMaterialFt = effectiveFenceFt;

  // ── LAYER 4: LABOR + COST ────────────────────────────────────────────────

  const terrainFactor       = TERRAIN_PROD[input.terrain];
  const adjustedPostsPerDay = Math.round(rules.postsPerDay * terrainFactor);
  const daysNominal         = totalPosts / adjustedPostsPerDay;
  const daysLow             = Math.ceil(daysNominal * 0.9);
  const daysHigh            = Math.ceil(daysNominal * 1.15);

  const laborCostLow  = Math.round(daysLow  * rates.dailyRateUSD);
  const laborCostHigh = Math.round(daysHigh * rates.dailyRateUSD);

  const materialCostBase =
    (totalPosts   * rates.postCostUSD) +
    (concreteBags * rates.concreteBagCostUSD);

  const multiplier = 1 + (rates.markupPct / 100);
  const totalCostLow  = Math.round((laborCostLow  + materialCostBase) * multiplier / 100) * 100;
  const totalCostHigh = Math.round((laborCostHigh + materialCostBase) * multiplier / 100) * 100;

  // ── Warnings ─────────────────────────────────────────────────────────────

  if (terrainFactor < 1) {
    warnings.push(`Terrain reduces fence production rate by ${Math.round((1 - terrainFactor) * 100)}%.`);
  }
  if (input.accessibility === "difficult") {
    warnings.push("Difficult access may require additional mobilization not included in fence cost.");
  }
  if (input.water !== "none") {
    warnings.push("Water present — verify fence setback requirements.");
  }

  return {
    status: "available",

    geometry: {
      perimeterFt,
      isRealBoundary,
      totalGateWidthFt,
      effectiveFenceFt,
      cornerCount,
    },

    posts: {
      linePosts,
      cornerPosts: cornerCount,
      gatePosts,
      total:       totalPosts,
      spacingFt:   spacing,
    },

    materials: {
      concreteBags,
      railLinearFt,
      wireLinearFt,
      fenceMaterialFt,
      fenceTypeRules: rules,
    },

    labor: {
      basePostsPerDay:     rules.postsPerDay,
      terrainFactor,
      adjustedPostsPerDay,
      daysLow,
      daysHigh,
      laborCostLow,
      laborCostHigh,
      materialCostBase,
      rates,
    },

    cost: {
      low:  totalCostLow,
      high: totalCostHigh,
    },

    warnings,
  };
}