import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  ArrowLeft, Plus, RefreshCw, Pencil, Trash2, Users, Crown, Clock, 
  AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, MessageCircle, KeyRound,
  FileText, ExternalLink, Coins, Cpu
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import AdminCreditsTab from "@/components/admin/AdminCreditsTab";
import AdminAIToolsUsageTab from "@/components/admin/AdminAIToolsUsageTab";
import AdminPlanos2SubscribersTab from "@/components/admin/AdminPlanos2SubscribersTab";

interface PremiumUser {
  id: string;
  user_id: string;
  plan_type: string | null;
  billing_period: string | null;
  is_active: boolean;
  expires_at: string | null;
  subscribed_at: string | null;
  greenn_product_id: number | null;
  greenn_contract_id: string | null;
  created_at: string | null;
  name?: string;
  phone?: string;
  email?: string;
}

type SortColumn = 'name' | 'plan_type' | 'billing_period' | 'is_active' | 'expires_at' | 'subscribed_at';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

const PLAN_LABELS: Record<string, string> = {
  arcano_basico: "Arcano Básico",
  arcano_pro: "Arcano Pro",
  arcano_unlimited: "Arcano Unlimited"
};

const PLAN_COLORS: Record<string, string> = {
  arcano_basico: "#f59e0b",
  arcano_pro: "#8b5cf6",
  arcano_unlimited: "#10b981"
};

const AdminPremiumDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  
  const [sortColumn, setSortColumn] = useState<SortColumn>('expires_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PremiumUser | null>(null);
  
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPlanType, setFormPlanType] = useState("arcano_basico");
  const [formBillingPeriod, setFormBillingPeriod] = useState("monthly");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formExpiresInDays, setFormExpiresInDays] = useState(30);
  const [formGreennProductId, setFormGreennProductId] = useState("");
  const [formGreennContractId, setFormGreennContractId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [webhookStats, setWebhookStats] = useState({ total: 0, errors: 0, refunds: 0 });
  const [renewalRate, setRenewalRate] = useState<{ rate: number; renewed: number; eligible: number } | null>(null);

  useEffect(() => {
    checkAdminAndFetch();
    fetchWebhookStats();
    fetchRenewalRate();
  }, []);

  const checkAdminAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/admin-login");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast.error("Acesso não autorizado");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await fetchPremiumUsers();
    } catch (error) {
      console.error("Error checking admin:", error);
      toast.error("Erro ao verificar permissões");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPremiumUsers = async () => {
    try {
      const { data: premiumData, error: premiumError } = await supabase
        .from("premium_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (premiumError) throw premiumError;

      const userIds = premiumData?.map(u => u.user_id) || [];
      
      // Fetch profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, phone, email")
        .in("id", userIds);

      // Fetch auth emails via edge function to fill missing emails
      const mergedData = premiumData?.map(premium => {
        const profile = profilesData?.find(p => p.id === premium.user_id);
        return {
          ...premium,
          name: profile?.name || '',
          phone: profile?.phone || '',
          email: profile?.email || '',
        };
      }) || [];

      setPremiumUsers(mergedData);
    } catch (error) {
      console.error("Error fetching premium users:", error);
      toast.error("Erro ao carregar usuários premium");
    }
  };

  const filterUsers = useMemo(() => {
    let filtered = [...premiumUsers];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.plan_type?.toLowerCase().includes(term)
      );
    }

    if (periodFilter !== "all") {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (periodFilter) {
        case "1": cutoffDate.setDate(now.getDate() - 1); break;
        case "3": cutoffDate.setDate(now.getDate() - 3); break;
        case "15": cutoffDate.setDate(now.getDate() - 15); break;
        case "30": cutoffDate.setDate(now.getDate() - 30); break;
        case "90": cutoffDate.setDate(now.getDate() - 90); break;
        case "365": cutoffDate.setFullYear(now.getFullYear() - 1); break;
      }

      filtered = filtered.filter(u => {
        if (!u.subscribed_at) return false;
        return new Date(u.subscribed_at) >= cutoffDate;
      });
    }

    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'plan_type':
          aValue = a.plan_type?.toLowerCase() || '';
          bValue = b.plan_type?.toLowerCase() || '';
          break;
        case 'billing_period':
          aValue = a.billing_period?.toLowerCase() || '';
          bValue = b.billing_period?.toLowerCase() || '';
          break;
        case 'is_active':
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        case 'expires_at':
          aValue = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
          bValue = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
          break;
        case 'subscribed_at':
          aValue = a.subscribed_at ? new Date(a.subscribed_at).getTime() : 0;
          bValue = b.subscribed_at ? new Date(b.subscribed_at).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [premiumUsers, searchTerm, periodFilter, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filterUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filterUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filterUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, periodFilter, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const resetForm = () => {
    setFormEmail("");
    setFormName("");
    setFormPhone("");
    setFormPlanType("arcano_basico");
    setFormBillingPeriod("monthly");
    setFormIsActive(true);
    setFormExpiresInDays(30);
    setFormGreennProductId("");
    setFormGreennContractId("");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getDaysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleCreate = async () => {
    if (!formEmail) {
      toast.error("Email é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("create-premium-user", {
        body: {
          email: formEmail,
          name: formName,
          phone: formPhone,
          planType: formPlanType,
          billingPeriod: formBillingPeriod,
          expiresInDays: formExpiresInDays,
          isActive: formIsActive,
          greennProductId: formGreennProductId ? parseInt(formGreennProductId) : null,
          greennContractId: formGreennContractId || null,
        },
      });

      if (response.error) throw response.error;

      toast.success("Usuário premium criado com sucesso!");
      setIsCreateModalOpen(false);
      resetForm();
      await fetchPremiumUsers();
    } catch (error: any) {
      console.error("Error creating premium user:", error);
      toast.error(error.message || "Erro ao criar usuário premium");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + formExpiresInDays);

      const { error: premiumError } = await supabase
        .from("premium_users")
        .update({
          plan_type: formPlanType,
          billing_period: formBillingPeriod,
          is_active: formIsActive,
          expires_at: expiresAt.toISOString(),
          greenn_product_id: formGreennProductId ? parseInt(formGreennProductId) : null,
          greenn_contract_id: formGreennContractId || null,
        })
        .eq("id", selectedUser.id);

      if (premiumError) throw premiumError;

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: selectedUser.user_id,
          name: formName,
          phone: formPhone.replace(/\D/g, ''),
          email: formEmail,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }

      toast.success("Usuário atualizado com sucesso!");
      setIsEditModalOpen(false);
      resetForm();
      await fetchPremiumUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error("Erro ao atualizar usuário");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("premium_users")
        .delete()
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success("Usuário removido com sucesso!");
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      await fetchPremiumUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Erro ao remover usuário");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user: PremiumUser) => {
    setSelectedUser(user);
    setFormEmail(user.email || '');
    setFormName(user.name || '');
    setFormPhone(user.phone || '');
    setFormPlanType(user.plan_type || "arcano_basico");
    setFormBillingPeriod(user.billing_period || "monthly");
    setFormIsActive(user.is_active);
    setFormExpiresInDays(getDaysUntilExpiry(user.expires_at) || 30);
    setFormGreennProductId(user.greenn_product_id?.toString() || "");
    setFormGreennContractId(user.greenn_contract_id || "");
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user: PremiumUser) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const openWhatsApp = (phone: string) => {
    if (!phone) {
      toast.error("Telefone não cadastrado");
      return;
    }
    const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
    window.open(`https://api.whatsapp.com/send/?phone=${formattedPhone}&text&type=phone_number&app_absent=0`, '_blank');
  };

  const fetchRenewalRate = async () => {
    try {
      // Get all premium users subscribed 30+ days ago
      const { data: eligibleUsers } = await supabase
        .from("premium_users")
        .select("user_id, subscribed_at")
        .not("subscribed_at", "is", null)
        .lt("subscribed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!eligibleUsers || eligibleUsers.length === 0) {
        setRenewalRate({ rate: 0, renewed: 0, eligible: 0 });
        return;
      }

      // Get profiles for these users
      const userIds = eligibleUsers.map(u => u.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);

      // Get all successful payments from webhook_logs
      const emails = profiles?.map(p => p.email).filter(Boolean) || [];
      const { data: webhookPayments } = await supabase
        .from("webhook_logs")
        .select("email, received_at")
        .eq("result", "success")
        .eq("status", "paid")
        .in("email", emails);

      // Count users who had a payment 25+ days after subscription
      let renewedCount = 0;
      for (const user of eligibleUsers) {
        const profile = profiles?.find(p => p.id === user.user_id);
        if (!profile?.email) continue;
        const subDate = new Date(user.subscribed_at!);
        const cutoff = new Date(subDate.getTime() + 25 * 24 * 60 * 60 * 1000);
        const hasRenewal = webhookPayments?.some(
          w => w.email?.toLowerCase() === profile.email?.toLowerCase() && new Date(w.received_at!) > cutoff
        );
        if (hasRenewal) renewedCount++;
      }

      const rate = eligibleUsers.length > 0 ? Math.round((renewedCount / eligibleUsers.length) * 1000) / 10 : 0;
      setRenewalRate({ rate, renewed: renewedCount, eligible: eligibleUsers.length });
    } catch (error) {
      console.error("Error fetching renewal rate:", error);
    }
  };

  const fetchWebhookStats = async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: logs } = await supabase
      .from("webhook_logs")
      .select("status, result")
      .gte("received_at", twentyFourHoursAgo);
    
    if (logs) {
      const total = logs.length;
      const errors = logs.filter(l => l.status === "error" || l.result === "error").length;
      const refunds = logs.filter(l => l.result === "refund" || l.result === "chargeback").length;
      setWebhookStats({ total, errors, refunds });
    }
  };

  const handleResetFirstPassword = async () => {
    if (!selectedUser || !selectedUser.email) {
      toast.error("Email do usuário não encontrado");
      return;
    }

    if (!confirm(`Tem certeza que deseja redefinir a senha de ${selectedUser.name || selectedUser.email} para o email inicial?`)) {
      return;
    }

    setIsResettingPassword(true);
    try {
      // Call edge function to reset password to email
      const response = await supabase.functions.invoke("update-user-password-artes", {
        body: {
          user_id: selectedUser.user_id,
          new_password: selectedUser.email,
        },
      });

      if (response.error) throw response.error;

      // Set password_changed to false to force password change on next login
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ password_changed: false })
        .eq("id", selectedUser.user_id);

      if (profileError) throw profileError;

      toast.success("Senha redefinida! O usuário precisará trocar a senha no próximo login.");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Erro ao redefinir senha");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const isEffectivelyActive = (u: PremiumUser) => {
    if (!u.is_active) return false;
    if (u.expires_at && new Date(u.expires_at) < new Date()) return false;
    return true;
  };

  const totalUsers = premiumUsers.length;
  const activeUsers = premiumUsers.filter(u => isEffectivelyActive(u)).length;
  const expiringUsers = premiumUsers.filter(u => {
    const days = getDaysUntilExpiry(u.expires_at);
    return days !== null && days <= 7 && days > 0 && isEffectivelyActive(u);
  });

  const planDistribution = Object.entries(
    premiumUsers.reduce((acc, user) => {
      const plan = user.plan_type || "unknown";
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: PLAN_LABELS[name] || name,
    value,
    color: PLAN_COLORS[name] || "#6b7280"
  }));

  const billingDistribution = [
    { name: "Mensal", value: premiumUsers.filter(u => u.billing_period === "monthly").length },
    { name: "Anual", value: premiumUsers.filter(u => u.billing_period === "yearly").length },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin-prompts/ferramentas")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Gerenciar Premium</h1>
          </div>
        </div>

        <Tabs defaultValue="assinantes" className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-4">
            <TabsTrigger value="assinantes" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Assinantes
            </TabsTrigger>
            <TabsTrigger value="assinantes-antigos" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assinantes Antigos
            </TabsTrigger>
            <TabsTrigger value="creditos" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Créditos IA
            </TabsTrigger>
            <TabsTrigger value="uso-ferramentas" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Uso Ferramentas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assinantes" className="space-y-6 mt-6">
            <AdminPlanos2SubscribersTab />
          </TabsContent>

          <TabsContent value="assinantes-antigos" className="space-y-6 mt-6">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="icon" onClick={fetchPremiumUsers}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={() => { resetForm(); setIsCreateModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <RefreshCw className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Renovação</p>
                <p className="text-2xl font-bold">
                  {renewalRate ? `${renewalRate.rate}%` : "..."}
                </p>
                {renewalRate && (
                  <p className="text-xs text-muted-foreground">
                    {renewalRate.renewed}/{renewalRate.eligible} renovaram
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Assinantes</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <Crown className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold">{activeUsers}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Expirando em 7 dias</p>
                <p className="text-2xl font-bold">{expiringUsers.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Inativos</p>
                <p className="text-2xl font-bold">{totalUsers - activeUsers}</p>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => navigate("/admin-webhook-logs")}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <FileText className="h-8 w-8 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Logs Webhook (24h)</p>
                <p className="text-2xl font-bold">{webhookStats.total}</p>
                <div className="flex gap-2 text-xs mt-1">
                  {webhookStats.errors > 0 && (
                    <span className="text-red-500">{webhookStats.errors} erros</span>
                  )}
                  {webhookStats.refunds > 0 && (
                    <span className="text-orange-500">{webhookStats.refunds} reembolsos</span>
                  )}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Plano</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={billingDistribution}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {expiringUsers.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção!</AlertTitle>
            <AlertDescription>
              {expiringUsers.length} usuário(s) com assinatura expirando nos próximos 7 dias.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Buscar por nome, email ou plano..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="1">Último dia</SelectItem>
              <SelectItem value="3">Últimos 3 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Nome {getSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('plan_type')}
                    >
                      <div className="flex items-center">
                        Plano {getSortIcon('plan_type')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('billing_period')}
                    >
                      <div className="flex items-center">
                        Período {getSortIcon('billing_period')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('is_active')}
                    >
                      <div className="flex items-center">
                        Status {getSortIcon('is_active')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('expires_at')}
                    >
                      <div className="flex items-center">
                        Expira em {getSortIcon('expires_at')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('subscribed_at')}
                    >
                      <div className="flex items-center">
                        Assinado em {getSortIcon('subscribed_at')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => {
                    const daysUntilExpiry = getDaysUntilExpiry(user.expires_at);
                    const isExpiring = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name || 'Sem nome'}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{PLAN_LABELS[user.plan_type || ''] || user.plan_type || "-"}</TableCell>
                        <TableCell className="capitalize">
                          {user.billing_period === 'monthly' ? 'Mensal' : user.billing_period === 'yearly' ? 'Anual' : user.billing_period || "-"}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const active = isEffectivelyActive(user);
                            const isExpiredButFlagged = user.is_active && user.expires_at && new Date(user.expires_at) < new Date();
                            return (
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                active 
                                  ? "bg-green-500/20 text-green-500" 
                                  : isExpiredButFlagged
                                    ? "bg-orange-500/20 text-orange-500"
                                    : "bg-red-500/20 text-red-500"
                              }`}>
                                {active ? "Ativo" : isExpiredButFlagged ? "Vencido" : "Inativo"}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <span className={isExpiring ? "text-orange-500 font-medium" : ""}>
                            {formatDate(user.expires_at)}
                            {daysUntilExpiry !== null && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({daysUntilExpiry}d)
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(user.subscribed_at)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openWhatsApp(user.phone || '')}
                              disabled={!user.phone}
                              title={user.phone ? "Enviar WhatsApp" : "Telefone não cadastrado"}
                            >
                              <MessageCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteModal(user)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        <p className="text-sm text-muted-foreground text-center">
          Mostrando {paginatedUsers.length} de {filterUsers.length} usuários
        </p>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Usuário Premium</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="usuario@email.com"
                />
              </div>
              <div>
                <Label>Nome</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nome do usuário"
                />
              </div>
              <div>
                <Label>Telefone/WhatsApp</Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="11999999999"
                />
              </div>
              <div>
                <Label>Plano</Label>
                <Select value={formPlanType} onValueChange={setFormPlanType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arcano_basico">Arcano Básico</SelectItem>
                    <SelectItem value="arcano_pro">Arcano Pro</SelectItem>
                    <SelectItem value="arcano_unlimited">Arcano Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Período de Cobrança</Label>
                <Select value={formBillingPeriod} onValueChange={setFormBillingPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expira em (dias)</Label>
                <Input
                  type="number"
                  value={formExpiresInDays}
                  onChange={(e) => setFormExpiresInDays(parseInt(e.target.value) || 30)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
                <Label>Ativo</Label>
              </div>
              <div>
                <Label>Greenn Product ID (opcional)</Label>
                <Input
                  value={formGreennProductId}
                  onChange={(e) => setFormGreennProductId(e.target.value)}
                />
              </div>
              <div>
                <Label>Greenn Contract ID (opcional)</Label>
                <Input
                  value={formGreennContractId}
                  onChange={(e) => setFormGreennContractId(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Usuário Premium</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  disabled
                />
              </div>
              <div>
                <Label>Nome</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nome do usuário"
                />
              </div>
              <div>
                <Label>Telefone/WhatsApp</Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="11999999999"
                />
              </div>
              <div>
                <Label>Plano</Label>
                <Select value={formPlanType} onValueChange={setFormPlanType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arcano_basico">Arcano Básico</SelectItem>
                    <SelectItem value="arcano_pro">Arcano Pro</SelectItem>
                    <SelectItem value="arcano_unlimited">Arcano Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Período de Cobrança</Label>
                <Select value={formBillingPeriod} onValueChange={setFormBillingPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expira em (dias a partir de hoje)</Label>
                <Input
                  type="number"
                  value={formExpiresInDays}
                  onChange={(e) => setFormExpiresInDays(parseInt(e.target.value) || 30)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
                <Label>Ativo</Label>
              </div>
              <div>
                <Label>Greenn Product ID (opcional)</Label>
                <Input
                  value={formGreennProductId}
                  onChange={(e) => setFormGreennProductId(e.target.value)}
                />
              </div>
              <div>
                <Label>Greenn Contract ID (opcional)</Label>
                <Input
                  value={formGreennContractId}
                  onChange={(e) => setFormGreennContractId(e.target.value)}
                />
              </div>

              {/* Reset Password Button */}
              <div className="pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                  onClick={handleResetFirstPassword}
                  disabled={isResettingPassword}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  {isResettingPassword ? "Redefinindo..." : "Redefinir Primeira Senha"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Redefine a senha para o email e força troca no próximo login
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <p>
              Tem certeza que deseja remover o usuário premium{" "}
              <strong>{selectedUser?.name || selectedUser?.email}</strong>?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting ? "Removendo..." : "Remover"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

          </TabsContent>

          <TabsContent value="creditos" className="mt-6">
            <AdminCreditsTab />
          </TabsContent>

          <TabsContent value="uso-ferramentas" className="mt-6">
            <AdminAIToolsUsageTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPremiumDashboard;