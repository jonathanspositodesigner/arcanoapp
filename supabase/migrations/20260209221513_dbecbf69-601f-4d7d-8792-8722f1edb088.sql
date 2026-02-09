
-- Create ai_tool_settings table for dynamic credit/API cost configuration
CREATE TABLE public.ai_tool_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name text UNIQUE NOT NULL,
  credit_cost integer NOT NULL DEFAULT 60,
  has_api_cost boolean NOT NULL DEFAULT false,
  api_cost numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_tool_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (tools need to read their cost)
CREATE POLICY "authenticated_can_read_tool_settings"
ON public.ai_tool_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admins can update
CREATE POLICY "admins_can_update_tool_settings"
ON public.ai_tool_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_ai_tool_settings_updated_at
BEFORE UPDATE ON public.ai_tool_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with current values
INSERT INTO public.ai_tool_settings (tool_name, credit_cost, has_api_cost, api_cost) VALUES
  ('Upscaler Arcano', 60, false, 0),
  ('Upscaler Pro', 80, false, 0),
  ('Pose Changer', 60, false, 0),
  ('Veste AI', 60, false, 0),
  ('Video Upscaler', 150, false, 0),
  ('Arcano Cloner', 80, true, 0.12),
  ('Gerador Avatar', 75, true, 0.12);
