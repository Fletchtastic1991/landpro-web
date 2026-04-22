import { LensEngine, LensProject, LensResult } from "./types";

// ─── Inputs ───────────────────────────────────────────────────────────────────

export type FenceType = "wood" | "chain_link" | "farm";

export interface FenceProInputs {
  fenceType:      FenceType;
  spacingFt:      number;           // user-set or type default
  gates:          { widthFt: number }[];
  // Labor rates (overridable in Contractor Mode later)
  crewSize?:      number;
  dailyRateUSD?:  number;
  postCostUSD?:   number;
  concreteBagCostUSD?: number;
  markup?:        number;           // e.g. 1.20 = 20% markup
}

// ─── Layer 2 — Structure rules by fence type ─────────────────────────────────

interface FenceTypeRules {
  defaultSpacingFt:  number;
  railsPerSpan:      number;      // 0 = no rails (chain_link, farm)
  concretePerPost:   number;      // bags per post
  postsPerDay:       number;      // baseline crew production
  wireStrands:       number;      // farm fence only
  description:       string;
}

const STRUCTURE_RULES: Record<FenceType, FenceTypeRules> = {
  wood: {
    defaultSpacingFt: 6,
    railsPerSpan:     3,
    concretePerPost:  2,
    postsPerDay:      80,
    wireStrands:      0,
    description:      "Wood privacy/split-rail fence. 6 ft spacing, 3 rails per span.",
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

// ─── Default cost rates ───────────────────────────────────────────────────────

const DEFAULT_RATES = {
  crewSize:           3,
  dailyRateUSD:       1200,   // $/day for full crew
  postCostUSD:        8,      // $/post (pressure treated)
  concreteBagCostUSD: 7,      // $/bag (80 lb)
  markup:             1.20,   // 20% markup
};

// ─── Layer 1 helpers — Geometry ───────────────────────────────────────────────

function haversineM([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180, Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getEdgeLengthsFt(polygon: GeoJSON.Polygon): number[] {
  const coords = polygon.coordinates[0] as [number, number][];
  const pts    = coords.slice(0, coords.length - 1);
  return pts.map((pt, i) => {
    const next = pts[(i + 1) % pts.length];
    return Math.round(hav(pt, next) * 3.28084);
  });
}

// Re-export for use inside this file
function hav(a: [number, number], b: [number, number]): number {
  return haversineM(a, b);
}

function countVertices(polygon: GeoJSON.Polygon): number {
  // Vertices = polygon points minus the closing duplicate
  return polygon.coordinates[0].length - 1;
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

// ─── Main Lens Function ───────────────────────────────────────────────────────

export const runFenceLens: LensEngine<FenceProInputs> = (
  project: LensProject,
  inputs:  FenceProInputs
): LensResult => {

  const rules   = STRUCTURE_RULES[inputs.fenceType];
  const spacing = inputs.spacingFt || rules.defaultSpacingFt;
  const rates   = {
    crewSize:           inputs.crewSize           ?? DEFAULT_RATES.crewSize,
    dailyRateUSD:       inputs.dailyRateUSD       ?? DEFAULT_RATES.dailyRateUSD,
    postCostUSD:        inputs.postCostUSD        ?? DEFAULT_RATES.postCostUSD,
    concreteBagCostUSD: inputs.concreteBagCostUSD ?? DEFAULT_RATES.concreteBagCostUSD,
    markup:             inputs.markup             ?? DEFAULT_RATES.markup,
  };

  const warnings: string[] = [];

  // ── LAYER 1: GEOMETRY ───────────────────────────────────────────────────

  let perimeterFt:   number;
  let edgeLengthsFt: number[];
  let isRealBoundary = false;
  let cornerCount    = 4; // default square

  const totalGateWidthFt = inputs.gates.reduce((sum, g) => sum + g.widthFt, 0);

  if (project.boundary?.coordinates?.[0]?.length > 2) {
    edgeLengthsFt  = getEdgeLengthsFt(project.boundary);
    perimeterFt    = edgeLengthsFt.reduce((a, b) => a + b, 0);
    cornerCount    = detectCorners(project.boundary);
    isRealBoundary = true;
  } else {
    // Fallback: square lot
    const side    = Math.round(Math.sqrt(project.acreage * 43560));
    perimeterFt   = side * 4;
    edgeLengthsFt = [side, side, side, side];
    warnings.push("Perimeter estimated from square-lot assumption. Draw boundary for accurate post count.");
  }

  const effectiveFenceFt = Math.max(0, perimeterFt - totalGateWidthFt);

  // ── LAYER 1 CONTINUED: Post calculation (edge-by-edge) ──────────────────
  // Line posts: for each edge, floor(scaled_edge / spacing)
  // This avoids double-counting corners

  const edgePostCounts = edgeLengthsFt.map(len => {
    const scaledLen = perimeterFt > 0 ? (len * effectiveFenceFt / perimeterFt) : 0;
    return Math.floor(scaledLen / spacing);
  });
  const linePosts  = edgePostCounts.reduce((a, b) => a + b, 0);
  const gatePosts  = inputs.gates.length * 2;
  // Corner posts are brace posts — counted separately, not as line posts
  const bracePosts = cornerCount + gatePosts;  // corners + gate sides all need bracing
  const totalPosts = linePosts + cornerCount + gatePosts;

  // ── LAYER 2: STRUCTURE ───────────────────────────────────────────────────

  if (inputs.spacingFt && inputs.spacingFt !== rules.defaultSpacingFt) {
    warnings.push(`Spacing overridden to ${inputs.spacingFt} ft (default for ${inputs.fenceType}: ${rules.defaultSpacingFt} ft).`);
  }

  // ── LAYER 3: MATERIALS ───────────────────────────────────────────────────

  // Concrete
  const concreteBags = Math.ceil(totalPosts * rules.concretePerPost);

  // Rails (wood only — linear feet of rail needed)
  const railLinearFt = rules.railsPerSpan > 0
    ? Math.round(effectiveFenceFt * rules.railsPerSpan)
    : 0;

  // Wire (farm fence — linear feet × strands)
  const wireLinearFt = rules.wireStrands > 0
    ? Math.round(effectiveFenceFt * rules.wireStrands)
    : 0;

  // Fence material (chain link roll length, or boards for wood)
  const fenceMaterialFt = effectiveFenceFt;

  // ── LAYER 4: LABOR + COST ────────────────────────────────────────────────

  // Terrain factor reduces posts-per-day
  const terrainFactor =
    project.terrain === "slight_slope" ? 0.80 :
    project.terrain === "steep"        ? 0.60 : 1.0;

  if (terrainFactor < 1) {
    warnings.push(`Terrain reduces production rate by ${Math.round((1 - terrainFactor) * 100)}%.`);
  }

  const adjustedPostsPerDay = rules.postsPerDay * terrainFactor;
  const daysRequired        = totalPosts / adjustedPostsPerDay;
  const daysLow             = Math.ceil(daysRequired * 0.9);
  const daysHigh            = Math.ceil(daysRequired * 1.15);

  // Labor cost
  const laborCostLow  = Math.round(daysLow  * rates.crewSize * (rates.dailyRateUSD / rates.crewSize));
  const laborCostHigh = Math.round(daysHigh * rates.crewSize * (rates.dailyRateUSD / rates.crewSize));

  // Material cost (posts + concrete)
  const materialCostBase =
    (totalPosts   * rates.postCostUSD) +
    (concreteBags * rates.concreteBagCostUSD);

  // Total cost + markup
  const totalCostLow  = Math.round((laborCostLow  + materialCostBase) * rates.markup / 100) * 100;
  const totalCostHigh = Math.round((laborCostHigh + materialCostBase) * rates.markup / 100) * 100;

  if (project.accessibility === "difficult") {
    warnings.push("Difficult access may require additional mobilization cost not included here.");
  }
  if (project.water !== "none") {
    warnings.push("Water present — verify fence setback requirements from water edge.");
  }

  // ── RESULT ───────────────────────────────────────────────────────────────

  return {
    id:      "fencing",
    name:    "FencePro",
    enabled: true,
    summary: {
      fenceType:         inputs.fenceType,
      perimeterFt,
      effectiveFenceFt,
      totalPosts,
      isRealBoundary,
      daysLow,
      daysHigh,
    },
    details: {
      // Geometry
      cornerCount,
      linePosts,
      cornerPosts:   cornerCount,
      gatePosts,
      bracePosts,
      spacingFt:     spacing,
      totalGateWidthFt,
      edgePostCounts,
      // Structure
      fenceTypeRules: rules,
      // Materials
      concreteBags,
      railLinearFt,
      wireLinearFt,
      fenceMaterialFt,
      // Labor
      terrainFactor,
      adjustedPostsPerDay,
      daysRequired,
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
};
