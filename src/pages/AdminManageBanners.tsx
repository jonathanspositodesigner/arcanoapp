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
  mobile_image_url: string | null;
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
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [mobileImagePreview, setMobileImagePreview] = useState<string | null>(null);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isMobile: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem deve ter no máximo 5MB");
        return;
      }
      if (isMobile) {
        setMobileImageFile(file);
        setMobileImagePreview(URL.createObjectURL(file));
      } else {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const uploadImage = async (bannerId: string, file: File, suffix: string = ""): Promise<string | null> => {
    if (!file) return null;
    
    const fileExt = file.name.split(".").pop();
    const fileName = `banner-${bannerId}${suffix}-${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("pack-covers")
      .upload(fileName, file, { upsert: true });

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
      toast.error("Imagem desktop é obrigatória");
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

      const imageUrl = await uploadImage(data.id, imageFile, "-desktop");
      let mobileImageUrl = null;
      if (mobileImageFile) {
        mobileImageUrl = await uploadImage(data.id, mobileImageFile, "-mobile");
      }
      
      await supabase
        .from("artes_banners")
        .update({ 
          image_url: imageUrl,
          mobile_image_url: mobileImageUrl
        })
        .eq("id", data.id);

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
      let mobileImageUrl = editingBanner.mobile_image_url;
      
      if (imageFile) {
        const newImageUrl = await uploadImage(editingBanner.id, imageFile, "-desktop");
        if (newImageUrl) imageUrl = newImageUrl;
      }
      
      if (mobileImageFile) {
        const newMobileUrl = await uploadImage(editingBanner.id, mobileImageFile, "-mobile");
        if (newMobileUrl) mobileImageUrl = newMobileUrl;
      }

      const { error } = await supabase
        .from("artes_banners")
        .update({
          title: formData.title,
          description: formData.description || null,
          button_text: formData.button_text,
          button_link: formData.button_link,
          image_url: imageUrl,
          mobile_image_url: mobileImageUrl,
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
    setMobileImageFile(null);
    setMobileImagePreview(null);
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
    setMobileImagePreview(banner.mobile_image_url);
    setMobileImageFile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderFormContent = (isEdit: boolean) => (
    <div className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto pr-2">
      {/* Live Preview - Desktop & Mobile */}
      {(imagePreview || mobileImagePreview) && (
        <div>
          <Label className="mb-2 block">Pré-visualização</Label>
          <div className="grid grid-cols-2 gap-3">
            {/* Desktop Preview */}
            <div>
              <p className="text-xs text-muted-foreground mb-1 text-center">Desktop</p>
              <div className="relative h-24 sm:h-32 rounded-lg overflow-hidden bg-muted">
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Desktop Preview"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                    <div className="absolute inset-0 flex items-center">
                      <div className="px-2 max-w-[80%]">
                        <h3 className="text-[10px] sm:text-xs font-bold text-white mb-0.5 line-clamp-1 leading-tight">
                          {formData.title || "Título"}
                        </h3>
                        <span className="inline-block bg-primary text-primary-foreground text-[8px] px-1.5 py-0.5 rounded">
                          {formData.button_text || "Saiba mais"}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                    Sem imagem
                  </div>
                )}
              </div>
            </div>
            
            {/* Mobile Preview */}
            <div>
              <p className="text-xs text-muted-foreground mb-1 text-center">Mobile</p>
              <div className="relative h-24 sm:h-32 rounded-lg overflow-hidden bg-muted">
                {mobileImagePreview ? (
                  <>
                    <img
                      src={mobileImagePreview}
                      alt="Mobile Preview"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                    <div className="absolute inset-0 flex items-center">
                      <div className="px-2 max-w-[80%]">
                        <h3 className="text-[10px] sm:text-xs font-bold text-white mb-0.5 line-clamp-1 leading-tight">
                          {formData.title || "Título"}
                        </h3>
                        <span className="inline-block bg-primary text-primary-foreground text-[8px] px-1.5 py-0.5 rounded">
                          {formData.button_text || "Saiba mais"}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                    {imagePreview ? "Usará desktop" : "Sem imagem"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor={isEdit ? "edit-title" : "add-title"}>Título do Banner</Label>
        <Input
          id={isEdit ? "edit-title" : "add-title"}
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Ex: Novo Pack Disponível!"
        />
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-desc" : "add-desc"}>Descrição (opcional)</Label>
        <Textarea
          id={isEdit ? "edit-desc" : "add-desc"}
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descrição do banner..."
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={isEdit ? "edit-btn-text" : "add-btn-text"}>Texto do Botão</Label>
          <Input
            id={isEdit ? "edit-btn-text" : "add-btn-text"}
            value={formData.button_text}
            onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))}
            placeholder="Saiba mais"
          />
        </div>
        <div>
          <Label htmlFor={isEdit ? "edit-btn-link" : "add-btn-link"}>Link do Botão</Label>
          <Input
            id={isEdit ? "edit-btn-link" : "add-btn-link"}
            value={formData.button_link}
            onChange={(e) => setFormData(prev => ({ ...prev, button_link: e.target.value }))}
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id={isEdit ? "edit-active" : "add-active"}
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
        <Label htmlFor={isEdit ? "edit-active" : "add-active"}>Banner ativo</Label>
      </div>
      {/* Desktop Image */}
      <div>
        <Label>Imagem Desktop</Label>
        <p className="text-xs text-muted-foreground mb-2">Tamanho recomendado: 1200x400px</p>
        <div className="mt-2">
          {imagePreview ? (
            <div className="flex items-center gap-2">
              <img src={imagePreview} alt="Desktop" className="w-24 h-10 object-cover rounded" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
              >
                Trocar
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">1200x400px</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleImageChange(e, false)}
              />
            </label>
          )}
        </div>
      </div>

      {/* Mobile Image */}
      <div>
        <Label>Imagem Mobile (opcional)</Label>
        <p className="text-xs text-muted-foreground mb-2">Tamanho recomendado: 600x300px</p>
        <div className="mt-2">
          {mobileImagePreview ? (
            <div className="flex items-center gap-2">
              <img src={mobileImagePreview} alt="Mobile" className="w-16 h-10 object-cover rounded" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setMobileImageFile(null); setMobileImagePreview(null); }}
              >
                Trocar
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">600x300px</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleImageChange(e, true)}
              />
            </label>
          )}
        </div>
      </div>

      <Button
        type="button"
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
              {renderFormContent(false)}
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
            {renderFormContent(true)}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminManageBanners;
