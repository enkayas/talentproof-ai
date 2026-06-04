
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  linkedin TEXT,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  portfolio_link TEXT,
  cv_text TEXT,
  qa_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX submissions_job_id_idx ON public.submissions(job_id);
GRANT INSERT ON public.submissions TO anon, authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit an application" ON public.submissions FOR INSERT WITH CHECK (true);
