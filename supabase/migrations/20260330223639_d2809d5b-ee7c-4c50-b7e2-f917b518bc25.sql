
-- 1. Create ai_tool_registry table
CREATE TABLE IF NOT EXISTS public.ai_tool_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  tool_name TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  storage_folder TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  expiry_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Populate with all current AI tools
INSERT INTO public.ai_tool_registry (table_name, tool_name, media_type, storage_folder) VALUES
  ('upscaler_jobs', 'Upscaler Arcano', 'image', 'upscaler'),
  ('pose_changer_jobs', 'Pose Changer', 'image', 'pose-changer'),
  ('veste_ai_jobs', 'Veste AI', 'image', 'veste-ai'),
  ('video_upscaler_jobs', 'Video Upscaler', 'video', 'video-upscaler'),
  ('character_generator_jobs', 'Gerador Avatar', 'image', 'character-generator'),
  ('arcano_cloner_jobs', 'Arcano Cloner', 'image', 'arcano-cloner'),
  ('image_generator_jobs', 'Gerar Imagem', 'image', 'image-generator'),
  ('video_generator_jobs', 'Gerar Vídeo', 'video', 'video-generator'),
  ('flyer_maker_jobs', 'Flyer Maker', 'image', 'flyer-maker'),
  ('bg_remover_jobs', 'Remover Fundo', 'image', 'bg-remover'),
  ('movieled_maker_jobs', 'MovieLed Maker', 'video', 'movieled')
ON CONFLICT (table_name) DO NOTHING;

-- 3. RLS
ALTER TABLE public.ai_tool_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ai_tool_registry" ON public.ai_tool_registry FOR SELECT USING (true);

-- 4. Rewrite get_user_ai_creations to be dynamic
CREATE OR REPLACE FUNCTION public.get_user_ai_creations(
  p_media_type TEXT DEFAULT 'all',
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 24
)
RETURNS TABLE(
  id UUID,
  output_url TEXT,
  thumbnail_url TEXT,
  tool_name TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_cutoff TIMESTAMPTZ := '2026-02-12T00:00:00Z';
  v_sql TEXT := '';
  v_tool RECORD;
  v_first BOOLEAN := TRUE;
BEGIN
  FOR v_tool IN
    SELECT r.table_name, r.tool_name, r.media_type, r.expiry_hours
    FROM ai_tool_registry r
    WHERE r.enabled = true
      AND (p_media_type = 'all' OR r.media_type = p_media_type)
  LOOP
    IF NOT v_first THEN
      v_sql := v_sql || ' UNION ALL ';
    END IF;
    v_first := FALSE;

    v_sql := v_sql || format(
      'SELECT t.id, t.output_url, t.thumbnail_url, %L::TEXT AS tool_name, %L::TEXT AS media_type, t.created_at,
        CASE WHEN t.created_at >= %L::timestamptz THEN (t.completed_at + interval ''24 hours'') ELSE (t.completed_at + interval ''5 days'') END AS expires_at
       FROM %I t
       WHERE t.user_id = %L AND t.status = ''completed'' AND t.output_url IS NOT NULL
         AND CASE WHEN t.created_at >= %L::timestamptz THEN (t.completed_at + interval ''24 hours'') > now() ELSE (t.completed_at + interval ''5 days'') > now() END',
      v_tool.tool_name, v_tool.media_type, v_cutoff, v_tool.table_name, v_user_id, v_cutoff
    );
  END LOOP;

  IF v_sql = '' THEN
    RETURN;
  END IF;

  v_sql := 'SELECT * FROM (' || v_sql || ') sub ORDER BY sub.created_at DESC LIMIT ' || p_limit || ' OFFSET ' || p_offset;

  RETURN QUERY EXECUTE v_sql;
END;
$function$;

-- 5. Rewrite delete_user_ai_creation to be dynamic
CREATE OR REPLACE FUNCTION public.delete_user_ai_creation(p_creation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_tool RECORD;
BEGIN
  FOR v_tool IN
    SELECT r.table_name FROM ai_tool_registry r WHERE r.enabled = true
  LOOP
    EXECUTE format(
      'DELETE FROM %I WHERE id = $1 AND user_id = $2 AND status = ''completed''',
      v_tool.table_name
    ) USING p_creation_id, v_user_id;

    IF FOUND THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$function$;
