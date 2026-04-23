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
import { LogOut, Upload, FileCheck, Clock, ArrowLeft, Copy, Pencil, XCircle, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { Instagram, User, Camera, KeyRound, DollarSign, TrendingUp, Trophy, Home, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePartnerGamificationNotifications } from "@/hooks/usePartnerGamificationNotifications";
import { SecureImage, SecureVideo } from "@/components/SecureMedia";
import { Dialog as ProfileDialog, DialogContent as ProfileDialogContent } from "@/components/ui/dialog";
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
  const [currentPage, setCurrentPage] = useState(1);
  const PROMPTS_PER_PAGE = 20;
  
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
  const [partnerGamification, setPartnerGamification] = useState<{ xp_total: number; level: number; current_streak: number; best_streak: number; streak_protection_available: boolean } | null>(null);
  const [toolEarningsCount, setToolEarningsCount] = useState(0);

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
    const [balanceRes, withdrawalsRes, gamRes, toolCountRes] = await Promise.all([
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
      supabase
        .from('partner_gamification')
        .select('xp_total, level, current_streak, best_streak, streak_protection_available')
        .eq('partner_id', partnerData.id)
        .maybeSingle(),
      supabase
        .from('collaborator_tool_earnings')
        .select('id', { count: 'exact', head: true })
        .eq('collaborator_id', partnerData.id),
    ]);
    
    setEarningsBalance(balanceRes.data?.total_earned || 0);
    setEarningsUnlocks(balanceRes.data?.total_unlocks || 0);
    const totalPaid = (withdrawalsRes.data || []).reduce((sum, w) => sum + Number(w.valor_solicitado), 0);
    setEarningsPaidOut(totalPaid);
    setPartnerGamification(gamRes.data || null);
    setToolEarningsCount(toolCountRes.count || 0);

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

  const totalPages = Math.max(1, Math.ceil(filteredPrompts.length / PROMPTS_PER_PAGE));
  const paginatedPrompts = filteredPrompts.slice((currentPage - 1) * PROMPTS_PER_PAGE, currentPage * PROMPTS_PER_PAGE);

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
          instagram: profileInstagram.trim() || null,
        })
        .eq('id', partner.id);
      
      if (error) throw error;
      
      setPartner({ ...partner, instagram: profileInstagram.trim() || undefined });
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

  const currentLevel = partnerGamification?.level || 1;
  const LEVELS = [
    { level: 1, name: "Iniciante", minXp: 0, maxXp: 399, unlockRate: 0.05 },
    { level: 2, name: "Criador", minXp: 400, maxXp: 899, unlockRate: 0.07 },
    { level: 3, name: "Colaborador", minXp: 900, maxXp: 1999, unlockRate: 0.07 },
    { level: 4, name: "Especialista", minXp: 2000, maxXp: 5999, unlockRate: 0.10 },
    { level: 5, name: "Elite", minXp: 6000, maxXp: Infinity, unlockRate: 0.12 },
  ];
  const currentLevelData = LEVELS.find(l => l.level === currentLevel) || LEVELS[0];
  const levelName = currentLevelData.name;
  const xpTotal = partnerGamification?.xp_total || 0;
  const nextLevelData = LEVELS.find(l => l.level === currentLevel + 1);
  const xpMin = currentLevelData.minXp;
  const xpMax = nextLevelData ? nextLevelData.minXp : currentLevelData.maxXp;
  const xpProgress = xpMax === Infinity ? 100 : Math.min(100, ((xpTotal - xpMin) / (xpMax - xpMin)) * 100);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* TopBar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowProfile(!showProfile)} className="relative">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} className="w-9 h-9 rounded-full object-cover border-2 border-primary/40" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-900 flex items-center justify-center text-primary-foreground font-bold text-sm border-2 border-primary/40">
                  {partner?.name?.charAt(0) || 'C'}
                </div>
              )}
            </button>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">{partner?.name}</p>
              <p className="text-xs text-muted-foreground">
                Nível {currentLevel} — <span className="text-primary">{levelName}</span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground text-xs gap-1 h-8">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </Button>
          <button
            onClick={() => navigate('/parceiro-como-ganhar')}
            className="w-8 h-8 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center transition-colors ml-1"
            title="Como ganhar na plataforma"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-20 md:pb-8">
        {/* Profile Dialog */}
        <ProfileDialog open={showProfile} onOpenChange={setShowProfile}>
          <ProfileDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <User className="h-5 w-5" /> Gerenciar Perfil
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {profileAvatarUrl ? (
                    <img src={profileAvatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-border">
                      <User className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors">
                    <Camera className="h-3.5 w-3.5 text-primary-foreground" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isUploadingAvatar} />
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">{isUploadingAvatar ? "Enviando..." : "Clique no ícone para alterar"}</p>
              </div>
              <div>
                <Label htmlFor="profileName">Nome</Label>
                <Input id="profileName" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="profileInstagram" className="flex items-center gap-1"><Instagram className="h-3.5 w-3.5" /> Instagram</Label>
                <Input id="profileInstagram" value={profileInstagram} onChange={(e) => setProfileInstagram(e.target.value)} placeholder="seu_usuario" className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">Sem o @, apenas o nome de usuário</p>
              </div>
              <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full">
                {isSavingProfile ? "Salvando..." : "Salvar Perfil"}
              </Button>
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2"><KeyRound className="h-4 w-4" /> Alterar Senha</h3>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha (mín. 6 caracteres)" />
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar senha" />
                <Button onClick={handleChangePassword} disabled={isChangingPassword} variant="outline" className="w-full">
                  {isChangingPassword ? "Alterando..." : "Alterar Senha"}
                </Button>
              </div>
            </div>
          </ProfileDialogContent>
        </ProfileDialog>

        {/* Hero Card */}
        <div className="mx-4 mt-3 mb-3 rounded-2xl bg-gradient-to-br from-purple-900 via-purple-800 to-primary p-5 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-6 left-2 w-20 h-20 rounded-full bg-white/[0.03] pointer-events-none" />
          <p className="text-xs font-semibold text-white/60 tracking-wide mb-1">SALDO DISPONÍVEL</p>
          <p className="text-3xl font-extrabold text-white leading-none">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(0, earningsBalance - earningsPaidOut))}
          </p>
          <p className="text-xs text-white/50 mt-1">{earningsUnlocks} prompts copiados • {toolEarningsCount} usos em ferramentas</p>
          <div className="flex items-center justify-between mt-4">
            <button onClick={() => navigate('/parceiro-extrato')} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors rounded-full px-3 py-1.5 text-xs font-semibold text-white">
              <TrendingUp className="h-3 w-3" /> Ver Extrato
            </button>
            <div className="flex items-center gap-2">
              {(partnerGamification?.current_streak || 0) > 0 && (
                <span className="bg-orange-500/30 text-orange-200 text-xs font-bold px-2.5 py-1 rounded-full">
                  🔥 {partnerGamification?.current_streak} dias
                </span>
              )}
              <span className="bg-white/15 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                Nível {currentLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2.5 px-4 mb-3">
          <button onClick={() => navigate('/parceiro-upload')} className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-primary hover:bg-primary/90 transition-colors">
            <Upload className="h-5 w-5 text-primary-foreground" />
            <span className="text-[11px] font-bold text-primary-foreground leading-tight text-center">Enviar Prompt</span>
          </button>
          <button onClick={() => navigate('/parceiro-extrato')} className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
            <DollarSign className="h-5 w-5 text-green-400" />
            <span className="text-[11px] font-semibold text-muted-foreground leading-tight text-center">Saldo & Saques</span>
          </button>
          <button onClick={() => navigate('/parceiro-conquistas')} className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span className="text-[11px] font-semibold text-muted-foreground leading-tight text-center">Conquistas</span>
          </button>
        </div>

        {/* XP Progress Section */}
        <div className="mx-4 mb-3 bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-foreground">
              ⚡ {xpTotal} XP · Nível {currentLevel} — {levelName}
            </p>
            {nextLevelData && (
              <p className="text-xs text-muted-foreground">meta: {xpMax}</p>
            )}
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-gradient-to-r from-primary to-purple-400 rounded-full transition-all duration-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-3">
            <span>{xpMin}</span>
            <span>{xpMax === Infinity ? '∞' : xpMax} XP</span>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-green-400">
              💰 Ganho por prompt copiado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentLevelData.unlockRate)}
            </p>
          </div>
        </div>

        {/* Streak Card */}
        {(partnerGamification?.current_streak || 0) > 0 && (
          <div className="mx-4 mb-3 bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <div>
                <p className="text-2xl font-extrabold text-foreground leading-none">
                  {partnerGamification?.current_streak} dias
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sequência · Recorde: {partnerGamification?.best_streak || 0} dias
                </p>
              </div>
            </div>
            {partnerGamification?.streak_protection_available && (
              <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                Proteção ✓
              </span>
            )}
          </div>
        )}

        {/* Section Header */}
        <p className="text-xs font-bold text-muted-foreground tracking-wider px-4 mb-2 mt-1">SEUS PROMPTS</p>

        {/* Stat Chips */}
        <div className="grid grid-cols-2 gap-2.5 px-4 mb-4">
          {[
            { num: stats.approved, label: '✅ Aprovados', color: 'text-green-400' },
            { num: stats.pending, label: '⏳ Pendentes', color: 'text-yellow-400' },
            { num: earningsUnlocks, label: '🔓 Prompts Copiados', color: 'text-blue-400' },
            { num: toolEarningsCount, label: '🤖 Usos em IA', color: 'text-purple-400' },
          ].map(({ num, label, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl px-4 py-3">
              <p className={`text-2xl font-extrabold ${color} leading-none`}>{num}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 px-4 mb-3 overflow-x-auto scrollbar-hide pb-1">
          {[
            { key: 'all', label: `Todos (${stats.total})` },
            { key: 'approved', label: `✅ (${stats.approved})` },
            { key: 'pending', label: `⏳ (${stats.pending})` },
            { key: 'rejected', label: `❌ (${stats.rejected})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setActiveFilter(key as FilterType); setCurrentPage(1); }}
              className={`flex-shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
                activeFilter === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Prompts Grid — 2 col mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 px-4">
          {paginatedPrompts.map((prompt) => {
            const status = getPromptStatus(prompt);
            return (
              <div key={prompt.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="relative">
                  {prompt.image_url.includes('.mp4') || prompt.image_url.includes('.webm') || prompt.image_url.includes('.mov') ? (
                    <SecureVideo
                      src={prompt.image_url}
                      className="w-full aspect-[3/4] object-cover"
                      isPremium={false}
                      autoPlay
                      muted
                      loop
                    />
                  ) : (
                    <SecureImage
                      src={prompt.image_url}
                      alt={prompt.title}
                      className="w-full aspect-[3/4] object-cover"
                      isPremium={false}
                    />
                  )}
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    {status === "approved" && <Badge className="bg-green-600 text-[10px] px-1.5 py-0.5">✓</Badge>}
                    {status === "deletion" && <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">Exclusão</Badge>}
                    {status === "pending" && <Badge variant="secondary" className="bg-yellow-500 text-foreground text-[10px] px-1.5 py-0.5">⏳</Badge>}
                    {status === "rejected" && <Badge variant="destructive" className="bg-red-600 text-[10px] px-1.5 py-0.5">✗</Badge>}
                  </div>
                </div>
                <div className="px-3 py-2.5">
                  <h3 className="font-bold text-xs text-foreground leading-tight truncate">{prompt.title}</h3>
                  <div className="flex items-center justify-between mt-1.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{prompt.category}</Badge>
                    <span className="text-[10px] text-primary font-semibold flex items-center gap-0.5"><Copy className="h-2.5 w-2.5" />{prompt.click_count || 0}</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {(status === "pending" || status === "rejected" || status === "approved") && (
                      <button onClick={() => openEditModal(prompt)} className="flex-1 text-[10px] font-semibold text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg py-1.5 transition-colors">
                        <Pencil className="h-3 w-3 inline mr-0.5" />Editar
                      </button>
                    )}
                    {status === "approved" && (
                      <button onClick={() => handleRequestDeletion(prompt.id)} className="flex-1 text-[10px] font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg px-2 py-1.5 transition-colors">
                        <XCircle className="h-3 w-3 inline mr-0.5" />Excluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 px-4 mt-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-card border border-border text-muted-foreground disabled:opacity-30 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-card border border-border text-muted-foreground disabled:opacity-30 hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {paginatedPrompts.length === 0 && filteredPrompts.length === 0 && (
          <div className="text-center py-12 px-4">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-4">
              {activeFilter === "all" 
                ? "Você ainda não enviou nenhum arquivo"
                : `Nenhum arquivo ${activeFilter === "approved" ? "aprovado" : activeFilter === "pending" ? "pendente" : "recusado"}`
              }
            </p>
            {activeFilter === "all" && (
              <Button onClick={() => navigate('/parceiro-upload')} size="sm" className="gap-2">
                <Upload className="h-3.5 w-3.5" /> Enviar Primeiro Arquivo
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center">
          {[
            { icon: Home, label: 'Home', path: '/parceiro-dashboard' as string | null, active: true },
            { icon: Upload, label: 'Enviar', path: '/parceiro-upload' as string | null, active: false },
            { icon: Trophy, label: 'Conquistas', path: '/parceiro-conquistas' as string | null, active: false },
            { icon: DollarSign, label: 'Extrato', path: '/parceiro-extrato' as string | null, active: false },
            { icon: User, label: 'Perfil', path: null as string | null, active: false },
          ].map(({ icon: NavIcon, label, path, active }) => (
            <button
              key={label}
              onClick={() => path ? navigate(path) : setShowProfile(true)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5"
            >
              <NavIcon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] font-semibold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
              {active && <div className="w-1 h-1 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </nav>

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