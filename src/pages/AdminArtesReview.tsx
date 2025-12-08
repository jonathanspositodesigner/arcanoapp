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

interface CommunityArte {
  id: string;
  title: string;
  description?: string;
  category: string;
  image_url: string;
  created_at: string;
  approved: boolean;
  contributor_name?: string;
}

interface PartnerArte {
  id: string;
  title: string;
  description?: string;
  category: string;
  image_url: string;
  created_at: string;
  approved: boolean;
  rejected: boolean;
  deletion_requested: boolean;
  partner_name: string;
}

const AdminArtesReview = () => {
  const navigate = useNavigate();
  const [communityArtes, setCommunityArtes] = useState<CommunityArte[]>([]);
  const [partnerArtes, setPartnerArtes] = useState<PartnerArte[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    await Promise.all([fetchCommunityArtes(), fetchPartnerArtes()]);
    setIsLoading(false);
  };

  const fetchCommunityArtes = async () => {
    const { data, error } = await supabase
      .from('community_artes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching community artes:", error);
    } else {
      setCommunityArtes(data || []);
    }
  };

  const fetchPartnerArtes = async () => {
    const { data, error } = await supabase
      .from('partner_artes')
      .select('*, partners(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching partner artes:", error);
    } else {
      const mapped = (data || []).map((a: any) => ({
        ...a,
        rejected: a.rejected || false,
        partner_name: a.partners?.name || 'Parceiro desconhecido',
      }));
      setPartnerArtes(mapped);
    }
  };

  const handleApproveCommunity = async (arteId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('community_artes')
      .update({ approved: true, approved_at: new Date().toISOString(), approved_by: user?.id })
      .eq('id', arteId);

    if (error) {
      toast.error("Erro ao aprovar");
    } else {
      toast.success("Aprovado com sucesso!");
      fetchCommunityArtes();
    }
  };

  const handleDeleteCommunity = async (arteId: string, imageUrl: string) => {
    const fileName = imageUrl.split('/').pop();
    if (fileName) {
      await supabase.storage.from('community-artes').remove([fileName]);
    }

    const { error } = await supabase.from('community_artes').delete().eq('id', arteId);

    if (error) {
      toast.error("Erro ao deletar");
    } else {
      toast.success("Deletado com sucesso!");
      fetchCommunityArtes();
    }
  };

  const handleApprovePartner = async (arteId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('partner_artes')
      .update({ 
        approved: true, 
        approved_at: new Date().toISOString(), 
        approved_by: user?.id, 
        deletion_requested: false,
        rejected: false,
        rejected_at: null,
        rejected_by: null
      })
      .eq('id', arteId);

    if (error) {
      toast.error("Erro ao aprovar");
    } else {
      toast.success("Aprovado com sucesso!");
      fetchPartnerArtes();
    }
  };

  const handleRejectPartner = async (arteId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('partner_artes')
      .update({ 
        approved: false,
        rejected: true, 
        rejected_at: new Date().toISOString(), 
        rejected_by: user?.id,
        approved_at: null,
        approved_by: null
      })
      .eq('id', arteId);

    if (error) {
      toast.error("Erro ao recusar");
    } else {
      toast.success("Recusado! O parceiro poderá editar e reenviar.");
      fetchPartnerArtes();
    }
  };

  const handleDeletePartner = async (arteId: string, imageUrl: string) => {
    const fileName = imageUrl.split('/').pop();
    if (fileName) {
      await supabase.storage.from('partner-artes').remove([fileName]);
    }

    const { error } = await supabase.from('partner_artes').delete().eq('id', arteId);

    if (error) {
      toast.error("Erro ao deletar");
    } else {
      toast.success("Deletado com sucesso!");
      fetchPartnerArtes();
    }
  };

  const getPartnerArteStatus = (arte: PartnerArte): "pending" | "approved" | "rejected" | "deletion" => {
    if (arte.deletion_requested) return "deletion";
    if (arte.approved) return "approved";
    if (arte.rejected) return "rejected";
    return "pending";
  };

  const isVideoUrl = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  const pendingCommunity = communityArtes.filter(a => !a.approved);
  const pendingPartner = partnerArtes.filter(a => !a.approved || a.deletion_requested);

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
        <Button variant="ghost" onClick={() => navigate("/admin-dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Painel
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Analisar Envios de Artes</h1>
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
              {communityArtes.map((arte) => (
                <Card key={arte.id} className="overflow-hidden">
                  <div className="relative">
                    {isVideoUrl(arte.image_url) ? (
                      <SecureVideo src={arte.image_url} className="w-full h-48 object-cover" isPremium={false} autoPlay muted loop />
                    ) : (
                      <SecureImage src={arte.image_url} alt={arte.title} className="w-full h-48 object-cover" isPremium={false} />
                    )}
                    {arte.approved && <Badge className="absolute top-2 right-2 bg-green-500">Aprovado</Badge>}
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{arte.title}</h3>
                      {arte.contributor_name && (
                        <p className="text-sm text-muted-foreground">Por: {arte.contributor_name}</p>
                      )}
                      <Badge variant="secondary" className="mt-1">{arte.category}</Badge>
                    </div>
                    {arte.description && <p className="text-sm text-muted-foreground line-clamp-3">{arte.description}</p>}
                    <div className="flex gap-2 pt-2">
                      {!arte.approved && (
                        <Button onClick={() => handleApproveCommunity(arte.id)} className="flex-1 bg-green-500 hover:bg-green-600">
                          <Check className="h-4 w-4 mr-2" />Aprovar
                        </Button>
                      )}
                      <Button onClick={() => handleDeleteCommunity(arte.id, arte.image_url)} variant="destructive" className="flex-1">
                        <X className="h-4 w-4 mr-2" />Deletar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {communityArtes.length === 0 && (
              <div className="text-center py-12"><p className="text-muted-foreground">Nenhum envio da comunidade</p></div>
            )}
          </TabsContent>

          <TabsContent value="partners">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partnerArtes.map((arte) => {
                const status = getPartnerArteStatus(arte);
                return (
                  <Card key={arte.id} className="overflow-hidden">
                    <div className="relative">
                      {isVideoUrl(arte.image_url) ? (
                        <SecureVideo src={arte.image_url} className="w-full h-48 object-cover" isPremium={false} autoPlay muted loop />
                      ) : (
                        <SecureImage src={arte.image_url} alt={arte.title} className="w-full h-48 object-cover" isPremium={false} />
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {status === "deletion" && (
                          <Badge variant="destructive"><Trash2 className="h-3 w-3 mr-1" />Exclusão Solicitada</Badge>
                        )}
                        {status === "approved" && <Badge className="bg-green-500">Aprovado</Badge>}
                        {status === "pending" && <Badge variant="secondary" className="bg-yellow-500 text-white">Pendente</Badge>}
                        {status === "rejected" && <Badge variant="destructive" className="bg-red-600"><XCircle className="h-3 w-3 mr-1" />Recusado</Badge>}
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-bold text-lg text-foreground">{arte.title}</h3>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                          <Handshake className="h-3 w-3 mr-1" />{arte.partner_name}
                        </Badge>
                        <Badge variant="secondary" className="mt-1 ml-1">{arte.category}</Badge>
                      </div>
                      {arte.description && <p className="text-sm text-muted-foreground line-clamp-3">{arte.description}</p>}
                      <div className="flex gap-2 pt-2">
                        {(status === "pending" || status === "rejected") && (
                          <Button onClick={() => handleApprovePartner(arte.id)} className="flex-1 bg-green-500 hover:bg-green-600">
                            <Check className="h-4 w-4 mr-2" />Aprovar
                          </Button>
                        )}
                        {(status === "pending" || status === "approved") && (
                          <Button onClick={() => handleRejectPartner(arte.id)} variant="outline" className="flex-1 text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-white">
                            <XCircle className="h-4 w-4 mr-2" />Recusar
                          </Button>
                        )}
                        {status === "deletion" && (
                          <>
                            <Button onClick={() => handleApprovePartner(arte.id)} className="flex-1 bg-green-500 hover:bg-green-600">
                              <Check className="h-4 w-4 mr-2" />Manter
                            </Button>
                            <Button onClick={() => handleDeletePartner(arte.id, arte.image_url)} variant="destructive" className="flex-1">
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
            {partnerArtes.length === 0 && (
              <div className="text-center py-12"><p className="text-muted-foreground">Nenhum envio de parceiros</p></div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminArtesReview;
