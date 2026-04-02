-- Add a flag to designate one mentor as the default chat mentor
ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS is_default_chat_mentor boolean NOT NULL DEFAULT false;

-- Ensure only one mentor can be the default chat mentor at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_default_chat_mentor
  ON public.mentor_profiles (is_default_chat_mentor) WHERE (is_default_chat_mentor = true);
