import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Upload, FileCheck, Clock, Trash2, Home, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SecureImage, SecureVideo } from "@/components/SecureMedia";

interface Partner {
  id: string;
  name: string;
  email: string;
}

interface PartnerPrompt {
  id: string;
  title: string;
  prompt: string;
  image_url: string;
  category: string;
  approved: boolean;
  deletion_requested: boolean;
  created_at: string;
  download_count?: number;
}

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [prompts, setPrompts] = useState<PartnerPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkPartnerAndFetchData();
  }, []);

  const checkPartnerAndFetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/parceiro-login');
      return;
    }

    // Check if user is a partner
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'partner')
      .maybeSingle();

    if (!roleData) {
      toast.error("Acesso negado");
      navigate('/');
      return;
    }

    // Fetch partner info
    const { data: partnerData, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (partnerError || !partnerData) {
      toast.error("Erro ao carregar dados do parceiro");
      navigate('/');
      return;
    }

    setPartner(partnerData);

    // Fetch partner's prompts
    const { data: promptsData, error: promptsError } = await supabase
      .from('partner_prompts')
      .select('*')
      .eq('partner_id', partnerData.id)
      .order('created_at', { ascending: false });

    if (promptsError) {
      console.error("Error fetching prompts:", promptsError);
      setPrompts([]);
    } else {
      // Fetch download counts for each prompt
      const promptIds = (promptsData || []).map(p => p.id);
      if (promptIds.length > 0) {
        const { data: downloadData } = await supabase
          .from('prompt_downloads')
          .select('prompt_id')
          .eq('prompt_type', 'partner')
          .in('prompt_id', promptIds);

        const downloadCounts: Record<string, number> = {};
        (downloadData || []).forEach(d => {
          downloadCounts[d.prompt_id] = (downloadCounts[d.prompt_id] || 0) + 1;
        });

        const promptsWithDownloads = (promptsData || []).map(p => ({
          ...p,
          download_count: downloadCounts[p.id] || 0
        }));
        setPrompts(promptsWithDownloads);
      } else {
        setPrompts([]);
      }
    }

    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate('/');
  };

  const handleRequestDeletion = async (promptId: string) => {
    if (!confirm("Deseja solicitar a exclusão deste arquivo? Um administrador irá analisar a solicitação.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('partner_prompts')
        .update({
          deletion_requested: true,
          deletion_requested_at: new Date().toISOString(),
        })
        .eq('id', promptId);

      if (error) throw error;

      toast.success("Solicitação de exclusão enviada");
      checkPartnerAndFetchData();
    } catch (error) {
      console.error("Error requesting deletion:", error);
      toast.error("Erro ao solicitar exclusão");
    }
  };

  const stats = {
    total: prompts.length,
    approved: prompts.filter(p => p.approved).length,
    pending: prompts.filter(p => !p.approved && !p.deletion_requested).length,
    deletionRequested: prompts.filter(p => p.deletion_requested).length,
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Olá, {partner?.name}!
            </h1>
            <p className="text-muted-foreground text-lg">
              Gerencie seus arquivos enviados
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
              <Home className="h-4 w-4" />
              Home
            </Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Enviados</p>
            </div>
          </Card>
          <Card className="p-4 bg-green-500/10 border-green-500/20">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Aprovados</p>
            </div>
          </Card>
          <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </Card>
          <Card className="p-4 bg-red-500/10 border-red-500/20">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{stats.deletionRequested}</p>
              <p className="text-sm text-muted-foreground">Exclusão Solicitada</p>
            </div>
          </Card>
        </div>

        {/* Upload Button */}
        <Button 
          onClick={() => navigate('/parceiro-upload')}
          className="w-full mb-8 h-16 text-lg bg-gradient-primary hover:opacity-90 gap-2"
        >
          <Upload className="h-6 w-6" />
          Enviar Novo Arquivo
        </Button>

        {/* Prompts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map((prompt) => (
            <Card key={prompt.id} className="overflow-hidden">
              <div className="relative">
                {prompt.image_url.includes('.mp4') || prompt.image_url.includes('.webm') || prompt.image_url.includes('.mov') ? (
                  <SecureVideo
                    src={prompt.image_url}
                    className="w-full h-48 object-cover"
                    isPremium={false}
                    autoPlay
                    muted
                    loop
                  />
                ) : (
                  <SecureImage
                    src={prompt.image_url}
                    alt={prompt.title}
                    className="w-full h-48 object-cover"
                    isPremium={false}
                  />
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  {prompt.approved ? (
                    <Badge className="bg-green-500">
                      <FileCheck className="h-3 w-3 mr-1" />
                      Aprovado
                    </Badge>
                  ) : prompt.deletion_requested ? (
                    <Badge variant="destructive">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Exclusão Solicitada
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-500 text-white">
                      <Clock className="h-3 w-3 mr-1" />
                      Pendente
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{prompt.title}</h3>
                    <Badge variant="outline" className="mt-1">{prompt.category}</Badge>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {prompt.download_count || 0}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{prompt.prompt}</p>
                
                {!prompt.deletion_requested && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRequestDeletion(prompt.id)}
                    className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Solicitar Exclusão
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {prompts.length === 0 && (
          <div className="text-center py-12">
            <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-4">
              Você ainda não enviou nenhum arquivo
            </p>
            <Button onClick={() => navigate('/parceiro-upload')} className="gap-2">
              <Upload className="h-4 w-4" />
              Enviar Primeiro Arquivo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerDashboard;
