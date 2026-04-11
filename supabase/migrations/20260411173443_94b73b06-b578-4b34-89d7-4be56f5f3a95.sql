UPDATE public.mp_products
SET price = CASE slug
  WHEN 'plano-ultimate-mensal' THEN 79.90
  WHEN 'plano-ultimate-anual' THEN 718.80
  ELSE price
END
WHERE slug IN ('plano-ultimate-mensal', 'plano-ultimate-anual');