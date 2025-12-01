import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CommunityPrompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  image_url: string;
  created_at: string;
  approved: boolean;
}

const AdminCommunityReview = () => {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<CommunityPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      const { data, error } = await supabase
        .from('community_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast.error("Erro ao carregar selos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (promptId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('community_prompts')
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', promptId);

      if (error) throw error;

      toast.success("Selo aprovado com sucesso!");
      fetchPrompts();
    } catch (error) {
      console.error("Error approving prompt:", error);
      toast.error("Erro ao aprovar selo");
    }
  };

  const handleDelete = async (promptId: string, imageUrl: string) => {
    try {
      // Delete from storage
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('community-prompts')
          .remove([fileName]);
      }

      // Delete from database
      const { error } = await supabase
        .from('community_prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      toast.success("Selo deletado com sucesso!");
      fetchPrompts();
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast.error("Erro ao deletar selo");
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
            Analisar Selos da Comunidade
          </h1>
          <p className="text-muted-foreground text-lg">
            {prompts.filter(p => !p.approved).length} selos pendentes de aprovação
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map((prompt) => (
            <Card key={prompt.id} className="overflow-hidden">
              <div className="relative">
                <img
                  src={prompt.image_url}
                  alt={prompt.title}
                  className="w-full h-48 object-cover"
                />
                {prompt.approved && (
                  <Badge className="absolute top-2 right-2 bg-green-500">
                    Aprovado
                  </Badge>
                )}
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
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {prompt.prompt}
                </p>
                <div className="flex gap-2 pt-2">
                  {!prompt.approved && (
                    <Button
                      onClick={() => handleApprove(prompt.id)}
                      className="flex-1 bg-green-500 hover:bg-green-600"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDelete(prompt.id, prompt.image_url)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Deletar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {prompts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Nenhum selo da comunidade encontrado
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCommunityReview;
