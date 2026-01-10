/**
 * LandPro Parcel State Service v1
 * 
 * Append-only service for managing Parcel State Objects and Reality Events.
 * 
 * Key Invariants:
 * - PSOs are created once per parcel, never deleted
 * - Reality Events are append-only, never modified or deleted
 * - Events are explicitly labeled as reported/observed, NOT guaranteed truth
 * - This service NEVER modifies Memory Core, SitePro, or analysis conclusions
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type {
  ParcelStateObject,
  ParcelStateResult,
  RealityEvent,
  RealityEventsResult,
  RealityEventInput,
  AppendEventResult,
  UpdateDerivedStateResult,
  LinkReportResult,
  DerivedState,
  LinkedReport,
  RealityEventLocation,
} from './types';

// ============================================================================
// Parcel State Object Operations
// ============================================================================

/**
 * Get the PSO for a parcel, or null if it doesn't exist
 */
async function getPSO(parcelId: string): Promise<ParcelStateResult> {
  try {
    const { data, error } = await supabase
      .from('parcel_state_objects')
      .select('*')
      .eq('parcel_id', parcelId)
      .maybeSingle();

    if (error) {
      console.error('[ParcelState] Error fetching PSO:', error.code);
      return { pso: null, error: error.message };
    }

    if (!data) {
      return { pso: null };
    }

    return {
      pso: transformDbPSO(data),
    };
  } catch (err) {
    console.error('[ParcelState] Unexpected error fetching PSO');
    return { pso: null, error: 'Failed to fetch parcel state' };
  }
}

/**
 * Get the PSO for a parcel, creating it if it doesn't exist
 * This is the primary entry point for accessing parcel state
 */
async function getOrCreatePSO(parcelId: string): Promise<ParcelStateResult> {
  // First try to get existing PSO
  const existing = await getPSO(parcelId);
  if (existing.error) {
    return existing;
  }
  if (existing.pso) {
    return existing;
  }

  // Create new PSO
  try {
    const { data, error } = await supabase
      .from('parcel_state_objects')
      .insert({
        parcel_id: parcelId,
        derived_state: null,
        linked_reports: [],
      })
      .select()
      .single();

    if (error) {
      // Handle race condition - another request might have created it
      if (error.code === '23505') { // unique_violation
        return getPSO(parcelId);
      }
      console.error('[ParcelState] Error creating PSO:', error.code);
      return { pso: null, error: error.message };
    }

    return {
      pso: transformDbPSO(data),
    };
  } catch (err) {
    console.error('[ParcelState] Unexpected error creating PSO');
    return { pso: null, error: 'Failed to create parcel state' };
  }
}

/**
 * Get the full PSO with its history of Reality Events
 */
async function getPSOWithHistory(parcelId: string): Promise<ParcelStateResult> {
  const { pso, error } = await getOrCreatePSO(parcelId);
  if (error || !pso) {
    return { pso: null, error };
  }

  const { events, error: eventsError } = await getEvents(pso.id);
  if (eventsError) {
    // Return PSO without history on events error
    return { pso };
  }

  return {
    pso: {
      ...pso,
      history: events,
    },
  };
}

// ============================================================================
// Reality Event Operations (Append-Only)
// ============================================================================

/**
 * Get all Reality Events for a PSO, ordered chronologically (oldest first)
 */
async function getEvents(psoId: string): Promise<RealityEventsResult> {
  try {
    const { data, error } = await supabase
      .from('reality_events')
      .select('*')
      .eq('parcel_state_id', psoId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('[ParcelState] Error fetching events:', error.code);
      return { events: [], error: error.message };
    }

    return {
      events: (data || []).map(transformDbEvent),
    };
  } catch (err) {
    console.error('[ParcelState] Unexpected error fetching events');
    return { events: [], error: 'Failed to fetch reality events' };
  }
}

/**
 * Get Reality Events for a parcel by parcel_id (convenience method)
 */
async function getEventsByParcelId(parcelId: string): Promise<RealityEventsResult> {
  const { pso, error } = await getPSO(parcelId);
  if (error) {
    return { events: [], error };
  }
  if (!pso) {
    // No PSO means no events
    return { events: [] };
  }
  return getEvents(pso.id);
}

/**
 * Append a new Reality Event to a PSO
 * Events are immutable once recorded - this is the only way to add history
 * 
 * Note: verification_status is always 'unverified' on creation
 */
