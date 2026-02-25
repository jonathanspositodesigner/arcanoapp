import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import {
  Users, Crown, Clock, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw,
  Plus, Pencil, Trash2, MessageCircle, KeyRound,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Planos2User {
  id: string;
  user_id: string;
  plan_slug: string;
  is_active: boolean;
  credits_per_month: number;
  daily_prompt_limit: number | null;
  has_image_generation: boolean;
  has_video_generation: boolean;
  cost_multiplier: number | null;
  greenn_product_id: number | null;
  greenn_contract_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  last_credit_reset_at: string | null;
  name?: string;
  email?: string;
  phone?: string;
}

type SortColumn = 'name' | 'plan_slug' | 'credits_per_month' | 'is_active' | 'expires_at' | 'created_at';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  ultimate: "Ultimate",
  unlimited: "IA Unlimited",
};

const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280",
  starter: "#3b82f6",
  pro: "#8b5cf6",
  ultimate: "#f59e0b",
  unlimited: "#10b981",
};

const PAID_PLANS = [
  { slug: "starter", label: "Starter", credits: 600, costMultiplier: 1 },
  { slug: "pro", label: "Pro", credits: 1500, costMultiplier: 1 },
  { slug: "ultimate", label: "Ultimate", credits: 6000, costMultiplier: 1 },
  { slug: "unlimited", label: "IA Unlimited", credits: 999999, costMultiplier: 0.5 },
];

