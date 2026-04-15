
-- Add financial protection triggers to video_generator_jobs and movieled_maker_jobs

CREATE TRIGGER protect_video_generator_financial
  BEFORE UPDATE ON public.video_generator_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ai_job_financial_columns();

CREATE TRIGGER protect_movieled_maker_financial
  BEFORE UPDATE ON public.movieled_maker_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ai_job_financial_columns();
