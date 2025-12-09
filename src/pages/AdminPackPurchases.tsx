import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, Trash2, Edit, Package, Calendar, User, MessageCircle, Copy, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addMonths, addYears } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PackPurchase {
  id: string;
  user_id: string;
  pack_slug: string;
  access_type: '6_meses' | '1_ano' | 'vitalicio';
  has_bonus_access: boolean;
  is_active: boolean;
  purchased_at: string;
  expires_at: string | null;
  greenn_contract_id: string | null;
  user_email?: string;
  user_name?: string;
  user_phone?: string;
}

interface Pack {
  id: string;
  name: string;
  slug: string;
}

const AdminPackPurchases = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [purchases, setPurchases] = useState<PackPurchase[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPack, setFilterPack] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Add/Edit dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PackPurchase | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    pack_slug: "",
    access_type: "vitalicio" as '6_meses' | '1_ano' | 'vitalicio',
    is_active: true,
    password: "",
    useRandomPassword: true
  });

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword();
    setFormData({ ...formData, password: newPassword });
  };

  const copyPassword = () => {
    if (formData.password) {
      navigator.clipboard.writeText(formData.password);
      toast.success("Senha copiada!");
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
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
    setIsLoading(false);
    fetchPurchases();
    fetchPacks();
  };

  const fetchPacks = async () => {
    const { data } = await supabase
      .from('artes_packs')
      .select('id, name, slug')
      .eq('type', 'pack')
      .order('display_order');
    
    setPacks(data || []);
  };

  const fetchPurchases = async () => {
    // First get all purchases
    const { data: purchasesData, error } = await supabase
      .from('user_pack_purchases')
      .select('*')
      .order('purchased_at', { ascending: false });

    if (error) {
      console.error('Error fetching purchases:', error);
      return;
    }

    // Get user details from profiles
    const userIds = [...new Set((purchasesData || []).map(p => p.user_id))];
    
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email, name, phone')
      .in('id', userIds);

    const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

    const purchasesWithUsers = (purchasesData || []).map(purchase => ({
      ...purchase,
      user_email: profilesMap.get(purchase.user_id)?.email || '',
      user_name: profilesMap.get(purchase.user_id)?.name || '',
      user_phone: profilesMap.get(purchase.user_id)?.phone || ''
    }));

    setPurchases(purchasesWithUsers);
  };

  const calculateExpiresAt = (accessType: '6_meses' | '1_ano' | 'vitalicio'): string | null => {
    const now = new Date();
    switch (accessType) {
      case '6_meses':
        return addMonths(now, 6).toISOString();
      case '1_ano':
        return addYears(now, 1).toISOString();
      case 'vitalicio':
        return null;
    }
  };

  const handleAddPurchase = async () => {
    if (!formData.email || !formData.pack_slug) {
      toast.error("Email e pack são obrigatórios");
      return;
    }

    try {
      // Check if user exists
      let userId: string;
      
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingProfile) {
        userId = existingProfile.id;
      } else {
        // Create new user
        const passwordToUse = formData.useRandomPassword 
          ? (formData.password || generateRandomPassword()) 
          : formData.password;
        
        if (!passwordToUse) {
          toast.error("Senha é obrigatória");
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: passwordToUse,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (authError || !authData.user) {
          toast.error("Erro ao criar usuário: " + (authError?.message || "Usuário não criado"));
          return;
        }

        userId = authData.user.id;

        // Create profile
        await supabase.from('profiles').upsert({
          id: userId,
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          password_changed: false
        });
      }

      // Check if already has this pack
      const { data: existingPurchase } = await supabase
        .from('user_pack_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('pack_slug', formData.pack_slug)
        .maybeSingle();

      if (existingPurchase) {
        toast.error("Este usuário já possui este pack");
        return;
      }

      // Create purchase
      const hasBonus = formData.access_type === '1_ano' || formData.access_type === 'vitalicio';
      const expiresAt = calculateExpiresAt(formData.access_type);

      const { error: purchaseError } = await supabase
        .from('user_pack_purchases')
        .insert({
          user_id: userId,
          pack_slug: formData.pack_slug,
          access_type: formData.access_type,
          has_bonus_access: hasBonus,
          is_active: formData.is_active,
          expires_at: expiresAt
        });

      if (purchaseError) {
        toast.error("Erro ao criar compra: " + purchaseError.message);
        return;
      }

      toast.success("Compra adicionada com sucesso!");
      setShowAddDialog(false);
      resetForm();
      fetchPurchases();
    } catch (error) {
      console.error('Error adding purchase:', error);
      toast.error("Erro ao adicionar compra");
    }
  };

  const handleUpdatePurchase = async () => {
    if (!editingPurchase) return;

    try {
      const hasBonus = formData.access_type === '1_ano' || formData.access_type === 'vitalicio';
      const expiresAt = calculateExpiresAt(formData.access_type);

      const { error } = await supabase
        .from('user_pack_purchases')
        .update({
          pack_slug: formData.pack_slug,
          access_type: formData.access_type,
          has_bonus_access: hasBonus,
          is_active: formData.is_active,
          expires_at: expiresAt
        })
        .eq('id', editingPurchase.id);

      if (error) {
        toast.error("Erro ao atualizar: " + error.message);
        return;
      }

      toast.success("Compra atualizada!");
      setEditingPurchase(null);
      setShowAddDialog(false);
      resetForm();
      fetchPurchases();
    } catch (error) {
      console.error('Error updating purchase:', error);
      toast.error("Erro ao atualizar compra");
    }
  };

  const handleDeletePurchase = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta compra?")) return;

    const { error } = await supabase
      .from('user_pack_purchases')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erro ao remover: " + error.message);
      return;
    }

    toast.success("Compra removida!");
    fetchPurchases();
  };

  const handleToggleActive = async (purchase: PackPurchase) => {
    const { error } = await supabase
      .from('user_pack_purchases')
      .update({ is_active: !purchase.is_active })
      .eq('id', purchase.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    toast.success(purchase.is_active ? "Acesso desativado" : "Acesso ativado");
    fetchPurchases();
  };

  const resetForm = () => {
    setFormData({
      email: "",
      name: "",
      phone: "",
      pack_slug: "",
      access_type: "vitalicio",
      is_active: true,
      password: "",
      useRandomPassword: true
    });
  };

  const openEditDialog = (purchase: PackPurchase) => {
    setEditingPurchase(purchase);
    setFormData({
      email: purchase.user_email || "",
      name: purchase.user_name || "",
      phone: purchase.user_phone || "",
      pack_slug: purchase.pack_slug,
      access_type: purchase.access_type,
      is_active: purchase.is_active,
      password: "",
      useRandomPassword: true
    });
    setShowAddDialog(true);
  };

  const openWhatsApp = (phone: string) => {
    if (!phone) {
      toast.error("Telefone não cadastrado");
      return;
    }
    window.open(`https://api.whatsapp.com/send/?phone=${phone}&text&type=phone_number&app_absent=0`, '_blank');
  };

  const getAccessTypeLabel = (type: string) => {
    switch (type) {
      case '6_meses': return '6 Meses';
      case '1_ano': return '1 Ano';
      case 'vitalicio': return 'Vitalício';
      default: return type;
    }
  };

  const getPackName = (slug: string) => {
    const pack = packs.find(p => p.slug === slug);
    return pack?.name || slug;
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = 
      (purchase.user_email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (purchase.user_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      purchase.pack_slug.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPack = filterPack === "all" || purchase.pack_slug === filterPack;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && purchase.is_active) ||
      (filterStatus === "inactive" && !purchase.is_active);
    
    return matchesSearch && matchesPack && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/admin-dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Compras de Packs</h1>
            <p className="text-muted-foreground">Adicione, edite ou remova acessos de usuários aos packs</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Compras</p>
                <p className="text-2xl font-bold">{purchases.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <User className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold">{purchases.filter(p => p.is_active).length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vitalícios</p>
                <p className="text-2xl font-bold">{purchases.filter(p => p.access_type === 'vitalicio').length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inativos</p>
                <p className="text-2xl font-bold">{purchases.filter(p => !p.is_active).length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Add Button */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email, nome ou pack..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterPack} onValueChange={setFilterPack}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por pack" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os packs</SelectItem>
              {packs.map(pack => (
                <SelectItem key={pack.id} value={pack.slug}>{pack.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
              setEditingPurchase(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Compra
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPurchase ? 'Editar Compra' : 'Adicionar Nova Compra'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Email do usuário *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@email.com"
                    disabled={!!editingPurchase}
                  />
                </div>
                {!editingPurchase && (
                  <>
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nome do usuário"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone (WhatsApp)</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="5511999999999"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Senha</Label>
                      <div className="flex gap-2 mb-2">
                        <Button 
                          type="button"
                          variant={formData.useRandomPassword ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setFormData({ ...formData, useRandomPassword: true });
                            handleGeneratePassword();
                          }}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Aleatória
                        </Button>
                        <Button 
                          type="button"
                          variant={!formData.useRandomPassword ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormData({ ...formData, useRandomPassword: false, password: "" })}
                        >
                          Manual
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder={formData.useRandomPassword ? "Clique em 'Aleatória' para gerar" : "Digite a senha"}
                          readOnly={formData.useRandomPassword}
                          className={formData.useRandomPassword ? "bg-muted" : ""}
                        />
                        {formData.password && (
                          <Button type="button" variant="outline" size="icon" onClick={copyPassword}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {formData.password && (
                        <p className="text-xs text-muted-foreground">
                          Senha: <span className="font-mono font-bold">{formData.password}</span>
                        </p>
                      )}
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Pack *</Label>
                  <Select value={formData.pack_slug} onValueChange={(v) => setFormData({ ...formData, pack_slug: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o pack" />
                    </SelectTrigger>
                    <SelectContent>
                      {packs.map(pack => (
                        <SelectItem key={pack.id} value={pack.slug}>{pack.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Acesso</Label>
                  <Select value={formData.access_type} onValueChange={(v: '6_meses' | '1_ano' | 'vitalicio') => setFormData({ ...formData, access_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6_meses">6 Meses - R$ 27,00</SelectItem>
                      <SelectItem value="1_ano">1 Ano - R$ 37,00 (+ Bônus)</SelectItem>
                      <SelectItem value="vitalicio">Vitalício - R$ 47,00 (+ Bônus)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="is_active">Acesso ativo</Label>
                </div>
                <Button 
                  onClick={editingPurchase ? handleUpdatePurchase : handleAddPurchase}
                  className="w-full"
                >
                  {editingPurchase ? 'Salvar Alterações' : 'Adicionar Compra'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Purchases Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Pack</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Bônus</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Compra</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{purchase.user_name || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground">{purchase.user_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getPackName(purchase.pack_slug)}</Badge>
                  </TableCell>
                  <TableCell>{getAccessTypeLabel(purchase.access_type)}</TableCell>
                  <TableCell>
                    {purchase.has_bonus_access ? (
                      <Badge className="bg-amber-500/20 text-amber-600">Sim</Badge>
                    ) : (
                      <Badge variant="outline">Não</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={purchase.is_active ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}
                      onClick={() => handleToggleActive(purchase)}
                      style={{ cursor: 'pointer' }}
                    >
                      {purchase.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {purchase.expires_at 
                      ? format(new Date(purchase.expires_at), "dd/MM/yyyy", { locale: ptBR })
                      : <span className="text-amber-500">Vitalício</span>
                    }
                  </TableCell>
                  <TableCell>
                    {format(new Date(purchase.purchased_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openWhatsApp(purchase.user_phone || '')}
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(purchase)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePurchase(purchase.id)}
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPurchases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma compra encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default AdminPackPurchases;
