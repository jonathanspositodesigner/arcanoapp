
-- Trigger function to limit cinema_characters to 20 per user
CREATE OR REPLACE FUNCTION public.check_cinema_characters_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.cinema_characters
  WHERE user_id = NEW.user_id;

  IF current_count >= 20 THEN
    RAISE EXCEPTION 'Limite de 20 personagens atingido';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_cinema_characters_limit
  BEFORE INSERT ON public.cinema_characters
  FOR EACH ROW
  EXECUTE FUNCTION public.check_cinema_characters_limit();

-- Trigger function to limit cinema_scenarios to 20 per user
CREATE OR REPLACE FUNCTION public.check_cinema_scenarios_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.cinema_scenarios
  WHERE user_id = NEW.user_id;

  IF current_count >= 20 THEN
    RAISE EXCEPTION 'Limite de 20 cenários atingido';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_cinema_scenarios_limit
  BEFORE INSERT ON public.cinema_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.check_cinema_scenarios_limit();
