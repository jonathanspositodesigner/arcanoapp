import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, Trash2, Edit, Package, Calendar, User, MessageCircle, X, Upload, KeyRound, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Loader2 } from "lucide-react";
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
  product_name: string | null;
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
  id?: string;
  purchased_at?: string;
  expires_at?: string | null;
  product_name?: string | null;
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

interface ServerClient {
  user_id: string;
  user_email: string;
  user_name: string;
  user_phone: string;
  pack_count: number;
  latest_purchase: string;
  earliest_expiration: string | null;
  has_vitalicio: boolean;
  purchases: PackPurchase[];
}

interface ServerStats {
  total_clients: number;
  total_purchases: number;
  expired_some: number;
  expired_all: number;
  expiring_30d: number;
}

interface ServerResponse {
  clients: ServerClient[];
  total_count: number;
  page: number;
  page_size: number;
  stats: ServerStats;
}

const AdminPackPurchases = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPack, setFilterPack] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Server-side data
  const [clients, setClients] = useState<ServerClient[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<ServerStats>({ total_clients: 0, total_purchases: 0, expired_some: 0, expired_all: 0, expiring_30d: 0 });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  
  // Sorting state
  type SortField = 'name' | 'purchase_date' | 'packs' | 'expires_at';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('purchase_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Expired clients modal state
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [expiredViewMode, setExpiredViewMode] = useState<'some' | 'all'>('some');
  const [expiredClients, setExpiredClients] = useState<ServerClient[]>([]);
  const [isLoadingExpired, setIsLoadingExpired] = useState(false);
  
  // Add/Edit dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<GroupedClient | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    email: "",
    name: "",
    phone: "",
    packAccesses: []
  });

  // Debounce ref
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    fetchPacks();
    fetchClients();
  };

  const fetchPacks = async () => {
    const { data } = await supabase
      .from('artes_packs')
      .select('id, name, slug, type')
      .order('display_order');
    
    setPacks(data || []);
  };

  const fetchClients = useCallback(async (
    search?: string,
    packFilter?: string,
    statusFilter?: string,
    page?: number,
    sort?: SortField,
    dir?: SortDirection
  ) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('admin_search_pack_clients', {
        p_search: search ?? searchTerm,
        p_pack_filter: packFilter ?? filterPack,
        p_status_filter: statusFilter ?? filterStatus,
        p_sort_field: sort ?? sortField,
        p_sort_direction: dir ?? sortDirection,
        p_page: page ?? currentPage,
        p_page_size: ITEMS_PER_PAGE,
      });

      if (error) {
        console.error('Error fetching clients:', error);
        toast.error("Erro ao buscar clientes");
        return;
      }

      const result = data as unknown as ServerResponse;
      setClients(result.clients || []);
      setTotalCount(result.total_count || 0);
      if (result.stats) setStats(result.stats);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, filterPack, filterStatus, sortField, sortDirection, currentPage]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchClients(value, filterPack, filterStatus, 1, sortField, sortDirection);
    }, 400);
  };

  // Filter changes
  useEffect(() => {
    if (!isAdmin) return;
    setCurrentPage(1);
    fetchClients(searchTerm, filterPack, filterStatus, 1, sortField, sortDirection);
  }, [filterPack, filterStatus]);

  // Page / sort changes
  useEffect(() => {
    if (!isAdmin) return;
    fetchClients(searchTerm, filterPack, filterStatus, currentPage, sortField, sortDirection);
  }, [currentPage, sortField, sortDirection]);

  // Fetch expired clients for modal
  const fetchExpiredClients = async (mode: 'some' | 'all') => {
    setIsLoadingExpired(true);
    try {
      // Use status filter to find expired
      const { data, error } = await supabase.rpc('admin_search_pack_clients', {
        p_search: '',
        p_pack_filter: 'all',
        p_status_filter: 'all',
        p_sort_field: 'expires_at',
        p_sort_direction: 'asc',
        p_page: 1,
        p_page_size: 200,
      });
      if (!error && data) {
        const result = data as unknown as ServerResponse;
        const now = new Date();
        const filtered = (result.clients || []).filter(c => {
          if (mode === 'all') {
            return c.purchases.length > 0 && c.purchases.every(p => p.expires_at && new Date(p.expires_at) < now);
          }
          return c.purchases.some(p => p.expires_at && new Date(p.expires_at) < now);
        });
        setExpiredClients(filtered);
      }
    } finally {
      setIsLoadingExpired(false);
    }
  };

  useEffect(() => {
    if (showExpiredModal) {
      fetchExpiredClients(expiredViewMode);
    }
  }, [showExpiredModal, expiredViewMode]);

  const calculateExpiresAt = (accessType: '3_meses' | '6_meses' | '1_ano' | 'vitalicio', baseDate?: Date): string | null => {
    const startDate = baseDate || new Date();
    switch (accessType) {
      case '3_meses':
        return addMonths(startDate, 3).toISOString();
      case '6_meses':
        return addMonths(startDate, 6).toISOString();
      case '1_ano':
        return addYears(startDate, 1).toISOString();
      case 'vitalicio':
        return null;
    }
  };

  const addPackAccess = () => {
    console.log('[AdminPackPurchases] addPackAccess clicked', {
      packsLoaded: packs.length,
      currentAccesses: formData.packAccesses.length,
    });
    if (!packs || packs.length === 0) {
      toast.error("Packs ainda não carregaram. Aguarde 1 segundo e tente novamente.");
      fetchPacks();
      return;
    }
    const availablePacks = packs.filter(
      (p) => !formData.packAccesses.some((pa) => pa.pack_slug === p.slug)
    );
    if (availablePacks.length === 0) {
      toast.error("Todos os packs já foram adicionados a este cliente");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      packAccesses: [
        ...prev.packAccesses,
        {
          pack_slug: availablePacks[0].slug,
          access_type: 'vitalicio',
          is_active: true,
        },
      ],
    }));
    toast.success(`Pack "${availablePacks[0].name}" adicionado. Configure abaixo.`);
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

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      if (editingClient) {
        const userId = editingClient.user_id;
        const existingIds = editingClient.purchases.map(p => p.id);
        const formAccessIds = formData.packAccesses.filter(pa => pa.id).map(pa => pa.id);
        const toDelete = existingIds.filter(id => !formAccessIds.includes(id));
        if (toDelete.length > 0) {
          await supabase.from('user_pack_purchases').delete().in('id', toDelete);
        }

        for (const access of formData.packAccesses) {
          const hasBonus = access.access_type === '1_ano' || access.access_type === 'vitalicio';
          if (access.id) {
            const originalPurchase = editingClient.purchases.find(p => p.id === access.id);
            let expiresAt;
            if (originalPurchase) {
              if (originalPurchase.access_type === access.access_type) {
                expiresAt = originalPurchase.expires_at;
              } else {
                const purchaseDate = new Date(originalPurchase.purchased_at);
                expiresAt = calculateExpiresAt(access.access_type, purchaseDate);
              }
            } else {
              expiresAt = calculateExpiresAt(access.access_type);
            }
            await supabase.from('user_pack_purchases').update({
              pack_slug: access.pack_slug,
              access_type: access.access_type,
              has_bonus_access: hasBonus,
              is_active: access.is_active,
              expires_at: expiresAt
            }).eq('id', access.id);
          } else {
            const expiresAt = calculateExpiresAt(access.access_type);
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
        toast.success("Cliente atualizado com sucesso!");
      } else {
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
      fetchClients(searchTerm, filterPack, filterStatus, currentPage, sortField, sortDirection);
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error("Erro ao salvar cliente");
    }
  };

  const handleDeletePurchase = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este acesso?")) return;
    const { error } = await supabase.from('user_pack_purchases').delete().eq('id', id);
    if (error) { toast.error("Erro ao remover: " + error.message); return; }
    toast.success("Acesso removido!");
    fetchClients(searchTerm, filterPack, filterStatus, currentPage, sortField, sortDirection);
  };

  const handleDeleteClient = async (client: GroupedClient) => {
    if (!confirm(`Tem certeza que deseja EXCLUIR COMPLETAMENTE o cliente "${client.user_email}"? Isso irá remover todos os acessos, perfil e conta de login.`)) return;

    // Optimistic UI
    setClients(prev => prev.filter(c => c.user_id !== client.user_id));
    toast.success("Cliente excluído!");

    try {
      const purchaseIds = client.purchases.map(p => p.id);
      if (purchaseIds.length > 0) await supabase.from('user_pack_purchases').delete().in('id', purchaseIds);
      await supabase.from('profiles').delete().eq('id', client.user_id);
      await supabase.from('premium_artes_users').delete().eq('user_id', client.user_id);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetch(
          `https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/delete-auth-user-artes`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ user_id: client.user_id })
          }
        );
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      fetchClients(searchTerm, filterPack, filterStatus, currentPage, sortField, sortDirection);
      toast.error("Erro ao excluir cliente");
    }
  };

  const handleResetFirstPassword = async () => {
    if (!editingClient) return;
    const confirmed = window.confirm(`Tem certeza que deseja redefinir a senha de ${editingClient.user_email} para a senha inicial (email)?`);
    if (!confirmed) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Sessão expirada."); return; }
      
      const response = await fetch(
        `https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/update-user-password-artes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ user_id: editingClient.user_id, new_password: editingClient.user_email })
        }
      );
      const result = await response.json();
      if (!response.ok) { toast.error("Erro ao redefinir senha: " + result.error); return; }
      
      await supabase.from('profiles').update({ password_changed: false }).eq('id', editingClient.user_id);
      toast.success("Senha redefinida! Cliente precisará alterar no próximo login.");
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error("Erro ao redefinir senha");
    }
  };

  const resetForm = () => {
    setFormData({ email: "", name: "", phone: "", packAccesses: [] });
    setEditingClient(null);
  };

  const openEditDialog = (client: ServerClient) => {
    const gc: GroupedClient = {
      user_id: client.user_id,
      user_email: client.user_email || '',
      user_name: client.user_name || '',
      user_phone: client.user_phone || '',
      purchases: client.purchases || []
    };
    setEditingClient(gc);
    setFormData({
      email: gc.user_email,
      name: gc.user_name,
      phone: gc.user_phone,
      packAccesses: (client.purchases || []).map(p => ({
        pack_slug: p.pack_slug,
        access_type: p.access_type,
        is_active: p.is_active,
        id: p.id,
        purchased_at: p.purchased_at,
        expires_at: p.expires_at,
        product_name: p.product_name
      }))
    });
    setShowAddDialog(true);
  };

  const openWhatsApp = (phone: string) => {
    if (!phone) { toast.error("Telefone não cadastrado"); return; }
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

  // Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
      <div className="container max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin-artes-eventos/ferramentas')} className="px-2 sm:px-4">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <div className="flex-1">
              <h1 className="text-xl sm:text-3xl font-bold text-foreground">Gerenciar Clientes</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Cadastre e gerencie acessos aos packs</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="sm:hidden"
              onClick={() => fetchClients(searchTerm, filterPack, filterStatus, currentPage, sortField, sortDirection)}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            className="hidden sm:flex"
            onClick={() => fetchClients(searchTerm, filterPack, filterStatus, currentPage, sortField, sortDirection)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Card className="p-2 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.total_clients}</p>
              </div>
            </div>
          </Card>
          <Card className="p-2 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-green-500/10 rounded-lg">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Total Compras</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.total_purchases}</p>
              </div>
            </div>
          </Card>
          <Card 
            className="p-2 sm:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setShowExpiredModal(true)}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-red-500/10 rounded-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-sm text-muted-foreground">Packs Vencidos</p>
                <div className="flex items-center gap-2 sm:gap-4">
                  <div>
                    <p className="text-base sm:text-xl font-bold text-amber-600">{stats.expired_some}</p>
                    <p className="text-[8px] sm:text-xs text-muted-foreground">algum</p>
                  </div>
                  <div>
                    <p className="text-base sm:text-xl font-bold text-red-400">{stats.expired_all}</p>
                    <p className="text-[8px] sm:text-xs text-muted-foreground">todos</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-2 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Expira 30 dias</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.expiring_30d}</p>
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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
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
            onClick={() => navigate('/admin-import-clients')}
            className="border-primary text-primary hover:bg-primary/10"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-foreground">
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

                {editingClient && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-amber-400">Redefinir senha do cliente</p>
                        <p className="text-xs text-muted-foreground">
                          A senha será redefinida para o email e exigirá mudança no próximo login.
                        </p>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={handleResetFirstPassword}
                        className="text-amber-400 border-amber-500/50 hover:bg-amber-500/20"
                      >
                        <KeyRound className="h-3 w-3 mr-1" />
                        Redefinir Primeira Senha
                      </Button>
                    </div>
                  </div>
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
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                                    {access.pack_slug
                                      ? packs.find((pack) => pack.slug === access.pack_slug)?.name || access.pack_slug
                                      : "Selecione um pack..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Buscar pack..." />
                                    <CommandList>
                                      <CommandEmpty>Nenhum pack encontrado.</CommandEmpty>
                                      <CommandGroup>
                                        {packs
                                          .filter(pack => !formData.packAccesses.some((pa, i) => i !== index && pa.pack_slug === pack.slug))
                                          .map((pack) => (
                                            <CommandItem
                                              key={pack.id}
                                              value={pack.name}
                                              onSelect={() => updatePackAccess(index, 'pack_slug', pack.slug)}
                                            >
                                              <Check className={cn("mr-2 h-4 w-4", access.pack_slug === pack.slug ? "opacity-100" : "opacity-0")} />
                                              {pack.name}
                                            </CommandItem>
                                          ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Tipo de Acesso</Label>
                              <Select 
                                value={access.access_type} 
                                onValueChange={(v: '3_meses' | '6_meses' | '1_ano' | 'vitalicio') => updatePackAccess(index, 'access_type', v)}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
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
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Ativo</SelectItem>
                                  <SelectItem value="inactive">Inativo</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {access.id && access.purchased_at && (
                            <div className="space-y-2">
                              {access.product_name && (
                                <div className="text-xs text-muted-foreground bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-1">
                                  <span className="font-medium text-blue-400">Produto:</span> {access.product_name}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>Compra: {format(new Date(access.purchased_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {access.access_type === 'vitalicio' ? (
                                    <Badge variant="outline" className="text-xs bg-accent0/10 text-muted-foreground border-border">
                                      Acesso Vitalício
                                    </Badge>
                                  ) : access.expires_at ? (
                                    <>
                                      <span>Expira: </span>
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${
                                          new Date(access.expires_at) < new Date() 
                                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                            : new Date(access.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                            : 'bg-green-500/10 text-green-400 border-green-500/30'
                                        }`}
                                      >
                                        {format(new Date(access.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                                      </Badge>
                                    </>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">Sem data de expiração</Badge>
                                  )}
                                </div>
                              </div>
                              
                              {access.access_type !== 'vitalicio' && access.expires_at && new Date(access.expires_at) < new Date() && (
                                <div className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-red-500 text-foreground text-xs">ACESSO EXPIRADO</Badge>
                                    <span className="text-xs text-red-400">
                                      Expirou em {format(new Date(access.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                  </div>
                                  <Button 
                                    type="button" size="sm" 
                                    className="bg-green-600 hover:bg-green-700 text-foreground text-xs"
                                    onClick={() => {
                                      const packName = packs.find(p => p.slug === access.pack_slug)?.name || access.pack_slug;
                                      const whatsappMessage = encodeURIComponent(`Olá! Gostaria de renovar meu acesso ao ${packName} com desconto especial.`);
                                      window.open(`https://api.whatsapp.com/send/?phone=&text=${whatsappMessage}&type=phone_number&app_absent=0`, '_blank');
                                    }}
                                  >
                                    Renovar com Desconto
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <Button 
                          type="button" variant="ghost" size="icon"
                          onClick={() => removePackAccess(index)}
                          className="text-red-500 hover:text-red-400"
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
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] sticky left-0 bg-background z-10">Ações</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none w-[180px]"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">Cliente{getSortIcon('name')}</div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none w-[280px]"
                    onClick={() => handleSort('packs')}
                  >
                    <div className="flex items-center">Packs{getSortIcon('packs')}</div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none w-[100px]"
                    onClick={() => handleSort('purchase_date')}
                  >
                    <div className="flex items-center">Compra{getSortIcon('purchase_date')}</div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none w-[100px]"
                    onClick={() => handleSort('expires_at')}
                  >
                    <div className="flex items-center">Vence{getSortIcon('expires_at')}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.user_id}>
                    <TableCell className="sticky left-0 bg-background z-10">
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openWhatsApp(client.user_phone)} title="WhatsApp">
                          <MessageCircle className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(client)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400" onClick={() => handleDeleteClient({
                          user_id: client.user_id,
                          user_email: client.user_email,
                          user_name: client.user_name,
                          user_phone: client.user_phone,
                          purchases: client.purchases || []
                        })} title="Excluir cliente">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{client.user_name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{client.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {client.pack_count === 0 ? (
                          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">Sem packs</Badge>
                        ) : (
                          (client.purchases || []).map((purchase) => (
                            <Badge 
                              key={purchase.id} 
                              variant="outline"
                              className={`text-xs ${!purchase.is_active ? 'opacity-50 line-through' : ''}`}
                            >
                              {getPackName(purchase.pack_slug)} ({getAccessTypeLabel(purchase.access_type)})
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.latest_purchase ? (
                        <span className="text-xs">{format(new Date(client.latest_purchase), "dd/MM/yy", { locale: ptBR })}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.has_vitalicio ? (
                        <Badge variant="outline" className="bg-accent0/10 text-muted-foreground border-border text-xs">Vitalício</Badge>
                      ) : client.earliest_expiration ? (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            new Date(client.earliest_expiration) < new Date() 
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : new Date(client.earliest_expiration) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                              : 'bg-green-500/10 text-green-400 border-green-500/30'
                          }`}
                        >
                          {format(new Date(client.earliest_expiration), "dd/MM/yy", { locale: ptBR })}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {clients.length === 0 && !isSearching && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                )}
                {isSearching && clients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 border-t">
              <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 text-xs"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  Ant
                </Button>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, index, arr) => (
                      <span key={page} className="flex items-center">
                        {index > 0 && arr[index - 1] !== page - 1 && (
                          <span className="px-1 text-muted-foreground text-xs">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-7 h-7 sm:w-8 sm:h-8 p-0 text-xs"
                        >
                          {page}
                        </Button>
                      </span>
                    ))
                  }
                </div>
                <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 text-xs"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Próx
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Expired Clients Modal */}
        <Dialog open={showExpiredModal} onOpenChange={setShowExpiredModal}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Clientes com Packs Vencidos</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4 mt-2 flex-1 overflow-hidden flex flex-col">
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <Button 
                  variant={expiredViewMode === 'some' ? 'default' : 'outline'}
                  onClick={() => setExpiredViewMode('some')}
                  size="sm" className="text-xs sm:text-sm h-8"
                >Algum vencido</Button>
                <Button 
                  variant={expiredViewMode === 'all' ? 'default' : 'outline'}
                  onClick={() => setExpiredViewMode('all')}
                  size="sm" className="text-xs sm:text-sm h-8"
                >Todos vencidos</Button>
              </div>
              
              <div className="overflow-auto flex-1">
                {isLoadingExpired ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table className="min-w-[500px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[70px] sticky left-0 bg-background z-10">Ações</TableHead>
                        <TableHead className="w-[180px]">Cliente</TableHead>
                        <TableHead>Packs Vencidos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiredClients.map(client => {
                        const now = new Date();
                        const expiredPacks = (client.purchases || []).filter(p => p.expires_at && new Date(p.expires_at) < now);
                        return (
                          <TableRow key={client.user_id}>
                            <TableCell className="sticky left-0 bg-background z-10">
                              <div className="flex gap-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openWhatsApp(client.user_phone)} title="WhatsApp">
                                  <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowExpiredModal(false); openEditDialog(client); }} title="Editar">
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-xs">{client.user_name || 'Sem nome'}</p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{client.user_email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {expiredPacks.map(p => (
                                  <Badge key={p.id} variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">
                                    {getPackName(p.pack_slug)} - {p.expires_at ? format(new Date(p.expires_at), "dd/MM/yy", { locale: ptBR }) : ''}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {expiredClients.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-sm text-muted-foreground">
                            Nenhum cliente com packs vencidos
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminPackPurchases;