async function appendEvent(
  psoId: string,
  input: RealityEventInput
): Promise<AppendEventResult> {
  try {
    const insertData = {
      parcel_state_id: psoId,
      source: input.source as 'user' | 'system' | 'pro' | 'sensor',
      event_type: input.event_type,
      description: input.description,
      location: (input.location || null) as Json,
      confidence_level: (input.confidence_level || 'Low') as 'High' | 'Medium' | 'Low',
      verification_status: 'unverified' as const, // Always unverified on creation
    };

    const { data, error } = await supabase
      .from('reality_events')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[ParcelState] Error appending event:', error.code);
      return { event: null, error: error.message };
    }

    return {
      event: transformDbEvent(data),
    };
  } catch (err) {
    console.error('[ParcelState] Unexpected error appending event');
    return { event: null, error: 'Failed to append reality event' };
  }
}

/**
 * Append a Reality Event by parcel_id (convenience method)
 * Creates PSO if it doesn't exist
 */
async function appendEventByParcelId(
  parcelId: string,
  input: RealityEventInput
): Promise<AppendEventResult> {
  const { pso, error } = await getOrCreatePSO(parcelId);
  if (error || !pso) {
    return { event: null, error: error || 'Failed to get parcel state' };
  }
  return appendEvent(pso.id, input);
}

// ============================================================================
// Derived State & Report Linking
// ============================================================================

/**
 * Update the derived state of a PSO
 * This is a computed summary, not the source of truth
 */
async function updateDerivedState(
  psoId: string,
  derivedState: DerivedState
): Promise<UpdateDerivedStateResult> {
  try {
    const { error } = await supabase
      .from('parcel_state_objects')
      .update({ derived_state: derivedState as Json })
      .eq('id', psoId);

    if (error) {
      console.error('[ParcelState] Error updating derived state:', error.code);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[ParcelState] Unexpected error updating derived state');
    return { success: false, error: 'Failed to update derived state' };
  }
}

/**
 * Link a report to a PSO
 * This is a reference only - does not modify the report
 */
async function linkReport(
  psoId: string,
  reportId: string
): Promise<LinkReportResult> {
  try {
    // First get current linked_reports
    const { data: pso, error: fetchError } = await supabase
      .from('parcel_state_objects')
      .select('linked_reports')
      .eq('id', psoId)
      .single();

    if (fetchError) {
      console.error('[ParcelState] Error fetching PSO for link:', fetchError.code);
      return { success: false, error: fetchError.message };
    }

    // Parse linked_reports from JSONB
    const rawLinks = pso?.linked_reports;
    const currentLinks: LinkedReport[] = Array.isArray(rawLinks) 
      ? (rawLinks as unknown as LinkedReport[])
      : [];
    
    // Check if already linked
    if (currentLinks.some(link => link.report_id === reportId)) {
      return { success: true }; // Already linked
    }

    // Append new link
    const newLink: LinkedReport = {
      report_id: reportId,
      linked_at: new Date().toISOString(),
    };

    const updatedLinks = [...currentLinks, newLink] as unknown as Json;

    const { error: updateError } = await supabase
      .from('parcel_state_objects')
      .update({ linked_reports: updatedLinks })
      .eq('id', psoId);

    if (updateError) {
      console.error('[ParcelState] Error linking report:', updateError.code);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[ParcelState] Unexpected error linking report');
    return { success: false, error: 'Failed to link report' };
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Transform database PSO row to typed ParcelStateObject
 */
function transformDbPSO(row: Record<string, unknown>): ParcelStateObject {
  return {
    id: row.id as string,
    parcel_id: row.parcel_id as string,
    created_at: row.created_at as string,
    last_updated: row.last_updated as string,
    derived_state: row.derived_state as DerivedState | null,
    linked_reports: (row.linked_reports as LinkedReport[] | null) || [],
  };
}

/**
 * Transform database Reality Event row to typed RealityEvent
 */
function transformDbEvent(row: Record<string, unknown>): RealityEvent {
  return {
    event_id: row.event_id as string,
    parcel_state_id: row.parcel_state_id as string,
    timestamp: row.timestamp as string,
    source: row.source as RealityEvent['source'],
    event_type: row.event_type as string,
    location: row.location as RealityEventLocation | null,
    description: row.description as string,
    confidence_level: row.confidence_level as RealityEvent['confidence_level'],
    verification_status: row.verification_status as RealityEvent['verification_status'],
  };
}

// ============================================================================
// Export Service
// ============================================================================

/**
 * Parcel State Service - Append-only management of parcel history
 * 
 * This service provides the foundational layer for acknowledging
 * what has been reported about a parcel while maintaining conservative
 * reasoning and never claiming certainty where it does not exist.
 */
export const parcelStateService = {
  // PSO operations
  getPSO,
  getOrCreatePSO,
  getPSOWithHistory,
  
  // Reality Event operations (append-only)
  getEvents,
  getEventsByParcelId,
  appendEvent,
  appendEventByParcelId,
  
  // Derived state & linking
  updateDerivedState,
  linkReport,
} as const;
