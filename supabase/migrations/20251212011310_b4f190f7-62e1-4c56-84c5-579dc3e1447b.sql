-- Add click_type column to arte_clicks table to distinguish between Canva, PSD, and Download clicks
ALTER TABLE public.arte_clicks 
ADD COLUMN click_type text NOT NULL DEFAULT 'download';

-- Add comment for documentation
COMMENT ON COLUMN public.arte_clicks.click_type IS 'Type of click: canva, psd, or download';