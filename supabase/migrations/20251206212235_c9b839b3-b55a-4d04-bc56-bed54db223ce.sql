-- Create table to track daily premium prompt copies
CREATE TABLE public.daily_prompt_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prompt_id UUID NOT NULL,
  copied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  copy_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Create index for efficient queries
CREATE INDEX idx_daily_prompt_copies_user_date ON public.daily_prompt_copies(user_id, copy_date);

-- Enable RLS
ALTER TABLE public.daily_prompt_copies ENABLE ROW LEVEL SECURITY;

-- Users can view their own copies
CREATE POLICY "Users can view their own copies"
ON public.daily_prompt_copies
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own copies
CREATE POLICY "Users can insert their own copies"
ON public.daily_prompt_copies
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all copies
CREATE POLICY "Admins can view all copies"
ON public.daily_prompt_copies
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to get daily copy count for a user
CREATE OR REPLACE FUNCTION public.get_daily_copy_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.daily_prompt_copies
  WHERE user_id = _user_id
    AND copy_date = CURRENT_DATE
$$;