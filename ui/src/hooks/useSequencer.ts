/**
 * React hook for Sequencing Logic v0
 * 
 * Provides reactive access to sequence execution.
 * Evaluates parcels linearly through Decision Engine.
 */

import { useState, useCallback } from 'react';
import { executeSequencer } from '@/lib/sequencer';
import type { SequencerOutput } from '@/lib/sequencer';
import type { ActivePro } from '@/lib/decision-engine/types';

interface UseSequencerReturn {
  /** Execute the sequencer with given parcel IDs */
  execute: (parcelIds: string[], activePros?: ActivePro[]) => Promise<SequencerOutput>;
  /** Latest sequence output */
  output: SequencerOutput | null;
  /** Whether sequence is currently executing */
  isExecuting: boolean;
  /** Error message if execution failed */
  error: string | null;
  /** Reset state */
  reset: () => void;
}

/**
 * Hook for executing the Sequencing Logic v0
 * 
 * @returns Sequence execution function and state
 */
export function useSequencer(): UseSequencerReturn {
  const [output, setOutput] = useState<SequencerOutput | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    parcelIds: string[],
    activePros: ActivePro[] = ['SitePro']
  ): Promise<SequencerOutput> => {
    setIsExecuting(true);
    setError(null);
    
    try {
      const result = await executeSequencer({
        parcel_ids: parcelIds,
        active_pros: activePros,
      });
      
      setOutput(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sequence execution failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setOutput(null);
    setError(null);
    setIsExecuting(false);
  }, []);

  return {
    execute,
    output,
    isExecuting,
    error,
    reset,
  };
}
