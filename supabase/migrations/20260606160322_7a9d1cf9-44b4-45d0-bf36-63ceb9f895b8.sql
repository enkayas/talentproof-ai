
-- 1) Clean up orphaned jobs (no owner) — they are unmanageable anyway
DELETE FROM public.submissions WHERE job_id IN (SELECT id FROM public.jobs WHERE owner_id IS NULL);
DELETE FROM public.jobs WHERE owner_id IS NULL;

-- 2) Enforce owner_id presence with sane default
ALTER TABLE public.jobs ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.jobs ALTER COLUMN owner_id SET NOT NULL;

-- 3) Tighten submissions INSERT policy: require job to exist and be live
DROP POLICY IF EXISTS "Anyone can submit an application" ON public.submissions;
CREATE POLICY "Anyone can submit to live jobs"
  ON public.submissions
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = submissions.job_id
        AND jobs.status = 'live'
    )
  );

-- 4) Allow job owners to delete candidate submissions for their jobs
CREATE POLICY "Job owners can delete their submissions"
  ON public.submissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = submissions.job_id
        AND jobs.owner_id = auth.uid()
    )
  );
