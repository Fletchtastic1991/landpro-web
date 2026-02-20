/**
 * LandPro Parcel State Module v1
 * 
 * This module provides the Parcel State Object (PSO) and Reality Event
 * functionality for LandPro. It works alongside (NOT replacing) the Memory Core.
 * 
 * Intent Declaration (For System Clarity):
 * "We acknowledge what has been reported about this parcel.
 *  We reason conservatively with that context.
 *  We never claim certainty where it does not exist."
 * 
 * @example
 * import { parcelStateService, type RealityEvent } from '@/lib/parcel-state';
 * 
 * // Get or create PSO for a parcel
 * const { pso } = await parcelStateService.getOrCreatePSO(parcelId);
 * 
 * // Append a reality event (immutable once recorded)
 * const { event } = await parcelStateService.appendEvent(pso.id, {
 *   source: 'user',
 *   event_type: 'site_visit',
 *   description: 'Walked the property boundary',
 *   confidence_level: 'Medium',
 * });
 * 
 * // Get all events for a parcel
 * const { events } = await parcelStateService.getEvents(pso.id);
 * 
 * // Link a report to the PSO
 * await parcelStateService.linkReport(pso.id, reportId);
 */

export { parcelStateService } from './parcelStateService';
export * from './types';
