/**
 * LandPro Memory Core v0
 * 
 * The Memory Core records facts, sources, confidence, and explicit unknowns for parcels.
 * 
 * Memory NEVER:
 * - evaluates
 * - infers
 * - decides
 * - aggregates
 * - resolves conflicts
 * 
 * Memory is append-only and immutable.
 * 
 * @example
 * import { memoryCore } from '@/lib/memory';
 * 
 * // Write a record
 * await memoryCore.writeRecord({
 *   parcel_id: 'xxx',
 *   category: 'topography',
 *   value: { slope: 12, unit: 'percent' },
 *   source: 'USGS DEM',
 *   confidence: 'High',
 * });
 * 
 * // Write an explicit unknown
 * await memoryCore.writeRecord({
 *   parcel_id: 'xxx',
 *   category: 'access',
 *   value: null, // explicitly unknown
 *   source: 'not available',
 *   confidence: 'Low',
 * });
 * 
 * // Read all records for a parcel
 * const { records } = await memoryCore.readRecords('xxx');
 * 
 * // List unknowns
 * const { unknowns } = await memoryCore.listUnknowns('xxx');
 * 
 * // List conflicts
 * const { conflicts } = await memoryCore.listConflicts('xxx');
 */

export { memoryCore } from './memoryCore';
export * from './types';
