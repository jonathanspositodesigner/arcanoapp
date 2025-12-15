
-- Create admin_goals table for tracking goals/milestones
CREATE TABLE public.admin_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_goals ENABLE ROW LEVEL SECURITY;

-- Only admins can manage goals
CREATE POLICY "Admins can manage goals"
ON public.admin_goals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_admin_goals_updated_at
BEFORE UPDATE ON public.admin_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
