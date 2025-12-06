import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, UserPlus, Loader2, Crown, Users, Clock, Pencil, Trash2, 
  RefreshCw, AlertTriangle, Search, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface PremiumUser {
  id: string;
  user_id: string;
  email?: string;
  is_active: boolean;
  plan_type: string | null;
  billing_period: string | null;
  expires_at: string | null;
  subscribed_at: string | null;
  created_at: string | null;
  greenn_product_id: number | null;
  greenn_contract_id: string | null;
}

const PLAN_COLORS: Record<string, string> = {
  arcano_basico: "#f59e0b",
  arcano_pro: "#8b5cf6",
  arcano_unlimited: "#10b981"
};

const PLAN_LABELS: Record<string, string> = {
  arcano_basico: "Arcano Básico",
  arcano_pro: "Arcano Pro",
  arcano_unlimited: "Arcano Unlimited"
};

const AdminPremiumDashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<PremiumUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PremiumUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    planType: "arcano_basico",
    billingPeriod: "monthly",
    isActive: true,
    expiresInDays: "30",
    greennProductId: "",
    greennContractId: ""
  });

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [premiumUsers, searchTerm, periodFilter]);

  const checkAdminAndFetch = async () => {
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

    setIsAdmin(true);
    await fetchPremiumUsers();
    setIsLoading(false);
  };

  const fetchPremiumUsers = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('premium_users')
        .select('*')
        .order('expires_at', { ascending: true });

      if (error) throw error;

      // Fetch user emails
      const usersWithEmails = await Promise.all(
        (data || []).map(async (user) => {
          // We need to get email from auth - using edge function would be better
          // For now, return without email
          return { ...user, email: undefined };
        })
      );

      setPremiumUsers(usersWithEmails);
    } catch (error) {
      console.error("Error fetching premium users:", error);
      toast.error("Erro ao carregar usuários premium");
    } finally {
      setIsRefreshing(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...premiumUsers];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.plan_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by period (subscription date)
    if (periodFilter !== "all") {
      const now = new Date();
      const daysMap: Record<string, number> = {
        "1": 1,
        "3": 3,
        "15": 15,
        "30": 30,
        "90": 90,
        "365": 365
      };
      const days = daysMap[periodFilter];
      if (days) {
        const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(user => {
          const subscribedAt = user.subscribed_at ? new Date(user.subscribed_at) : null;
          return subscribedAt && subscribedAt >= cutoffDate;
        });
      }
    }

    setFilteredUsers(filtered);
  };

  const resetForm = () => {
    setFormData({
      email: "",
      planType: "arcano_basico",
      billingPeriod: "monthly",
      isActive: true,
      expiresInDays: "30",
      greennProductId: "",
      greennContractId: ""
    });
  };

  const handleCreate = async () => {
    if (!formData.email.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-premium-user', {
        body: {
          email: formData.email.trim(),
          planType: formData.planType,
          billingPeriod: formData.billingPeriod,
          expiresInDays: parseInt(formData.expiresInDays),
          isActive: formData.isActive,
          greennProductId: formData.greennProductId ? parseInt(formData.greennProductId) : undefined,
          greennContractId: formData.greennContractId || undefined
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Usuário premium criado com sucesso!");
      setShowCreateModal(false);
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
      expiresAt.setDate(expiresAt.getDate() + parseInt(formData.expiresInDays));

      const { error } = await supabase
        .from('premium_users')
        .update({
          plan_type: formData.planType,
          billing_period: formData.billingPeriod,
          is_active: formData.isActive,
          expires_at: expiresAt.toISOString(),
          greenn_product_id: formData.greennProductId ? parseInt(formData.greennProductId) : null,
          greenn_contract_id: formData.greennContractId || null
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success("Usuário premium atualizado com sucesso!");
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      await fetchPremiumUsers();
    } catch (error: any) {
      console.error("Error updating premium user:", error);
      toast.error(error.message || "Erro ao atualizar usuário premium");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('premium_users')
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success("Usuário premium removido com sucesso!");
      setShowDeleteModal(false);
      setSelectedUser(null);
      await fetchPremiumUsers();
    } catch (error: any) {
      console.error("Error deleting premium user:", error);
      toast.error(error.message || "Erro ao remover usuário premium");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user: PremiumUser) => {
    setSelectedUser(user);
    const daysUntilExpiry = user.expires_at 
      ? Math.max(0, Math.ceil((new Date(user.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 30;
    
    setFormData({
      email: "",
      planType: user.plan_type || "arcano_basico",
      billingPeriod: user.billing_period || "monthly",
      isActive: user.is_active,
      expiresInDays: String(daysUntilExpiry || 30),
      greennProductId: user.greenn_product_id?.toString() || "",
      greennContractId: user.greenn_contract_id || ""
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user: PremiumUser) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Stats calculations
  const totalUsers = premiumUsers.length;
  const activeUsers = premiumUsers.filter(u => u.is_active).length;
  const expiringUsers = premiumUsers.filter(u => {
    if (!u.expires_at) return false;
    const daysUntil = (new Date(u.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil > 0 && daysUntil <= 7;
  });

  // Chart data
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

  const billingDistribution = Object.entries(
    premiumUsers.reduce((acc, user) => {
      const period = user.billing_period || "unknown";
      acc[period] = (acc[period] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: name === "monthly" ? "Mensal" : name === "yearly" ? "Anual" : name,
    value
  }));

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getDaysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin-dashboard')}
              size="icon"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Gerenciar Usuários Premium
              </h1>
              <p className="text-muted-foreground">
                Dashboard e gestão de assinaturas
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchPremiumUsers}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-gradient-primary hover:opacity-90"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Assinantes</p>
                <p className="text-3xl font-bold text-foreground">{totalUsers}</p>
                <p className="text-xs text-green-500">{activeUsers} ativos</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <Crown className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Planos</p>
                <div className="flex gap-2 mt-1">
                  {planDistribution.map(plan => (
                    <Badge key={plan.name} style={{ backgroundColor: plan.color }} className="text-white">
                      {plan.value}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-full">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expirando em 7 dias</p>
                <p className="text-3xl font-bold text-foreground">{expiringUsers.length}</p>
                <p className="text-xs text-orange-500">Atenção necessária</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Distribuição por Plano</h3>
            <ResponsiveContainer width="100%" height={250}>
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
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Período de Cobrança</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={billingDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Expiring Soon Alert */}
        {expiringUsers.length > 0 && (
          <Card className="p-4 mb-6 border-orange-500/50 bg-orange-500/10">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium text-foreground">
                  {expiringUsers.length} usuário(s) com assinatura expirando em 7 dias
                </p>
                <p className="text-sm text-muted-foreground">
                  {expiringUsers.map(u => u.user_id.slice(0, 8)).join(", ")}...
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID ou plano..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="1">Último dia</SelectItem>
                <SelectItem value="3">Últimos 3 dias</SelectItem>
                <SelectItem value="15">Últimos 15 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Assinado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const daysUntil = getDaysUntilExpiry(user.expires_at);
                  const isExpiringSoon = daysUntil !== null && daysUntil <= 7 && daysUntil > 0;
                  const isExpired = daysUntil !== null && daysUntil <= 0;

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-xs">
                        {user.user_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ backgroundColor: PLAN_COLORS[user.plan_type || ""] || "#6b7280" }}
                          className="text-white"
                        >
                          {PLAN_LABELS[user.plan_type || ""] || user.plan_type || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.billing_period === "monthly" ? "Mensal" : 
                         user.billing_period === "yearly" ? "Anual" : user.billing_period || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-orange-500' : ''}`}>
                          {formatDate(user.expires_at)}
                          {daysUntil !== null && (
                            <span className="text-xs ml-1">
                              ({daysUntil <= 0 ? 'expirado' : `${daysUntil}d`})
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(user.subscribed_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditModal(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openDeleteModal(user)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Create Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Usuário Premium</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email do usuário *</Label>
                <Input
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo do Plano</Label>
                <Select value={formData.planType} onValueChange={(v) => setFormData({ ...formData, planType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arcano_basico">Arcano Básico</SelectItem>
                    <SelectItem value="arcano_pro">Arcano Pro</SelectItem>
                    <SelectItem value="arcano_unlimited">Arcano IA Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período de Cobrança</Label>
                <Select value={formData.billingPeriod} onValueChange={(v) => setFormData({ ...formData, billingPeriod: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expira em (dias)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.expiresInDays}
                  onChange={(e) => setFormData({ ...formData, expiresInDays: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Status Ativo</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Usuário Premium
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuário Premium</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-sm">{selectedUser?.user_id}</p>
              </div>
              <div className="space-y-2">
                <Label>Tipo do Plano</Label>
                <Select value={formData.planType} onValueChange={(v) => setFormData({ ...formData, planType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arcano_basico">Arcano Básico</SelectItem>
                    <SelectItem value="arcano_pro">Arcano Pro</SelectItem>
                    <SelectItem value="arcano_unlimited">Arcano IA Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período de Cobrança</Label>
                <Select value={formData.billingPeriod} onValueChange={(v) => setFormData({ ...formData, billingPeriod: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nova expiração em (dias a partir de hoje)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.expiresInDays}
                  onChange={(e) => setFormData({ ...formData, expiresInDays: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Status Ativo</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                />
              </div>
              <Button onClick={handleEdit} className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Tem certeza que deseja remover este usuário premium?
              </p>
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-sm">{selectedUser?.user_id}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Excluir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminPremiumDashboard;
