ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS cv_score integer,
  ADD COLUMN IF NOT EXISTS cv_analysis jsonb;