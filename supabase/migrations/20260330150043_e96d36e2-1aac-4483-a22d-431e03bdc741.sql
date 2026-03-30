CREATE OR REPLACE FUNCTION public.admin_search_pack_clients(
  p_search text DEFAULT NULL,
  p_pack_filter text DEFAULT NULL,
  p_status_filter text DEFAULT NULL,
  p_sort_field text DEFAULT 'purchase_date',
  p_sort_direction text DEFAULT 'desc',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_offset integer;
  v_total_clients integer;
  v_total_purchases integer;
  v_expired_some integer;
  v_expired_all integer;
  v_expiring_30d integer;
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  v_offset := (p_page - 1) * p_page_size;

  WITH filtered_purchases AS (
    SELECT 
      upp.id,
      upp.user_id,
      upp.pack_slug,
      upp.access_type,
      upp.has_bonus_access,
      upp.is_active,
      upp.purchased_at,
      upp.expires_at,
      upp.greenn_contract_id,
      upp.product_name,
      p.email as user_email,
      p.name as user_name,
      p.phone as user_phone
    FROM user_pack_purchases upp
    JOIN profiles p ON p.id = upp.user_id
    WHERE 
      (p_search IS NULL OR p_search = '' OR 
        p.email ILIKE '%' || p_search || '%' OR 
        p.name ILIKE '%' || p_search || '%' OR
        upp.pack_slug ILIKE '%' || p_search || '%')
      AND (p_pack_filter IS NULL OR p_pack_filter = 'all' OR upp.pack_slug = p_pack_filter)
      AND (p_status_filter IS NULL OR p_status_filter = 'all' OR
        (p_status_filter = 'active' AND upp.is_active = true) OR
        (p_status_filter = 'inactive' AND upp.is_active = false))
  ),
  orphan_profiles AS (
    SELECT 
      p.id as user_id,
      p.email as user_email,
      p.name as user_name,
      p.phone as user_phone,
      p.created_at
    FROM profiles p
    WHERE 
      p_search IS NOT NULL AND p_search != '' AND length(p_search) >= 3 AND
      (p.email ILIKE '%' || p_search || '%' OR p.name ILIKE '%' || p_search || '%')
      AND NOT EXISTS (SELECT 1 FROM filtered_purchases fp WHERE fp.user_id = p.id)
      AND (p_pack_filter IS NULL OR p_pack_filter = 'all')
      AND (p_status_filter IS NULL OR p_status_filter = 'all' OR p_status_filter = 'inactive')
  ),
  grouped_clients AS (
    SELECT 
      user_id,
      MAX(user_email) as user_email,
      MAX(user_name) as user_name,
      MAX(user_phone) as user_phone,
      COUNT(*)::int as pack_count,
      MAX(purchased_at) as latest_purchase,
      MIN(CASE WHEN is_active AND expires_at IS NOT NULL THEN expires_at END) as earliest_expiration,
      bool_or(access_type::text = 'vitalicio') as has_vitalicio
    FROM filtered_purchases
    GROUP BY user_id
    
    UNION ALL
    
    SELECT
      user_id,
      user_email,
      user_name,
      user_phone,
      0 as pack_count,
      created_at as latest_purchase,
      NULL::timestamptz as earliest_expiration,
      false as has_vitalicio
    FROM orphan_profiles
  ),
  sorted_clients AS (
    SELECT *,
      COUNT(*) OVER() as total_count
    FROM grouped_clients
    ORDER BY
      CASE WHEN p_sort_field = 'name' AND p_sort_direction = 'asc' THEN LOWER(COALESCE(user_name, user_email, '')) END ASC NULLS LAST,
      CASE WHEN p_sort_field = 'name' AND p_sort_direction = 'desc' THEN LOWER(COALESCE(user_name, user_email, '')) END DESC NULLS LAST,
      CASE WHEN p_sort_field = 'purchase_date' AND p_sort_direction = 'asc' THEN latest_purchase END ASC NULLS LAST,
      CASE WHEN p_sort_field = 'purchase_date' AND p_sort_direction = 'desc' THEN latest_purchase END DESC NULLS LAST,
      CASE WHEN p_sort_field = 'packs' AND p_sort_direction = 'asc' THEN pack_count END ASC NULLS LAST,
      CASE WHEN p_sort_field = 'packs' AND p_sort_direction = 'desc' THEN pack_count END DESC NULLS LAST,
      CASE WHEN p_sort_field = 'expires_at' AND p_sort_direction = 'asc' THEN COALESCE(earliest_expiration, '9999-12-31'::timestamptz) END ASC,
      CASE WHEN p_sort_field = 'expires_at' AND p_sort_direction = 'desc' THEN COALESCE(earliest_expiration, '0001-01-01'::timestamptz) END DESC
    LIMIT p_page_size OFFSET v_offset
  ),
  page_user_ids AS (
    SELECT user_id FROM sorted_clients
  ),
  page_purchases AS (
    SELECT 
      upp.user_id,
      jsonb_agg(
        jsonb_build_object(
          'id', upp.id,
          'user_id', upp.user_id,
          'pack_slug', upp.pack_slug,
          'access_type', upp.access_type,
          'has_bonus_access', upp.has_bonus_access,
          'is_active', upp.is_active,
          'purchased_at', upp.purchased_at,
          'expires_at', upp.expires_at,
          'greenn_contract_id', upp.greenn_contract_id,
          'product_name', upp.product_name
        ) ORDER BY upp.purchased_at DESC
      ) as purchases
    FROM user_pack_purchases upp
    WHERE upp.user_id IN (SELECT user_id FROM page_user_ids)
    GROUP BY upp.user_id
  )
  SELECT jsonb_build_object(
    'clients', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'user_id', sc.user_id,
          'user_email', sc.user_email,
          'user_name', sc.user_name,
          'user_phone', sc.user_phone,
          'pack_count', sc.pack_count,
          'latest_purchase', sc.latest_purchase,
          'earliest_expiration', sc.earliest_expiration,
          'has_vitalicio', sc.has_vitalicio,
          'purchases', COALESCE(pp.purchases, '[]'::jsonb)
        )
      )
      FROM sorted_clients sc
      LEFT JOIN page_purchases pp ON pp.user_id = sc.user_id
    ), '[]'::jsonb),
    'total_count', COALESCE((SELECT total_count FROM sorted_clients LIMIT 1), 0),
    'page', p_page,
    'page_size', p_page_size
  ) INTO v_result;

  SELECT COUNT(DISTINCT user_id)::int INTO v_total_clients FROM user_pack_purchases;
  SELECT COUNT(*)::int INTO v_total_purchases FROM user_pack_purchases;
  
  SELECT COUNT(DISTINCT user_id)::int INTO v_expired_some
  FROM user_pack_purchases WHERE expires_at IS NOT NULL AND expires_at < now();
  
  SELECT COUNT(*)::int INTO v_expired_all
  FROM (
    SELECT user_id FROM user_pack_purchases
    GROUP BY user_id
    HAVING bool_and(expires_at IS NOT NULL AND expires_at < now())
  ) sub;
  
  SELECT COUNT(DISTINCT user_id)::int INTO v_expiring_30d
  FROM user_pack_purchases
  WHERE is_active AND expires_at IS NOT NULL AND expires_at <= now() + interval '30 days' AND expires_at > now();

  v_result := v_result || jsonb_build_object(
    'stats', jsonb_build_object(
      'total_clients', v_total_clients,
      'total_purchases', v_total_purchases,
      'expired_some', v_expired_some,
      'expired_all', v_expired_all,
      'expiring_30d', v_expiring_30d
    )
  );

  RETURN v_result;
END;
$$;