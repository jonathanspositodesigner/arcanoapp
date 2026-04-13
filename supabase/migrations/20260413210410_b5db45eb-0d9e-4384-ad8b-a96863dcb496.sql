DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'seedance_jobs'
      AND policyname = 'Admins can view all seedance jobs'
  ) THEN
    CREATE POLICY "Admins can view all seedance jobs"
    ON public.seedance_jobs
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;