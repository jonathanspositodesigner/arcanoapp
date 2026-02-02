-- ====================================================================
-- SECURITY FIX: Add auth.uid() validation to client-callable functions
-- ====================================================================

-- 1. Fix has_pack_access - validate caller owns the user_id
CREATE OR REPLACE FUNCTION public.has_pack_access(_user_id uuid, _pack_slug text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Security check: only allow checking own access or via service role
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Access denied: cannot check another user pack access';
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM user_pack_purchases
    WHERE user_id = _user_id
    AND pack_slug = _pack_slug
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$function$;

-- 2. Fix has_bonus_access - validate caller owns the user_id
CREATE OR REPLACE FUNCTION public.has_bonus_access(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Security check: only allow checking own access or via service role
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Access denied: cannot check another user bonus access';
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM user_pack_purchases
    WHERE user_id = _user_id
    AND has_bonus_access = true
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$function$;

-- 3. Fix get_user_packs - validate caller owns the user_id
CREATE OR REPLACE FUNCTION public.get_user_packs(_user_id uuid)
 RETURNS TABLE(pack_slug text, access_type artes_access_type, has_bonus boolean, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Security check: only allow checking own packs or via service role
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Access denied: cannot view another user packs';
  END IF;
  
  RETURN QUERY
  SELECT upp.pack_slug, upp.access_type, upp.has_bonus_access, upp.expires_at
  FROM user_pack_purchases upp
  WHERE upp.user_id = _user_id
  AND upp.is_active = true
  AND (upp.expires_at IS NULL OR upp.expires_at > now());
END;
$function$;

-- 4. Fix get_user_expired_packs - validate caller owns the user_id
CREATE OR REPLACE FUNCTION public.get_user_expired_packs(_user_id uuid)
 RETURNS TABLE(pack_slug text, access_type artes_access_type, has_bonus boolean, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Security check: only allow checking own expired packs or via service role
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Access denied: cannot view another user expired packs';
  END IF;
  
  RETURN QUERY
  SELECT upp.pack_slug, upp.access_type, upp.has_bonus_access, upp.expires_at
  FROM user_pack_purchases upp
  WHERE upp.user_id = _user_id
  AND upp.is_active = true
  AND upp.access_type != 'vitalicio'
  AND upp.expires_at IS NOT NULL 
  AND upp.expires_at < now();
END;
$function$;

-- 5. Fix consume_upscaler_credits - validate caller owns the user_id
CREATE OR REPLACE FUNCTION public.consume_upscaler_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Upscaler usage'::text)
 RETURNS TABLE(success boolean, new_balance integer, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_monthly INTEGER;
  current_lifetime INTEGER;
  total_balance INTEGER;
  monthly_to_consume INTEGER;
  lifetime_to_consume INTEGER;
  updated_monthly INTEGER;
  updated_lifetime INTEGER;
BEGIN
  -- Security check: only allow consuming own credits or via service role
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RETURN QUERY SELECT FALSE, 0, 'Access denied: cannot consume another user credits'::TEXT;
    RETURN;
  END IF;

  -- Validate amount is positive and reasonable
  IF _amount <= 0 OR _amount > 10000 THEN
    RETURN QUERY SELECT FALSE, 0, 'Invalid amount'::TEXT;
    RETURN;
  END IF;

  -- Get current balances (or create if not exists)
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT monthly_balance, lifetime_balance INTO current_monthly, current_lifetime
  FROM upscaler_credits
  WHERE user_id = _user_id
  FOR UPDATE;
  
  total_balance := current_monthly + current_lifetime;
  
  IF total_balance < _amount THEN
    RETURN QUERY SELECT FALSE, total_balance, 'Saldo insuficiente'::TEXT;
    RETURN;
  END IF;
  
  -- Consume from monthly first, then lifetime
  IF current_monthly >= _amount THEN
    monthly_to_consume := _amount;
    lifetime_to_consume := 0;
  ELSE
    monthly_to_consume := current_monthly;
    lifetime_to_consume := _amount - current_monthly;
  END IF;
  
  updated_monthly := current_monthly - monthly_to_consume;
  updated_lifetime := current_lifetime - lifetime_to_consume;
  
  UPDATE upscaler_credits
  SET 
    monthly_balance = updated_monthly, 
    lifetime_balance = updated_lifetime,
    balance = updated_monthly + updated_lifetime,
    updated_at = now()
  WHERE user_id = _user_id;
  
  -- Log the transaction with credit_type info
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, -_amount, updated_monthly + updated_lifetime, 'consumption', _description, 
     CASE WHEN lifetime_to_consume > 0 THEN 'mixed' ELSE 'monthly' END);
  
  RETURN QUERY SELECT TRUE, updated_monthly + updated_lifetime, NULL::TEXT;
END;
$function$;

-- 6. Fix add_upscaler_credits - admin only
CREATE OR REPLACE FUNCTION public.add_upscaler_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Credit added'::text)
 RETURNS TABLE(success boolean, new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_balance INTEGER;
BEGIN
  -- Security check: only admins can add credits (via service role when auth.uid() is null)
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required to add credits';
  END IF;

  -- Validate amount is positive and reasonable
  IF _amount <= 0 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  -- Insert or update monthly credits
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (_user_id, _amount, _amount, 0)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    monthly_balance = upscaler_credits.monthly_balance + _amount,
    balance = upscaler_credits.monthly_balance + _amount + upscaler_credits.lifetime_balance,
    updated_at = now()
  RETURNING monthly_balance + lifetime_balance INTO updated_balance;
  
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, _amount, updated_balance, 'credit', _description, 'monthly');
  
  RETURN QUERY SELECT TRUE, updated_balance;
END;
$function$;

-- 7. Fix reset_upscaler_credits - admin only
CREATE OR REPLACE FUNCTION public.reset_upscaler_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Subscription credits reset'::text)
 RETURNS TABLE(success boolean, new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_lifetime INTEGER;
  updated_balance INTEGER;
BEGIN
  -- Security check: only admins can reset credits (via service role when auth.uid() is null)
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required to reset credits';
  END IF;

  -- Validate amount is non-negative and reasonable
  IF _amount < 0 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  -- Get current lifetime balance or create record
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (_user_id, _amount, _amount, 0)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    monthly_balance = _amount, 
    balance = _amount + upscaler_credits.lifetime_balance,
    updated_at = now()
  RETURNING monthly_balance + lifetime_balance INTO updated_balance;
  
  -- Log transaction
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, _amount, updated_balance, 'reset', _description, 'monthly');
  
  RETURN QUERY SELECT TRUE, updated_balance;
END;
$function$;

-- 8. Fix add_lifetime_credits - admin only
CREATE OR REPLACE FUNCTION public.add_lifetime_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Lifetime credit added'::text)
 RETURNS TABLE(success boolean, new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_balance INTEGER;
BEGIN
  -- Security check: only admins can add lifetime credits (via service role when auth.uid() is null)
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required to add lifetime credits';
  END IF;

  -- Validate amount is positive and reasonable
  IF _amount <= 0 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  -- Insert or update lifetime credits
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (_user_id, _amount, 0, _amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    lifetime_balance = upscaler_credits.lifetime_balance + _amount,
    balance = upscaler_credits.monthly_balance + upscaler_credits.lifetime_balance + _amount,
    updated_at = now()
  RETURNING monthly_balance + lifetime_balance INTO updated_balance;
  
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, _amount, updated_balance, 'credit', _description, 'lifetime');
  
  RETURN QUERY SELECT TRUE, updated_balance;
END;
$function$;

-- 9. Fix get_daily_copy_count - validate caller owns the user_id
CREATE OR REPLACE FUNCTION public.get_daily_copy_count(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Security check: only allow checking own copy count or via service role
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Access denied: cannot check another user copy count';
  END IF;
  
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.daily_prompt_copies
    WHERE user_id = _user_id
      AND copy_date = CURRENT_DATE
  );
END;
$function$;

-- 10. Fix get_daily_arte_copy_count - validate caller owns the user_id
CREATE OR REPLACE FUNCTION public.get_daily_arte_copy_count(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Security check: only allow checking own copy count or via service role
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Access denied: cannot check another user arte copy count';
  END IF;
  
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.daily_arte_copies
    WHERE user_id = _user_id
      AND copy_date = CURRENT_DATE
  );
END;
$function$;

-- 11. Fix get_daily_musicos_download_count - validate caller owns the user_id
CREATE OR REPLACE FUNCTION public.get_daily_musicos_download_count(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  download_count INTEGER;
BEGIN
  -- Security check: only allow checking own download count or via service role
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Access denied: cannot check another user download count';
  END IF;
  
  SELECT COUNT(*)::INTEGER INTO download_count
  FROM daily_musicos_downloads
  WHERE user_id = _user_id
    AND download_date = CURRENT_DATE;
  
  RETURN COALESCE(download_count, 0);
END;
$function$;

-- 12. Fix check_profile_exists - add email format validation
CREATE OR REPLACE FUNCTION public.check_profile_exists(check_email text)
 RETURNS TABLE(exists_in_db boolean, password_changed boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Basic email format validation
  IF check_email IS NULL OR LENGTH(check_email) < 3 OR LENGTH(check_email) > 320 THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, FALSE::BOOLEAN;
    RETURN;
  END IF;
  
  -- Check for basic email format (contains @ and .)
  IF check_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, FALSE::BOOLEAN;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    TRUE as exists_in_db,
    COALESCE(p.password_changed, false) as password_changed
  FROM profiles p
  WHERE LOWER(p.email) = LOWER(check_email)
  LIMIT 1;
  
  -- If not found, return that doesn't exist
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, FALSE::BOOLEAN;
  END IF;
END;
$function$;

-- 13. Fix get_upscaler_credits - validate caller owns the user_id
CREATE OR REPLACE FUNCTION public.get_upscaler_credits(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Security check: only allow checking own credits or via service role
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Access denied: cannot check another user credits';
  END IF;
  
  RETURN COALESCE(
    (SELECT monthly_balance + lifetime_balance FROM upscaler_credits WHERE user_id = _user_id),
    0
  );
END;
$function$;

-- 14. Fix get_upscaler_credits_breakdown - validate caller owns the user_id
CREATE OR REPLACE FUNCTION public.get_upscaler_credits_breakdown(_user_id uuid)
 RETURNS TABLE(total integer, monthly integer, lifetime integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Security check: only allow checking own credits or via service role
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Access denied: cannot check another user credits breakdown';
  END IF;
  
  RETURN QUERY
  SELECT 
    COALESCE(uc.monthly_balance + uc.lifetime_balance, 0) as total,
    COALESCE(uc.monthly_balance, 0) as monthly,
    COALESCE(uc.lifetime_balance, 0) as lifetime
  FROM upscaler_credits uc
  WHERE uc.user_id = _user_id
  UNION ALL
  SELECT 0, 0, 0
  WHERE NOT EXISTS (SELECT 1 FROM upscaler_credits WHERE user_id = _user_id)
  LIMIT 1;
END;
$function$;