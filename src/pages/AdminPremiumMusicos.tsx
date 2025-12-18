import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  ArrowLeft, Users, Crown, Calendar, Plus, Search, 
  Edit, Trash2, MessageCircle, RefreshCw, ChevronLeft, ChevronRight,
  AlertTriangle
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PremiumUser {
  id: string;
  user_id: string;
  plan_type: string | null;
  billing_period: string | null;
  is_active: boolean;
  subscribed_at: string | null;
  expires_at: string | null;
  created_at: string | null;
  profile?: {
    name: string | null;
    email: string | null;
    phone: string | null;
    password_changed: boolean | null;
  };
}

const AdminPremiumMusicos = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<PremiumUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<PremiumUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPlanType, setFormPlanType] = useState("basico");
  const [formBillingPeriod, setFormBillingPeriod] = useState("mensal");
  const [formExpirationDays, setFormExpirationDays] = useState("30");
  const [formIsActive, setFormIsActive] = useState(true);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
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
      .single();

    if (!roleData) {
      navigate("/admin-login");
      return;
    }

    await fetchUsers();
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch all premium musicos users with pagination
      let allUsers: PremiumUser[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("premium_musicos_users")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allUsers = [...allUsers, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      // Fetch profiles for all users
      const userIds = allUsers.map(u => u.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email, phone, password_changed")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        allUsers = allUsers.map(u => ({
          ...u,
          profile: profileMap.get(u.user_id) || undefined,
        }));
      }

      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormEmail("");
    setFormName("");
    setFormPhone("");
    setFormPlanType("basico");
    setFormBillingPeriod("mensal");
    setFormExpirationDays("30");
    setFormIsActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (user: PremiumUser) => {
    setEditingUser(user);
    setFormEmail(user.profile?.email || "");
    setFormName(user.profile?.name || "");
    setFormPhone(user.profile?.phone || "");
    setFormPlanType(user.plan_type || "basico");
    setFormBillingPeriod(user.billing_period || "mensal");
    setFormIsActive(user.is_active);
    
    if (user.expires_at) {
      const daysLeft = differenceInDays(new Date(user.expires_at), new Date());
      setFormExpirationDays(String(Math.max(0, daysLeft)));
    } else {
      setFormExpirationDays("0");
    }
    
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formEmail.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      if (editingUser) {
        // Update existing user
        let expiresAt: string | null = null;
        const days = parseInt(formExpirationDays);
        if (days > 0) {
          const expDate = new Date();
          expDate.setDate(expDate.getDate() + days);
          expiresAt = expDate.toISOString();
        }

        const { error: premiumError } = await supabase
          .from("premium_musicos_users")
          .update({
            plan_type: formPlanType,
            billing_period: formBillingPeriod,
            is_active: formIsActive,
            expires_at: expiresAt,
          })
          .eq("id", editingUser.id);

        if (premiumError) throw premiumError;

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            name: formName || null,
            phone: formPhone || null,
          })
          .eq("id", editingUser.user_id);

        if (profileError) throw profileError;

        toast.success("Usuário atualizado!");
      } else {
        // Create new user via edge function
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await supabase.functions.invoke("create-premium-user-musicos", {
          body: {
            email: formEmail.trim().toLowerCase(),
            name: formName || undefined,
            phone: formPhone || undefined,
            plan_type: formPlanType,
            billing_period: formBillingPeriod,
            expiration_days: parseInt(formExpirationDays) || 30,
            is_active: formIsActive,
          },
        });

        if (response.error) throw response.error;
        if (response.data?.error) throw new Error(response.data.error);

        toast.success("Usuário criado!");
      }

      setShowModal(false);
      await fetchUsers();
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast.error(error.message || "Erro ao salvar usuário");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user: PremiumUser) => {
    if (!confirm(`Deseja excluir ${user.profile?.email || "este usuário"}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("premium_musicos_users")
        .delete()
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Usuário removido!");
      await fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Erro ao excluir usuário");
    }
  };

  const handleResetPassword = async (user: PremiumUser) => {
    if (!user.profile?.email) {
      toast.error("Email não encontrado");
      return;
    }

    if (!confirm(`Redefinir senha de ${user.profile.email} para o email?`)) {
      return;
    }

    try {
      const response = await supabase.functions.invoke("update-user-password-artes", {
        body: {
          user_id: user.user_id,
          new_password: user.profile.email,
        },
      });

      if (response.error) throw response.error;

      await supabase
        .from("profiles")
        .update({ password_changed: false })
        .eq("id", user.user_id);

      toast.success("Senha redefinida para o email!");
      await fetchUsers();
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Erro ao redefinir senha");
    }
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://api.whatsapp.com/send/?phone=${cleanPhone}&text&type=phone_number&app_absent=0`, "_blank");
  };

  // Filter and paginate
  const filteredUsers = users.filter(u => {
    const search = searchTerm.toLowerCase();
    return (
      u.profile?.email?.toLowerCase().includes(search) ||
      u.profile?.name?.toLowerCase().includes(search) ||
      u.plan_type?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const expiringUsers = users.filter(u => {
    if (!u.expires_at || !u.is_active) return false;
    const daysLeft = differenceInDays(new Date(u.expires_at), new Date());
    return daysLeft >= 0 && daysLeft <= 7;
  }).length;

  const getExpirationStatus = (expiresAt: string | null, isActive: boolean) => {
    if (!isActive) return { text: "Inativo", variant: "destructive" as const };
    if (!expiresAt) return { text: "Vitalício", variant: "default" as const };
    
    const daysLeft = differenceInDays(new Date(expiresAt), new Date());
    if (daysLeft < 0) return { text: "Expirado", variant: "destructive" as const };
    if (daysLeft <= 7) return { text: `${daysLeft}d`, variant: "outline" as const };
    return { text: `${daysLeft}d`, variant: "secondary" as const };
  };

  if (isLoading) {
    return (
      <AdminLayoutPlatform platform="artes-musicos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
        </div>
      </AdminLayoutPlatform>
    );
  }

  return (
    <AdminLayoutPlatform platform="artes-musicos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin-artes-musicos/ferramentas")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Clientes Premium - Músicos</h1>
              <p className="text-muted-foreground">Gerencie assinantes da plataforma de músicos</p>
            </div>
          </div>
          <Button onClick={handleOpenAdd} className="bg-gradient-to-r from-violet-500 to-purple-500">
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/20 rounded-full">
                <Users className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-full">
                <Crown className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold">{activeUsers}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-full">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expirando (7 dias)</p>
                <p className="text-2xl font-bold">{expiringUsers}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou nome..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => {
                const expStatus = getExpirationStatus(user.expires_at, user.is_active);
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.profile?.name || "—"}</p>
                        <p className="text-sm text-muted-foreground">{user.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {user.plan_type || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{user.billing_period || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={expStatus.variant}>{expStatus.text}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.expires_at
                        ? format(new Date(user.expires_at), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {user.profile?.phone && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleWhatsApp(user.profile!.phone!)}
                            className="text-green-500 hover:text-green-600"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResetPassword(user)}
                          title="Redefinir senha"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginatedUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Cliente" : "Novo Cliente Premium"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email *</Label>
              <Input
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@exemplo.com"
                disabled={!!editingUser}
              />
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plano</Label>
                <Select value={formPlanType} onValueChange={setFormPlanType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basico">Básico</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Período</Label>
                <Select value={formBillingPeriod} onValueChange={setFormBillingPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                    <SelectItem value="vitalicio">Vitalício</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Dias de Acesso (0 = Vitalício)</Label>
              <Input
                type="number"
                value={formExpirationDays}
                onChange={(e) => setFormExpirationDays(e.target.value)}
                min="0"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500"
              >
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayoutPlatform>
  );
};

export default AdminPremiumMusicos;
