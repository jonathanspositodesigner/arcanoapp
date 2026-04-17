import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TOOL_META: Record<string, { name: string; sourceTable: "admin_prompts" | "admin_artes"; sourceCategory?: string; hasCategories: boolean }> = {
  arcano_cloner: { name: "Arcano Cloner", sourceTable: "admin_prompts", sourceCategory: "Fotos", hasCategories: true },
  veste_ai: { name: "Veste AI", sourceTable: "admin_prompts", sourceCategory: "Fotos", hasCategories: true },
  pose_maker: { name: "Pose Maker", sourceTable: "admin_prompts", sourceCategory: "Fotos", hasCategories: true },
  flyer_maker: { name: "Flyer Maker", sourceTable: "admin_artes", hasCategories: true },
  seedance2: { name: "Seedance 2", sourceTable: "admin_prompts", sourceCategory: "Seedance 2", hasCategories: false },
};

interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
}

interface LibraryItem {
  id: string;
  source_id: string;
  category_id: string | null;
  is_visible: boolean;
  display_order: number;
  // joined source
  title?: string;
  image_url?: string;
  thumbnail_url?: string | null;
}

const IALibraryManager = () => {
  const { toolSlug = "" } = useParams();
  const navigate = useNavigate();
  const meta = TOOL_META[toolSlug];

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addAvailable, setAddAvailable] = useState<any[]>([]);
  const [addCategoryId, setAddCategoryId] = useState<string>("");
  const [addLoading, setAddLoading] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());

  // Category management
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");

  const loadAll = useCallback(async () => {
    if (!meta) return;
    setLoading(true);
    try {
      let cats: Category[] = [];
      if (meta.hasCategories) {
        const { data: catData } = await supabase
          .from("ai_tool_library_categories")
          .select("*")
          .eq("tool_slug", toolSlug)
          .order("display_order", { ascending: true });
        cats = catData || [];
        setCategories(cats);
      }

      const { data: itemData } = await supabase
        .from("ai_tool_library_items")
        .select("*")
        .eq("tool_slug", toolSlug)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      const sourceIds = Array.from(new Set((itemData || []).map((i) => i.source_id)));
      let sourcesById: Record<string, any> = {};
      if (sourceIds.length > 0) {
        const selectCols = meta.sourceTable === "admin_prompts"
          ? "id, title, image_url, thumbnail_url"
          : "id, title, image_url";
        const chunkSize = 150;
        const sourceChunks: any[] = [];

        for (let i = 0; i < sourceIds.length; i += chunkSize) {
          const chunk = sourceIds.slice(i, i + chunkSize);
          const { data: sources, error: srcErr } = await supabase
            .from(meta.sourceTable)
            .select(selectCols)
            .in("id", chunk);
          if (srcErr) {
            console.error("Source load error:", srcErr);
            continue;
          }
          sourceChunks.push(...(sources || []));
        }

        sourcesById = Object.fromEntries(sourceChunks.map((s: any) => [s.id, s]));
      }

      const enriched: LibraryItem[] = (itemData || []).map((it) => ({
        id: it.id,
        source_id: it.source_id,
        category_id: it.category_id,
        is_visible: it.is_visible,
        display_order: it.display_order,
        title: sourcesById[it.source_id]?.title,
        image_url: sourcesById[it.source_id]?.image_url,
        thumbnail_url: sourcesById[it.source_id]?.thumbnail_url,
      }));
      setItems(enriched);
    } finally {
      setLoading(false);
    }
  }, [toolSlug, meta]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (!meta) {
    return (
      <AdminLayoutPlatform platform="prompts">
        <div>Ferramenta inválida</div>
      </AdminLayoutPlatform>
    );
  }

  // ----- Category CRUD -----
  const createCategory = async () => {
    if (!newCatName.trim()) return;
    const slug = newCatName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { error } = await supabase.from("ai_tool_library_categories").insert({
      tool_slug: toolSlug,
      name: newCatName.trim(),
      slug,
      display_order: categories.length,
    });
    if (error) {
      toast.error("Erro ao criar categoria: " + error.message);
      return;
    }
    setNewCatName("");
    toast.success("Categoria criada");
    loadAll();
  };

  const renameCategory = async (id: string) => {
    if (!editCatName.trim()) return;
    const { error } = await supabase.from("ai_tool_library_categories").update({ name: editCatName.trim() }).eq("id", id);
    if (error) return toast.error(error.message);
    setEditingCat(null);
    toast.success("Categoria renomeada");
    loadAll();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Excluir esta categoria? Os itens não serão removidos, apenas ficarão sem categoria.")) return;
    const { error } = await supabase.from("ai_tool_library_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Categoria excluída");
    if (activeCategoryId === id) setActiveCategoryId("all");
    loadAll();
  };

  // ----- Item actions -----
  const toggleVisibility = async (item: LibraryItem) => {
    const { error } = await supabase.from("ai_tool_library_items").update({ is_visible: !item.is_visible }).eq("id", item.id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_visible: !i.is_visible } : i)));
  };

  const removeItem = async (item: LibraryItem) => {
    if (!confirm("Remover este item da biblioteca da ferramenta?")) return;
    const { error } = await supabase.from("ai_tool_library_items").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Item removido");
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const moveToCategory = async (item: LibraryItem, newCategoryId: string | null) => {
    const { error } = await supabase.from("ai_tool_library_items").update({ category_id: newCategoryId }).eq("id", item.id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, category_id: newCategoryId } : i)));
    toast.success("Categoria atualizada");
  };

  // ----- Add modal -----
  const openAddModal = async () => {
    setAddOpen(true);
    setAddLoading(true);
    setSelectedToAdd(new Set());
    setAddSearch("");
    setAddCategoryId(meta.hasCategories ? (categories[0]?.id || "") : "");
    try {
      const selectCols = meta.sourceTable === "admin_prompts"
        ? "id, title, image_url, thumbnail_url"
        : "id, title, image_url";
      let q = supabase
        .from(meta.sourceTable)
        .select(selectCols)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (meta.sourceCategory) q = q.eq("category", meta.sourceCategory);

      const { data: src, error } = await q;
      if (error) {
        console.error("Add modal load error:", error);
        toast.error("Erro: " + error.message);
        setAddAvailable([]);
        return;
      }

      const existingBySourceId = new Map(items.map((item) => [item.source_id, item]));
      setAddAvailable(
        (src || []).map((source: any) => ({
          ...source,
          alreadyInLibrary: existingBySourceId.has(source.id),
          currentCategoryId: existingBySourceId.get(source.id)?.category_id ?? null,
          currentVisibility: existingBySourceId.get(source.id)?.is_visible ?? false,
        }))
      );
    } finally {
      setAddLoading(false);
    }
  };

  const confirmAdd = async () => {
    if (selectedToAdd.size === 0) return;

    const rows = Array.from(selectedToAdd).map((sid, index) => ({
      tool_slug: toolSlug,
      source_table: meta.sourceTable,
      source_id: sid,
      category_id: meta.hasCategories ? (addCategoryId || null) : null,
      is_visible: true,
      display_order: items.length + index,
    }));

    const { error } = await supabase
      .from("ai_tool_library_items")
      .upsert(rows, { onConflict: "tool_slug,source_id" });

    if (error) return toast.error(error.message);

    toast.success(`${rows.length} item(ns) atualizado(s)`);
    setAddOpen(false);
    loadAll();
  };

  // Filter items by active category tab
  const visibleItems = items.filter((i) => {
    if (!meta.hasCategories || activeCategoryId === "all") return true;
    if (activeCategoryId === "uncategorized") return !i.category_id;
    return i.category_id === activeCategoryId;
  });

  const filteredAvailable = addAvailable.filter((a) =>
    !addSearch.trim() || (a.title || "").toLowerCase().includes(addSearch.toLowerCase())
  );

  return (
    <AdminLayoutPlatform platform="prompts">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin-ia-libraries")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{meta.name}</h1>
              <p className="text-sm text-muted-foreground">{items.length} item(ns) na biblioteca</p>
            </div>
          </div>
          <Button onClick={openAddModal} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>

        {meta.hasCategories && (
          <Card className="p-4 mb-4">
            <h3 className="text-sm font-semibold mb-3">Categorias</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md">
                  {editingCat === c.id ? (
                    <>
                      <Input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} className="h-7 w-32 text-sm" />
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => renameCategory(c.id)}><Check className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingCat(null)}><X className="h-3 w-3" /></Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">{c.name}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingCat(c.id); setEditCatName(c.name); }}><Pencil className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteCategory(c.id)}><Trash2 className="h-3 w-3" /></Button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nova categoria..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createCategory()}
                className="max-w-xs"
              />
              <Button onClick={createCategory} size="sm" className="gap-1"><Plus className="h-3 w-3" /> Criar</Button>
            </div>
          </Card>
        )}

        {meta.hasCategories && (
          <Tabs value={activeCategoryId} onValueChange={setActiveCategoryId} className="mb-4">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Todos ({items.length})</TabsTrigger>
              {categories.map((c) => (
                <TabsTrigger key={c.id} value={c.id}>
                  {c.name} ({items.filter((i) => i.category_id === c.id).length})
                </TabsTrigger>
              ))}
              <TabsTrigger value="uncategorized">Sem categoria ({items.filter((i) => !i.category_id).length})</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : visibleItems.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>Nenhum item nesta categoria.</p>
            <Button onClick={openAddModal} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Adicionar itens</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {visibleItems.map((item) => (
              <Card key={item.id} className={`p-2 ${!item.is_visible ? "opacity-50" : ""}`}>
                <div className="aspect-[3/4] bg-muted rounded-md overflow-hidden mb-2">
                  <img src={item.thumbnail_url || item.image_url} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs font-medium line-clamp-2 mb-2 min-h-[2rem]">{item.title || "Sem título"}</p>
                {meta.hasCategories && (
                  <Select value={item.category_id || "none"} onValueChange={(v) => moveToCategory(item, v === "none" ? null : v)}>
                    <SelectTrigger className="h-7 text-xs mb-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Switch checked={item.is_visible} onCheckedChange={() => toggleVisibility(item)} />
                    <span className="text-[10px] text-muted-foreground">{item.is_visible ? "Visível" : "Oculto"}</span>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(item)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add modal */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Adicionar à biblioteca de {meta.name}</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por título..." value={addSearch} onChange={(e) => setAddSearch(e.target.value)} className="pl-9" />
              </div>
              {meta.hasCategories && (
                <Select value={addCategoryId} onValueChange={setAddCategoryId}>
                  <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex-1 overflow-y-auto mt-3">
              {addLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : filteredAvailable.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Nenhum item disponível para adicionar.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {filteredAvailable.map((src) => {
                    const selected = selectedToAdd.has(src.id);
                    return (
                      <button
                        key={src.id}
                        onClick={() => {
                          const ns = new Set(selectedToAdd);
                          if (selected) ns.delete(src.id); else ns.add(src.id);
                          setSelectedToAdd(ns);
                        }}
                        className={`relative aspect-[3/4] rounded-md overflow-hidden border-2 transition-all text-left ${selected ? "border-primary ring-2 ring-primary/30" : src.alreadyInLibrary ? "border-accent hover:border-primary/50" : "border-border hover:border-primary/50"}`}
                      >
                        <img src={src.thumbnail_url || src.image_url} alt={src.title || "Item sem título"} loading="lazy" className="w-full h-full object-cover" />
                        {selected && (
                          <div className="absolute top-1 right-1 bg-primary rounded-full p-1">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                        {src.alreadyInLibrary && !selected && (
                          <div className="absolute top-1 right-1 rounded-full bg-accent px-2 py-0.5">
                            <span className="text-[9px] font-medium text-accent-foreground">Na biblioteca</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="text-[10px] text-white line-clamp-2 font-medium">{src.title || "Sem título"}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="flex-shrink-0">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button onClick={confirmAdd} disabled={selectedToAdd.size === 0}>
                Adicionar {selectedToAdd.size > 0 ? `(${selectedToAdd.size})` : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayoutPlatform>
  );
};

export default IALibraryManager;
