
ALTER TABLE public.admin_collections
  ADD COLUMN IF NOT EXISTS partner_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_admin_collections_partner_id
  ON public.admin_collections(partner_id);

-- Policies for partners managing own collections
DROP POLICY IF EXISTS "Partners can view own collections" ON public.admin_collections;
CREATE POLICY "Partners can view own collections"
  ON public.admin_collections FOR SELECT
  USING (partner_id IS NOT NULL AND partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can create own collections" ON public.admin_collections;
CREATE POLICY "Partners can create own collections"
  ON public.admin_collections FOR INSERT
  WITH CHECK (partner_id IS NOT NULL AND partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can update own collections" ON public.admin_collections;
CREATE POLICY "Partners can update own collections"
  ON public.admin_collections FOR UPDATE
  USING (partner_id IS NOT NULL AND partner_id = auth.uid())
  WITH CHECK (partner_id IS NOT NULL AND partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can delete own collections" ON public.admin_collections;
CREATE POLICY "Partners can delete own collections"
  ON public.admin_collections FOR DELETE
  USING (partner_id IS NOT NULL AND partner_id = auth.uid());

-- Policies for partners managing items inside their own collections (only their approved prompts)
DROP POLICY IF EXISTS "Partners can insert items in own collections" ON public.admin_collection_items;
CREATE POLICY "Partners can insert items in own collections"
  ON public.admin_collection_items FOR INSERT
  WITH CHECK (
    prompt_type = 'partner'
    AND EXISTS (
      SELECT 1 FROM public.admin_collections c
      WHERE c.id = collection_id
        AND c.partner_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.partner_prompts p
      WHERE p.id = prompt_id
        AND p.partner_id = auth.uid()
        AND p.approved = true
        AND COALESCE(p.rejected, false) = false
    )
  );

DROP POLICY IF EXISTS "Partners can delete items in own collections" ON public.admin_collection_items;
CREATE POLICY "Partners can delete items in own collections"
  ON public.admin_collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_collections c
      WHERE c.id = collection_id
        AND c.partner_id = auth.uid()
    )
  );