const AdminPlanos2SubscribersTab = () => {
  const [users, setUsers] = useState<Planos2User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Planos2User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Form states
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPlanSlug, setFormPlanSlug] = useState("starter");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formExpiresInDays, setFormExpiresInDays] = useState(30);
  const [formGreennProductId, setFormGreennProductId] = useState("");
  const [formGreennContractId, setFormGreennContractId] = useState("");
  const [formCreditsPerMonth, setFormCreditsPerMonth] = useState(600);
  const [formCostMultiplier, setFormCostMultiplier] = useState(1);
  const [renewalRate, setRenewalRate] = useState<{ rate: number; renewed: number; eligible: number } | null>(null);

  useEffect(() => {
    fetchPlanos2Users();
  }, []);

  const fetchPlanos2Users = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("planos2_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = data?.map(u => u.user_id) || [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, phone")
        .in("id", userIds);

      const merged = data?.map(sub => {
        const profile = profiles?.find(p => p.id === sub.user_id);
        return {
          ...sub,
          name: profile?.name || '',
          email: profile?.email || '',
          phone: profile?.phone || '',
        };
      }) || [];

      setUsers(merged);
    } catch (error) {
      console.error("Error fetching planos2 users:", error);
      toast.error("Erro ao carregar assinantes");
    } finally {
      setIsLoading(false);
    }
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

  const isEffectivelyActive = (u: Planos2User) => {
    if (!u.is_active) return false;
    if (u.expires_at && new Date(u.expires_at) < new Date()) return false;
    return true;
  };

  // Plan change auto-fill
  const handlePlanChange = (slug: string) => {
    setFormPlanSlug(slug);
    const plan = PAID_PLANS.find(p => p.slug === slug);
    if (plan) {
      setFormCreditsPerMonth(plan.credits);
      setFormCostMultiplier(plan.costMultiplier);
    }
  };

  const resetForm = () => {
    setFormEmail("");
    setFormName("");
    setFormPhone("");
    setFormPlanSlug("starter");
    setFormIsActive(true);
    setFormExpiresInDays(30);
    setFormGreennProductId("");
    setFormGreennContractId("");
    setFormCreditsPerMonth(600);
    setFormCostMultiplier(1);
  };

  const openEditModal = (user: Planos2User) => {
    setSelectedUser(user);
    setFormEmail(user.email || '');
    setFormName(user.name || '');
    setFormPhone(user.phone || '');
    setFormPlanSlug(user.plan_slug || "starter");
    setFormIsActive(user.is_active);
    setFormExpiresInDays(getDaysUntilExpiry(user.expires_at) || 30);
    setFormGreennProductId(user.greenn_product_id?.toString() || "");
    setFormGreennContractId(user.greenn_contract_id || "");
    setFormCreditsPerMonth(user.credits_per_month);
    setFormCostMultiplier(user.cost_multiplier ?? 1);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user: Planos2User) => {
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

  const handleCreate = async () => {
    if (!formEmail) {
      toast.error("Email é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the existing edge function to create user
      const response = await supabase.functions.invoke("create-premium-user", {
        body: {
          email: formEmail,
          name: formName,
          phone: formPhone,
          planType: formPlanSlug,
          billingPeriod: "monthly",
          expiresInDays: formExpiresInDays,
          isActive: formIsActive,
          greennProductId: formGreennProductId ? parseInt(formGreennProductId) : null,
          greennContractId: formGreennContractId || null,
          // Planos 2 specific
          isPlanos2: true,
          creditsPerMonth: formCreditsPerMonth,
          costMultiplier: formCostMultiplier,
        },
      });

      if (response.error) throw response.error;

      // If edge function doesn't handle planos2, do it manually
      if (response.data?.user_id) {
        const userId = response.data.user_id;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + formExpiresInDays);

        // Check if subscription already exists
        const { data: existing } = await supabase
          .from("planos2_subscriptions")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existing) {
          // Update existing
          await supabase
            .from("planos2_subscriptions")
            .update({
              plan_slug: formPlanSlug,
              is_active: formIsActive,
              credits_per_month: formCreditsPerMonth,
              cost_multiplier: formCostMultiplier,
              expires_at: expiresAt.toISOString(),
              greenn_product_id: formGreennProductId ? parseInt(formGreennProductId) : null,
              greenn_contract_id: formGreennContractId || null,
            })
            .eq("user_id", userId);
        } else {
          // Insert new
          await supabase
            .from("planos2_subscriptions")
            .insert({
              user_id: userId,
              plan_slug: formPlanSlug,
              is_active: formIsActive,
              credits_per_month: formCreditsPerMonth,
              cost_multiplier: formCostMultiplier,
              expires_at: expiresAt.toISOString(),
              greenn_product_id: formGreennProductId ? parseInt(formGreennProductId) : null,
              greenn_contract_id: formGreennContractId || null,
            });
        }
      }

      toast.success("Usuário criado com sucesso!");
      setIsCreateModalOpen(false);
      resetForm();
      await fetchPlanos2Users();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Erro ao criar usuário");
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

      const { error: subError } = await supabase
        .from("planos2_subscriptions")
        .update({
          plan_slug: formPlanSlug,
          is_active: formIsActive,
          credits_per_month: formCreditsPerMonth,
          cost_multiplier: formCostMultiplier,
          expires_at: expiresAt.toISOString(),
          greenn_product_id: formGreennProductId ? parseInt(formGreennProductId) : null,
          greenn_contract_id: formGreennContractId || null,
        })
        .eq("id", selectedUser.id);

      if (subError) throw subError;

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
      await fetchPlanos2Users();
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
        .from("planos2_subscriptions")
        .delete()
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success("Usuário removido com sucesso!");
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      await fetchPlanos2Users();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Erro ao remover usuário");
    } finally {
      setIsSubmitting(false);
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
      const response = await supabase.functions.invoke("update-user-password-artes", {
        body: {
          user_id: selectedUser.user_id,
          new_password: selectedUser.email,
        },
      });

      if (response.error) throw response.error;

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

  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.plan_slug?.toLowerCase().includes(term) ||
        (PLAN_LABELS[u.plan_slug] || '').toLowerCase().includes(term)
      );
    }

    if (planFilter !== "all") {
      filtered = filtered.filter(u => u.plan_slug === planFilter);
    }

    if (periodFilter !== "all") {
      const now = new Date();
      const cutoff = new Date();
      switch (periodFilter) {
        case "1": cutoff.setDate(now.getDate() - 1); break;
        case "7": cutoff.setDate(now.getDate() - 7); break;
        case "30": cutoff.setDate(now.getDate() - 30); break;
        case "90": cutoff.setDate(now.getDate() - 90); break;
      }
      filtered = filtered.filter(u => new Date(u.created_at) >= cutoff);
    }

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortColumn) {
        case 'name': aVal = a.name?.toLowerCase() || ''; bVal = b.name?.toLowerCase() || ''; break;
        case 'plan_slug': aVal = a.plan_slug; bVal = b.plan_slug; break;
        case 'credits_per_month': aVal = a.credits_per_month; bVal = b.credits_per_month; break;
        case 'is_active': aVal = isEffectivelyActive(a) ? 1 : 0; bVal = isEffectivelyActive(b) ? 1 : 0; break;
        case 'expires_at': aVal = a.expires_at ? new Date(a.expires_at).getTime() : Infinity; bVal = b.expires_at ? new Date(b.expires_at).getTime() : Infinity; break;
        case 'created_at': aVal = new Date(a.created_at).getTime(); bVal = new Date(b.created_at).getTime(); break;
        default: return 0;
      }
      return sortDirection === 'asc' ? (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) : (aVal > bVal ? -1 : aVal < bVal ? 1 : 0);
    });

    return filtered;
  }, [users, searchTerm, planFilter, periodFilter, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, planFilter, periodFilter, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(column); setSortDirection('asc'); }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Metrics
  const totalUsersCount = users.length;
  const activePayingUsers = users.filter(u => isEffectivelyActive(u) && u.plan_slug !== 'free').length;
  const expiringUsers = users.filter(u => {
    const days = getDaysUntilExpiry(u.expires_at);
    return days !== null && days <= 7 && days > 0 && isEffectivelyActive(u);
  });
  const inactiveUsers = users.filter(u => !isEffectivelyActive(u)).length;

  // Calculate renewal rate for planos2
  useEffect(() => {
    if (users.length === 0) return;
    const paidUsers = users.filter(u => u.plan_slug !== 'free');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const eligible = paidUsers.filter(u => new Date(u.created_at) < thirtyDaysAgo);
    if (eligible.length === 0) {
      setRenewalRate({ rate: 0, renewed: 0, eligible: 0 });
      return;
    }
    const renewed = eligible.filter(u => isEffectivelyActive(u));
    const rate = Math.round((renewed.length / eligible.length) * 1000) / 10;
    setRenewalRate({ rate, renewed: renewed.length, eligible: eligible.length });
  }, [users]);

  const planDistribution = Object.entries(
    users.reduce((acc, u) => {
      acc[u.plan_slug] = (acc[u.plan_slug] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: PLAN_LABELS[name] || name,
    value,
    color: PLAN_COLORS[name] || "#6b7280",
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Shared form fields for create/edit modals
  const renderFormFields = (isEdit: boolean) => (
    <div className="space-y-4">
      <div>
        <Label>Email {!isEdit && "*"}</Label>
        <Input
          type="email"
          value={formEmail}
          onChange={(e) => setFormEmail(e.target.value)}
          placeholder="usuario@email.com"
          disabled={isEdit}
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
        <Select value={formPlanSlug} onValueChange={handlePlanChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAID_PLANS.map(plan => (
              <SelectItem key={plan.slug} value={plan.slug}>{plan.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Créditos/mês</Label>
        <Input
          type="number"
          value={formCreditsPerMonth}
          onChange={(e) => setFormCreditsPerMonth(parseInt(e.target.value) || 0)}
        />
        <p className="text-xs text-muted-foreground mt-1">Preenchido automaticamente ao trocar o plano</p>
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

      {isEdit && (
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
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="icon" onClick={fetchPlanos2Users}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button onClick={() => { resetForm(); setIsCreateModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <RefreshCw className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Renovação</p>
              <p className="text-2xl font-bold">
                {renewalRate ? `${renewalRate.rate}%` : "..."}
              </p>
              {renewalRate && renewalRate.eligible > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {renewalRate.renewed}/{renewalRate.eligible} renovaram
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Sem dados (30+ dias)</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total de Assinantes</p>
              <p className="text-2xl font-bold">{totalUsersCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Crown className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Ativos (pagos)</p>
              <p className="text-2xl font-bold">{activePayingUsers}</p>
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
              <p className="text-2xl font-bold">{inactiveUsers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution Chart */}
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

      {expiringUsers.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção!</AlertTitle>
          <AlertDescription>
            {expiringUsers.length} assinante(s) expirando nos próximos 7 dias.
          </AlertDescription>
        </Alert>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar por nome, email ou plano..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="ultimate">Ultimate</SelectItem>
            <SelectItem value="unlimited">IA Unlimited</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o período</SelectItem>
            <SelectItem value="1">Último dia</SelectItem>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                    <div className="flex items-center">Nome/Email {getSortIcon('name')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('plan_slug')}>
                    <div className="flex items-center">Plano {getSortIcon('plan_slug')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('credits_per_month')}>
                    <div className="flex items-center">Créditos/mês {getSortIcon('credits_per_month')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('is_active')}>
                    <div className="flex items-center">Status {getSortIcon('is_active')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('expires_at')}>
                    <div className="flex items-center">Expira em {getSortIcon('expires_at')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center">Assinado em {getSortIcon('created_at')}</div>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => {
                  const daysUntilExpiry = getDaysUntilExpiry(user.expires_at);
                  const isExpiring = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
                  const active = isEffectivelyActive(user);
                  const isExpiredButFlagged = user.is_active && user.expires_at && new Date(user.expires_at) < new Date();

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${PLAN_COLORS[user.plan_slug] || '#6b7280'}20`,
                            color: PLAN_COLORS[user.plan_slug] || '#6b7280',
                          }}
                        >
                          {PLAN_LABELS[user.plan_slug] || user.plan_slug}
                        </span>
                      </TableCell>
                      <TableCell>{user.credits_per_month}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          active
                            ? "bg-green-500/20 text-green-500"
                            : isExpiredButFlagged
                              ? "bg-orange-500/20 text-orange-500"
                              : "bg-red-500/20 text-red-500"
                        }`}>
                          {active ? "Ativo" : isExpiredButFlagged ? "Vencido" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={isExpiring ? "text-orange-500 font-medium" : ""}>
                          {formatDate(user.expires_at)}
                          {daysUntilExpiry !== null && (
                            <span className="text-xs text-muted-foreground ml-1">({daysUntilExpiry}d)</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
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
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink onClick={() => setCurrentPage(pageNum)} isActive={currentPage === pageNum} className="cursor-pointer">
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
        Mostrando {paginatedUsers.length} de {filteredUsers.length} assinantes
      </p>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Assinante (Planos 2)</DialogTitle>
          </DialogHeader>
          {renderFormFields(false)}
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

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Assinante (Planos 2)</DialogTitle>
          </DialogHeader>
          {renderFormFields(true)}
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

      {/* Delete Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p>
            Tem certeza que deseja remover o assinante{" "}
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
    </div>
  );
};

export default AdminPlanos2SubscribersTab;
