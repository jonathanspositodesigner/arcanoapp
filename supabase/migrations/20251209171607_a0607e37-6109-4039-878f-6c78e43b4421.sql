-- Create table to track imported records and avoid duplicates
CREATE TABLE public.import_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_hash text NOT NULL UNIQUE,
  email text NOT NULL,
  product_name text NOT NULL,
  purchase_date text NOT NULL,
  processed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_log ENABLE ROW LEVEL SECURITY;

-- Only admins can manage import logs
CREATE POLICY "Admins can manage import logs"
  ON public.import_log
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_import_log_hash ON public.import_log(import_hash);
CREATE INDEX idx_import_log_email ON public.import_log(email);