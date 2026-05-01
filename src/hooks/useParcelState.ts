/**
 * React hook for LandPro Parcel State v1
 * 
 * Provides reactive access to Parcel State Objects and Reality Events.
 * Works alongside (NOT replacing) useParcelMemory and useDecisionEngine.
 * 
 * Key Principles:
 * - PSO and Reality Events are append-only
 * - Events are acknowledged context, NOT guaranteed truth
 * - This hook NEVER modifies analysis conclusions or risk assessments
 * 
 * Safe Influence Rules:
 * Reality Events may influence analysis ONLY in these ways:
 * - Referencing past actions in explanations
 * - Adjusting narrative context to avoid repetition
 * - Informing recommended next steps
 * - Clarifying what remains unresolved
 * - Stating when prior actions do NOT change constraints
 * 
 * Reality Events may NEVER:
 * - Remove or downgrade risk flags
 * - Override regulatory/legal/environmental constraints
 * - Change feasibility conclusions
 * - Suppress warnings
 * - Increase certainty beyond available data
 * 
 * @example
 * import { useParcelState } from '@/hooks/useParcelState';
 * 
 * function ParcelHistory({ parcelId }) {
 *   const {
 *     pso,
 *     events,
 *     isLoading,
 *     appendEvent,
 *   } = useParcelState(parcelId);
 * 
 *   // Display history
 *   return (
 *     <div>
 *       {events.map(event => (
 *         <div key={event.event_id}>
 *           {event.description}
 *           <span>({event.verification_status})</span>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parcelStateService } from '@/lib/parcel-state/parcelStateService.ts';
import type { RealityEventInput, DerivedState } from '@/lib/parcel-state/parcelStateService.ts';

const PSO_QUERY_KEY = 'parcel-state';

/**
 * Hook for accessing and appending to Parcel State
 * 
 * PSO is append-only - writes add events, never modify or delete
 */
export function useParcelState(parcelId: string | undefined) {
  const queryClient = useQueryClient();

  // Get PSO with full history
  const psoQuery = useQuery({
    queryKey: [PSO_QUERY_KEY, 'pso', parcelId],
    queryFn: () => parcelStateService.getPSOWithHistory(parcelId!),
    enabled: !!parcelId,
  });

  // Get events separately for efficiency
  const eventsQuery = useQuery({
    queryKey: [PSO_QUERY_KEY, 'events', parcelId],
    queryFn: () => parcelStateService.getEventsByParcelId(parcelId!),
    enabled: !!parcelId,
  });

  // Append a Reality Event (immutable once recorded)
  const appendEventMutation = useMutation({
    mutationFn: (input: RealityEventInput) =>
      parcelStateService.appendEventByParcelId(parcelId!, input),
    onSuccess: () => {
      // Invalidate both PSO and events queries
      queryClient.invalidateQueries({
        queryKey: [PSO_QUERY_KEY, 'pso', parcelId],
      });
      queryClient.invalidateQueries({
        queryKey: [PSO_QUERY_KEY, 'events', parcelId],
      });
    },
  });

  // Update derived state
  const updateDerivedStateMutation = useMutation({
    mutationFn: async (derivedState: DerivedState) => {
      const pso = psoQuery.data?.pso;
      if (!pso) {
        throw new Error('PSO not found');
      }
      return parcelStateService.updateDerivedState(pso.id, derivedState);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PSO_QUERY_KEY, 'pso', parcelId],
      });
    },
  });

  // Link a report to the PSO
  const linkReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const pso = psoQuery.data?.pso;
      if (!pso) {
        throw new Error('PSO not found');
      }
      return parcelStateService.linkReport(pso.id, reportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PSO_QUERY_KEY, 'pso', parcelId],
      });
    },
  });

  // Compute some useful derived values
  const events = eventsQuery.data?.events ?? psoQuery.data?.pso?.history ?? [];
  const hasHistory = events.length > 0;
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  return {
    // PSO data
    pso: psoQuery.data?.pso ?? null,
    
    // Reality Events (chronological order)
    events,
    
    // Convenience flags
    hasHistory,
    lastEvent,
    
    // Loading states
    isLoading: psoQuery.isLoading || eventsQuery.isLoading,
    isLoadingPSO: psoQuery.isLoading,
    isLoadingEvents: eventsQuery.isLoading,
    
    // Error states
    psoError: psoQuery.data?.error ?? psoQuery.error?.message,
    eventsError: eventsQuery.data?.error ?? eventsQuery.error?.message,
    
    // Append operations (append-only)
    appendEvent: appendEventMutation.mutateAsync,
    isAppending: appendEventMutation.isPending,
    
    // Update operations
    updateDerivedState: updateDerivedStateMutation.mutateAsync,
    linkReport: linkReportMutation.mutateAsync,
    
    // Refetch functions
    refetchPSO: psoQuery.refetch,
    refetchEvents: eventsQuery.refetch,
  };
}

/**
 * Hook for just reading parcel history (no mutations)
 * Useful for display-only components
 */
export function useParcelHistory(parcelId: string | undefined) {
  const eventsQuery = useQuery({
    queryKey: [PSO_QUERY_KEY, 'events', parcelId],
    queryFn: () => parcelStateService.getEventsByParcelId(parcelId!),
    enabled: !!parcelId,
  });

  return {
    events: eventsQuery.data?.events ?? [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.data?.error ?? eventsQuery.error?.message,
    hasHistory: (eventsQuery.data?.events?.length ?? 0) > 0,
    refetch: eventsQuery.refetch,
  };
}
