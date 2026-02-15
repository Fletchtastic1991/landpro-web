/**
 * LandPro Memory Core v0 - Type Definitions
 * 
 * IMMUTABILITY CONTRACT:
 * - Records cannot be modified after creation
 * - Records cannot be deleted
 * - Unknowns are explicit (value = null)
 * - Conflicts are preserved (multiple records allowed)
 */

/**
 * Locked category enum for v0
 * NO new categories may be added without explicit version bump
 */
export type MemoryCategory =
  | 'geometry'
  | 'topography'
  | 'surface'
  | 'access'
  | 'restriction'
  | 'infrastructure'
  | 'observation'
  | 'metadata';

/**
 * Confidence levels - reflects source reliability ONLY, not correctness
 */
export type MemoryConfidence = 'High' | 'Medium' | 'Low';

/**
 * Allowed value types for memory records
 * null = explicitly unknown (first-class unknown)
 */
export type MemoryValue =
  | number
  | boolean
  | string
  | Record<string, unknown> // geometry or complex object
  | null; // explicit unknown

/**
 * Core memory record structure
 * Every field is REQUIRED
 */
export interface MemoryRecord {
  /** Unique identifier for this record */
  record_id: string;
  
  /** Parcel (project) this record belongs to */
  parcel_id: string;
  
  /** Category from locked enum */
  category: MemoryCategory;
  
  /** Raw value - no interpretation. null = explicitly unknown */
  value: MemoryValue;
  
  /** Where the data came from */
  source: string;
  
  /** Source reliability level */
  confidence: MemoryConfidence;
  
  /** When the record was written */
  timestamp: string;
}

/**
 * Input for writing a new memory record
 * record_id and timestamp are auto-generated
 */
export interface MemoryRecordInput {
  parcel_id: string;
  category: MemoryCategory;
  value: MemoryValue;
  source: string;
  confidence: MemoryConfidence;
}

/**
 * Conflict detection result
 * Represents records with same parcel + category but different values
 */
export interface MemoryConflict {
  parcel_id: string;
  category: MemoryCategory;
  records: MemoryRecord[];
}

/**
 * Unknown record - value is explicitly null
 */
export interface MemoryUnknown {
  record_id: string;
  parcel_id: string;
  category: MemoryCategory;
  source: string;
  confidence: MemoryConfidence;
  timestamp: string;
}

/**
 * Memory Core operation results
 */
export interface MemoryWriteResult {
  success: boolean;
  record?: MemoryRecord;
  error?: string;
}

export interface MemoryReadResult {
  success: boolean;
  records: MemoryRecord[];
  error?: string;
}

export interface MemoryUnknownsResult {
  success: boolean;
  unknowns: MemoryUnknown[];
  error?: string;
}

export interface MemoryConflictsResult {
  success: boolean;
  conflicts: MemoryConflict[];
  error?: string;
}

/**
 * All valid categories for v0 (locked)
 */
export const MEMORY_CATEGORIES: readonly MemoryCategory[] = [
  'geometry',
  'topography',
  'surface',
  'access',
  'restriction',
  'infrastructure',
  'observation',
  'metadata',
] as const;

/**
 * All valid confidence levels
 */
export const MEMORY_CONFIDENCE_LEVELS: readonly MemoryConfidence[] = [
  'High',
  'Medium',
  'Low',
] as const;
