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
import { ArrowLeft, Plus, Search, Trash2, Edit, Package, Calendar, User, MessageCircle, X, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addMonths, addYears } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PackPurchase {
  id: string;
  user_id: string;
  pack_slug: string;
  access_type: '3_meses' | '6_meses' | '1_ano' | 'vitalicio';
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

interface PackAccess {
  pack_slug: string;
  access_type: '3_meses' | '6_meses' | '1_ano' | 'vitalicio';
  is_active: boolean;
  id?: string; // for existing purchases
  purchased_at?: string; // purchase date for expiration calculation
  expires_at?: string | null; // calculated expiration date
}

interface ClientFormData {
  email: string;
  name: string;
  phone: string;
  packAccesses: PackAccess[];
}

interface GroupedClient {
  user_id: string;
  user_email: string;
  user_name: string;
  user_phone: string;
  purchases: PackPurchase[];
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  
  // Expired clients modal state
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [expiredViewMode, setExpiredViewMode] = useState<'some' | 'all'>('some');
  
  // Add/Edit dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<GroupedClient | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    email: "",
    name: "",
    phone: "",
    packAccesses: []
  });


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
    // Fetch ALL purchases using pagination to avoid 1000 record limit
    let allPurchases: any[] = [];
    let from = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: purchasesData, error } = await supabase
        .from('user_pack_purchases')
        .select('*')
        .order('purchased_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('Error fetching purchases:', error);
        break;
      }

      if (!purchasesData || purchasesData.length === 0) break;
      
      allPurchases = [...allPurchases, ...purchasesData];
      
      // If we got less than pageSize, we've reached the end
      if (purchasesData.length < pageSize) break;
      
      from += pageSize;
    }

    console.log(`Fetched ${allPurchases.length} total purchases`);

    // Get unique user IDs
    const userIds = [...new Set(allPurchases.map(p => p.user_id))];
    console.log(`Found ${userIds.length} unique clients`);
    
    // Fetch profiles in batches to handle large numbers
    let allProfiles: any[] = [];
    const batchSize = 100;
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batchIds = userIds.slice(i, i + batchSize);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, name, phone')
        .in('id', batchIds);
      
      if (profilesData) {
        allProfiles = [...allProfiles, ...profilesData];
      }
    }

    const profilesMap = new Map(allProfiles.map(p => [p.id, p]));

    const purchasesWithUsers = allPurchases.map(purchase => ({
      ...purchase,
      user_email: profilesMap.get(purchase.user_id)?.email || '',
      user_name: profilesMap.get(purchase.user_id)?.name || '',
      user_phone: profilesMap.get(purchase.user_id)?.phone || ''
    }));

    setPurchases(purchasesWithUsers);
  };

  const calculateExpiresAt = (accessType: '3_meses' | '6_meses' | '1_ano' | 'vitalicio'): string | null => {
    const now = new Date();
    switch (accessType) {
      case '3_meses':
        return addMonths(now, 3).toISOString();
      case '6_meses':
        return addMonths(now, 6).toISOString();
      case '1_ano':
        return addYears(now, 1).toISOString();
      case 'vitalicio':
        return null;
    }
  };

  const addPackAccess = () => {
    const availablePacks = packs.filter(p => !formData.packAccesses.some(pa => pa.pack_slug === p.slug));
    if (availablePacks.length === 0) {
      toast.error("Todos os packs já foram adicionados");
      return;
    }
    setFormData({
      ...formData,
      packAccesses: [...formData.packAccesses, {
        pack_slug: availablePacks[0].slug,
        access_type: 'vitalicio',
        is_active: true
      }]
    });
  };

  const removePackAccess = (index: number) => {
    const newAccesses = [...formData.packAccesses];
    newAccesses.splice(index, 1);
    setFormData({ ...formData, packAccesses: newAccesses });
  };

  const updatePackAccess = (index: number, field: keyof PackAccess, value: any) => {
    const newAccesses = [...formData.packAccesses];
    newAccesses[index] = { ...newAccesses[index], [field]: value };
    setFormData({ ...formData, packAccesses: newAccesses });
  };

  const handleSaveClient = async () => {
    if (!formData.email) {
      toast.error("Email é obrigatório");
      return;
    }

    if (formData.packAccesses.length === 0) {
      toast.error("Adicione pelo menos um pack");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      if (editingClient) {
        // Editing existing client - update via direct queries (admin has permission)
        const userId = editingClient.user_id;

        // Get existing purchase IDs for this user
        const existingIds = editingClient.purchases.map(p => p.id);
        const formAccessIds = formData.packAccesses.filter(pa => pa.id).map(pa => pa.id);

        // Delete removed purchases
        const toDelete = existingIds.filter(id => !formAccessIds.includes(id));
        if (toDelete.length > 0) {
          await supabase.from('user_pack_purchases').delete().in('id', toDelete);
        }

        // Update or insert purchases
        for (const access of formData.packAccesses) {
          const hasBonus = access.access_type === '1_ano' || access.access_type === 'vitalicio';
          const expiresAt = calculateExpiresAt(access.access_type);

          if (access.id) {
            // Update existing
            await supabase.from('user_pack_purchases').update({
              pack_slug: access.pack_slug,
              access_type: access.access_type,
              has_bonus_access: hasBonus,
              is_active: access.is_active,
              expires_at: expiresAt
            }).eq('id', access.id);
          } else {
            // Insert new
            await supabase.from('user_pack_purchases').insert({
              user_id: userId,
              pack_slug: access.pack_slug,
              access_type: access.access_type,
              has_bonus_access: hasBonus,
              is_active: access.is_active,
              expires_at: expiresAt
            });
          }
        }

        // Update profile info via edge function (to reset password if needed)
        const response = await fetch(
          `https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/update-user-password-artes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ 
              user_id: userId, 
              new_password: formData.email.toLowerCase().trim() 
            })
          }
        );

        if (!response.ok) {
          console.error('Error updating password:', await response.json());
        }

        toast.success("Cliente atualizado com sucesso!");
      } else {
        // Creating new client - use edge function to avoid session switching
        const packsToCreate = formData.packAccesses.map(access => {
          const hasBonus = access.access_type === '1_ano' || access.access_type === 'vitalicio';
          const expiresAt = calculateExpiresAt(access.access_type);
          return {
            pack_slug: access.pack_slug,
            access_type: access.access_type,
            has_bonus: hasBonus,
            expires_at: expiresAt
          };
        });

        const response = await fetch(
          `https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/create-pack-client`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              email: formData.email,
              name: formData.name,
              phone: formData.phone,
              packs: packsToCreate
            })
          }
        );

        const result = await response.json();
        
        if (!response.ok) {
          toast.error(result.error || "Erro ao criar cliente");
          return;
        }

        toast.success(result.message || "Cliente cadastrado com sucesso!");
      }

      setShowAddDialog(false);
      resetForm();
      fetchPurchases();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error("Erro ao salvar cliente");
    }
  };

  const handleDeletePurchase = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este acesso?")) return;

    const { error } = await supabase
      .from('user_pack_purchases')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erro ao remover: " + error.message);
      return;
    }

    toast.success("Acesso removido!");
    fetchPurchases();
  };

  const handleDeleteClient = async (client: GroupedClient) => {
    if (!confirm(`Tem certeza que deseja EXCLUIR COMPLETAMENTE o cliente "${client.user_email}"? Isso irá remover todos os acessos, perfil e conta de login.`)) return;

    try {
      // Delete all pack purchases
      for (const purchase of client.purchases) {
        await supabase.from('user_pack_purchases').delete().eq('id', purchase.id);
      }

      // Delete profile
      await supabase.from('profiles').delete().eq('id', client.user_id);

      // Delete premium_artes_users if exists
      await supabase.from('premium_artes_users').delete().eq('user_id', client.user_id);

      // Delete user from Auth via edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const response = await fetch(
          `https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/delete-auth-user-artes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ user_id: client.user_id })
          }
        );

        const result = await response.json();
        if (!response.ok) {
          console.error('Error deleting auth user:', result);
          toast.error("Erro ao excluir usuário do Auth: " + result.error);
          return;
        }
      }

      toast.success("Cliente excluído completamente!");
      fetchPurchases();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error("Erro ao excluir cliente");
    }
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
      packAccesses: []
    });
    setEditingClient(null);
  };

  const openEditDialog = (purchase: PackPurchase) => {
    // Group all purchases for this user
    const userPurchases = purchases.filter(p => p.user_id === purchase.user_id);
    
    const client: GroupedClient = {
      user_id: purchase.user_id,
      user_email: purchase.user_email || '',
      user_name: purchase.user_name || '',
      user_phone: purchase.user_phone || '',
      purchases: userPurchases
    };

    setEditingClient(client);
    setFormData({
      email: client.user_email,
      name: client.user_name,
      phone: client.user_phone,
      packAccesses: userPurchases.map(p => ({
        pack_slug: p.pack_slug,
        access_type: p.access_type,
        is_active: p.is_active,
        id: p.id,
        purchased_at: p.purchased_at,
        expires_at: p.expires_at
      }))
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

  // Group purchases by user for display - deduplicate by user_id + pack_slug
  const groupedClients: GroupedClient[] = [];
  const userMap = new Map<string, GroupedClient>();
  
  filteredPurchases.forEach(purchase => {
    if (!userMap.has(purchase.user_id)) {
      const client: GroupedClient = {
        user_id: purchase.user_id,
        user_email: purchase.user_email || '',
        user_name: purchase.user_name || '',
        user_phone: purchase.user_phone || '',
        purchases: []
      };
      userMap.set(purchase.user_id, client);
      groupedClients.push(client);
    }
    
    // Only add if this pack_slug doesn't already exist for this user (deduplicate)
    const existingClient = userMap.get(purchase.user_id)!;
    const alreadyHasPack = existingClient.purchases.some(p => p.pack_slug === purchase.pack_slug);
    if (!alreadyHasPack) {
      existingClient.purchases.push(purchase);
    }
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
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Clientes de Packs</h1>
            <p className="text-muted-foreground">Cadastre clientes e gerencie seus acessos aos packs</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-bold">{[...new Set(purchases.map(p => p.user_id))].length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Package className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Acessos</p>
                <p className="text-2xl font-bold">{purchases.length}</p>
              </div>
            </div>
          </Card>
          <Card 
            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setShowExpiredModal(true)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Packs Vencidos</p>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xl font-bold text-amber-600">
                      {(() => {
                        const now = new Date();
                        const userIds = [...new Set(purchases.map(p => p.user_id))];
                        return userIds.filter(userId => 
                          purchases.some(p => 
                            p.user_id === userId && 
                            p.expires_at && 
                            new Date(p.expires_at) < now
                          )
                        ).length;
                      })()}
                    </p>
                    <p className="text-xs text-muted-foreground">c/ algum vencido</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-red-600">
                      {(() => {
                        const now = new Date();
                        const userIds = [...new Set(purchases.map(p => p.user_id))];
                        return userIds.filter(userId => {
                          const userPurchases = purchases.filter(p => p.user_id === userId);
                          return userPurchases.every(p => 
                            p.expires_at && new Date(p.expires_at) < now
                          );
                        }).length;
                      })()}
                    </p>
                    <p className="text-xs text-muted-foreground">todos vencidos</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expirando em 30 dias</p>
                <p className="text-2xl font-bold">
                  {(() => {
                    const now = new Date();
                    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                    const userIds = [...new Set(purchases.map(p => p.user_id))];
                    return userIds.filter(userId => 
                      purchases.some(p => 
                        p.user_id === userId && 
                        p.is_active && 
                        p.expires_at && 
                        new Date(p.expires_at) <= thirtyDaysFromNow
                      )
                    ).length;
                  })()}
                </p>
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
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin-import-access')}
            className="border-primary text-primary hover:bg-primary/10"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importar XLSX (Acessos)
          </Button>
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email do cliente *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="cliente@email.com"
                      disabled={!!editingClient}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do cliente"
                      disabled={!!editingClient}
                    />
                  </div>
                </div>

                {!editingClient && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Telefone (WhatsApp)</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="5511999999999"
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Senha:</strong> A senha do cliente será o próprio email dele.
                      </p>
                    </div>
                  </>
                )}

                {/* Pack Accesses */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Acessos aos Packs</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addPackAccess}>
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar Pack
                    </Button>
                  </div>
                  
                  {formData.packAccesses.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                      Nenhum pack adicionado. Clique em "Adicionar Pack" para começar.
                    </p>
                  )}

                  {formData.packAccesses.map((access, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Pack</Label>
                              <Select 
                                value={access.pack_slug} 
                                onValueChange={(v) => updatePackAccess(index, 'pack_slug', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {packs.map(pack => (
                                    <SelectItem 
                                      key={pack.id} 
                                      value={pack.slug}
                                      disabled={formData.packAccesses.some((pa, i) => i !== index && pa.pack_slug === pack.slug)}
                                    >
                                      {pack.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Tipo de Acesso</Label>
                              <Select 
                                value={access.access_type} 
                                onValueChange={(v: '3_meses' | '6_meses' | '1_ano' | 'vitalicio') => updatePackAccess(index, 'access_type', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3_meses">3 Meses</SelectItem>
                                  <SelectItem value="6_meses">6 Meses</SelectItem>
                                  <SelectItem value="1_ano">1 Ano (+ Bônus)</SelectItem>
                                  <SelectItem value="vitalicio">Vitalício (+ Bônus)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Status</Label>
                              <Select 
                                value={access.is_active ? "active" : "inactive"} 
                                onValueChange={(v) => updatePackAccess(index, 'is_active', v === "active")}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Ativo</SelectItem>
                                  <SelectItem value="inactive">Inativo</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {/* Expiration info for existing purchases */}
                          {access.id && access.purchased_at && (
                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Compra: {format(new Date(access.purchased_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {access.access_type === 'vitalicio' ? (
                                  <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">
                                    Acesso Vitalício
                                  </Badge>
                                ) : access.expires_at ? (
                                  <>
                                    <span>Expira: </span>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        new Date(access.expires_at) < new Date() 
                                          ? 'bg-red-500/10 text-red-600 border-red-500/30'
                                          : new Date(access.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                          : 'bg-green-500/10 text-green-600 border-green-500/30'
                                      }`}
                                    >
                                      {format(new Date(access.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                                    </Badge>
                                  </>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    Sem data de expiração
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removePackAccess(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                <Button onClick={handleSaveClient} className="w-full">
                  {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Clients Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Packs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedClients
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((client) => (
                <TableRow key={client.user_id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{client.user_name || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground">{client.user_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {client.purchases.map((purchase) => (
                        <Badge 
                          key={purchase.id} 
                          variant="outline"
                          className={`text-xs ${!purchase.is_active ? 'opacity-50 line-through' : ''}`}
                        >
                          {getPackName(purchase.pack_slug)} ({getAccessTypeLabel(purchase.access_type)})
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {client.purchases.every(p => p.is_active) ? (
                        <Badge className="bg-green-500/20 text-green-600">Todos ativos</Badge>
                      ) : client.purchases.some(p => p.is_active) ? (
                        <Badge className="bg-amber-500/20 text-amber-600">Parcial</Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-600">Inativo</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openWhatsApp(client.user_phone)}
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(client.purchases[0])}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClient(client)}
                        title="Excluir cliente"
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {groupedClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {groupedClients.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, groupedClients.length)} de {groupedClients.length} clientes
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(groupedClients.length / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === Math.ceil(groupedClients.length / ITEMS_PER_PAGE) ||
                      Math.abs(page - currentPage) <= 2
                    )
                    .map((page, index, arr) => (
                      <span key={page}>
                        {index > 0 && arr[index - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      </span>
                    ))
                  }
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(groupedClients.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={currentPage === Math.ceil(groupedClients.length / ITEMS_PER_PAGE)}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Expired Clients Modal */}
        <Dialog open={showExpiredModal} onOpenChange={setShowExpiredModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Clientes com Packs Vencidos</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Button 
                  variant={expiredViewMode === 'some' ? 'default' : 'outline'}
                  onClick={() => setExpiredViewMode('some')}
                  size="sm"
                >
                  Com algum pack vencido
                </Button>
                <Button 
                  variant={expiredViewMode === 'all' ? 'default' : 'outline'}
                  onClick={() => setExpiredViewMode('all')}
                  size="sm"
                >
                  Todos os packs vencidos
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Packs Vencidos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const now = new Date();
                    const userIds = [...new Set(purchases.map(p => p.user_id))];
                    
                    const expiredClients = userIds.filter(userId => {
                      const userPurchases = purchases.filter(p => p.user_id === userId);
                      const hasExpired = userPurchases.some(p => p.expires_at && new Date(p.expires_at) < now);
                      const allExpired = userPurchases.every(p => p.expires_at && new Date(p.expires_at) < now);
                      
                      return expiredViewMode === 'all' ? allExpired : hasExpired;
                    });
                    
                    return expiredClients.map(userId => {
                      const userPurchases = purchases.filter(p => p.user_id === userId);
                      const firstPurchase = userPurchases[0];
                      const expiredPacks = userPurchases.filter(p => p.expires_at && new Date(p.expires_at) < now);
                      
                      return (
                        <TableRow key={userId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{firstPurchase.user_name || 'Sem nome'}</p>
                              <p className="text-sm text-muted-foreground">{firstPurchase.user_email}</p>
                              {firstPurchase.user_phone && (
                                <p className="text-xs text-muted-foreground">{firstPurchase.user_phone}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {expiredPacks.map((purchase) => (
                                <Badge 
                                  key={purchase.id} 
                                  variant="outline"
                                  className="text-xs bg-red-500/10 text-red-600 border-red-500/30"
                                >
                                  {getPackName(purchase.pack_slug)} - venceu em {format(new Date(purchase.expires_at!), "dd/MM/yy", { locale: ptBR })}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openWhatsApp(firstPurchase.user_phone || '')}
                                title="WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setShowExpiredModal(false);
                                  openEditDialog(firstPurchase);
                                }}
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminPackPurchases;
