/**
 * React hook for LandPro Readiness computation
 * 
 * STRICT RULES (from system invariants):
 * 1. One-Way Data Flow - Memory Core is the sole source of truth
 * 2. Readiness is a PURE DERIVED COMPUTATION - never persisted
 * 3. Only explicit Memory Core records affect readiness
 * 4. Analysis output NEVER affects readiness
 * 5. Re-running analysis NEVER changes readiness
 * 6. Safety default: ambiguity = lower readiness
 * 
 * @example
 * import { useReadiness } from '@/hooks/useReadiness';
 * 
 * function ParcelReadiness({ parcelId }) {
 *   const { 
 *     readiness,
 *     isComputing,
 *     supportingEntries,
 *     missingRequirements,
 *     blockers,
 *   } = useReadiness(parcelId);
 * 
 *   return (
 *     <div>
 *       <Badge>{readiness?.label}</Badge>
 *       <p>{readiness?.conditional_statement}</p>
 *       
 *       {missingRequirements.length > 0 && (
 *         <ul>
 *           {missingRequirements.map(m => (
 *             <li key={m.milestone}>{m.label}</li>
 *           ))}
 *         </ul>
 *       )}
 *     </div>
 *   );
 * }
 */

import { useMemo } from 'react';
import { useParcelMemory } from '@/hooks/useParcelMemory';
import { computeReadiness } from '@/lib/readiness';
import type { ReadinessResult, MemoryRecordForReadiness } from '@/lib/readiness';

/**
 * Hook for computing readiness from Memory Core
 * 
 * Readiness is recomputed whenever memory records change.
 * It is NEVER persisted or written back to memory.
 * 
 * @param parcelId - The parcel to compute readiness for
 * @returns Readiness computation result and loading state
 */
export function useReadiness(parcelId: string | undefined) {
  // Get memory records from Memory Core (the ONLY source of truth)
  const { 
    records, 
    isLoadingRecords, 
    recordsError 
  } = useParcelMemory(parcelId);

  // Compute readiness as a pure derivation from memory records
  // This is memoized and recomputed when records change
  const readiness = useMemo<ReadinessResult | null>(() => {
    if (!parcelId || !records || records.length === 0) {
      // No parcel or no records = explicit "not ready" state
      if (parcelId && records && records.length === 0) {
        return computeReadiness({
          parcel_id: parcelId,
          memory_records: [],
        });
      }
      return null;
    }

    // Transform MemoryRecord to MemoryRecordForReadiness
    const memoryRecordsForReadiness: MemoryRecordForReadiness[] = records.map(r => ({
      record_id: r.record_id,
      category: r.category,
      value: r.value,
      source: r.source,
      timestamp: r.timestamp,
    }));

    // Pure computation - no side effects, no persistence
    return computeReadiness({
      parcel_id: parcelId,
      memory_records: memoryRecordsForReadiness,
    });
  }, [parcelId, records]);

  // Convenience accessors
  const supportingEntries = readiness?.supporting_entries ?? [];
  const missingRequirements = readiness?.missing_requirements ?? [];
  const blockers = readiness?.blockers ?? [];
  
  // Derived flags
  const hasBlockers = blockers.length > 0;
  const hasMissingRequirements = missingRequirements.length > 0;
  const hasSupportingEntries = supportingEntries.length > 0;
  
  // Readiness level checks
  const isNotReady = readiness?.level === 'not_ready';
  const isRaw = readiness?.level === 'raw';
  const isEarlyStage = readiness?.level === 'early_stage';
  const isConditional = readiness?.level === 'conditional';
  const isBlocked = readiness?.level === 'blocked';

  return {
    // Core readiness result
    readiness,
    
    // Loading/error state (from Memory Core fetch)
    isComputing: isLoadingRecords,
    error: recordsError,
    
    // Explainability: supporting entries
    supportingEntries,
    hasSupportingEntries,
    
    // Explainability: missing requirements
    missingRequirements,
    hasMissingRequirements,
    
    // Explainability: blockers
    blockers,
    hasBlockers,
    
    // Level convenience flags
    isNotReady,
    isRaw,
    isEarlyStage,
    isConditional,
    isBlocked,
    
    // Conditional statement for UI
    conditionalStatement: readiness?.conditional_statement ?? null,
    label: readiness?.label ?? null,
    level: readiness?.level ?? null,
  };
}

/**
 * Hook for read-only readiness display
 * Returns only what's needed for display, no mutations
 */
export function useReadinessDisplay(parcelId: string | undefined) {
  const { 
    readiness, 
    isComputing, 
    label, 
    conditionalStatement,
    hasBlockers,
    hasMissingRequirements,
  } = useReadiness(parcelId);

  return {
    label,
    conditionalStatement,
    level: readiness?.level ?? null,
    isComputing,
    hasBlockers,
    hasMissingRequirements,
    // For badge styling
    variant: hasBlockers 
      ? 'destructive' 
      : hasMissingRequirements 
        ? 'outline' 
        : 'default',
  };
}
