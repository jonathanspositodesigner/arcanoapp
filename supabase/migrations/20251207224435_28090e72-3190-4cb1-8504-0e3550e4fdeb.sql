-- Allow anyone to read prompt_clicks for displaying click counts
CREATE POLICY "Anyone can view prompt click counts"
ON public.prompt_clicks
FOR SELECT
USING (true);