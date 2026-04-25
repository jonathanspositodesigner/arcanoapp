import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Check, X, Users, Handshake, Trash2, XCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SecureImage, SecureVideo } from "@/components/SecureMedia";
import { syncFotoToAllTools } from "@/lib/iaLibrarySync";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
  rejection_reason?: string | null;
  deletion_requested: boolean;
  partner_name: string;
  is_premium: boolean;
  tutorial_url?: string | null;
  reference_images?: string[] | null;
  thumbnail_url?: string | null;
  gender?: string | null;
  tags?: string[] | null;
  subcategory_slug?: string | null;
  bonus_clicks?: number | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  deletion_requested_at?: string | null;
  updated_at?: string | null;
}

const AdminCommunityReview = () => {
  const navigate = useNavigate();
  const [communityPrompts, setCommunityPrompts] = useState<CommunityPrompt[]>([]);
  const [partnerPrompts, setPartnerPrompts] = useState<PartnerPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailItem, setDetailItem] = useState<{ kind: "community" | "partner"; data: any } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ promptId: string; title: string; currentReason?: string | null } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

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
      // Sync to AI tool libraries if it's a Fotos prompt
      const prompt = partnerPrompts.find(p => p.id === promptId);
      if (prompt?.category === 'Fotos') {
        const { data: promptData } = await supabase
          .from('partner_prompts')
          .select('subcategory_slug')
          .eq('id', promptId)
          .maybeSingle();
        if (promptData?.subcategory_slug) {
          await syncFotoToAllTools(promptId, promptData.subcategory_slug, 'partner_prompts');
        }
      }
      toast.success("Aprovado com sucesso!");
      fetchPartnerPrompts();
    }
  };

  const openRejectModal = (promptId: string, title: string, currentReason?: string | null) => {
    setRejectModal({ promptId, title, currentReason });
    setRejectReason(currentReason || "");
  };

  const handleConfirmReject = async () => {
    if (!rejectModal) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Informe o motivo da recusa");
      return;
    }
    if (reason.length > 1000) {
      toast.error("O motivo deve ter no máximo 1000 caracteres");
      return;
    }

    setIsRejecting(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('partner_prompts')
      .update({
        approved: false,
        rejected: true,
        rejected_at: new Date().toISOString(),
        rejected_by: user?.id,
        rejection_reason: reason,
        approved_at: null,
        approved_by: null,
      })
      .eq('id', rejectModal.promptId);

    setIsRejecting(false);

    if (error) {
      toast.error("Erro ao recusar");
    } else {
      await syncFotoToAllTools(rejectModal.promptId, null, 'partner_prompts');
      toast.success("Recusado! O parceiro verá o motivo e poderá editar.");
      setRejectModal(null);
      setRejectReason("");
      fetchPartnerPrompts();
    }
  };

  const handleDeletePartner = async (promptId: string, imageUrl: string) => {
    // Remove from AI tool libraries before deleting
    await syncFotoToAllTools(promptId, null, 'partner_prompts');

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

  const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url || "");

  const formatDate = (d?: string | null) =>
    d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

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
                  <div
                    className="relative cursor-pointer group"
                    onClick={() => setDetailItem({ kind: "community", data: prompt })}
                  >
                    {isVideoUrl(prompt.image_url) ? (
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
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Badge className="bg-background/90 text-foreground"><Eye className="h-3 w-3 mr-1" />Ver detalhes</Badge>
                    </div>
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
                    <div
                      className="relative cursor-pointer group"
                      onClick={() => setDetailItem({ kind: "partner", data: prompt })}
                    >
                      {isVideoUrl(prompt.image_url) ? (
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
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                        <Badge className="bg-background/90 text-foreground"><Eye className="h-3 w-3 mr-1" />Ver detalhes</Badge>
                      </div>
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
                          <Badge variant="secondary" className="bg-yellow-500 text-foreground">
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
                      {prompt.is_premium ? (
                        <Badge className="mt-1 ml-1 bg-amber-500 text-foreground">Premium</Badge>
                      ) : (
                        <Badge variant="secondary" className="mt-1 ml-1 bg-green-500/20 text-green-400 border-green-500/30">Gratuito</Badge>
                      )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">{prompt.prompt}</p>
                      <div className="flex gap-2 pt-2">
                        {(status === "pending" || status === "rejected") && (
                          <Button onClick={() => handleApprovePartner(prompt.id)} className="flex-1 bg-green-500 hover:bg-green-600">
                            <Check className="h-4 w-4 mr-2" />Aprovar
                          </Button>
                        )}
                        {(status === "pending" || status === "approved") && (
                          <Button onClick={() => handleRejectPartner(prompt.id)} variant="outline" className="flex-1 text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-foreground">
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

      {/* Detail Modal */}
      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{detailItem.data.title}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image / Video — full size */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mídia Principal</p>
                  <div className="rounded-lg overflow-hidden bg-muted border border-border">
                    {isVideoUrl(detailItem.data.image_url) ? (
                      <SecureVideo
                        src={detailItem.data.image_url}
                        className="w-full h-auto max-h-[70vh] object-contain"
                        isPremium={false}
                        controls
                      />
                    ) : (
                      <SecureImage
                        src={detailItem.data.image_url}
                        alt={detailItem.data.title}
                        className="w-full h-auto max-h-[70vh] object-contain"
                        isPremium={false}
                      />
                    )}
                  </div>
                  {detailItem.kind === "partner" && detailItem.data.thumbnail_url && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Thumbnail</p>
                      <SecureImage
                        src={detailItem.data.thumbnail_url}
                        alt="thumb"
                        className="w-32 h-32 object-cover rounded border border-border"
                        isPremium={false}
                      />
                    </div>
                  )}
                  {detailItem.kind === "partner" && Array.isArray(detailItem.data.reference_images) && detailItem.data.reference_images.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Imagens de Referência ({detailItem.data.reference_images.length})
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {detailItem.data.reference_images.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                            <SecureImage
                              src={url}
                              alt={`ref-${i}`}
                              className="w-full h-24 object-cover rounded border border-border hover:border-primary transition-colors"
                              isPremium={false}
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {detailItem.kind === "partner" && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <Handshake className="h-3 w-3 mr-1" />{detailItem.data.partner_name}
                      </Badge>
                    )}
                    {detailItem.kind === "community" && detailItem.data.contributor_name && (
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />{detailItem.data.contributor_name}
                      </Badge>
                    )}
                    <Badge variant="secondary">{detailItem.data.category}</Badge>
                    {detailItem.kind === "partner" && (
                      detailItem.data.is_premium ? (
                        <Badge className="bg-amber-500 text-foreground">Premium</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">Gratuito</Badge>
                      )
                    )}
                    {detailItem.kind === "partner" && detailItem.data.gender && (
                      <Badge variant="outline">Gênero: {detailItem.data.gender}</Badge>
                    )}
                    {detailItem.kind === "partner" && detailItem.data.subcategory_slug && (
                      <Badge variant="outline">Subcat: {detailItem.data.subcategory_slug}</Badge>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Prompt</p>
                    <div className="bg-muted/50 rounded-lg p-3 border border-border whitespace-pre-wrap text-foreground max-h-64 overflow-y-auto">
                      {detailItem.data.prompt}
                    </div>
                  </div>

                  {detailItem.kind === "partner" && detailItem.data.tutorial_url && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Tutorial</p>
                      <a href={detailItem.data.tutorial_url} target="_blank" rel="noreferrer" className="text-primary underline break-all text-xs">
                        {detailItem.data.tutorial_url}
                      </a>
                    </div>
                  )}

                  {detailItem.kind === "partner" && Array.isArray(detailItem.data.tags) && detailItem.data.tags.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {detailItem.data.tags.map((t: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Criado em</p>
                      <p className="text-foreground font-medium">{formatDate(detailItem.data.created_at)}</p>
                    </div>
                    {detailItem.data.updated_at && (
                      <div>
                        <p className="text-muted-foreground">Atualizado em</p>
                        <p className="text-foreground font-medium">{formatDate(detailItem.data.updated_at)}</p>
                      </div>
                    )}
                    {detailItem.data.approved_at && (
                      <div>
                        <p className="text-muted-foreground">Aprovado em</p>
                        <p className="text-green-400 font-medium">{formatDate(detailItem.data.approved_at)}</p>
                      </div>
                    )}
                    {detailItem.data.rejected_at && (
                      <div>
                        <p className="text-muted-foreground">Recusado em</p>
                        <p className="text-red-400 font-medium">{formatDate(detailItem.data.rejected_at)}</p>
                      </div>
                    )}
                    {detailItem.data.deletion_requested_at && (
                      <div>
                        <p className="text-muted-foreground">Exclusão solicitada em</p>
                        <p className="text-orange-400 font-medium">{formatDate(detailItem.data.deletion_requested_at)}</p>
                      </div>
                    )}
                    {detailItem.kind === "partner" && typeof detailItem.data.bonus_clicks === "number" && (
                      <div>
                        <p className="text-muted-foreground">Bonus clicks</p>
                        <p className="text-foreground font-medium">{detailItem.data.bonus_clicks}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="text-muted-foreground">ID</p>
                      <p className="text-foreground font-mono text-[10px] break-all">{detailItem.data.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCommunityReview;