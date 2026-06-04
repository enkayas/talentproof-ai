
-- Add ownership to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS owner_id uuid;
CREATE INDEX IF NOT EXISTS jobs_owner_id_idx ON public.jobs(owner_id);

-- Replace insert policy with one that requires the owner to be the signed-in user
DROP POLICY IF EXISTS "Anyone can create jobs" ON public.jobs;
CREATE POLICY "Authenticated users can create their own jobs"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owners can update / delete their own jobs
CREATE POLICY "Owners can update their jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Keep public SELECT on jobs (the candidate apply page reads by unguessable slug)
-- "Anyone can read jobs" policy already exists.

-- Submissions: let job owners read submissions for their own jobs
GRANT SELECT ON public.submissions TO authenticated;
CREATE POLICY "Job owners can view their submissions"
  ON public.submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = submissions.job_id
        AND jobs.owner_id = auth.uid()
    )
  );
