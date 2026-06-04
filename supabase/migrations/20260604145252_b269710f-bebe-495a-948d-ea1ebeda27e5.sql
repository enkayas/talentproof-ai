
CREATE TABLE public.jobs (
  id TEXT PRIMARY KEY,
  job_title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  require_link BOOLEAN NOT NULL DEFAULT false,
  require_cv BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.jobs TO anon, authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read jobs" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Anyone can create jobs" ON public.jobs FOR INSERT WITH CHECK (true);
