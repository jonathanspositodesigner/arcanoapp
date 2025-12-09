import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Upload, GripVertical, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Banner {
  id: string;
  title: string;
  description: string | null;
  button_text: string;
  button_link: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

const AdminManageBanners = () => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    button_text: "Saiba mais",
    button_link: "",
    is_active: true
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    checkAdmin();
    fetchBanners();
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

  const fetchBanners = async () => {
    const { data, error } = await supabase
      .from("artes_banners")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar banners");
      return;
    }
    setBanners((data || []) as Banner[]);
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

    const newBanners = [...banners];
    const [draggedBanner] = newBanners.splice(draggedIndex, 1);
    newBanners.splice(dragOverIndex, 0, draggedBanner);

    setBanners(newBanners);
    setDraggedIndex(null);
    setDragOverIndex(null);

    try {
      for (let i = 0; i < newBanners.length; i++) {
        await supabase
          .from("artes_banners")
          .update({ display_order: i })
          .eq("id", newBanners[i].id);
      }
      toast.success("Ordem atualizada!");
    } catch (error) {
      toast.error("Erro ao salvar ordem");
      fetchBanners();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem deve ter no máximo 5MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (bannerId: string): Promise<string | null> => {
    if (!imageFile) return null;
    
    const fileExt = imageFile.name.split(".").pop();
    const fileName = `banner-${bannerId}-${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("pack-covers")
      .upload(fileName, imageFile, { upsert: true });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data } = supabase.storage.from("pack-covers").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleAdd = async () => {
    if (!formData.title.trim() || !formData.button_link.trim()) {
      toast.error("Título e link são obrigatórios");
      return;
    }
    if (!imageFile) {
      toast.error("Imagem é obrigatória");
      return;
    }

    setSaving(true);
    try {
      const maxOrder = banners.length > 0 ? Math.max(...banners.map(b => b.display_order), 0) : 0;
      
      const { data, error } = await supabase
        .from("artes_banners")
        .insert({
          title: formData.title,
          description: formData.description || null,
          button_text: formData.button_text,
          button_link: formData.button_link,
          image_url: "placeholder",
          display_order: maxOrder + 1,
          is_active: formData.is_active
        })
        .select()
        .single();

      if (error) throw error;

      const imageUrl = await uploadImage(data.id);
      if (imageUrl) {
        await supabase
          .from("artes_banners")
          .update({ image_url: imageUrl })
          .eq("id", data.id);
      }

      toast.success("Banner criado com sucesso!");
      setIsAddOpen(false);
      resetForm();
      fetchBanners();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar banner");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingBanner || !formData.title.trim() || !formData.button_link.trim()) {
      toast.error("Título e link são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = editingBanner.image_url;
      
      if (imageFile) {
        const newImageUrl = await uploadImage(editingBanner.id);
        if (newImageUrl) imageUrl = newImageUrl;
      }

      const { error } = await supabase
        .from("artes_banners")
        .update({
          title: formData.title,
          description: formData.description || null,
          button_text: formData.button_text,
          button_link: formData.button_link,
          image_url: imageUrl,
          is_active: formData.is_active
        })
        .eq("id", editingBanner.id);

      if (error) throw error;

      toast.success("Banner atualizado com sucesso!");
      setEditingBanner(null);
      resetForm();
      fetchBanners();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar banner");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (banner: Banner) => {
    if (!confirm(`Tem certeza que deseja excluir o banner "${banner.title}"?`)) return;

    try {
      const { error } = await supabase
        .from("artes_banners")
        .delete()
        .eq("id", banner.id);

      if (error) throw error;

      // Delete image from storage
      if (banner.image_url) {
        const fileName = banner.image_url.split("/").pop();
        if (fileName) {
          await supabase.storage.from("pack-covers").remove([fileName]);
        }
      }

      toast.success("Banner excluído com sucesso!");
      fetchBanners();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir banner");
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from("artes_banners")
        .update({ is_active: !banner.is_active })
        .eq("id", banner.id);

      if (error) throw error;
      
      toast.success(banner.is_active ? "Banner desativado" : "Banner ativado");
      fetchBanners();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      button_text: "Saiba mais",
      button_link: "",
      is_active: true
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const openEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description || "",
      button_text: banner.button_text,
      button_link: banner.button_link,
      is_active: banner.is_active
    });
    setImagePreview(banner.image_url);
    setImageFile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const FormContent = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Título do Banner</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Novo Pack Disponível!"
        />
      </div>
      <div>
        <Label>Descrição (opcional)</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição do banner..."
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Texto do Botão</Label>
          <Input
            value={formData.button_text}
            onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
            placeholder="Saiba mais"
          />
        </div>
        <div>
          <Label>Link do Botão</Label>
          <Input
            value={formData.button_link}
            onChange={(e) => setFormData({ ...formData, button_link: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label>Banner ativo</Label>
      </div>
      <div>
        <Label>Imagem do Banner</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Tamanho recomendado: 1200x400px (Desktop) / 600x300px (Mobile)
        </p>
        <div className="mt-2">
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-40 object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
              >
                Remover
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Clique para enviar</span>
              <span className="text-xs text-muted-foreground mt-1">1200x400px recomendado</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>
          )}
        </div>
      </div>
      <Button 
        onClick={isEdit ? handleEdit : handleAdd} 
        disabled={saving} 
        className="w-full"
      >
        {saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Banner"}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin-dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Banners</h1>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Banner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Novo Banner</DialogTitle>
              </DialogHeader>
              <FormContent />
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-lg p-4 mb-6 border border-border">
          <h3 className="font-medium text-foreground mb-2">Tamanhos Recomendados</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Desktop:</span> 1200 x 400 pixels
            </div>
            <div>
              <span className="font-medium text-foreground">Mobile:</span> 600 x 300 pixels
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Arraste os banners para reorganizar a ordem de exibição
        </p>

        <div className="grid gap-3">
          {banners.map((banner, index) => (
            <Card 
              key={banner.id} 
              className={`overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
                draggedIndex === index ? 'opacity-50 scale-95' : ''
              } ${dragOverIndex === index ? 'border-primary border-2' : ''} ${
                !banner.is_active ? 'opacity-60' : ''
              }`}
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
                <div className="w-40 h-24 flex-shrink-0">
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 p-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{banner.title}</h3>
                    {!banner.is_active && (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                  </div>
                  {banner.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{banner.description}</p>
                  )}
                  <p className="text-xs text-primary mt-1">{banner.button_text} → {banner.button_link}</p>
                </div>
                <div className="flex gap-2 p-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleActive(banner)}
                    title={banner.is_active ? "Desativar" : "Ativar"}
                  >
                    {banner.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(banner)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(banner)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {banners.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum banner cadastrado
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingBanner} onOpenChange={(open) => { if (!open) { setEditingBanner(null); resetForm(); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Banner</DialogTitle>
            </DialogHeader>
            <FormContent isEdit />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminManageBanners;
