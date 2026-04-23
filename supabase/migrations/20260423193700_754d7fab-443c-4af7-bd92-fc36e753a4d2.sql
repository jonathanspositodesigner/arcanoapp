CREATE OR REPLACE FUNCTION public.assign_founder_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _founder_count INT;
BEGIN
  SELECT COUNT(*) INTO _founder_count FROM public.partners WHERE is_founder = true;
  IF _founder_count < 15 THEN
    NEW.is_founder := true;
  ELSE
    NEW.is_founder := false;
  END IF;
  RETURN NEW;
END;
$$;

WITH first_15 AS (
  SELECT id
  FROM public.partners
  ORDER BY created_at ASC
  LIMIT 15
)
UPDATE public.partners p
SET is_founder = EXISTS (
  SELECT 1 FROM first_15 WHERE first_15.id = p.id
);