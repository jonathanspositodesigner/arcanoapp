import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LogOut, Upload, FileCheck, Clock, Trash2, ArrowLeft, Copy, Pencil, XCircle } from "lucide-react";
import { Instagram, User, Camera, KeyRound, DollarSign, TrendingUp, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePartnerGamificationNotifications } from "@/hooks/usePartnerGamificationNotifications";
import { SecureImage, SecureVideo } from "@/components/SecureMedia";
import imageCompression from 'browser-image-compression';

interface Partner {
  id: string;
  name: string;
  email: string;
  instagram?: string;
  avatar_url?: string;
}

interface PartnerPrompt {
  id: string;
  title: string;
  prompt: string;
  image_url: string;
  category: string;
  approved: boolean;
  rejected: boolean;
  deletion_requested: boolean;
  created_at: string;
  click_count?: number;
}

type FilterType = "all" | "approved" | "pending" | "rejected";

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  usePartnerGamificationNotifications(partner?.id ?? null);
  const [prompts, setPrompts] = useState<PartnerPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PartnerPrompt | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPromptText, setEditPromptText] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile state
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileInstagram, setProfileInstagram] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [earningsBalance, setEarningsBalance] = useState(0);
  const [earningsUnlocks, setEarningsUnlocks] = useState(0);
  const [earningsPaidOut, setEarningsPaidOut] = useState(0);

  useEffect(() => {
    checkPartnerAndFetchData();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('prompts_categories')
      .select('id, name, is_admin_only')
      .eq('is_admin_only', false)
      .order('display_order', { ascending: true });
    if (data) setCategories(data);
  };

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
      .select('id, name, email, instagram, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle();

    if (partnerError || !partnerData) {
      toast.error("Erro ao carregar dados do parceiro");
      navigate('/');
      return;
    }

    setPartner(partnerData);
    setProfileName(partnerData.name);
    setProfileInstagram(partnerData.instagram || "");
    setProfileAvatarUrl(partnerData.avatar_url || "");

    // Fetch earnings balance and paid withdrawals
    const [balanceRes, withdrawalsRes] = await Promise.all([
      supabase
        .from('collaborator_balances')
        .select('total_earned, total_unlocks')
        .eq('collaborator_id', partnerData.id)
        .maybeSingle(),
      supabase
        .from('partner_withdrawals')
        .select('valor_solicitado')
        .eq('partner_id', partnerData.id)
        .eq('status', 'pago'),
    ]);
    
    setEarningsBalance(balanceRes.data?.total_earned || 0);
    setEarningsUnlocks(balanceRes.data?.total_unlocks || 0);
    const totalPaid = (withdrawalsRes.data || []).reduce((sum, w) => sum + Number(w.valor_solicitado), 0);
    setEarningsPaidOut(totalPaid);

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
      // Fetch click counts via aggregated RPC
      const promptIds = (promptsData || []).map(p => p.id);
      if (promptIds.length > 0) {
        const { data: clickData } = await supabase.rpc('get_prompt_click_counts');

        const clickCounts: Record<string, number> = {};
        (clickData || []).forEach((d: any) => {
          if (promptIds.includes(d.prompt_id)) {
            clickCounts[d.prompt_id] = Number(d.click_count);
          }
        });

        const promptsWithClicks = (promptsData || []).map(p => ({
          ...p,
          rejected: p.rejected || false,
          click_count: clickCounts[p.id] || 0
        }));
        setPrompts(promptsWithClicks);
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

  const openEditModal = (prompt: PartnerPrompt) => {
    setEditingPrompt(prompt);
    setEditTitle(prompt.title);
    setEditPromptText(prompt.prompt);
    setEditCategory(prompt.category);
    setEditModalOpen(true);
  };

  const formatTitle = (title: string): string => {
    if (!title) return "";
    return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
  };

  const handleSaveEdit = async () => {
    if (!editingPrompt) return;

    if (!editTitle.trim() || !editPromptText.trim() || !editCategory) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsSubmitting(true);

    try {
      // Update prompt and set it back to pending (unapproved) status
      const { error } = await supabase
        .from('partner_prompts')
        .update({
          title: formatTitle(editTitle),
          prompt: editPromptText,
          category: editCategory,
          approved: false,
          rejected: false,
          rejected_at: null,
          rejected_by: null,
          approved_at: null,
          approved_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingPrompt.id);

      if (error) throw error;

      toast.success("Arquivo atualizado! Aguardando aprovação do administrador.");
      setEditModalOpen(false);
      setEditingPrompt(null);
      checkPartnerAndFetchData();
    } catch (error) {
      console.error("Error updating prompt:", error);
      toast.error("Erro ao atualizar arquivo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPromptStatus = (prompt: PartnerPrompt): "approved" | "pending" | "rejected" | "deletion" => {
    if (prompt.deletion_requested) return "deletion";
    if (prompt.approved) return "approved";
    if (prompt.rejected) return "rejected";
    return "pending";
  };

  const filteredPrompts = prompts.filter(prompt => {
    const status = getPromptStatus(prompt);
    if (activeFilter === "all") return true;
    if (activeFilter === "approved") return status === "approved";
    if (activeFilter === "pending") return status === "pending";
    if (activeFilter === "rejected") return status === "rejected";
    return true;
  });

  const stats = {
    total: prompts.length,
    approved: prompts.filter(p => p.approved && !p.deletion_requested).length,
    pending: prompts.filter(p => !p.approved && !p.rejected && !p.deletion_requested).length,
    rejected: prompts.filter(p => p.rejected && !p.deletion_requested).length,
    deletionRequested: prompts.filter(p => p.deletion_requested).length,
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !partner) return;
    
    setIsUploadingAvatar(true);
    try {
      // Compress to 100px and convert to webp
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 100,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.85,
      });
      
      const fileName = `partner-avatars/${partner.id}-${Date.now()}.webp`;
      const webpFile = new File([compressed], fileName.split('/').pop()!, { type: 'image/webp' });
      
      const { error: uploadError } = await supabase.storage
        .from('prompts-cloudinary')
        .upload(fileName, webpFile, { contentType: 'image/webp', upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('prompts-cloudinary')
        .getPublicUrl(fileName);
      
      const avatarUrl = urlData.publicUrl;
      
      const { error: updateError } = await supabase
        .from('partners')
        .update({ avatar_url: avatarUrl })
        .eq('id', partner.id);
      
      if (updateError) throw updateError;
      
      setProfileAvatarUrl(avatarUrl);
      setPartner({ ...partner, avatar_url: avatarUrl });
      toast.success("Foto atualizada com sucesso!");
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error("Erro ao enviar foto");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!partner || !profileName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('partners')
        .update({
          name: profileName.trim(),
          instagram: profileInstagram.trim() || null,
        })
        .eq('id', partner.id);
      
      if (error) throw error;
      
      setPartner({ ...partner, name: profileName.trim(), instagram: profileInstagram.trim() || undefined });
      toast.success("Perfil atualizado!");
    } catch (err) {
      console.error("Profile save error:", err);
      toast.error("Erro ao salvar perfil");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar senha");
    } finally {
      setIsChangingPassword(false);
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
            <Button variant="outline" onClick={() => navigate('/parceiro-plataformas')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button variant="outline" onClick={() => setShowProfile(!showProfile)} className="gap-2">
              <User className="h-4 w-4" />
              Perfil
            </Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Profile Section */}
        {showProfile && (
          <Card className="p-6 mb-8 border-primary/20">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <User className="h-5 w-5" />
              Gerenciar Perfil
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left column - Profile info */}
              <div className="space-y-4">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {profileAvatarUrl ? (
                      <img src={profileAvatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-border">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors">
                      <Camera className="h-3.5 w-3.5 text-primary-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={isUploadingAvatar}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isUploadingAvatar ? "Enviando..." : "Clique no ícone para alterar"}
                    </p>
                    <p className="text-xs text-muted-foreground">Auto-redimensionada para 100px em WebP</p>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <Label htmlFor="profileName">Nome</Label>
                  <Input
                    id="profileName"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Instagram */}
                <div>
                  <Label htmlFor="profileInstagram" className="flex items-center gap-1">
                    <Instagram className="h-3.5 w-3.5" />
                    Instagram
                  </Label>
                  <Input
                    id="profileInstagram"
                    value={profileInstagram}
                    onChange={(e) => setProfileInstagram(e.target.value)}
                    placeholder="seu_usuario"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Sem o @, apenas o nome de usuário</p>
                </div>

                <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full">
                  {isSavingProfile ? "Salvando..." : "Salvar Perfil"}
                </Button>
              </div>

              {/* Right column - Password */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Alterar Senha
                </h3>
                <div>
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleChangePassword} disabled={isChangingPassword} variant="outline" className="w-full">
                  {isChangingPassword ? "Alterando..." : "Alterar Senha"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        {/* Earnings Balance Card */}
        <Card
          className="p-5 mb-6 bg-green-500/10 border-green-500/20 cursor-pointer hover:bg-green-500/15 transition-colors"
          onClick={() => navigate('/parceiro-extrato')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Disponível</p>
                <p className="text-3xl font-bold text-green-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(earningsBalance - earningsPaidOut)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {earningsUnlocks} desbloqueio{earningsUnlocks !== 1 ? 's' : ''} • Total bruto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(earningsBalance)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Ver Extrato</span>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Enviados</p>
            </div>
          </Card>
          <Card className="p-4 bg-green-500/10 border-green-500/20">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
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
              <p className="text-3xl font-bold text-red-400">{stats.rejected}</p>
              <p className="text-sm text-muted-foreground">Recusados</p>
            </div>
          </Card>
          <Card className="p-4 bg-orange-500/10 border-orange-500/20">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">{stats.deletionRequested}</p>
              <p className="text-sm text-muted-foreground">Exclusão Solicitada</p>
            </div>
          </Card>
        </div>

        {/* Upload Button */}
        <Button 
          onClick={() => navigate('/parceiro-upload')}
          className="w-full mb-6 h-16 text-lg bg-gradient-primary hover:opacity-90 gap-2"
        >
          <Upload className="h-6 w-6" />
          Enviar Novo Arquivo
        </Button>

        {/* Conquistas Button */}
        <Button
          onClick={() => navigate('/parceiro-conquistas')}
          variant="outline"
          className="w-full mb-6 h-14 text-base gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
        >
          <Trophy className="h-5 w-5" />
          🎮 Conquistas & Ranking
        </Button>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            onClick={() => setActiveFilter("all")}
            size="sm"
          >
            Todos ({stats.total})
          </Button>
          <Button
            variant={activeFilter === "approved" ? "default" : "outline"}
            onClick={() => setActiveFilter("approved")}
            size="sm"
            className={activeFilter === "approved" ? "bg-green-600 hover:bg-green-700" : "text-green-400 border-green-600"}
          >
            <FileCheck className="h-4 w-4 mr-1" />
            Aprovados ({stats.approved})
          </Button>
          <Button
            variant={activeFilter === "pending" ? "default" : "outline"}
            onClick={() => setActiveFilter("pending")}
            size="sm"
            className={activeFilter === "pending" ? "bg-yellow-600 hover:bg-yellow-700" : "text-yellow-600 border-yellow-600"}
          >
            <Clock className="h-4 w-4 mr-1" />
            Pendentes ({stats.pending})
          </Button>
          <Button
            variant={activeFilter === "rejected" ? "default" : "outline"}
            onClick={() => setActiveFilter("rejected")}
            size="sm"
            className={activeFilter === "rejected" ? "bg-red-600 hover:bg-red-700" : "text-red-400 border-red-600"}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Recusados ({stats.rejected})
          </Button>
        </div>

        {/* Prompts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.map((prompt) => {
            const status = getPromptStatus(prompt);
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
                    {status === "approved" && (
                      <Badge className="bg-green-500">
                        <FileCheck className="h-3 w-3 mr-1" />
                        Aprovado
                      </Badge>
                    )}
                    {status === "deletion" && (
                      <Badge variant="destructive">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Exclusão Solicitada
                      </Badge>
                    )}
                    {status === "pending" && (
                      <Badge variant="secondary" className="bg-yellow-500 text-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                    {status === "rejected" && (
                      <Badge variant="destructive" className="bg-red-600">
                        <XCircle className="h-3 w-3 mr-1" />
                        Recusado
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
                      <Copy className="h-3 w-3" />
                      {prompt.click_count || 0}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{prompt.prompt}</p>
                  
                  <div className="flex gap-2">
                    {/* Edit button - available for pending and rejected prompts */}
                    {(status === "pending" || status === "rejected") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(prompt)}
                        className="flex-1"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )}
                    
                    {/* Deletion request - available for approved prompts */}
                    {status === "approved" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(prompt)}
                          className="flex-1"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRequestDeletion(prompt.id)}
                          className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </>
                    )}
                  </div>

                  {status === "rejected" && (
                    <p className="text-xs text-red-500 mt-2">
                      Este arquivo foi recusado. Você pode editá-lo e reenviar para aprovação.
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {filteredPrompts.length === 0 && (
          <div className="text-center py-12">
            <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-4">
              {activeFilter === "all" 
                ? "Você ainda não enviou nenhum arquivo"
                : `Nenhum arquivo ${activeFilter === "approved" ? "aprovado" : activeFilter === "pending" ? "pendente" : "recusado"}`
              }
            </p>
            {activeFilter === "all" && (
              <Button onClick={() => navigate('/parceiro-upload')} className="gap-2">
                <Upload className="h-4 w-4" />
                Enviar Primeiro Arquivo
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Arquivo</DialogTitle>
          </DialogHeader>
          
          {editingPrompt && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-center">
                {editingPrompt.image_url.includes('.mp4') || editingPrompt.image_url.includes('.webm') || editingPrompt.image_url.includes('.mov') ? (
                  <SecureVideo
                    src={editingPrompt.image_url}
                    className="max-h-32 object-contain rounded-lg"
                    isPremium={false}
                    controls
                    muted
                  />
                ) : (
                  <SecureImage
                    src={editingPrompt.image_url}
                    alt={editingPrompt.title}
                    className="max-h-32 object-contain rounded-lg"
                    isPremium={false}
                  />
                )}
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ Ao editar, o arquivo voltará para análise e será removido da biblioteca até ser aprovado novamente.
                </p>
              </div>

              <div>
                <Label htmlFor="editTitle">Título</Label>
                <Input
                  id="editTitle"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="editCategory">Categoria</Label>
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

              <div>
                <Label htmlFor="editPrompt">Prompt</Label>
                <Textarea
                  id="editPrompt"
                  value={editPromptText}
                  onChange={(e) => setEditPromptText(e.target.value)}
                  className="mt-1 min-h-[100px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Salvando..." : "Salvar e Enviar para Aprovação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerDashboard;