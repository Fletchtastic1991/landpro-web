/**
 * React hook for SitePro v0
 * 
 * Provides reactive access to SitePro evaluation.
 * Reads ONLY from Memory Core.
 */

import { useMemo } from 'react';
import { useParcelMemory } from './useParcelMemory';
import { evaluateParcel } from '@/lib/sitepro';
import type { SiteProResult } from '@/lib/sitepro';

/**
 * Hook for running SitePro evaluation on a parcel
 * 
 * Automatically evaluates when memory records change.
 * Returns null if parcelId is undefined or no records exist.
 */
export function useSitePro(parcelId: string | undefined): {
  result: SiteProResult | null;
  isLoading: boolean;
  error: string | undefined;
  refetch: () => void;
} {
  const {
    records,
    isLoadingRecords,
    recordsError,
    refetchRecords,
  } = useParcelMemory(parcelId);

  // Memoize evaluation to prevent unnecessary recalculations
  const result = useMemo(() => {
    if (!parcelId || records.length === 0) {
      return null;
    }
    return evaluateParcel(parcelId, records);
  }, [parcelId, records]);

  return {
    result,
    isLoading: isLoadingRecords,
    error: recordsError,
    refetch: refetchRecords,
  };
}
