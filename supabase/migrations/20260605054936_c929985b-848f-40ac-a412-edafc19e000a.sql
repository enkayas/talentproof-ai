ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS is_shortlisted boolean NOT NULL DEFAULT false;

CREATE POLICY "Job owners can update their submissions"
ON public.submissions
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = submissions.job_id AND jobs.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = submissions.job_id AND jobs.owner_id = auth.uid()));

GRANT UPDATE ON public.submissions TO authenticated;