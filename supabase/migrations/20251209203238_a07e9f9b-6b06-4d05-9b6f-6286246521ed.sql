-- Add import_source column to distinguish data origins
ALTER TABLE public.user_pack_purchases 
ADD COLUMN IF NOT EXISTS import_source text DEFAULT 'manual';

-- Mark ALL existing records as old sales data (standby)
UPDATE public.user_pack_purchases 
SET import_source = 'csv_vendas' 
WHERE import_source IS NULL OR import_source = 'manual';

-- Add comment for documentation
COMMENT ON COLUMN public.user_pack_purchases.import_source IS 'Source of the record: csv_vendas (old sales - standby), xlsx_acessos (access import), manual (admin created)';