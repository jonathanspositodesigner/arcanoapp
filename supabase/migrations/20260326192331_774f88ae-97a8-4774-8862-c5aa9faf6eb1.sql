CREATE TABLE public.ai_engine_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  modo TEXT NOT NULL DEFAULT 'Standard',
  api_cost NUMERIC NOT NULL DEFAULT 0,
  tempo_segundos INTEGER NOT NULL DEFAULT 0,
  rh_coins NUMERIC NOT NULL DEFAULT 0,
  custo_rh NUMERIC NOT NULL DEFAULT 0,
  custo_total NUMERIC NOT NULL DEFAULT 0,
  creditos_cobrir INTEGER NOT NULL DEFAULT 0,
  cobrar_3x NUMERIC NOT NULL DEFAULT 0,
  creditos_3x INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_engine_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_engine_costs"
ON public.ai_engine_costs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));