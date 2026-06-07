
-- Add cv_file_path to submissions
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS cv_file_path text;

-- Storage policies for cv-resumes bucket
-- Anyone (anon + authenticated) can upload to cv-resumes
CREATE POLICY "Anyone can upload CV resumes"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'cv-resumes');

-- Job owners can read CVs uploaded under their job folder (path is jobId/filename)
CREATE POLICY "Job owners can read CV resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'cv-resumes'
  AND EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = (storage.foldername(name))[1]
      AND jobs.owner_id = auth.uid()
  )
);

-- Job owners can delete CVs under their job folder
CREATE POLICY "Job owners can delete CV resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'cv-resumes'
  AND EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = (storage.foldername(name))[1]
      AND jobs.owner_id = auth.uid()
  )
);
