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
import { ArrowLeft, Pencil, Trash2, Star, Search, Video, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Format title: first letter uppercase, rest lowercase
const formatTitle = (title: string): string => {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

// File validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return "Arquivo muito grande. Máximo 50MB.";
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return "Tipo de arquivo não permitido. Use JPEG, PNG, GIF, WebP, MP4, WebM ou MOV.";
  }
  return null;
};

interface Prompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  image_url: string;
  type: 'admin' | 'community';
  is_premium?: boolean;
  created_at?: string;
  tutorial_url?: string;
}

const AdminManageImages = () => {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPromptText, setEditPromptText] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editIsPremium, setEditIsPremium] = useState(false);
  const [editHasTutorial, setEditHasTutorial] = useState(false);
  const [editTutorialUrl, setEditTutorialUrl] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [newMediaPreview, setNewMediaPreview] = useState<string>("");

  useEffect(() => {
    checkAdminAndFetchPrompts();
  }, []);

  const checkAdminAndFetchPrompts = async () => {
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

    fetchPrompts();
  };

  const fetchPrompts = async () => {
    try {
      const [adminData, communityData] = await Promise.all([
        supabase.from('admin_prompts').select('*').order('created_at', { ascending: false }),
        supabase.from('community_prompts').select('*').eq('approved', true).order('created_at', { ascending: false })
      ]);

      const allPrompts: Prompt[] = [
        ...(adminData.data || []).map(p => ({ ...p, type: 'admin' as const })),
        ...(communityData.data || []).map(p => ({ ...p, type: 'community' as const, is_premium: false }))
      ].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      setPrompts(allPrompts);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast.error("Erro ao carregar imagens");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPrompts = prompts.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setEditTitle(prompt.title);
    setEditPromptText(prompt.prompt);
    setEditCategory(prompt.category);
    setEditIsPremium(prompt.is_premium || false);
    setEditHasTutorial(!!prompt.tutorial_url);
    setEditTutorialUrl(prompt.tutorial_url || "");
    setNewMediaFile(null);
    setNewMediaPreview("");
  };

  const handleCloseEdit = () => {
    setEditingPrompt(null);
    setNewMediaFile(null);
    setNewMediaPreview("");
  };

  const handleNewMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      setNewMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPrompt) return;

    try {
      const table = editingPrompt.type === 'admin' ? 'admin_prompts' : 'community_prompts';
      const bucket = editingPrompt.type === 'admin' ? 'admin-prompts' : 'community-prompts';
      
      let newImageUrl = editingPrompt.image_url;

      // If there's a new media file, upload it and delete the old one
      if (newMediaFile) {
        // Upload new file
        const fileExt = newMediaFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, newMediaFile);

        if (uploadError) throw uploadError;

        // Get new public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        newImageUrl = publicUrl;

        // Delete old file
        const oldFileName = editingPrompt.image_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from(bucket).remove([oldFileName]);
        }
      }

      const updateData: any = {
        title: formatTitle(editTitle),
        prompt: editPromptText,
        category: editCategory,
        image_url: newImageUrl
      };

      // Only add is_premium and tutorial_url for admin prompts
      if (editingPrompt.type === 'admin') {
        updateData.is_premium = editIsPremium;
        updateData.tutorial_url = editHasTutorial && editTutorialUrl ? editTutorialUrl : null;
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', editingPrompt.id);

      if (error) throw error;

      toast.success("Arquivo atualizado com sucesso!");
      handleCloseEdit();
      fetchPrompts();
    } catch (error) {
      console.error("Error updating prompt:", error);
      toast.error("Erro ao atualizar arquivo");
    }
  };

  const handleDelete = async (prompt: Prompt) => {
    if (!confirm("Tem certeza que deseja deletar este arquivo?")) return;

    try {
      const bucket = prompt.type === 'admin' ? 'admin-prompts' : 'community-prompts';
      const table = prompt.type === 'admin' ? 'admin_prompts' : 'community_prompts';
      
      // Delete from storage
      const fileName = prompt.image_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from(bucket).remove([fileName]);
      }

      // Delete from database
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', prompt.id);

      if (error) throw error;

      toast.success("Arquivo deletado com sucesso!");
      fetchPrompts();
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast.error("Erro ao deletar arquivo");
    }
  };

  const isVideoUrl = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
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
        <Button
          variant="ghost"
          onClick={() => navigate("/admin-dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Painel
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Gerenciar Arquivos Enviados
          </h1>
          <p className="text-muted-foreground text-lg mb-4">
            {filteredPrompts.length} arquivos {searchTerm ? 'encontrados' : 'publicados'}
          </p>
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
          {filteredPrompts.map((prompt) => {
            const isVideo = isVideoUrl(prompt.image_url);
            return (
              <Card key={`${prompt.type}-${prompt.id}`} className="overflow-hidden">
                <div className="relative">
                  {isVideo ? (
                    <video
                      src={prompt.image_url}
                      className="w-full h-48 object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      src={prompt.image_url}
                      alt={prompt.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {prompt.is_premium && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                        <Star className="h-3 w-3 mr-1" fill="currentColor" />
                        Premium
                      </Badge>
                    )}
                    <Badge className={
                      prompt.type === 'admin' ? 'bg-gradient-primary' : 'bg-blue-500'
                    }>
                      {prompt.type === 'admin' ? 'Exclusivo' : 'Comunidade'}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">
                      {prompt.title}
                    </h3>
                    <Badge variant="secondary" className="mt-1">
                      {prompt.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {prompt.prompt}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleEdit(prompt)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(prompt)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredPrompts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchTerm ? 'Nenhum arquivo encontrado com esse nome' : 'Nenhum arquivo encontrado'}
            </p>
          </div>
        )}
      </div>

      <Dialog open={!!editingPrompt} onOpenChange={handleCloseEdit}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Arquivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Replace Media Section */}
            <div>
              <Label>Substituir Imagem/Vídeo</Label>
              <div className="mt-2">
                <label
                  htmlFor="new-media"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                >
                  {newMediaPreview ? (
                    newMediaFile?.type.startsWith('video/') ? (
                      <video
                        src={newMediaPreview}
                        className="h-full object-contain"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <img
                        src={newMediaPreview}
                        alt="New Preview"
                        className="h-full object-contain"
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Clique para selecionar nova mídia
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Atual: {editingPrompt?.image_url.split('/').pop()?.substring(0, 30)}...
                      </p>
                    </div>
                  )}
                </label>
                <input
                  id="new-media"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleNewMediaChange}
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Categoria</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Selos 3D">Selos 3D</SelectItem>
                  <SelectItem value="Fotos">Fotos</SelectItem>
                  <SelectItem value="Cenários">Cenários</SelectItem>
                  <SelectItem value="Movies para Telão">Movies para Telão</SelectItem>
                  <SelectItem value="Controles de Câmera">Controles de Câmera</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {editingPrompt?.type === 'admin' && (
              <>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <Star className={`h-5 w-5 ${editIsPremium ? 'text-yellow-500' : 'text-muted-foreground'}`} fill={editIsPremium ? 'currentColor' : 'none'} />
                    <Label htmlFor="edit-isPremium" className="font-medium">
                      {editIsPremium ? 'Conteúdo Premium' : 'Conteúdo Gratuito'}
                    </Label>
                  </div>
                  <Switch
                    id="edit-isPremium"
                    checked={editIsPremium}
                    onCheckedChange={setEditIsPremium}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <Video className={`h-5 w-5 ${editHasTutorial ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Label htmlFor="edit-hasTutorial" className="font-medium">
                      {editHasTutorial ? 'Tem Tutorial' : 'Sem Tutorial'}
                    </Label>
                  </div>
                  <Switch
                    id="edit-hasTutorial"
                    checked={editHasTutorial}
                    onCheckedChange={setEditHasTutorial}
                  />
                </div>

                {editHasTutorial && (
                  <div>
                    <Label htmlFor="edit-tutorialUrl">Link do Tutorial (YouTube, Vimeo, etc.)</Label>
                    <Input
                      id="edit-tutorialUrl"
                      value={editTutorialUrl}
                      onChange={(e) => setEditTutorialUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="mt-2"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <Label htmlFor="edit-prompt">Prompt</Label>
              <Textarea
                id="edit-prompt"
                value={editPromptText}
                onChange={(e) => setEditPromptText(e.target.value)}
                className="mt-2 min-h-32"
              />
            </div>
            <Button
              onClick={handleSaveEdit}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminManageImages;
