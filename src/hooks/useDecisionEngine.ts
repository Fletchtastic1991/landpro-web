/**
 * React hook for Decision Engine v0
 * 
 * Provides reactive access to Decision Engine execution.
 * Coordinates Memory → SitePro → result package → stop
 */

import { useMemo, useCallback, useState } from 'react';
import { useParcelMemory } from './useParcelMemory';
import { executeDecisionEngine } from '@/lib/decision-engine';
import type { 
  DecisionEngineResult, 
  DecisionEngineError,
  ActivePro,
} from '@/lib/decision-engine';

interface UseDecisionEngineReturn {
  /** Decision Engine result (null if not executed or no parcel) */
  result: DecisionEngineResult | null;
  
  /** Execution error (null if successful) */
  error: DecisionEngineError | null;
  
  /** Whether data is loading from Memory Core */
  isLoading: boolean;
  
  /** Whether Decision Engine has been executed */
  hasExecuted: boolean;
  
  /** Execute Decision Engine manually */
  execute: () => void;
  
  /** Reset execution state */
  reset: () => void;
  
  /** Refetch Memory and re-execute */
  refetch: () => void;
}

/**
 * Hook for executing Decision Engine v0 on a parcel
 * 
 * Loads Memory records and executes Decision Engine when triggered.
 * Does NOT auto-execute - must call execute() manually.
 */
export function useDecisionEngine(parcelId: string | undefined): UseDecisionEngineReturn {
  const [hasExecuted, setHasExecuted] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    result: DecisionEngineResult | null;
    error: DecisionEngineError | null;
  }>({ result: null, error: null });

  const {
    records,
    conflicts,
    isLoadingRecords,
    isLoadingConflicts,
    refetchRecords,
    refetchConflicts,
  } = useParcelMemory(parcelId);

  const isLoading = isLoadingRecords || isLoadingConflicts;

  // Execute Decision Engine
  const execute = useCallback(() => {
    if (!parcelId) {
      setExecutionResult({
        result: null,
        error: {
          code: 'NO_PARCEL_ID',
          message: 'Parcel ID is required to execute Decision Engine',
        },
      });
      setHasExecuted(true);
      return;
    }

    // v0: Active Pros = SitePro only
    const activePros: ActivePro[] = ['SitePro'];

    const outcome = executeDecisionEngine({
      parcel_id: parcelId,
      memory_records: records,
      memory_conflicts: conflicts,
      active_pros: activePros,
    });

    if ('error' in outcome) {
      setExecutionResult({ result: null, error: outcome.error });
    } else {
      setExecutionResult({ result: outcome.result, error: null });
    }
    setHasExecuted(true);
  }, [parcelId, records, conflicts]);

  // Reset execution state
  const reset = useCallback(() => {
    setHasExecuted(false);
    setExecutionResult({ result: null, error: null });
  }, []);

  // Refetch Memory and reset for re-execution
  const refetch = useCallback(() => {
    reset();
    refetchRecords();
    refetchConflicts();
  }, [reset, refetchRecords, refetchConflicts]);

  return {
    result: executionResult.result,
    error: executionResult.error,
    isLoading,
    hasExecuted,
    execute,
    reset,
    refetch,
  };
}
