-- Triggers para espelhar automaticamente categorias e itens entre as 3 ferramentas
-- (arcano_cloner, veste_ai, pose_maker) que compartilham a mesma biblioteca de "Fotos".

-- =========================================================================
-- 1) ESPELHO DE CATEGORIAS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.mirror_fotos_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fotos_tools text[] := ARRAY['arcano_cloner','veste_ai','pose_maker'];
  other_tool text;
BEGIN
  -- Evita loops: se já estamos dentro de uma execução de mirror, sai.
  IF current_setting('app.mirror_fotos_running', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Só age para as 3 ferramentas
  IF (TG_OP = 'DELETE' AND NOT (OLD.tool_slug = ANY(fotos_tools))) THEN
    RETURN OLD;
  END IF;
  IF (TG_OP IN ('INSERT','UPDATE') AND NOT (NEW.tool_slug = ANY(fotos_tools))) THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.mirror_fotos_running', 'on', true);

  IF TG_OP = 'INSERT' THEN
    FOREACH other_tool IN ARRAY fotos_tools LOOP
      IF other_tool <> NEW.tool_slug THEN
        INSERT INTO public.ai_tool_library_categories (tool_slug, slug, name, display_order)
        VALUES (other_tool, NEW.slug, NEW.name, NEW.display_order)
        ON CONFLICT (tool_slug, slug) DO UPDATE
          SET name = EXCLUDED.name,
              display_order = EXCLUDED.display_order,
              updated_at = now();
      END IF;
    END LOOP;

  ELSIF TG_OP = 'UPDATE' THEN
    FOREACH other_tool IN ARRAY fotos_tools LOOP
      IF other_tool <> NEW.tool_slug THEN
        -- Se o slug foi alterado, precisamos atualizar pelo slug antigo
        UPDATE public.ai_tool_library_categories
           SET slug = NEW.slug,
               name = NEW.name,
               display_order = NEW.display_order,
               updated_at = now()
         WHERE tool_slug = other_tool AND slug = OLD.slug;
        -- Se não existia ainda na outra ferramenta, cria
        IF NOT FOUND THEN
          INSERT INTO public.ai_tool_library_categories (tool_slug, slug, name, display_order)
          VALUES (other_tool, NEW.slug, NEW.name, NEW.display_order)
          ON CONFLICT (tool_slug, slug) DO UPDATE
            SET name = EXCLUDED.name,
                display_order = EXCLUDED.display_order,
                updated_at = now();
        END IF;
      END IF;
    END LOOP;

  ELSIF TG_OP = 'DELETE' THEN
    FOREACH other_tool IN ARRAY fotos_tools LOOP
      IF other_tool <> OLD.tool_slug THEN
        DELETE FROM public.ai_tool_library_categories
         WHERE tool_slug = other_tool AND slug = OLD.slug;
      END IF;
    END LOOP;
  END IF;

  PERFORM set_config('app.mirror_fotos_running', 'off', true);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_fotos_categories ON public.ai_tool_library_categories;
CREATE TRIGGER trg_mirror_fotos_categories
AFTER INSERT OR UPDATE OR DELETE ON public.ai_tool_library_categories
FOR EACH ROW EXECUTE FUNCTION public.mirror_fotos_categories();


-- =========================================================================
-- 2) ESPELHO DE ITENS (prompt → categoria, ordem, visibilidade)
-- =========================================================================
-- Garantia: cada (tool_slug, source_id) é único — necessário para o upsert.
-- Já existe um índice/constraint? Cria se faltar.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ai_tool_library_items'::regclass
      AND conname = 'ai_tool_library_items_tool_source_unique'
  ) THEN
    BEGIN
      ALTER TABLE public.ai_tool_library_items
        ADD CONSTRAINT ai_tool_library_items_tool_source_unique
        UNIQUE (tool_slug, source_id);
    EXCEPTION WHEN duplicate_table OR unique_violation THEN
      -- Se houver duplicados existentes, ignoramos a criação aqui;
      -- o trigger ainda funcionará via UPDATE/INSERT manual.
      NULL;
    END;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.mirror_fotos_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fotos_tools text[] := ARRAY['arcano_cloner','veste_ai','pose_maker'];
  other_tool text;
  target_cat_id uuid;
  src_slug text;
BEGIN
  IF current_setting('app.mirror_fotos_items_running', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF (TG_OP = 'DELETE' AND NOT (OLD.tool_slug = ANY(fotos_tools))) THEN
    RETURN OLD;
  END IF;
  IF (TG_OP IN ('INSERT','UPDATE') AND NOT (NEW.tool_slug = ANY(fotos_tools))) THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.mirror_fotos_items_running', 'on', true);

  IF TG_OP IN ('INSERT','UPDATE') THEN
    -- Descobre o slug da categoria do registro de origem
    SELECT slug INTO src_slug
      FROM public.ai_tool_library_categories
     WHERE id = NEW.category_id;

    FOREACH other_tool IN ARRAY fotos_tools LOOP
      IF other_tool <> NEW.tool_slug THEN
        -- Resolve a categoria correspondente na outra ferramenta (mesmo slug)
        target_cat_id := NULL;
        IF src_slug IS NOT NULL THEN
          SELECT id INTO target_cat_id
            FROM public.ai_tool_library_categories
           WHERE tool_slug = other_tool AND slug = src_slug;
        END IF;

        INSERT INTO public.ai_tool_library_items
          (tool_slug, source_table, source_id, category_id, is_visible, display_order)
        VALUES
          (other_tool, NEW.source_table, NEW.source_id, target_cat_id, NEW.is_visible, NEW.display_order)
        ON CONFLICT (tool_slug, source_id) DO UPDATE
          SET category_id = EXCLUDED.category_id,
              is_visible  = EXCLUDED.is_visible,
              display_order = EXCLUDED.display_order,
              source_table = EXCLUDED.source_table,
              updated_at = now();
      END IF;
    END LOOP;

  ELSIF TG_OP = 'DELETE' THEN
    FOREACH other_tool IN ARRAY fotos_tools LOOP
      IF other_tool <> OLD.tool_slug THEN
        DELETE FROM public.ai_tool_library_items
         WHERE tool_slug = other_tool AND source_id = OLD.source_id;
      END IF;
    END LOOP;
  END IF;

  PERFORM set_config('app.mirror_fotos_items_running', 'off', true);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_fotos_items ON public.ai_tool_library_items;
CREATE TRIGGER trg_mirror_fotos_items
AFTER INSERT OR UPDATE OR DELETE ON public.ai_tool_library_items
FOR EACH ROW EXECUTE FUNCTION public.mirror_fotos_items();