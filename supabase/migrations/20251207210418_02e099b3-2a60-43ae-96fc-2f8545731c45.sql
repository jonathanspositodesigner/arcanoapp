
-- Create partners table
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- RLS policies for partners table
CREATE POLICY "Admins can manage all partners"
ON public.partners FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view their own profile"
ON public.partners FOR SELECT
USING (auth.uid() = user_id);

-- Create partner_prompts table
CREATE TABLE public.partner_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  prompt text NOT NULL,
  image_url text NOT NULL,
  category text NOT NULL,
  is_premium boolean DEFAULT false,
  approved boolean DEFAULT false,
  approved_at timestamptz,
  approved_by uuid,
  deletion_requested boolean DEFAULT false,
  deletion_requested_at timestamptz,
  tutorial_url text,
  reference_images text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on partner_prompts
ALTER TABLE public.partner_prompts ENABLE ROW LEVEL SECURITY;

-- RLS policies for partner_prompts
CREATE POLICY "Admins can manage all partner prompts"
ON public.partner_prompts FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view their own prompts"
ON public.partner_prompts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = partner_prompts.partner_id 
    AND partners.user_id = auth.uid()
  )
);

CREATE POLICY "Partners can insert their own prompts"
ON public.partner_prompts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = partner_prompts.partner_id 
    AND partners.user_id = auth.uid()
  )
);

CREATE POLICY "Partners can update their own prompts"
ON public.partner_prompts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = partner_prompts.partner_id 
    AND partners.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view approved partner prompts"
ON public.partner_prompts FOR SELECT
USING (approved = true);

-- Create partner-prompts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-prompts', 'partner-prompts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for partner-prompts bucket
CREATE POLICY "Partners can upload to partner bucket"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'partner-prompts' 
  AND has_role(auth.uid(), 'partner')
);

CREATE POLICY "Partners and admins can view partner files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'partner-prompts'
  AND (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Admins can manage partner bucket"
ON storage.objects FOR ALL
USING (bucket_id = 'partner-prompts' AND has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'partner-prompts' AND has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_partners_updated_at
BEFORE UPDATE ON public.partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_prompts_updated_at
BEFORE UPDATE ON public.partner_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
