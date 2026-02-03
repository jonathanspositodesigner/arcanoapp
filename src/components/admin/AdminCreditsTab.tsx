import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  RefreshCw, Pencil, Coins, ArrowUpDown, ArrowUp, ArrowDown,
  Plus, Minus, UserPlus, Search, User, AlertCircle
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface CreditUser {
  user_id: string;
  email: string;
  name: string;
  monthly_balance: number;
  lifetime_balance: number;
  total_balance: number;
  updated_at: string;
}

interface SearchedUser {
  id: string;
  email: string;
  name: string | null;
}

type SortColumn = 'name' | 'email' | 'monthly_balance' | 'lifetime_balance' | 'total_balance';
type SortDirection = 'asc' | 'desc';
type AddUserModalState = 'idle' | 'searching' | 'found' | 'not_found' | 'submitting';

const ITEMS_PER_PAGE = 20;

const AdminCreditsTab = () => {
  const [creditUsers, setCreditUsers] = useState<CreditUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [sortColumn, setSortColumn] = useState<SortColumn>('total_balance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CreditUser | null>(null);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditDescription, setCreditDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [addUserModalState, setAddUserModalState] = useState<AddUserModalState>('idle');
  const [searchEmail, setSearchEmail] = useState("");
  const [foundUser, setFoundUser] = useState<SearchedUser | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUserAmount, setNewUserAmount] = useState(0);
  const [newUserDescription, setNewUserDescription] = useState("");

  useEffect(() => {
    fetchCreditUsers();
  }, []);

  const fetchCreditUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_credit_users');

      if (error) throw error;

      setCreditUsers(data || []);
    } catch (error) {
      console.error("Error fetching credit users:", error);
      toast.error("Erro ao carregar usuários com créditos");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let filtered = [...creditUsers];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'monthly_balance':
          aValue = a.monthly_balance;
          bValue = b.monthly_balance;
          break;
        case 'lifetime_balance':
          aValue = a.lifetime_balance;
          bValue = b.lifetime_balance;
          break;
        case 'total_balance':
          aValue = a.total_balance;
          bValue = b.total_balance;
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
  }, [creditUsers, searchTerm, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
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

  const openEditModal = (user: CreditUser) => {
    setSelectedUser(user);
    setCreditAmount(0);
    setCreditDescription("");
    setIsEditModalOpen(true);
  };

  const handleCreditAction = async (action: 'add_monthly' | 'remove_monthly' | 'add_lifetime' | 'remove_lifetime') => {
    if (!selectedUser || creditAmount <= 0) {
      toast.error("Digite uma quantidade válida");
      return;
    }

    const description = creditDescription || `Ajuste manual - Admin (${action})`;

    setIsSubmitting(true);
    try {
      let rpcName: string;
      
      switch (action) {
        case 'add_monthly':
          rpcName = 'add_upscaler_credits';
          break;
        case 'remove_monthly':
          rpcName = 'remove_monthly_credits';
          break;
        case 'add_lifetime':
          rpcName = 'add_lifetime_credits';
          break;
        case 'remove_lifetime':
          rpcName = 'remove_lifetime_credits';
          break;
      }

      const { data, error } = await supabase.rpc(rpcName as 'add_upscaler_credits' | 'remove_monthly_credits' | 'add_lifetime_credits' | 'remove_lifetime_credits', {
        _user_id: selectedUser.user_id,
        _amount: creditAmount,
        _description: description
      });

      if (error) throw error;

      const result = data?.[0];
      if (result && !result.success) {
        toast.error(result.error_message || "Erro ao processar créditos");
        return;
      }

      toast.success(`Créditos ${action.includes('add') ? 'adicionados' : 'removidos'} com sucesso!`);
      setIsEditModalOpen(false);
      await fetchCreditUsers();
    } catch (error: unknown) {
      console.error("Error updating credits:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao atualizar créditos";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  // Add User Modal Functions
  const openAddUserModal = () => {
    setSearchEmail("");
    setFoundUser(null);
    setNewUserName("");
    setNewUserAmount(0);
    setNewUserDescription("");
    setAddUserModalState('idle');
    setIsAddUserModalOpen(true);
  };

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) {
      toast.error("Digite um email para buscar");
      return;
    }

    setAddUserModalState('searching');

    try {
      const { data, error } = await supabase.functions.invoke('admin-add-credit-user', {
        body: { action: 'search', email: searchEmail.trim() }
      });

      if (error) throw error;

      if (data.found) {
        setFoundUser(data.user);
        setAddUserModalState('found');
      } else {
        setFoundUser(null);
        setAddUserModalState('not_found');
      }
    } catch (error: unknown) {
      console.error("Error searching user:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao buscar usuário";
      toast.error(errorMessage);
      setAddUserModalState('idle');
    }
  };

  const handleAddCreditsToUser = async (creditType: 'monthly' | 'lifetime') => {
    if (newUserAmount <= 0) {
      toast.error("Digite uma quantidade válida de créditos");
      return;
    }

    setAddUserModalState('submitting');

    try {
      const { data, error } = await supabase.functions.invoke('admin-add-credit-user', {
        body: {
          action: 'add_credits',
          email: searchEmail.trim(),
          name: newUserName.trim() || undefined,
          creditType,
          amount: newUserAmount,
          description: newUserDescription.trim() || undefined
        }
      });

      if (error) throw error;

      if (data.success) {
        const message = data.user_created 
          ? `Usuário criado e ${formatNumber(newUserAmount)} créditos ${creditType === 'monthly' ? 'mensais' : 'vitalícios'} adicionados!`
          : `${formatNumber(newUserAmount)} créditos ${creditType === 'monthly' ? 'mensais' : 'vitalícios'} adicionados!`;
        
        toast.success(message);
        setIsAddUserModalOpen(false);
        await fetchCreditUsers();
      } else {
        toast.error(data.error || "Erro ao adicionar créditos");
        setAddUserModalState(foundUser ? 'found' : 'not_found');
      }
    } catch (error: unknown) {
      console.error("Error adding credits:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao adicionar créditos";
      toast.error(errorMessage);
      setAddUserModalState(foundUser ? 'found' : 'not_found');
    }
  };

  const totalMonthlyCredits = creditUsers.reduce((sum, u) => sum + u.monthly_balance, 0);
  const totalLifetimeCredits = creditUsers.reduce((sum, u) => sum + u.lifetime_balance, 0);
  const totalCredits = totalMonthlyCredits + totalLifetimeCredits;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Coins className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total de Usuários</p>
              <p className="text-2xl font-bold">{creditUsers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Coins className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Créditos Mensais</p>
              <p className="text-2xl font-bold">{formatNumber(totalMonthlyCredits)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Coins className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Créditos Vitalícios</p>
              <p className="text-2xl font-bold">{formatNumber(totalLifetimeCredits)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Coins className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total em Créditos</p>
              <p className="text-2xl font-bold">{formatNumber(totalCredits)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search, Add User, and Refresh */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={openAddUserModal} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Adicionar Novo Usuário
        </Button>
        <Button variant="outline" size="icon" onClick={fetchCreditUsers}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
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
                      Usuário {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort('monthly_balance')}
                  >
                    <div className="flex items-center justify-end">
                      Mensais {getSortIcon('monthly_balance')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort('lifetime_balance')}
                  >
                    <div className="flex items-center justify-end">
                      Vitalícios {getSortIcon('lifetime_balance')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort('total_balance')}
                  >
                    <div className="flex items-center justify-end">
                      Total {getSortIcon('total_balance')}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário com créditos encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-blue-600 font-medium">
                          {formatNumber(user.monthly_balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-purple-600 font-medium">
                          {formatNumber(user.lifetime_balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600 font-bold">
                          {formatNumber(user.total_balance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
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
        Mostrando {paginatedUsers.length} de {filteredUsers.length} usuários
      </p>

      {/* Edit Credits Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Créditos</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedUser.name || 'Sem nome'}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>

              {/* Current Balances */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Mensais</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatNumber(selectedUser.monthly_balance)}
                  </p>
                </div>
                <div className="p-3 border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Vitalícios</p>
                  <p className="text-xl font-bold text-purple-600">
                    {formatNumber(selectedUser.lifetime_balance)}
                  </p>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={0}
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                  placeholder="Ex: 500"
                />
              </div>

              {/* Description */}
              <div>
                <Label>Descrição (opcional)</Label>
                <Input
                  value={creditDescription}
                  onChange={(e) => setCreditDescription(e.target.value)}
                  placeholder="Motivo do ajuste..."
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  onClick={() => handleCreditAction('add_monthly')}
                  disabled={isSubmitting || creditAmount <= 0}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Mensais
                </Button>
                <Button
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50"
                  onClick={() => handleCreditAction('remove_monthly')}
                  disabled={isSubmitting || creditAmount <= 0}
                >
                  <Minus className="h-4 w-4 mr-1" />
                  Mensais
                </Button>
                <Button
                  variant="outline"
                  className="border-purple-500 text-purple-600 hover:bg-purple-50"
                  onClick={() => handleCreditAction('add_lifetime')}
                  disabled={isSubmitting || creditAmount <= 0}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Vitalícios
                </Button>
                <Button
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  onClick={() => handleCreditAction('remove_lifetime')}
                  disabled={isSubmitting || creditAmount <= 0}
                >
                  <Minus className="h-4 w-4 mr-1" />
                  Vitalícios
                </Button>
              </div>

              {isSubmitting && (
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                  <span>Processando...</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Adicionar Créditos a Usuário
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Email Search */}
            <div className="space-y-2">
              <Label>Email do Usuário</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="usuario@email.com"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  disabled={addUserModalState === 'searching' || addUserModalState === 'submitting'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && addUserModalState === 'idle') {
                      handleSearchUser();
                    }
                  }}
                />
                <Button
                  onClick={handleSearchUser}
                  disabled={addUserModalState === 'searching' || addUserModalState === 'submitting' || !searchEmail.trim()}
                >
                  {addUserModalState === 'searching' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* User Found */}
            {addUserModalState === 'found' && foundUser && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Usuário encontrado!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {foundUser.name || 'Sem nome'} • {foundUser.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* User Not Found */}
            {addUserModalState === 'not_found' && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Usuário não encontrado
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Um novo usuário será criado automaticamente
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Credit Form (show when found or not_found) */}
            {(addUserModalState === 'found' || addUserModalState === 'not_found' || addUserModalState === 'submitting') && (
              <>
                {/* Name (only for new users) */}
                {(addUserModalState === 'not_found' || (addUserModalState === 'submitting' && !foundUser)) && (
                  <div>
                    <Label>Nome do Usuário (opcional)</Label>
                    <Input
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Nome completo"
                      disabled={addUserModalState === 'submitting'}
                    />
                  </div>
                )}

                {/* Credit Amount */}
                <div>
                  <Label>Quantidade de Créditos</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newUserAmount}
                    onChange={(e) => setNewUserAmount(parseInt(e.target.value) || 0)}
                    placeholder="Ex: 1500"
                    disabled={addUserModalState === 'submitting'}
                  />
                </div>

                {/* Description */}
                <div>
                  <Label>Descrição (opcional)</Label>
                  <Input
                    value={newUserDescription}
                    onChange={(e) => setNewUserDescription(e.target.value)}
                    placeholder="Motivo do crédito..."
                    disabled={addUserModalState === 'submitting'}
                  />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleAddCreditsToUser('monthly')}
                    disabled={addUserModalState === 'submitting' || newUserAmount <= 0}
                  >
                    {addUserModalState === 'submitting' ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Mensais
                  </Button>
                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => handleAddCreditsToUser('lifetime')}
                    disabled={addUserModalState === 'submitting' || newUserAmount <= 0}
                  >
                    {addUserModalState === 'submitting' ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Vitalícios
                  </Button>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserModalOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCreditsTab;
