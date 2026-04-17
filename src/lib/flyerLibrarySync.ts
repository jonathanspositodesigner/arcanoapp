import { supabase } from "@/integrations/supabase/client";

/**
 * Vincula uma arte (admin_artes ou partner_artes) à categoria correspondente
 * da biblioteca do Flyer Maker (ai_tool_library_items).
 *
 * @param subcategorySlug slug da categoria (ex: 'evento', 'agenda-de-artista')
 * @param sourceTable    'admin_artes' | 'partner_artes'
 * @param sourceId       id da arte
 */
export async function linkArteToFlyerLibrary(
  subcategorySlug: string | null | undefined,
  sourceTable: "admin_artes" | "partner_artes",
  sourceId: string
): Promise<void> {
  if (!subcategorySlug) return;

  try {
    // 1) Encontrar a categoria do flyer_maker pelo slug
    const { data: category, error: catError } = await supabase
      .from("ai_tool_library_categories")
      .select("id")
      .eq("tool_slug", "flyer_maker")
      .eq("slug", subcategorySlug)
      .maybeSingle();

    if (catError || !category) {
      console.warn("[flyerLibrarySync] Categoria não encontrada:", subcategorySlug);
      return;
    }

    // 2) Verificar se já existe um item para essa arte (evita duplicar)
    const { data: existing } = await supabase
      .from("ai_tool_library_items")
      .select("id")
      .eq("tool_slug", "flyer_maker")
      .eq("source_table", sourceTable)
      .eq("source_id", sourceId)
      .maybeSingle();

    if (existing) {
      // Atualiza categoria caso tenha mudado
      await supabase
        .from("ai_tool_library_items")
        .update({ category_id: category.id, is_visible: true })
        .eq("id", existing.id);
      return;
    }

    // 3) Inserir item novo
    await supabase.from("ai_tool_library_items").insert({
      tool_slug: "flyer_maker",
      category_id: category.id,
      source_table: sourceTable,
      source_id: sourceId,
      is_visible: true,
    });
  } catch (err) {
    console.error("[flyerLibrarySync] Erro ao vincular arte à biblioteca:", err);
  }
}
