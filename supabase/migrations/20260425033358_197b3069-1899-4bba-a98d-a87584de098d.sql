
-- 1. Add reference_prompt_id column for collaborator attribution
ALTER TABLE public.image_generator_jobs
ADD COLUMN IF NOT EXISTS reference_prompt_id text;

-- 2. Register the tool rate (R$ 0.10 per use)
INSERT INTO public.collaborator_tool_rates (tool_table, tool_display_name, earning_per_use, is_active)
VALUES ('image_generator_jobs', 'Gerar Imagem', 0.10, true)
ON CONFLICT (tool_table) DO NOTHING;

-- 3. Attach the generic earning trigger
DROP TRIGGER IF EXISTS trg_register_earning_image_generator ON public.image_generator_jobs;
CREATE TRIGGER trg_register_earning_image_generator
AFTER UPDATE ON public.image_generator_jobs
FOR EACH ROW
WHEN (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed'))
EXECUTE FUNCTION public.trg_register_tool_earning_from_job('image_generator_jobs');
