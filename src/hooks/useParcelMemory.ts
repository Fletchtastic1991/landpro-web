/**
 * React hook for LandPro Memory Core v0
 * 
 * Provides reactive access to parcel memory with the 4 allowed operations:
 * 1. Write Record
 * 2. Read Records
 * 3. List Unknowns
 * 4. List Conflicts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memoryCore } from '@/lib/memory';
import type { MemoryRecordInput } from '@/lib/memory';

const MEMORY_QUERY_KEY = 'parcel-memory';

/**
 * Hook for reading and writing parcel memory
 * Memory is append-only - writes add records, never modify or delete
 */
export function useParcelMemory(parcelId: string | undefined) {
  const queryClient = useQueryClient();

  // Read all records for a parcel
  const recordsQuery = useQuery({
    queryKey: [MEMORY_QUERY_KEY, 'records', parcelId],
    queryFn: () => memoryCore.readRecords(parcelId!),
    enabled: !!parcelId,
  });

  // List unknowns for a parcel
  const unknownsQuery = useQuery({
    queryKey: [MEMORY_QUERY_KEY, 'unknowns', parcelId],
    queryFn: () => memoryCore.listUnknowns(parcelId!),
    enabled: !!parcelId,
  });

  // List conflicts for a parcel
  const conflictsQuery = useQuery({
    queryKey: [MEMORY_QUERY_KEY, 'conflicts', parcelId],
    queryFn: () => memoryCore.listConflicts(parcelId!),
    enabled: !!parcelId,
  });

  // Write a single record (append-only)
  const writeRecordMutation = useMutation({
    mutationFn: (input: Omit<MemoryRecordInput, 'parcel_id'>) =>
      memoryCore.writeRecord({ ...input, parcel_id: parcelId! }),
    onSuccess: () => {
      // Invalidate all memory queries for this parcel
      queryClient.invalidateQueries({
        queryKey: [MEMORY_QUERY_KEY, 'records', parcelId],
      });
      queryClient.invalidateQueries({
        queryKey: [MEMORY_QUERY_KEY, 'unknowns', parcelId],
      });
      queryClient.invalidateQueries({
        queryKey: [MEMORY_QUERY_KEY, 'conflicts', parcelId],
      });
    },
  });

  // Write multiple records (append-only)
  const writeRecordsMutation = useMutation({
    mutationFn: (inputs: Omit<MemoryRecordInput, 'parcel_id'>[]) =>
      memoryCore.writeRecords(
        inputs.map((input) => ({ ...input, parcel_id: parcelId! }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [MEMORY_QUERY_KEY, 'records', parcelId],
      });
      queryClient.invalidateQueries({
        queryKey: [MEMORY_QUERY_KEY, 'unknowns', parcelId],
      });
      queryClient.invalidateQueries({
        queryKey: [MEMORY_QUERY_KEY, 'conflicts', parcelId],
      });
    },
  });

  return {
    // Read operations
    records: recordsQuery.data?.records ?? [],
    unknowns: unknownsQuery.data?.unknowns ?? [],
    conflicts: conflictsQuery.data?.conflicts ?? [],

    // Loading states
    isLoadingRecords: recordsQuery.isLoading,
    isLoadingUnknowns: unknownsQuery.isLoading,
    isLoadingConflicts: conflictsQuery.isLoading,

    // Error states
    recordsError: recordsQuery.data?.error ?? recordsQuery.error?.message,
    unknownsError: unknownsQuery.data?.error ?? unknownsQuery.error?.message,
    conflictsError: conflictsQuery.data?.error ?? conflictsQuery.error?.message,

    // Write operations (append-only)
    writeRecord: writeRecordMutation.mutateAsync,
    writeRecords: writeRecordsMutation.mutateAsync,
    isWriting: writeRecordMutation.isPending || writeRecordsMutation.isPending,

    // Refetch functions
    refetchRecords: recordsQuery.refetch,
    refetchUnknowns: unknownsQuery.refetch,
    refetchConflicts: conflictsQuery.refetch,
  };
}
