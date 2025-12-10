-- Create promotions table
CREATE TABLE public.artes_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  greenn_product_id INTEGER,
  has_bonus_access BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create promotion items table (packs included in promotion)
CREATE TABLE public.artes_promotion_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID NOT NULL REFERENCES public.artes_promotions(id) ON DELETE CASCADE,
  pack_slug TEXT NOT NULL,
  access_type artes_access_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.artes_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artes_promotion_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for promotions
CREATE POLICY "Admins can manage promotions" 
ON public.artes_promotions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active promotions" 
ON public.artes_promotions 
FOR SELECT 
USING (true);

-- RLS policies for promotion items
CREATE POLICY "Admins can manage promotion items" 
ON public.artes_promotion_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view promotion items" 
ON public.artes_promotion_items 
FOR SELECT 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_artes_promotions_updated_at
BEFORE UPDATE ON public.artes_promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();