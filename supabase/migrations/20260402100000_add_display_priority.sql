-- Add display_priority column for admin-controlled mentor ordering
ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS display_priority integer NOT NULL DEFAULT 0;

-- Index for efficient sorted queries
CREATE INDEX IF NOT EXISTS idx_mentor_priority
  ON public.mentor_profiles (is_approved, display_priority DESC);
