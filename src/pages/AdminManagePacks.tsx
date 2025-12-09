import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Upload, GripVertical } from "lucide-react";

interface Pack {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  display_order: number;
}

const AdminManagePacks = () => {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [formData, setFormData] = useState({ name: "", slug: "" });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    checkAdmin();
    fetchPacks();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/admin-login");
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin");
    if (!roles || roles.length === 0) {
      navigate("/");
    }
  };

  const fetchPacks = async () => {
    const { data, error } = await supabase
      .from("artes_packs")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar packs");
      return;
    }
    setPacks(data || []);
    setLoading(false);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newPacks = [...packs];
    const [draggedPack] = newPacks.splice(draggedIndex, 1);
    newPacks.splice(dragOverIndex, 0, draggedPack);

    // Update local state immediately for smooth UX
    setPacks(newPacks);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Update display_order in database
    try {
      const updates = newPacks.map((pack, index) => ({
        id: pack.id,
        name: pack.name,
        slug: pack.slug,
        cover_url: pack.cover_url,
        display_order: index
      }));

      for (const update of updates) {
        await supabase
          .from("artes_packs")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }

      toast.success("Ordem atualizada!");
    } catch (error) {
      toast.error("Erro ao salvar ordem");
      fetchPacks(); // Revert on error
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData({
      name,
      slug: generateSlug(name)
    });
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem deve ter no máximo 5MB");
        return;
      }
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const uploadCover = async (packId: string): Promise<string | null> => {
    if (!coverFile) return null;
    
    const fileExt = coverFile.name.split(".").pop();
    const fileName = `${packId}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("pack-covers")
      .upload(fileName, coverFile, { upsert: true });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data } = supabase.storage.from("pack-covers").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const maxOrder = Math.max(...packs.map(p => p.display_order), 0);
      
      const { data, error } = await supabase
        .from("artes_packs")
        .insert({
          name: formData.name,
          slug: formData.slug || generateSlug(formData.name),
          display_order: maxOrder + 1
        })
        .select()
        .single();

      if (error) throw error;

      if (coverFile && data) {
        const coverUrl = await uploadCover(data.id);
        if (coverUrl) {
          await supabase
            .from("artes_packs")
            .update({ cover_url: coverUrl })
            .eq("id", data.id);
        }
      }

      toast.success("Pack criado com sucesso!");
      setIsAddOpen(false);
      resetForm();
      fetchPacks();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar pack");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingPack || !formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      let coverUrl = editingPack.cover_url;
      
      if (coverFile) {
        const newCoverUrl = await uploadCover(editingPack.id);
        if (newCoverUrl) coverUrl = newCoverUrl;
      }

      const { error } = await supabase
        .from("artes_packs")
        .update({
          name: formData.name,
          slug: formData.slug || generateSlug(formData.name),
          cover_url: coverUrl
        })
        .eq("id", editingPack.id);

      if (error) throw error;

      toast.success("Pack atualizado com sucesso!");
      setEditingPack(null);
      resetForm();
      fetchPacks();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar pack");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pack: Pack) => {
    if (!confirm(`Tem certeza que deseja excluir o pack "${pack.name}"?`)) return;

    try {
      // Check if pack has artes
      const { count } = await supabase
        .from("admin_artes")
        .select("*", { count: "exact", head: true })
        .eq("pack", pack.name);

      if (count && count > 0) {
        toast.error(`Este pack possui ${count} artes. Remova ou mova as artes antes de excluir.`);
        return;
      }

      const { error } = await supabase
        .from("artes_packs")
        .delete()
        .eq("id", pack.id);

      if (error) throw error;

      // Delete cover from storage
      if (pack.cover_url) {
        const fileName = pack.cover_url.split("/").pop();
        if (fileName) {
          await supabase.storage.from("pack-covers").remove([fileName]);
        }
      }

      toast.success("Pack excluído com sucesso!");
      fetchPacks();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir pack");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", slug: "" });
    setCoverFile(null);
    setCoverPreview(null);
  };

  const openEdit = (pack: Pack) => {
    setEditingPack(pack);
    setFormData({ name: pack.name, slug: pack.slug });
    setCoverPreview(pack.cover_url);
    setCoverFile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin-dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Packs</h1>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Pack
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Pack</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Nome do Pack</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ex: Pack Arcano Vol.7"
                  />
                </div>
                <div>
                  <Label>Slug (URL)</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="pack-arcano-vol-7"
                  />
                </div>
                <div>
                  <Label>Imagem de Capa</Label>
                  <div className="mt-2">
                    {coverPreview ? (
                      <div className="relative">
                        <img
                          src={coverPreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                        >
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Clique para enviar</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleCoverChange}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <Button onClick={handleAdd} disabled={saving} className="w-full">
                  {saving ? "Salvando..." : "Criar Pack"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Arraste os packs para reorganizar a ordem de exibição
        </p>

        <div className="grid gap-2">
          {packs.map((pack, index) => (
            <Card 
              key={pack.id} 
              className={`overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
                draggedIndex === index ? 'opacity-50 scale-95' : ''
              } ${dragOverIndex === index ? 'border-primary border-2' : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDragLeave={() => setDragOverIndex(null)}
            >
              <div className="flex items-center">
                <div className="p-3 cursor-grab text-muted-foreground hover:text-foreground">
                  <GripVertical className="w-5 h-5" />
                </div>
                <div className="w-28 h-20 flex-shrink-0">
                  {pack.cover_url ? (
                    <img
                      src={pack.cover_url}
                      alt={pack.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">Sem capa</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 p-4">
                  <h3 className="font-semibold text-foreground">{pack.name}</h3>
                  <p className="text-sm text-muted-foreground">/{pack.slug}</p>
                </div>
                <div className="flex gap-2 p-4">
                  <Button variant="outline" size="sm" onClick={() => openEdit(pack)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(pack)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingPack} onOpenChange={(open) => { if (!open) { setEditingPack(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Pack</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nome do Pack</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Pack Arcano Vol.7"
                />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="pack-arcano-vol-7"
                />
              </div>
              <div>
                <Label>Imagem de Capa</Label>
                <div className="mt-2">
                  {coverPreview ? (
                    <div className="relative">
                      <img
                        src={coverPreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                      >
                        Remover
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Clique para enviar</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleCoverChange}
                      />
                    </label>
                  )}
                </div>
              </div>
              <Button onClick={handleEdit} disabled={saving} className="w-full">
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminManagePacks;
