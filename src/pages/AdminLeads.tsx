import { useEffect, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Search, Trash2, MessageCircle, Package, ArrowUpDown, ArrowUp, ArrowDown, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addMonths, addYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import AdminLayout from "@/components/AdminLayout";

interface Lead {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  created_at: string;
}

interface Pack {
  id: string;
  name: string;
  slug: string;
}

interface PackAccess {
  pack_slug: string;
  access_type: '3_meses' | '6_meses' | '1_ano' | 'vitalicio';
}

const AdminLeads = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  
  // Sorting state
  type SortField = 'name' | 'email' | 'created_at';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Add Pack dialog state
  const [showAddPackDialog, setShowAddPackDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [packAccesses, setPackAccesses] = useState<PackAccess[]>([]);

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
    fetchLeads();
    fetchPacks();
  };

  const fetchPacks = async () => {
    const { data } = await supabase
      .from('artes_packs')
      .select('id, name, slug')
      .order('display_order');
    
    setPacks(data || []);
  };

  const fetchLeads = async () => {
    // Get all user IDs that have pack purchases
    let allPurchaseUserIds: string[] = [];
    let from = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: purchasesData } = await supabase
        .from('user_pack_purchases')
        .select('user_id')
        .range(from, from + pageSize - 1);

      if (!purchasesData || purchasesData.length === 0) break;
      
      allPurchaseUserIds = [...allPurchaseUserIds, ...purchasesData.map(p => p.user_id)];
      
      if (purchasesData.length < pageSize) break;
      from += pageSize;
    }

    const uniquePurchaseUserIds = [...new Set(allPurchaseUserIds)];

    // Fetch ALL profiles using pagination
    let allProfiles: any[] = [];
    from = 0;
    
    while (true) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, name, phone, created_at')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (!profilesData || profilesData.length === 0) break;
      
      allProfiles = [...allProfiles, ...profilesData];
      
      if (profilesData.length < pageSize) break;
      from += pageSize;
    }

    // Filter to only leads (profiles WITHOUT pack purchases)
    const leadsOnly = allProfiles.filter(
      profile => !uniquePurchaseUserIds.includes(profile.id)
    );

    setLeads(leadsOnly);
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
    const availablePacks = packs.filter(p => !packAccesses.some(pa => pa.pack_slug === p.slug));
    if (availablePacks.length === 0) {
      toast.error("Todos os packs já foram adicionados");
      return;
    }
    setPackAccesses([...packAccesses, {
      pack_slug: availablePacks[0].slug,
      access_type: 'vitalicio'
    }]);
  };

  const removePackAccess = (index: number) => {
    const newAccesses = [...packAccesses];
    newAccesses.splice(index, 1);
    setPackAccesses(newAccesses);
  };

  const updatePackAccess = (index: number, field: keyof PackAccess, value: any) => {
    const newAccesses = [...packAccesses];
    newAccesses[index] = { ...newAccesses[index], [field]: value };
    setPackAccesses(newAccesses);
  };

  const handleAddPacks = async () => {
    if (!selectedLead) return;

    if (packAccesses.length === 0) {
      toast.error("Adicione pelo menos um pack");
      return;
    }

    try {
      // Insert pack purchases for this lead
      for (const access of packAccesses) {
        const hasBonus = access.access_type === '1_ano' || access.access_type === 'vitalicio';
        const expiresAt = calculateExpiresAt(access.access_type);

        const { error } = await supabase.from('user_pack_purchases').insert({
          user_id: selectedLead.id,
          pack_slug: access.pack_slug,
          access_type: access.access_type,
          has_bonus_access: hasBonus,
          is_active: true,
          expires_at: expiresAt
        });

        if (error) {
          console.error('Error inserting pack:', error);
          toast.error(`Erro ao adicionar pack: ${error.message}`);
          return;
        }
      }

      toast.success("Packs adicionados! Lead agora é cliente.");
      setShowAddPackDialog(false);
      setSelectedLead(null);
      setPackAccesses([]);
      fetchLeads(); // Refresh - lead should disappear from list
    } catch (error) {
      console.error('Error adding packs:', error);
      toast.error("Erro ao adicionar packs");
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (!confirm(`Tem certeza que deseja EXCLUIR o lead "${lead.email}"? Isso removerá o perfil e a conta de login.`)) return;

    // Optimistic UI
    const previousLeads = [...leads];
    setLeads(prev => prev.filter(l => l.id !== lead.id));
    toast.success("Lead excluído!");

    try {
      // Delete profile
      await supabase.from('profiles').delete().eq('id', lead.id);

      // Delete user from Auth via edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetch(
          `https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/delete-auth-user-artes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ user_id: lead.id })
          }
        );
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      setLeads(previousLeads);
      toast.error("Erro ao excluir lead");
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://api.whatsapp.com/send/?phone=${cleanPhone}&text&type=phone_number&app_absent=0`, '_blank');
  };

  // Filtering
  const filteredLeads = leads.filter(lead => {
    const searchLower = searchTerm.toLowerCase();
    return (
      lead.email?.toLowerCase().includes(searchLower) ||
      lead.name?.toLowerCase().includes(searchLower) ||
      lead.phone?.toLowerCase().includes(searchLower)
    );
  });

  // Sorting
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'email':
        aValue = a.email || '';
        bValue = b.email || '';
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      default:
        aValue = '';
        bValue = '';
    }

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = sortedLeads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p>Carregando...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin-hub')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Leads</h1>
            <p className="text-muted-foreground">Usuários que criaram conta mas não compraram nenhum pack</p>
          </div>
        </div>

        {/* Stats */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full">
              <UserPlus className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{leads.length}</p>
              <p className="text-muted-foreground">Leads cadastrados sem compras</p>
            </div>
          </div>
        </Card>

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email, nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center">
                    Email {getSortIcon('email')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Nome {getSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    Cadastrado em {getSortIcon('created_at')}
                  </div>
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.email}</TableCell>
                  <TableCell>{lead.name || '-'}</TableCell>
                  <TableCell>{lead.phone || '-'}</TableCell>
                  <TableCell>
                    {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {lead.phone && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openWhatsApp(lead.phone!)}
                          title="Contatar via WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedLead(lead);
                          setPackAccesses([]);
                          setShowAddPackDialog(true);
                        }}
                        title="Adicionar Pack"
                      >
                        <Package className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteLead(lead)}
                        title="Excluir Lead"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "Nenhum lead encontrado" : "Nenhum lead cadastrado"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
          </div>
        )}

        {/* Add Pack Dialog */}
        <Dialog open={showAddPackDialog} onOpenChange={setShowAddPackDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Packs ao Lead</DialogTitle>
            </DialogHeader>
            
            {selectedLead && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{selectedLead.email}</p>
                  {selectedLead.name && <p className="text-xs text-muted-foreground">{selectedLead.name}</p>}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Packs</Label>
                    <Button variant="outline" size="sm" onClick={addPackAccess}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Pack
                    </Button>
                  </div>

                  {packAccesses.map((access, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                            >
                              {packs.find(p => p.slug === access.pack_slug)?.name || "Selecione..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Buscar pack..." />
                              <CommandList>
                                <CommandEmpty>Nenhum pack encontrado.</CommandEmpty>
                                <CommandGroup>
                                  {packs
                                    .filter(p => !packAccesses.some((pa, i) => i !== index && pa.pack_slug === p.slug))
                                    .map((pack) => (
                                      <CommandItem
                                        key={pack.id}
                                        onSelect={() => updatePackAccess(index, 'pack_slug', pack.slug)}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            access.pack_slug === pack.slug ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {pack.name}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        <Select
                          value={access.access_type}
                          onValueChange={(v) => updatePackAccess(index, 'access_type', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3_meses">3 Meses</SelectItem>
                            <SelectItem value="6_meses">6 Meses</SelectItem>
                            <SelectItem value="1_ano">1 Ano</SelectItem>
                            <SelectItem value="vitalicio">Vitalício</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePackAccess(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}

                  {packAccesses.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Clique em "Adicionar Pack" para atribuir packs a este lead
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddPackDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddPacks} disabled={packAccesses.length === 0}>
                    Salvar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminLeads;
