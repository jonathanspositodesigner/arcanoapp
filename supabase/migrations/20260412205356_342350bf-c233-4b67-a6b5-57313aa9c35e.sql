
-- Create prompt_likes table
CREATE TABLE public.prompt_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt_id UUID NOT NULL,
  prompt_type TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, prompt_id)
);

-- Enable RLS
ALTER TABLE public.prompt_likes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view likes" ON public.prompt_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like" ON public.prompt_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes" ON public.prompt_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_prompt_likes_prompt_id ON public.prompt_likes (prompt_id);
CREATE INDEX idx_prompt_likes_user_id ON public.prompt_likes (user_id);

-- Aggregated counts RPC
CREATE OR REPLACE FUNCTION public.get_prompt_like_counts()
RETURNS TABLE (prompt_id UUID, like_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT prompt_id, COUNT(*)::BIGINT as like_count
  FROM public.prompt_likes
  GROUP BY prompt_id;
$$;
