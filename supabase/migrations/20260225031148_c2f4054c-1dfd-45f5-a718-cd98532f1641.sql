-- Add admin SELECT policies for all AI job tables that are missing them

CREATE POLICY "Admins can view all arcano_cloner_jobs"
  ON public.arcano_cloner_jobs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all character_generator_jobs"
  ON public.character_generator_jobs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all image_generator_jobs"
  ON public.image_generator_jobs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all video_generator_jobs"
  ON public.video_generator_jobs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all flyer_maker_jobs"
  ON public.flyer_maker_jobs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all pose_changer_jobs"
  ON public.pose_changer_jobs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all veste_ai_jobs"
  ON public.veste_ai_jobs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all video_upscaler_jobs"
  ON public.video_upscaler_jobs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));