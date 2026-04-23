import { supabase } from "@/integrations/supabase/client";

// As 3 ferramentas que compartilham a mesma biblioteca de "Fotos"
export const FOTOS_TOOLS = ["arcano_cloner", "veste_ai", "pose_maker"] as const;
export const FOTOS_CANONICAL_TOOL = "arcano_cloner";

export interface IALibraryCategory {
  id: string;
  name: string;
  slug: string;
  display_order: number;
}

/**
 * Busca as subcategorias canônicas (do Arcano Cloner) usadas para
 * classificar fotos nas 3 ferramentas (Cloner, Veste AI, Pose Maker).
 */
export async function fetchFotosSubcategories(): Promise<IALibraryCategory[]> {
  const { data, error } = await supabase
    .from("ai_tool_library_categories")
    .select("id, name, slug, display_order")
    .eq("tool_slug", FOTOS_CANONICAL_TOOL)
    .order("display_order", { ascending: true });
  if (error) {
    console.error("[iaLibrarySync] fetch subcategories failed:", error);
    return [];
  }
  return data || [];
}

/**
 * Descobre em qual subcategoria (slug) o prompt está atualmente,
 * olhando para a categoria associada ao item no Arcano Cloner.
 */
export async function getCurrentSubcategorySlug(sourceId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("ai_tool_library_items")
    .select("category_id, ai_tool_library_categories!inner(slug, tool_slug)")
    .eq("source_id", sourceId)
    .eq("tool_slug", FOTOS_CANONICAL_TOOL)
    .maybeSingle();
  if (error || !data) return null;
  // @ts-ignore – join shape
  return data.ai_tool_library_categories?.slug ?? null;
}

/**
 * Sincroniza o item (prompt) nas 3 ferramentas (arcano_cloner, veste_ai, pose_maker)
 * dentro da categoria com o slug informado. Se subcategorySlug for null/vazio,
 * remove o item das 3 bibliotecas.
 */
export async function syncFotoToAllTools(
  sourceId: string,
  subcategorySlug: string | null,
  sourceTable: string = "admin_prompts"
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!subcategorySlug) {
      // Remove de todas as 3 bibliotecas
      const { error: delErr } = await supabase
        .from("ai_tool_library_items")
        .delete()
        .eq("source_id", sourceId)
        .in("tool_slug", FOTOS_TOOLS as unknown as string[]);
      if (delErr) throw delErr;
      return { success: true };
    }

    // Busca as categorias (uma por ferramenta) que casam com o slug
    const { data: cats, error: catErr } = await supabase
      .from("ai_tool_library_categories")
      .select("id, tool_slug")
      .in("tool_slug", FOTOS_TOOLS as unknown as string[])
      .eq("slug", subcategorySlug);
    if (catErr) throw catErr;

    if (!cats || cats.length === 0) {
      return { success: false, error: `Subcategoria '${subcategorySlug}' não encontrada` };
    }

    const rows = cats.map((c) => ({
      tool_slug: c.tool_slug,
      source_table: sourceTable,
      source_id: sourceId,
      category_id: c.id,
      is_visible: true,
      display_order: 0,
    }));

    const { error: upsertErr } = await supabase
      .from("ai_tool_library_items")
      .upsert(rows, { onConflict: "tool_slug,source_id" });
    if (upsertErr) throw upsertErr;

    return { success: true };
  } catch (e: any) {
    console.error("[iaLibrarySync] syncFotoToAllTools failed:", e);
    return { success: false, error: e.message || "Falha ao sincronizar bibliotecas" };
  }
}
