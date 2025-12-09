
-- Create function to get user's expired packs
CREATE OR REPLACE FUNCTION public.get_user_expired_packs(_user_id uuid)
RETURNS TABLE(pack_slug text, access_type artes_access_type, has_bonus boolean, expires_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT pack_slug, access_type, has_bonus_access, expires_at
  FROM user_pack_purchases
  WHERE user_id = _user_id
  AND is_active = true
  AND access_type != 'vitalicio'
  AND expires_at IS NOT NULL 
  AND expires_at < now()
$$;
