
INSERT INTO public.mp_products (slug, title, price, type, is_active, plan_slug, access_type, credits_amount)
VALUES
  ('upscaler-arcano-starter', 'Upscaler Arcano - Starter', 24.90, 'landing_bundle', true, 'starter', 'vitalicio', 1500),
  ('upscaler-arcano-pro', 'Upscaler Arcano - Pro', 37.00, 'landing_bundle', true, 'pro', 'vitalicio', 4200),
  ('upscaler-arcano-ultimate', 'Upscaler Arcano - Ultimate', 79.90, 'landing_bundle', true, 'ultimate', 'vitalicio', 14000);

UPDATE public.mp_products SET price = 99.90 WHERE slug = 'upscaller-arcano-vitalicio';
