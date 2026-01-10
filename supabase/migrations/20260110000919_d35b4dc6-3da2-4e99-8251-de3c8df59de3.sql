-- Create enum for reality event sources
CREATE TYPE reality_event_source AS ENUM ('user', 'system', 'pro', 'sensor');

-- Create enum for verification status
CREATE TYPE verification_status AS ENUM ('unverified', 'verified');

-- Create parcel_state_objects table (Parcel State Object - PSO)
-- This is append-only and persists across sessions
CREATE TABLE public.parcel_state_objects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  derived_state JSONB DEFAULT NULL,
  linked_reports JSONB DEFAULT '[]'::jsonb,
  
  -- Each parcel can only have one PSO
  CONSTRAINT unique_parcel_pso UNIQUE (parcel_id)
);

-- Create reality_events table
-- Each event is immutable once recorded
CREATE TABLE public.reality_events (
  event_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_state_id UUID NOT NULL REFERENCES public.parcel_state_objects(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source reality_event_source NOT NULL,
  event_type TEXT NOT NULL,
  location JSONB DEFAULT NULL,
  description TEXT NOT NULL,
  confidence_level memory_confidence NOT NULL DEFAULT 'Low',
  verification_status verification_status NOT NULL DEFAULT 'unverified'
);

-- Enable RLS on both tables
ALTER TABLE public.parcel_state_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reality_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for parcel_state_objects
-- Users can view PSOs for their parcels
CREATE POLICY "Users can view PSOs for their parcels"
ON public.parcel_state_objects
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = parcel_state_objects.parcel_id
    AND projects.user_id = auth.uid()
  )
);

-- Users can create PSOs for their parcels
CREATE POLICY "Users can create PSOs for their parcels"
ON public.parcel_state_objects
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = parcel_state_objects.parcel_id
    AND projects.user_id = auth.uid()
  )
);

-- Users can update derived_state and linked_reports only (append-only pattern)
CREATE POLICY "Users can update PSOs for their parcels"
ON public.parcel_state_objects
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = parcel_state_objects.parcel_id
    AND projects.user_id = auth.uid()
  )
);

-- RLS policies for reality_events (append-only: INSERT and SELECT only)
-- Users can view reality events for their parcels
CREATE POLICY "Users can view reality events for their parcels"
ON public.reality_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM parcel_state_objects pso
    JOIN projects p ON p.id = pso.parcel_id
    WHERE pso.id = reality_events.parcel_state_id
    AND p.user_id = auth.uid()
  )
);

-- Users can create reality events for their parcels
CREATE POLICY "Users can create reality events for their parcels"
ON public.reality_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM parcel_state_objects pso
    JOIN projects p ON p.id = pso.parcel_id
    WHERE pso.id = reality_events.parcel_state_id
    AND p.user_id = auth.uid()
  )
);

-- NO UPDATE or DELETE policies for reality_events (immutable)

-- Create index for efficient lookups
CREATE INDEX idx_reality_events_parcel_state ON public.reality_events(parcel_state_id);
CREATE INDEX idx_reality_events_timestamp ON public.reality_events(timestamp DESC);
CREATE INDEX idx_pso_parcel_id ON public.parcel_state_objects(parcel_id);

-- Trigger to update last_updated on PSO when reality events are added
CREATE OR REPLACE FUNCTION public.update_pso_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.parcel_state_objects
  SET last_updated = now()
  WHERE id = NEW.parcel_state_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_pso_on_event_insert
AFTER INSERT ON public.reality_events
FOR EACH ROW
EXECUTE FUNCTION public.update_pso_last_updated();