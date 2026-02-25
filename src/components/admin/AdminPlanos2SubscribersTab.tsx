import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import {
  Users, Crown, Clock, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw,
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
  cost_multiplier: number;
  greenn_product_id: number | null;
  greenn_contract_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  name?: string;
  email?: string;
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

const AdminPlanos2SubscribersTab = () => {
  const [users, setUsers] = useState<Planos2User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

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
        .select("id, name, email")
        .in("id", userIds);

      const merged = data?.map(sub => {
        const profile = profiles?.find(p => p.id === sub.user_id);
        return {
          ...sub,
          name: profile?.name || '',
          email: profile?.email || '',
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
  }, [users, searchTerm, periodFilter, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, periodFilter, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(column); setSortDirection('asc'); }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Metrics
  const totalUsers = users.length;
  const activePayingUsers = users.filter(u => isEffectivelyActive(u) && u.plan_slug !== 'free').length;
  const expiringUsers = users.filter(u => {
    const days = getDaysUntilExpiry(u.expires_at);
    return days !== null && days <= 7 && days > 0 && isEffectivelyActive(u);
  });
  const inactiveUsers = users.filter(u => !isEffectivelyActive(u)).length;

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

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="icon" onClick={fetchPlanos2Users}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
    </div>
  );
};

export default AdminPlanos2SubscribersTab;
