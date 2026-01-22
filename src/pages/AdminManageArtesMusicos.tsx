import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Pencil, Trash2, Star, Search, Copy, CalendarDays, Sparkles, Image, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SecureImage, SecureVideo } from "@/components/SecureMedia";

interface Category {
  id: string;
  name: string;
}

interface Arte {
  id: string;
  title: string;
  description?: string;
  category: string;
  image_url: string;
  download_url?: string;
  is_premium?: boolean;
  created_at?: string;
  tutorial_url?: string;
  bonus_clicks?: number;
  canva_link?: string;
  drive_link?: string;
  is_ai_generated?: boolean;
  ai_prompt?: string;
  ai_reference_image_url?: string;
}

type SortOption = 'date' | 'downloads';
type MediaTypeFilter = 'all' | 'image' | 'video';

const formatTitle = (title: string): string => {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm", "video/quicktime"];

const TUTORIAL_TEMPLATES = [
  {
    name: "Tutorial de criar movie pra telão",
    url: '<iframe width="1250" height="703" src="https://www.youtube.com/embed/jbc00r7nX1U" title="COMO FAZER MOVIE PARA TELÃO" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
  },
];

const AdminManageArtesMusicos = () => {
  const navigate = useNavigate();
  const [artes, setArtes] = useState<Arte[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingArte, setEditingArte] = useState<Arte | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editIsPremium, setEditIsPremium] = useState(false);
  const [editHasTutorial, setEditHasTutorial] = useState(false);
  const [editTutorialUrl, setEditTutorialUrl] = useState("");
  const [editBonusClicks, setEditBonusClicks] = useState(0);
  const [editCanvaLink, setEditCanvaLink] = useState("");
  const [editDriveLink, setEditDriveLink] = useState("");
  const [editIsAiGenerated, setEditIsAiGenerated] = useState(false);
  const [editAiPrompt, setEditAiPrompt] = useState("");
  const [editAiReferenceImageUrl, setEditAiReferenceImageUrl] = useState("");
  const [newAiReferenceImage, setNewAiReferenceImage] = useState<File | null>(null);
  const [newAiReferencePreview, setNewAiReferencePreview] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [newMediaPreview, setNewMediaPreview] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>('all');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('artes_categories_musicos')
      .select('id, name')
      .order('display_order', { ascending: true });
    setCategories(data || []);
  };

  useEffect(() => {
    checkAdminAndFetchArtes();
  }, []);

  const checkAdminAndFetchArtes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/admin-login');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      toast.error("Acesso negado");
      navigate('/');
      return;
    }

    fetchArtes();
  };

  const fetchArtes = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_artes')
        .select('*')
        .eq('platform', 'musicos')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArtes(data || []);

      const { data: clickData } = await supabase.from('arte_clicks').select('arte_id');
      const counts: Record<string, number> = {};
      (clickData || []).forEach(d => {
        counts[d.arte_id] = (counts[d.arte_id] || 0) + 1;
      });
      setClickCounts(counts);
    } catch (error) {
      console.error("Error fetching artes:", error);
      toast.error("Erro ao carregar artes");
    } finally {
      setIsLoading(false);
    }
  };

  const getClickCount = (arte: Arte) => {
    return (clickCounts[arte.id] || 0) + (arte.bonus_clicks || 0);
  };

  const isVideoUrl = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  const filteredAndSortedArtes = artes
    .filter(a => {
      const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
      const isVideo = isVideoUrl(a.image_url);
      const matchesMediaType = mediaTypeFilter === 'all' || 
        (mediaTypeFilter === 'video' && isVideo) || 
        (mediaTypeFilter === 'image' && !isVideo);
      return matchesSearch && matchesCategory && matchesMediaType;
    })
    .sort((a, b) => {
      if (sortBy === 'downloads') {
        return getClickCount(b) - getClickCount(a);
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  const handleEdit = (arte: Arte) => {
    setEditingArte(arte);
    setEditTitle(arte.title);
    setEditDescription(arte.description || "");
    setEditCategory(arte.category);
    setEditIsPremium(arte.is_premium || false);
    setEditHasTutorial(!!arte.tutorial_url);
    setEditTutorialUrl(arte.tutorial_url || "");
    setEditBonusClicks(arte.bonus_clicks || 0);
    setEditCanvaLink(arte.canva_link || "");
    setEditDriveLink(arte.drive_link || "");
    setEditIsAiGenerated(arte.is_ai_generated || false);
    setEditAiPrompt(arte.ai_prompt || "");
    setEditAiReferenceImageUrl(arte.ai_reference_image_url || "");
    setNewAiReferenceImage(null);
    setNewAiReferencePreview("");
    setNewMediaFile(null);
    setNewMediaPreview("");
  };

  const handleCloseEdit = () => {
    setEditingArte(null);
    setNewMediaFile(null);
    setNewMediaPreview("");
    setNewAiReferenceImage(null);
    setNewAiReferencePreview("");
  };

  const handleNewAiReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Apenas imagens são permitidas para referência");
        return;
      }
      setNewAiReferenceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewAiReferencePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleNewMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Arquivo muito grande. Máximo 50MB.");
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Tipo de arquivo não permitido.");
        return;
      }
      setNewMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewMediaPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadFileToStorage = async (file: File): Promise<string> => {
    const { uploadToStorage } = await import("@/hooks/useStorageUpload");
    const result = await uploadToStorage(file, 'artes-cloudinary');
    if (!result.success) throw new Error(result.error);
    return result.url!;
  };

  const handleSaveEdit = async () => {
    if (!editingArte) return;

    try {
      let newImageUrl = editingArte.image_url;

      if (newMediaFile) {
        newImageUrl = await uploadFileToStorage(newMediaFile);
      }

      // Handle AI reference image upload
      let aiReferenceImageUrl = editAiReferenceImageUrl;
      if (newAiReferenceImage) {
        aiReferenceImageUrl = await uploadFileToStorage(newAiReferenceImage);
      }
      // Clear reference image if AI is disabled
      if (!editIsAiGenerated) {
        aiReferenceImageUrl = null;
      }

      const { error } = await supabase
        .from('admin_artes')
        .update({
          title: formatTitle(editTitle),
          description: editDescription || null,
          category: editCategory,
          image_url: newImageUrl,
          is_premium: editIsPremium,
          tutorial_url: editHasTutorial && editTutorialUrl ? editTutorialUrl : null,
          bonus_clicks: editBonusClicks,
          canva_link: editCanvaLink || null,
          drive_link: editDriveLink || null,
          is_ai_generated: editIsAiGenerated,
          ai_prompt: editIsAiGenerated ? editAiPrompt : null,
          ai_reference_image_url: aiReferenceImageUrl
        })
        .eq('id', editingArte.id);

      if (error) throw error;

      toast.success("Arte atualizada com sucesso!");
      handleCloseEdit();
      fetchArtes();
    } catch (error) {
      console.error("Error updating arte:", error);
      toast.error("Erro ao atualizar arte");
    }
  };

  const handleDelete = async (arte: Arte) => {
    if (!confirm("Tem certeza que deseja deletar esta arte?")) return;

    try {
      const { error } = await supabase
        .from('admin_artes')
        .delete()
        .eq('id', arte.id);

      if (error) throw error;

      toast.success("Arte deletada com sucesso!");
      fetchArtes();
    } catch (error) {
      console.error("Error deleting arte:", error);
      toast.error("Erro ao deletar arte");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate("/admin-artes-musicos/ferramentas")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Painel
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Gerenciar Artes - Músicos
          </h1>
          <p className="text-muted-foreground text-lg mb-4">
            {filteredAndSortedArtes.length} artes {searchTerm || categoryFilter !== 'all' ? 'encontradas' : 'publicadas'}
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground self-center mr-2">Tipo:</span>
            <Button 
              variant={mediaTypeFilter === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setMediaTypeFilter('all')}
            >
              Todos
            </Button>
            <Button 
              variant={mediaTypeFilter === 'image' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setMediaTypeFilter('image')}
              className={mediaTypeFilter === 'image' ? 'bg-blue-500 hover:bg-blue-600' : ''}
            >
              <Image className="h-4 w-4 mr-1" />Imagens
            </Button>
            <Button 
              variant={mediaTypeFilter === 'video' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setMediaTypeFilter('video')}
              className={mediaTypeFilter === 'video' ? 'bg-violet-500 hover:bg-violet-600' : ''}
            >
              <Video className="h-4 w-4 mr-1" />Vídeos
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground self-center mr-2">Categoria:</span>
            <Button variant={categoryFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setCategoryFilter('all')}>
              Todas
            </Button>
            {categories.map(cat => (
              <Button 
                key={cat.id}
                variant={categoryFilter === cat.name ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setCategoryFilter(cat.name)}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground self-center mr-2">Ordenar por:</span>
            <Button variant={sortBy === 'date' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('date')}
              className={sortBy === 'date' ? 'bg-primary' : ''}>
              <CalendarDays className="h-4 w-4 mr-1" />Mais recente
            </Button>
            <Button variant={sortBy === 'downloads' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('downloads')}
              className={sortBy === 'downloads' ? 'bg-primary' : ''}>
              <Copy className="h-4 w-4 mr-1" />Mais baixados
            </Button>
          </div>
          
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedArtes.map((arte) => {
            const isVideo = isVideoUrl(arte.image_url);
            return (
              <Card key={arte.id} className="overflow-hidden">
                <div className="relative">
                  {isVideo ? (
                    <SecureVideo src={arte.image_url} className="w-full h-48 object-cover" isPremium={arte.is_premium || false} autoPlay muted loop />
                  ) : (
                    <SecureImage src={arte.image_url} alt={arte.title} className="w-full h-48 object-cover" isPremium={arte.is_premium || false} />
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge className={isVideo ? "bg-violet-500 text-white border-0" : "bg-blue-500 text-white border-0"}>
                      {isVideo ? <Video className="h-3 w-3 mr-1" /> : <Image className="h-3 w-3 mr-1" />}
                      {isVideo ? 'Vídeo' : 'Imagem'}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {arte.is_ai_generated && (
                      <Badge className="bg-purple-500 text-white border-0">
                        <Sparkles className="h-3 w-3 mr-1" />IA
                      </Badge>
                    )}
                    {arte.is_premium && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                        <Star className="h-3 w-3 mr-1" fill="currentColor" />Premium
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{arte.title}</h3>
                      <Badge variant="secondary" className="mt-1">{arte.category}</Badge>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary flex items-center gap-1">
                      <Copy className="h-3 w-3" />{getClickCount(arte)}
                    </Badge>
                  </div>
                  {arte.description && <p className="text-sm text-muted-foreground line-clamp-2">{arte.description}</p>}
                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => handleEdit(arte)} variant="outline" className="flex-1">
                      <Pencil className="h-4 w-4 mr-2" />Editar
                    </Button>
                    <Button onClick={() => handleDelete(arte)} variant="destructive" className="flex-1">
                      <Trash2 className="h-4 w-4 mr-2" />Excluir
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredAndSortedArtes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchTerm ? 'Nenhuma arte encontrada com esse nome' : 'Nenhuma arte encontrada'}
            </p>
          </div>
        )}
      </div>

      <Dialog open={!!editingArte} onOpenChange={() => handleCloseEdit()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Arte</DialogTitle>
          </DialogHeader>
          {editingArte && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {newMediaPreview ? (
                  <img src={newMediaPreview} alt="Preview" className="max-h-48 object-contain rounded-lg" />
                ) : isVideoUrl(editingArte.image_url) ? (
                  <SecureVideo src={editingArte.image_url} className="max-h-48 object-contain rounded-lg" isPremium={editingArte.is_premium || false} controls />
                ) : (
                  <SecureImage src={editingArte.image_url} alt={editingArte.title} className="max-h-48 object-contain rounded-lg" isPremium={editingArte.is_premium || false} />
                )}
              </div>
              
              <div>
                <Label>Substituir Mídia</Label>
                <input type="file" accept="image/*,video/*" onChange={handleNewMediaChange}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80" />
              </div>

              <div>
                <Label>Título</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label>Categoria</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Arte Premium</Label>
                <Switch checked={editIsPremium} onCheckedChange={setEditIsPremium} />
              </div>

              <div className="flex items-center justify-between">
                <Label>Feito com IA</Label>
                <Switch checked={editIsAiGenerated} onCheckedChange={setEditIsAiGenerated} />
              </div>

              {editIsAiGenerated && (
                <div className="space-y-4">
                  <div>
                    <Label>Prompt utilizado</Label>
                    <Textarea 
                      value={editAiPrompt} 
                      onChange={(e) => setEditAiPrompt(e.target.value)} 
                      className="mt-1"
                      placeholder="Descreva o prompt utilizado para gerar esta arte..."
                    />
                  </div>
                  
                  <div>
                    <Label>Imagem de Referência</Label>
                    {(newAiReferencePreview || editAiReferenceImageUrl) && (
                      <div className="relative mt-2 mb-2">
                        <img 
                          src={newAiReferencePreview || editAiReferenceImageUrl} 
                          alt="Referência IA" 
                          className="w-full max-h-32 object-contain rounded-lg bg-muted/50"
                        />
                        <button
                          onClick={() => {
                            setNewAiReferenceImage(null);
                            setNewAiReferencePreview("");
                            setEditAiReferenceImageUrl("");
                          }}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/80"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleNewAiReferenceChange}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-400 mt-1" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Imagem para o usuário baixar e usar junto com o prompt
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Possui Tutorial</Label>
                <Switch checked={editHasTutorial} onCheckedChange={setEditHasTutorial} />
              </div>

              {editHasTutorial && (
                <div className="space-y-3">
                  <Label>URL do Tutorial (YouTube)</Label>
                  <div className="flex flex-wrap gap-2">
                    <p className="text-sm text-muted-foreground w-full">Sugestões:</p>
                    {TUTORIAL_TEMPLATES.map((template) => (
                      <Button
                        key={template.name}
                        type="button"
                        variant={editTutorialUrl === template.url ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditTutorialUrl(template.url)}
                        className="text-xs"
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                  <Input value={editTutorialUrl} onChange={(e) => setEditTutorialUrl(e.target.value)} className="mt-1" placeholder="Ou cole a URL do tutorial manualmente..." />
                </div>
              )}

              <div>
                <Label>Link do Canva</Label>
                <Input value={editCanvaLink} onChange={(e) => setEditCanvaLink(e.target.value)} className="mt-1" placeholder="https://canva.com/..." />
              </div>

              <div>
                <Label>Link do Drive (PSD)</Label>
                <Input value={editDriveLink} onChange={(e) => setEditDriveLink(e.target.value)} className="mt-1" placeholder="https://drive.google.com/..." />
              </div>

              <div>
                <Label>Bônus de Cliques</Label>
                <Input type="number" value={editBonusClicks} onChange={(e) => setEditBonusClicks(parseInt(e.target.value) || 0)} className="mt-1" />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveEdit} className="flex-1 bg-primary">
                  Salvar Alterações
                </Button>
                <Button onClick={handleCloseEdit} variant="outline" className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminManageArtesMusicos;
