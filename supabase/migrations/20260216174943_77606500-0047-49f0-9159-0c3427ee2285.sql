
-- Etapa 1: Adicionar coluna tool_name à landing_page_trials
ALTER TABLE public.landing_page_trials 
ADD COLUMN tool_name TEXT NOT NULL DEFAULT 'upscaler';

-- Etapa 2: RLS para INSERT anônimo no arcano_cloner_jobs (trial com user_id NULL)
CREATE POLICY "Allow anonymous trial inserts"
ON public.arcano_cloner_jobs FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Etapa 3: RLS para SELECT anônimo no arcano_cloner_jobs (trial com user_id NULL)
CREATE POLICY "Allow anonymous trial select"
ON public.arcano_cloner_jobs FOR SELECT
TO anon
USING (user_id IS NULL);
