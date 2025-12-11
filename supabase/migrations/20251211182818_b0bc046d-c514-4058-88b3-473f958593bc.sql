-- Create abandoned_checkouts table for remarketing
CREATE TABLE public.abandoned_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Lead data
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  cpf TEXT,
  -- Product data
  product_id INTEGER,
  product_name TEXT,
  offer_name TEXT,
  offer_hash TEXT,
  amount DECIMAL(10,2),
  checkout_link TEXT,
  checkout_step INTEGER,
  -- Remarketing status
  remarketing_status TEXT DEFAULT 'pending',
  contacted_at TIMESTAMP WITH TIME ZONE,
  contacted_by UUID,
  notes TEXT,
  -- Timestamps
  abandoned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_abandoned_checkouts_email ON abandoned_checkouts(email);
CREATE INDEX idx_abandoned_checkouts_status ON abandoned_checkouts(remarketing_status);
CREATE INDEX idx_abandoned_checkouts_abandoned_at ON abandoned_checkouts(abandoned_at DESC);
CREATE INDEX idx_abandoned_checkouts_product_id ON abandoned_checkouts(product_id);

-- Enable Row Level Security
ALTER TABLE abandoned_checkouts ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage abandoned checkouts
CREATE POLICY "Admins can manage abandoned checkouts"
ON abandoned_checkouts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));