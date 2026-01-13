-- Create enum for memory categories (locked for v0)
CREATE TYPE memory_category AS ENUM (
  'geometry',
  'topography',
  'surface',
  'access',
  'restriction',
  'infrastructure',
  'observation',
  'metadata'
);

-- Create enum for confidence levels
CREATE TYPE memory_confidence AS ENUM (
  'High',
  'Medium',
  'Low'
);

-- Create the immutable memory_records table
CREATE TABLE public.memory_records (
  record_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category memory_category NOT NULL,
  value JSONB, -- null allowed for explicit unknowns
  source TEXT NOT NULL,
  confidence memory_confidence NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient parcel lookups
CREATE INDEX idx_memory_records_parcel_id ON public.memory_records(parcel_id);

-- Create index for unknown detection (null values)
CREATE INDEX idx_memory_records_unknowns ON public.memory_records(parcel_id) WHERE value IS NULL;

-- Enable RLS
ALTER TABLE public.memory_records ENABLE ROW LEVEL SECURITY;

-- Users can read memory records for their parcels
CREATE POLICY "Users can read memory records for their parcels"
ON public.memory_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = memory_records.parcel_id
    AND projects.user_id = auth.uid()
  )
);

-- Users can write memory records for their parcels (append-only)
CREATE POLICY "Users can write memory records for their parcels"
ON public.memory_records
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = memory_records.parcel_id
    AND projects.user_id = auth.uid()
  )
);

-- CRITICAL: No UPDATE policy - records are immutable
-- CRITICAL: No DELETE policy - records are permanent

-- Add comment documenting immutability contract
COMMENT ON TABLE public.memory_records IS 'LandPro Memory Core v0: Append-only immutable fact store. NO updates or deletes permitted. Unknowns are explicit (value=null). Conflicts are preserved (multiple records for same fact).';