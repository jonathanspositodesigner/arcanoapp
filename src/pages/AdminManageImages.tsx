import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Pencil, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Prompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  image_url: string;
  type: 'admin' | 'community';
  is_premium?: boolean;
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
        supabase.from('admin_prompts').select('*'),
        supabase.from('community_prompts').select('*').eq('approved', true)
      ]);

      const allPrompts: Prompt[] = [
        ...(adminData.data || []).map(p => ({ ...p, type: 'admin' as const })),
        ...(communityData.data || []).map(p => ({ ...p, type: 'community' as const, is_premium: false }))
      ];

      setPrompts(allPrompts);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast.error("Erro ao carregar imagens");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setEditTitle(prompt.title);
    setEditPromptText(prompt.prompt);
    setEditCategory(prompt.category);
    setEditIsPremium(prompt.is_premium || false);
  };

  const handleSaveEdit = async () => {
    if (!editingPrompt) return;

    try {
      const table = editingPrompt.type === 'admin' ? 'admin_prompts' : 'community_prompts';
      
      const updateData: any = {
        title: editTitle,
        prompt: editPromptText,
        category: editCategory
      };

      // Only add is_premium for admin prompts
      if (editingPrompt.type === 'admin') {
        updateData.is_premium = editIsPremium;
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', editingPrompt.id);

      if (error) throw error;

      toast.success("Selo atualizado com sucesso!");
      setEditingPrompt(null);
      fetchPrompts();
    } catch (error) {
      console.error("Error updating prompt:", error);
      toast.error("Erro ao atualizar selo");
    }
  };

  const handleDelete = async (prompt: Prompt) => {
    if (!confirm("Tem certeza que deseja deletar este selo?")) return;

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

      toast.success("Selo deletado com sucesso!");
      fetchPrompts();
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast.error("Erro ao deletar selo");
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
            Gerenciar Imagens Enviadas
          </h1>
          <p className="text-muted-foreground text-lg">
            {prompts.length} selos publicados
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map((prompt) => {
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

        {prompts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Nenhum selo encontrado
            </p>
          </div>
        )}
      </div>

      <Dialog open={!!editingPrompt} onOpenChange={() => setEditingPrompt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Selo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Input
                id="edit-category"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="mt-2"
              />
            </div>
            
            {editingPrompt?.type === 'admin' && (
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
