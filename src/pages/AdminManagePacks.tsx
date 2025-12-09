import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Upload, GripVertical, Package, Gift, GraduationCap, BookOpen, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Pack {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  display_order: number;
  type: 'pack' | 'bonus' | 'curso' | 'tutorial' | 'ferramentas_ia';
}

type ItemType = 'pack' | 'bonus' | 'curso' | 'tutorial' | 'ferramentas_ia';

const AdminManagePacks = () => {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTypeSelectOpen, setIsTypeSelectOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [formData, setFormData] = useState({ name: "", slug: "" });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType>('pack');
  const [activeTab, setActiveTab] = useState<ItemType>('pack');

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
      toast.error("Erro ao carregar itens");
      return;
    }
    setPacks((data || []) as Pack[]);
    setLoading(false);
  };

  const getPacksByType = (type: ItemType) => {
    return packs.filter(p => p.type === type);
  };

  const handleDragStart = (index: number, type: ItemType) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = async (type: ItemType) => {
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const typeFiltered = getPacksByType(type);
    const newPacks = [...typeFiltered];
    const [draggedPack] = newPacks.splice(draggedIndex, 1);
    newPacks.splice(dragOverIndex, 0, draggedPack);

    // Update local state immediately for smooth UX
    const updatedAll = packs.map(p => {
      if (p.type !== type) return p;
      const idx = newPacks.findIndex(np => np.id === p.id);
      return idx >= 0 ? { ...p, display_order: idx } : p;
    });
    setPacks(updatedAll);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Update display_order in database
    try {
      for (let i = 0; i < newPacks.length; i++) {
        await supabase
          .from("artes_packs")
          .update({ display_order: i })
          .eq("id", newPacks[i].id);
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

  const handleTypeSelect = (type: ItemType) => {
    setSelectedType(type);
    setIsTypeSelectOpen(false);
    setIsAddOpen(true);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const typeItems = getPacksByType(selectedType);
      const maxOrder = typeItems.length > 0 ? Math.max(...typeItems.map(p => p.display_order), 0) : 0;
      
      const { data, error } = await supabase
        .from("artes_packs")
        .insert({
          name: formData.name,
          slug: formData.slug || generateSlug(formData.name),
          display_order: maxOrder + 1,
          type: selectedType
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

      const typeLabel = selectedType === 'pack' ? 'Pack' : selectedType === 'bonus' ? 'Bônus' : 'Curso';
      toast.success(`${typeLabel} criado com sucesso!`);
      setIsAddOpen(false);
      resetForm();
      fetchPacks();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar item");
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

      toast.success("Item atualizado com sucesso!");
      setEditingPack(null);
      resetForm();
      fetchPacks();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pack: Pack) => {
    const typeLabel = pack.type === 'pack' ? 'pack' : pack.type === 'bonus' ? 'bônus' : 'curso';
    if (!confirm(`Tem certeza que deseja excluir o ${typeLabel} "${pack.name}"?`)) return;

    try {
      // Check if pack has artes (only for packs and bonus)
      if (pack.type !== 'curso') {
        const { count } = await supabase
          .from("admin_artes")
          .select("*", { count: "exact", head: true })
          .eq("pack", pack.name);

        if (count && count > 0) {
          toast.error(`Este ${typeLabel} possui ${count} artes. Remova ou mova as artes antes de excluir.`);
          return;
        }
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

      toast.success("Item excluído com sucesso!");
      fetchPacks();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir item");
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

  const getTypeIcon = (type: ItemType) => {
    switch (type) {
      case 'pack': return <Package className="w-5 h-5" />;
      case 'bonus': return <Gift className="w-5 h-5" />;
      case 'curso': return <GraduationCap className="w-5 h-5" />;
      case 'tutorial': return <BookOpen className="w-5 h-5" />;
      case 'ferramentas_ia': return <Cpu className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: ItemType) => {
    switch (type) {
      case 'pack': return 'Pack';
      case 'bonus': return 'Bônus';
      case 'curso': return 'Curso';
      case 'tutorial': return 'Tutorial';
      case 'ferramentas_ia': return 'Ferramentas de IA';
    }
  };

  const renderPackList = (type: ItemType) => {
    const items = getPacksByType(type);
    
    return (
      <div className="grid gap-2">
        {items.map((pack, index) => (
          <Card 
            key={pack.id} 
            className={`overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
              draggedIndex === index ? 'opacity-50 scale-95' : ''
            } ${dragOverIndex === index ? 'border-primary border-2' : ''}`}
            draggable
            onDragStart={() => handleDragStart(index, type)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={() => handleDragEnd(type)}
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
                    {getTypeIcon(pack.type)}
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
        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum {getTypeLabel(type).toLowerCase()} cadastrado
          </div>
        )}
      </div>
    );
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
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Conteúdo</h1>
          </div>
          
          {/* Type Selection Modal */}
          <Dialog open={isTypeSelectOpen} onOpenChange={setIsTypeSelectOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>O que você deseja criar?</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 mt-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleTypeSelect('pack')}
                >
                  <Package className="w-8 h-8 text-primary" />
                  <span className="font-medium">Pack</span>
                  <span className="text-xs text-muted-foreground">Coleção de artes editáveis</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleTypeSelect('bonus')}
                >
                  <Gift className="w-8 h-8 text-orange-500" />
                  <span className="font-medium">Bônus</span>
                  <span className="text-xs text-muted-foreground">Conteúdo extra para membros</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleTypeSelect('curso')}
                >
                  <GraduationCap className="w-8 h-8 text-blue-500" />
                  <span className="font-medium">Curso</span>
                  <span className="text-xs text-muted-foreground">Curso ou treinamento</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleTypeSelect('tutorial')}
                >
                  <BookOpen className="w-8 h-8 text-green-500" />
                  <span className="font-medium">Tutorial</span>
                  <span className="text-xs text-muted-foreground">Tutorial e guias</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleTypeSelect('ferramentas_ia')}
                >
                  <Cpu className="w-8 h-8 text-purple-500" />
                  <span className="font-medium">Ferramentas de IA</span>
                  <span className="text-xs text-muted-foreground">Ferramentas de inteligência artificial</span>
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Item Dialog */}
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getTypeIcon(selectedType)}
                  Criar Novo {getTypeLabel(selectedType)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={`Ex: ${selectedType === 'pack' ? 'Pack Arcano Vol.7' : selectedType === 'bonus' ? 'Bônus Especial' : 'Curso de Design'}`}
                  />
                </div>
                <div>
                  <Label>Slug (URL)</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="slug-do-item"
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
                  {saving ? "Salvando..." : `Criar ${getTypeLabel(selectedType)}`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ItemType)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="pack" className="flex items-center gap-1 text-xs sm:text-sm">
              <Package className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Packs</span>
              <Badge variant="secondary" className="ml-1 text-xs">{getPacksByType('pack').length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="bonus" className="flex items-center gap-1 text-xs sm:text-sm">
              <Gift className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Bônus</span>
              <Badge variant="secondary" className="ml-1 text-xs">{getPacksByType('bonus').length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="curso" className="flex items-center gap-1 text-xs sm:text-sm">
              <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Cursos</span>
              <Badge variant="secondary" className="ml-1 text-xs">{getPacksByType('curso').length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="tutorial" className="flex items-center gap-1 text-xs sm:text-sm">
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Tutoriais</span>
              <Badge variant="secondary" className="ml-1 text-xs">{getPacksByType('tutorial').length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="ferramentas_ia" className="flex items-center gap-1 text-xs sm:text-sm">
              <Cpu className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">IA</span>
              <Badge variant="secondary" className="ml-1 text-xs">{getPacksByType('ferramentas_ia').length}</Badge>
            </TabsTrigger>
          </TabsList>

          <p className="text-sm text-muted-foreground mb-4">
            Arraste os itens para reorganizar a ordem de exibição
          </p>

          <TabsContent value="pack">
            {renderPackList('pack')}
          </TabsContent>
          <TabsContent value="bonus">
            {renderPackList('bonus')}
          </TabsContent>
          <TabsContent value="curso">
            {renderPackList('curso')}
          </TabsContent>
          <TabsContent value="tutorial">
            {renderPackList('tutorial')}
          </TabsContent>
          <TabsContent value="ferramentas_ia">
            {renderPackList('ferramentas_ia')}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={!!editingPack} onOpenChange={(open) => { if (!open) { setEditingPack(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingPack && getTypeIcon(editingPack.type)}
                Editar {editingPack && getTypeLabel(editingPack.type)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Nome do item"
                />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="slug-do-item"
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
