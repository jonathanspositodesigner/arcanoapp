import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Check, X, Users, Handshake, Trash2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SecureImage, SecureVideo } from "@/components/SecureMedia";

interface CommunityPrompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  image_url: string;
  created_at: string;
  approved: boolean;
  contributor_name?: string;
}

interface PartnerPrompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  image_url: string;
  created_at: string;
  approved: boolean;
  rejected: boolean;
  deletion_requested: boolean;
  partner_name: string;
}

const AdminCommunityReview = () => {
  const navigate = useNavigate();
  const [communityPrompts, setCommunityPrompts] = useState<CommunityPrompt[]>([]);
  const [partnerPrompts, setPartnerPrompts] = useState<PartnerPrompt[]>([]);
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

    await Promise.all([fetchCommunityPrompts(), fetchPartnerPrompts()]);
    setIsLoading(false);
  };

  const fetchCommunityPrompts = async () => {
    const { data, error } = await supabase
      .from('community_prompts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching community prompts:", error);
    } else {
      setCommunityPrompts(data || []);
    }
  };

  const fetchPartnerPrompts = async () => {
    const { data, error } = await supabase
      .from('partner_prompts')
      .select('*, partners(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching partner prompts:", error);
    } else {
      const mapped = (data || []).map((p: any) => ({
        ...p,
        rejected: p.rejected || false,
        partner_name: p.partners?.name || 'Parceiro desconhecido',
      }));
      setPartnerPrompts(mapped);
    }
  };

  const handleApproveCommunity = async (promptId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('community_prompts')
      .update({ approved: true, approved_at: new Date().toISOString(), approved_by: user?.id })
      .eq('id', promptId);

    if (error) {
      toast.error("Erro ao aprovar");
    } else {
      toast.success("Aprovado com sucesso!");
      fetchCommunityPrompts();
    }
  };

  const handleDeleteCommunity = async (promptId: string, imageUrl: string) => {
    const fileName = imageUrl.split('/').pop();
    if (fileName) {
      await supabase.storage.from('community-prompts').remove([fileName]);
    }

    const { error } = await supabase.from('community_prompts').delete().eq('id', promptId);

    if (error) {
      toast.error("Erro ao deletar");
    } else {
      toast.success("Deletado com sucesso!");
      fetchCommunityPrompts();
    }
  };

  const handleApprovePartner = async (promptId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('partner_prompts')
      .update({ 
        approved: true, 
        approved_at: new Date().toISOString(), 
        approved_by: user?.id, 
        deletion_requested: false,
        rejected: false,
        rejected_at: null,
        rejected_by: null
      })
      .eq('id', promptId);

    if (error) {
      toast.error("Erro ao aprovar");
    } else {
      toast.success("Aprovado com sucesso!");
      fetchPartnerPrompts();
    }
  };

  const handleRejectPartner = async (promptId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('partner_prompts')
      .update({ 
        approved: false,
        rejected: true, 
        rejected_at: new Date().toISOString(), 
        rejected_by: user?.id,
        approved_at: null,
        approved_by: null
      })
      .eq('id', promptId);

    if (error) {
      toast.error("Erro ao recusar");
    } else {
      toast.success("Recusado! O parceiro poderá editar e reenviar.");
      fetchPartnerPrompts();
    }
  };

  const handleDeletePartner = async (promptId: string, imageUrl: string) => {
    const fileName = imageUrl.split('/').pop();
    if (fileName) {
      await supabase.storage.from('partner-prompts').remove([fileName]);
    }

    const { error } = await supabase.from('partner_prompts').delete().eq('id', promptId);

    if (error) {
      toast.error("Erro ao deletar");
    } else {
      toast.success("Deletado com sucesso!");
      fetchPartnerPrompts();
    }
  };

  const getPartnerPromptStatus = (prompt: PartnerPrompt): "pending" | "approved" | "rejected" | "deletion" => {
    if (prompt.deletion_requested) return "deletion";
    if (prompt.approved) return "approved";
    if (prompt.rejected) return "rejected";
    return "pending";
  };

  const pendingCommunity = communityPrompts.filter(p => !p.approved);
  const pendingPartner = partnerPrompts.filter(p => !p.approved || p.deletion_requested);

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
        <Button variant="ghost" onClick={() => navigate("/admin-prompts/ferramentas")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Painel
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Analisar Envios</h1>
        </div>

        <Tabs defaultValue="community">
          <TabsList className="mb-6">
            <TabsTrigger value="community" className="gap-2">
              <Users className="h-4 w-4" />
              Comunidade ({pendingCommunity.length})
            </TabsTrigger>
            <TabsTrigger value="partners" className="gap-2">
              <Handshake className="h-4 w-4" />
              Parceiros ({pendingPartner.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="community">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communityPrompts.map((prompt) => (
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
                    {prompt.approved && <Badge className="absolute top-2 right-2 bg-green-500">Aprovado</Badge>}
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{prompt.title}</h3>
                      {prompt.contributor_name && (
                        <p className="text-sm text-muted-foreground">Por: {prompt.contributor_name}</p>
                      )}
                      <Badge variant="secondary" className="mt-1">{prompt.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{prompt.prompt}</p>
                    <div className="flex gap-2 pt-2">
                      {!prompt.approved && (
                        <Button onClick={() => handleApproveCommunity(prompt.id)} className="flex-1 bg-green-500 hover:bg-green-600">
                          <Check className="h-4 w-4 mr-2" />Aprovar
                        </Button>
                      )}
                      <Button onClick={() => handleDeleteCommunity(prompt.id, prompt.image_url)} variant="destructive" className="flex-1">
                        <X className="h-4 w-4 mr-2" />Deletar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {communityPrompts.length === 0 && (
              <div className="text-center py-12"><p className="text-muted-foreground">Nenhum envio da comunidade</p></div>
            )}
          </TabsContent>

          <TabsContent value="partners">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partnerPrompts.map((prompt) => {
                const status = getPartnerPromptStatus(prompt);
                return (
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
                        {status === "deletion" && (
                          <Badge variant="destructive">
                            <Trash2 className="h-3 w-3 mr-1" />Exclusão Solicitada
                          </Badge>
                        )}
                        {status === "approved" && (
                          <Badge className="bg-green-500">Aprovado</Badge>
                        )}
                        {status === "pending" && (
                          <Badge variant="secondary" className="bg-yellow-500 text-white">
                            Pendente
                          </Badge>
                        )}
                        {status === "rejected" && (
                          <Badge variant="destructive" className="bg-red-600">
                            <XCircle className="h-3 w-3 mr-1" />Recusado
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-bold text-lg text-foreground">{prompt.title}</h3>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                          <Handshake className="h-3 w-3 mr-1" />{prompt.partner_name}
                        </Badge>
                        <Badge variant="secondary" className="mt-1 ml-1">{prompt.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">{prompt.prompt}</p>
                      <div className="flex gap-2 pt-2">
                        {(status === "pending" || status === "rejected") && (
                          <Button onClick={() => handleApprovePartner(prompt.id)} className="flex-1 bg-green-500 hover:bg-green-600">
                            <Check className="h-4 w-4 mr-2" />Aprovar
                          </Button>
                        )}
                        {(status === "pending" || status === "approved") && (
                          <Button onClick={() => handleRejectPartner(prompt.id)} variant="outline" className="flex-1 text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-white">
                            <XCircle className="h-4 w-4 mr-2" />Recusar
                          </Button>
                        )}
                        {status === "deletion" && (
                          <>
                            <Button onClick={() => handleApprovePartner(prompt.id)} className="flex-1 bg-green-500 hover:bg-green-600">
                              <Check className="h-4 w-4 mr-2" />Manter
                            </Button>
                            <Button onClick={() => handleDeletePartner(prompt.id, prompt.image_url)} variant="destructive" className="flex-1">
                              <Trash2 className="h-4 w-4 mr-2" />Confirmar Exclusão
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            {partnerPrompts.length === 0 && (
              <div className="text-center py-12"><p className="text-muted-foreground">Nenhum envio de parceiros</p></div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminCommunityReview;