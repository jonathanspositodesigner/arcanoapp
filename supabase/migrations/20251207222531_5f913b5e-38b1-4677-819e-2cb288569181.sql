-- Create table to track downloads
CREATE TABLE public.prompt_downloads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id uuid NOT NULL,
    prompt_type text NOT NULL DEFAULT 'admin',
    downloaded_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_downloads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert downloads (for tracking)
CREATE POLICY "Anyone can insert downloads"
ON public.prompt_downloads
FOR INSERT
WITH CHECK (true);

-- Admins and partners can view downloads
CREATE POLICY "Admins can view all downloads"
ON public.prompt_downloads
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view downloads of their prompts"
ON public.prompt_downloads
FOR SELECT
USING (
    prompt_type = 'partner' AND 
    EXISTS (
        SELECT 1 FROM partner_prompts pp
        JOIN partners p ON pp.partner_id = p.id
        WHERE pp.id = prompt_downloads.prompt_id
        AND p.user_id = auth.uid()
    )
);

-- Create index for faster queries
CREATE INDEX idx_prompt_downloads_prompt_id ON public.prompt_downloads(prompt_id);
CREATE INDEX idx_prompt_downloads_prompt_type ON public.prompt_downloads(prompt_type);