-- Add reference_prompt_id to flyer_maker_jobs + trigger compartilhado + rate
ALTER TABLE public.flyer_maker_jobs 
ADD COLUMN IF NOT EXISTS reference_prompt_id text;

CREATE INDEX IF NOT EXISTS idx_flyer_maker_jobs_reference_prompt 
ON public.flyer_maker_jobs(reference_prompt_id) 
WHERE reference_prompt_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_register_earning_flyer_maker ON public.flyer_maker_jobs;
CREATE TRIGGER trg_register_earning_flyer_maker
  AFTER INSERT OR UPDATE OF status ON public.flyer_maker_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_register_tool_earning_from_job('flyer_maker_jobs');

INSERT INTO public.collaborator_tool_rates (tool_table, tool_display_name, earning_per_use, is_active)
VALUES ('flyer_maker_jobs', 'Flyer Maker', 0.10, true)
ON CONFLICT (tool_table) DO NOTHING;