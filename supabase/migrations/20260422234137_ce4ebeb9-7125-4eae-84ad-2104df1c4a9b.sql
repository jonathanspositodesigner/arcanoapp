
-- Table to track daily premium prompt unlocks
CREATE TABLE public.daily_premium_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt_id TEXT NOT NULL,
  unlock_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, prompt_id, unlock_date)
);

-- Index for fast lookups
CREATE INDEX idx_daily_premium_unlocks_user_date ON public.daily_premium_unlocks (user_id, unlock_date);

-- Enable RLS
ALTER TABLE public.daily_premium_unlocks ENABLE ROW LEVEL SECURITY;

-- Users can see their own unlocks
CREATE POLICY "Users can view their own premium unlocks"
ON public.daily_premium_unlocks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own unlocks
CREATE POLICY "Users can insert their own premium unlocks"
ON public.daily_premium_unlocks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RPC: count today's unlocks for a user (São Paulo timezone)
CREATE OR REPLACE FUNCTION public.get_daily_premium_unlock_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.daily_premium_unlocks
  WHERE user_id = _user_id
    AND unlock_date = (now() AT TIME ZONE 'America/Sao_Paulo')::date;
$$;

-- RPC: get prompt IDs unlocked today
CREATE OR REPLACE FUNCTION public.get_user_unlocked_prompts_today(_user_id UUID)
RETURNS TABLE(prompt_id TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dpu.prompt_id
  FROM public.daily_premium_unlocks dpu
  WHERE dpu.user_id = _user_id
    AND dpu.unlock_date = (now() AT TIME ZONE 'America/Sao_Paulo')::date;
$$;
