/**
 * LandPro Memory Core v0 - Service Layer
 * 
 * CRITICAL RULES:
 * - Memory NEVER evaluates, infers, decides, aggregates, or resolves conflicts
 * - Memory is append-only and immutable
 * - Unknowns are first-class records (value = null)
 * - Conflicts are preserved, not resolved
 * 
 * ALLOWED OPERATIONS (v0 ONLY):
 * 1. Write Record
 * 2. Read Records
 * 3. List Unknowns
 * 4. List Conflicts
 * 
 * NO updates. NO merges. NO learning. NO additional operations.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  MemoryRecord,
  MemoryRecordInput,
  MemoryWriteResult,
  MemoryReadResult,
  MemoryUnknownsResult,
  MemoryConflictsResult,
  MemoryConflict,
  MemoryCategory,
  MemoryConfidence,
} from './types';

/**
 * Write a single record to memory
 * Records are immutable - once written, they cannot be modified or deleted
 */
export async function writeRecord(input: MemoryRecordInput): Promise<MemoryWriteResult> {
  try {
    const insertData = {
      parcel_id: input.parcel_id,
      category: input.category as 'geometry' | 'topography' | 'surface' | 'access' | 'restriction' | 'infrastructure' | 'observation' | 'metadata',
      value: input.value as import('@/integrations/supabase/types').Json,
      source: input.source,
      confidence: input.confidence as 'High' | 'Medium' | 'Low',
    };

    const { data, error } = await supabase
      .from('memory_records')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      record: transformDbRecord(data),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error writing record',
    };
  }
}

/**
 * Write multiple records to memory atomically
 * All records are written or none are written
 */
export async function writeRecords(inputs: MemoryRecordInput[]): Promise<MemoryWriteResult[]> {
  const results: MemoryWriteResult[] = [];

  for (const input of inputs) {
    const result = await writeRecord(input);
    results.push(result);
  }

  return results;
}

/**
 * Read all records for a parcel
 * Returns ALL records including unknowns and conflicting values
 * Memory performs NO filtering or summarization
 */
export async function readRecords(parcelId: string): Promise<MemoryReadResult> {
  try {
    const { data, error } = await supabase
      .from('memory_records')
      .select('*')
      .eq('parcel_id', parcelId)
      .order('timestamp', { ascending: true });

    if (error) {
      return { success: false, records: [], error: error.message };
    }

    return {
      success: true,
      records: (data || []).map(transformDbRecord),
    };
  } catch (err) {
    return {
      success: false,
      records: [],
      error: err instanceof Error ? err.message : 'Unknown error reading records',
    };
  }
}

/**
 * Read records for a parcel filtered by category
 * Returns ALL records for that category (including conflicts)
 */
export async function readRecordsByCategory(
  parcelId: string,
  category: MemoryCategory
): Promise<MemoryReadResult> {
  try {
    const { data, error } = await supabase
      .from('memory_records')
      .select('*')
      .eq('parcel_id', parcelId)
      .eq('category', category)
      .order('timestamp', { ascending: true });

    if (error) {
      return { success: false, records: [], error: error.message };
    }

    return {
      success: true,
      records: (data || []).map(transformDbRecord),
    };
  } catch (err) {
    return {
      success: false,
      records: [],
      error: err instanceof Error ? err.message : 'Unknown error reading records',
    };
  }
}

/**
 * List all explicit unknowns for a parcel
 * Unknowns are records where value = null
 * Unknowns are NEVER inferred - only explicitly recorded unknowns are returned
 */
export async function listUnknowns(parcelId: string): Promise<MemoryUnknownsResult> {
  try {
    const { data, error } = await supabase
      .from('memory_records')
      .select('*')
      .eq('parcel_id', parcelId)
      .is('value', null)
      .order('timestamp', { ascending: true });

    if (error) {
      return { success: false, unknowns: [], error: error.message };
    }

    return {
      success: true,
      unknowns: (data || []).map((record) => ({
        record_id: record.record_id,
        parcel_id: record.parcel_id,
        category: record.category as MemoryCategory,
        source: record.source,
        confidence: record.confidence as MemoryConfidence,
        timestamp: record.timestamp,
      })),
    };
  } catch (err) {
    return {
      success: false,
      unknowns: [],
      error: err instanceof Error ? err.message : 'Unknown error listing unknowns',
    };
  }
}

/**
 * List all conflicts for a parcel
 * A conflict exists when multiple records have the same category but different values
 * Memory does NOT resolve conflicts - it only reports them
 */
export async function listConflicts(parcelId: string): Promise<MemoryConflictsResult> {
  try {
    const { data, error } = await supabase
      .from('memory_records')
      .select('*')
      .eq('parcel_id', parcelId)
      .order('category', { ascending: true })
      .order('timestamp', { ascending: true });

    if (error) {
      return { success: false, conflicts: [], error: error.message };
    }

    // Group records by category
    const byCategory = new Map<MemoryCategory, MemoryRecord[]>();
    for (const record of data || []) {
      const transformed = transformDbRecord(record);
      const existing = byCategory.get(transformed.category) || [];
      existing.push(transformed);
      byCategory.set(transformed.category, existing);
    }

    // Find conflicts (categories with multiple distinct values)
    const conflicts: MemoryConflict[] = [];
    for (const [category, records] of byCategory) {
      if (records.length > 1) {
        // Check if values actually differ
        const valueStrings = new Set(records.map((r) => JSON.stringify(r.value)));
        if (valueStrings.size > 1) {
          conflicts.push({
            parcel_id: parcelId,
            category,
            records,
          });
        }
      }
    }

    return {
      success: true,
      conflicts,
    };
  } catch (err) {
    return {
      success: false,
      conflicts: [],
      error: err instanceof Error ? err.message : 'Unknown error listing conflicts',
    };
  }
}

/**
 * Transform database record to typed MemoryRecord
 * Internal helper - not exported
 */
function transformDbRecord(record: {
  record_id: string;
  parcel_id: string;
  category: string;
  value: unknown;
  source: string;
  confidence: string;
  timestamp: string;
}): MemoryRecord {
  return {
    record_id: record.record_id,
    parcel_id: record.parcel_id,
    category: record.category as MemoryCategory,
    value: record.value as MemoryRecord['value'],
    source: record.source,
    confidence: record.confidence as MemoryConfidence,
    timestamp: record.timestamp,
  };
}

/**
 * Memory Core v0 API
 * Only these 4 operations are permitted
 */
export const memoryCore = {
  writeRecord,
  writeRecords,
  readRecords,
  readRecordsByCategory,
  listUnknowns,
  listConflicts,
} as const;
