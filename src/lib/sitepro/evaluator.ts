/**
 * SitePro v0 - Decision Engine
 * 
 * LOCKED CONTRACT - ANY DEVIATION IS A BUG:
 * - Reads ONLY from Memory Core
 * - Never infers, never estimates, never substitutes
 * - Conservative bias: if unsure → Inconclusive
 * - Never recommends actions or implies approval
 */

import type { MemoryRecord } from '@/lib/memory/types.ts';
import type {
  SiteProResult,
  SiteProOutcome,
  SiteProConfidence,
  SiteProKnownFact,
  SiteProUnknown,
  AreaEvaluation,
} from './types.ts';

/**
 * Generate unique evaluation ID
 */
function generateEvaluationId(): string {
  return `eval_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract known facts from memory records (non-null values)
 */
function extractKnownFacts(records: MemoryRecord[]): SiteProKnownFact[] {
  return records
    .filter((r) => r.value !== null)
    .map((r) => ({
      category: r.category,
      value: r.value,
      source: r.source,
      confidence: r.confidence,
      timestamp: r.timestamp,
    }));
}

/**
 * Extract unknowns from memory records (null values)
 */
function extractUnknowns(records: MemoryRecord[]): SiteProUnknown[] {
  return records
    .filter((r) => r.value === null)
    .map((r) => ({
      category: r.category,
      source: r.source,
      impact: getUnknownImpact(r.category),
    }));
}

/**
 * Describe impact of unknown data for each category
 */
function getUnknownImpact(category: string): string {
  const impacts: Record<string, string> = {
    geometry: 'Parcel boundaries cannot be verified',
    topography: 'Slope and terrain conditions are unknown',
    surface: 'Floodplain, wetlands, and soil conditions are unverified',
    access: 'Road access and easement status cannot be confirmed',
    restriction: 'Land use restrictions and designations are unknown',
    infrastructure: 'Utility and infrastructure availability is unverified',
    observation: 'Site observations have not been recorded',
    metadata: 'Additional parcel metadata is missing',
  };
  return impacts[category] || 'Data for this category is missing';
}

/**
 * Extract unique sources from records
 */
function extractSources(records: MemoryRecord[]): string[] {
  const sources = new Set<string>();
  records.forEach((r) => sources.add(r.source));
  return Array.from(sources);
}

/**
 * Evaluate physical feasibility
 */
function evaluatePhysicalFeasibility(records: MemoryRecord[]): AreaEvaluation {
  const notes: string[] = [];
  let hasBlocker = false;
  let hasCriticalUnknown = false;

  // Check topography
  const topoRecords = records.filter((r) => r.category === 'topography');
  const knownTopo = topoRecords.filter((r) => r.value !== null);
  const unknownTopo = topoRecords.filter((r) => r.value === null);

  if (unknownTopo.length > 0) {
    hasCriticalUnknown = true;
    notes.push('Topography data is incomplete');
  }

  // Check for extreme slopes (if known)
  knownTopo.forEach((r) => {
    if (typeof r.value === 'object' && r.value !== null) {
      const val = r.value as Record<string, unknown>;
      if (typeof val.extreme_slope === 'number' && val.extreme_slope > 45) {
        hasBlocker = true;
        notes.push('Extreme slope conditions detected (>45%)');
      }
    }
  });

  // Check surface conditions
  const surfaceRecords = records.filter((r) => r.category === 'surface');
  const knownSurface = surfaceRecords.filter((r) => r.value !== null);
  const unknownSurface = surfaceRecords.filter((r) => r.value === null);

  if (unknownSurface.length > 0) {
    hasCriticalUnknown = true;
    notes.push('Surface condition data is incomplete');
  }

  // Check for full floodplain/wetlands coverage
  knownSurface.forEach((r) => {
    if (typeof r.value === 'object' && r.value !== null) {
      const val = r.value as Record<string, unknown>;
      if (val.floodplain_coverage === 'full' || val.wetlands_coverage === 'full') {
        hasBlocker = true;
        notes.push('Parcel is fully within floodplain or wetlands');
      }
    }
  });

  return {
    area: 'physical_feasibility',
    hasBlocker,
    hasCriticalUnknown,
    notes,
  };
}

/**
 * Evaluate legal/designation constraints
 */
function evaluateLegalConstraints(records: MemoryRecord[]): AreaEvaluation {
  const notes: string[] = [];
  let hasBlocker = false;
  let hasCriticalUnknown = false;

  const restrictionRecords = records.filter((r) => r.category === 'restriction');
  const knownRestrictions = restrictionRecords.filter((r) => r.value !== null);
  const unknownRestrictions = restrictionRecords.filter((r) => r.value === null);

  if (unknownRestrictions.length > 0) {
    hasCriticalUnknown = true;
    notes.push('Restriction data is incomplete');
  }

  // Check for protected land designations
  knownRestrictions.forEach((r) => {
    if (typeof r.value === 'object' && r.value !== null) {
      const val = r.value as Record<string, unknown>;
      if (val.protected_land === true) {
        hasBlocker = true;
        notes.push('Parcel has protected land designation');
      }
      if (val.conservation_easement === true) {
        hasBlocker = true;
        notes.push('Parcel has conservation easement');
      }
    }
    if (typeof r.value === 'string') {
      const lower = r.value.toLowerCase();
      if (lower.includes('protected') || lower.includes('conservation') || lower.includes('preserve')) {
        hasBlocker = true;
        notes.push(`Restriction detected: ${r.value}`);
      }
    }
  });

  return {
    area: 'legal_constraints',
    hasBlocker,
    hasCriticalUnknown,
    notes,
  };
}

/**
 * Evaluate basic accessibility
 */
function evaluateAccessibility(records: MemoryRecord[]): AreaEvaluation {
  const notes: string[] = [];
  let hasBlocker = false;
  let hasCriticalUnknown = false;

  const accessRecords = records.filter((r) => r.category === 'access');
  const knownAccess = accessRecords.filter((r) => r.value !== null);
  const unknownAccess = accessRecords.filter((r) => r.value === null);

  if (unknownAccess.length > 0 || accessRecords.length === 0) {
    hasCriticalUnknown = true;
    notes.push('Access data is incomplete or missing');
  }

  // Check for confirmed lack of legal access
  let hasRoadAccess = false;
  let hasEasement = false;
  let confirmedNoAccess = false;

  knownAccess.forEach((r) => {
    if (typeof r.value === 'object' && r.value !== null) {
      const val = r.value as Record<string, unknown>;
      if (val.public_road_adjacent === true) hasRoadAccess = true;
      if (val.public_road_adjacent === false) confirmedNoAccess = true;
      if (val.recorded_easement === true) hasEasement = true;
    }
    if (typeof r.value === 'boolean') {
      if (r.value === true) hasRoadAccess = true;
    }
  });

  // Blocked only if confirmed no road access AND no easement AND isolated
  if (confirmedNoAccess && !hasEasement) {
    hasBlocker = true;
    notes.push('Confirmed lack of legal access with no recorded easement');
  }

  if (hasRoadAccess || hasEasement) {
    notes.push('Minimal access indication exists');
  }

  return {
    area: 'basic_accessibility',
    hasBlocker,
    hasCriticalUnknown,
    notes,
  };
}

/**
 * Evaluate data completeness
 */
function evaluateDataCompleteness(records: MemoryRecord[]): AreaEvaluation {
  const notes: string[] = [];
  let hasCriticalUnknown = false;

  // Check for geometry (required)
  const geometryRecords = records.filter((r) => r.category === 'geometry');
  const knownGeometry = geometryRecords.filter((r) => r.value !== null);

  if (knownGeometry.length === 0) {
    hasCriticalUnknown = true;
    notes.push('No verified parcel boundary exists');
  }

  // Count unknowns across all categories
  const unknowns = records.filter((r) => r.value === null);
  if (unknowns.length > 0) {
    notes.push(`${unknowns.length} explicit unknown(s) in dataset`);
  }

  // Check for conflicts (multiple records with same category but different values)
  const categoryValues = new Map<string, Set<string>>();
  records.forEach((r) => {
    if (r.value !== null) {
      const key = r.category;
      const valStr = JSON.stringify(r.value);
      if (!categoryValues.has(key)) {
        categoryValues.set(key, new Set());
      }
      categoryValues.get(key)!.add(valStr);
    }
  });

  categoryValues.forEach((values, category) => {
    if (values.size > 1) {
      hasCriticalUnknown = true;
      notes.push(`Conflicting data exists for ${category}`);
    }
  });

  return {
    area: 'data_completeness',
    hasBlocker: false,
    hasCriticalUnknown,
    notes,
  };
}

/**
 * Determine outcome based on evaluations
 * DECISION TREE (locked):
 * 
 * 🔴 Blocked - ANY confirmed blocker
 * 🟡 Inconclusive - No blockers BUT critical unknowns or conflicts
 * 🟢 Potentially Suitable - No blockers, no critical unknowns preventing assessment
 */
function determineOutcome(evaluations: AreaEvaluation[]): SiteProOutcome {
  // Check for any blocker → Blocked
  const hasAnyBlocker = evaluations.some((e) => e.hasBlocker);
  if (hasAnyBlocker) {
    return 'blocked';
  }

  // Check for critical unknowns → Inconclusive
  const hasAnyCriticalUnknown = evaluations.some((e) => e.hasCriticalUnknown);
  if (hasAnyCriticalUnknown) {
    return 'inconclusive';
  }

  // No blockers, no critical unknowns → Potentially Suitable
  return 'potentially_suitable';
}

/**
 * Generate plain-language reasoning
 */
function generateReasoning(
  outcome: SiteProOutcome,
  evaluations: AreaEvaluation[],
  unknowns: SiteProUnknown[]
): string {
  const parts: string[] = [];

  switch (outcome) {
    case 'blocked':
      parts.push('This parcel has confirmed blocking constraints that prevent preliminary suitability.');
      evaluations.forEach((e) => {
        if (e.hasBlocker) {
          e.notes.forEach((n) => parts.push(`• ${n}`));
        }
      });
      break;

    case 'inconclusive':
      parts.push('A definitive preliminary assessment cannot be made due to incomplete or conflicting data.');
      if (unknowns.length > 0) {
        parts.push(`${unknowns.length} data point(s) are explicitly unknown.`);
      }
      evaluations.forEach((e) => {
        if (e.hasCriticalUnknown) {
          e.notes.forEach((n) => parts.push(`• ${n}`));
        }
      });
      break;

    case 'potentially_suitable':
      parts.push('Based on available data, no confirmed blocking constraints exist.');
      parts.push('Physical conditions do not appear obviously prohibitive.');
      evaluations.forEach((e) => {
        e.notes.forEach((n) => {
          if (!n.includes('incomplete') && !n.includes('missing')) {
            parts.push(`• ${n}`);
          }
        });
      });
      if (unknowns.length > 0) {
        parts.push(`Note: ${unknowns.length} data point(s) remain unknown but do not confirm blockage.`);
      }
      break;
  }

  return parts.join(' ');
}

/**
 * Determine confidence level
 * Only Low or Medium - never High for preliminary assessment
 */
function determineConfidence(
  outcome: SiteProOutcome,
  evaluations: AreaEvaluation[],
  records: MemoryRecord[]
): SiteProConfidence {
  // Count high-confidence records
  const highConfidenceCount = records.filter((r) => r.confidence === 'High' && r.value !== null).length;
  const totalKnown = records.filter((r) => r.value !== null).length;
  const unknownCount = records.filter((r) => r.value === null).length;

  // Default to Low
  let confidence: SiteProConfidence = 'Low';

  // Medium only if:
  // - Outcome is blocked (confirmed blockers are certain)
  // - OR majority of records are high-confidence with few unknowns
  if (outcome === 'blocked') {
    confidence = 'Medium';
  } else if (totalKnown > 3 && highConfidenceCount > totalKnown / 2 && unknownCount < 2) {
    confidence = 'Medium';
  }

  return confidence;
}

/**
 * MAIN EVALUATION FUNCTION
 * 
 * Evaluates a parcel using ONLY Memory Core records.
 * Returns a complete SiteProResult.
 */
export function evaluateParcel(parcelId: string, records: MemoryRecord[]): SiteProResult {
  // Filter records for this parcel (should already be filtered, but ensure)
  const parcelRecords = records.filter((r) => r.parcel_id === parcelId);

  // Extract facts and unknowns
  const knownFacts = extractKnownFacts(parcelRecords);
  const unknowns = extractUnknowns(parcelRecords);
  const sources = extractSources(parcelRecords);

  // Run internal evaluations (private, never exposed as scores)
  const evaluations: AreaEvaluation[] = [
    evaluatePhysicalFeasibility(parcelRecords),
    evaluateLegalConstraints(parcelRecords),
    evaluateAccessibility(parcelRecords),
    evaluateDataCompleteness(parcelRecords),
  ];

  // Determine outcome using decision tree
  const outcome = determineOutcome(evaluations);

  // Generate reasoning
  const reasoning = generateReasoning(outcome, evaluations, unknowns);

  // Determine confidence (Low or Medium only)
  const confidence = determineConfidence(outcome, evaluations, parcelRecords);

  return {
    evaluation_id: generateEvaluationId(),
    parcel_id: parcelId,
    outcome,
    reasoning,
    known_facts: knownFacts,
    unknowns,
    confidence,
    sources_referenced: sources,
    evaluated_at: new Date().toISOString(),
  };
}
