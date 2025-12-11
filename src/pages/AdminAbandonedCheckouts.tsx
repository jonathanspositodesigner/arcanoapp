import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, MessageCircle, Mail, Check, X, StickyNote, 
  RefreshCw, ChevronLeft, ChevronRight, DollarSign, Users,
  Clock, TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AdminLayout from "@/components/AdminLayout";

interface AbandonedCheckout {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  cpf: string | null;
  product_id: number | null;
  product_name: string | null;
  offer_name: string | null;
  amount: number | null;
  checkout_link: string | null;
  checkout_step: number | null;
  remarketing_status: string;
  contacted_at: string | null;
  notes: string | null;
  abandoned_at: string;
}

const ITEMS_PER_PAGE = 20;

const AdminAbandonedCheckouts = () => {
  const navigate = useNavigate();
  const [checkouts, setCheckouts] = useState<AbandonedCheckout[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    converted: 0,
    potentialValue: 0
  });
  
  // Notes modal
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<AbandonedCheckout | null>(null);
  const [notesText, setNotesText] = useState("");

  const fetchCheckouts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('abandoned_checkouts')
        .select('*', { count: 'exact' })
        .order('abandoned_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('remarketing_status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      setCheckouts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching checkouts:', error);
      toast.error("Erro ao carregar checkouts abandonados");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Total
      const { count: total } = await supabase
        .from('abandoned_checkouts')
        .select('*', { count: 'exact', head: true });

      // Pending
      const { count: pending } = await supabase
        .from('abandoned_checkouts')
        .select('*', { count: 'exact', head: true })
        .eq('remarketing_status', 'pending');

      // Converted
      const { count: converted } = await supabase
        .from('abandoned_checkouts')
        .select('*', { count: 'exact', head: true })
        .eq('remarketing_status', 'converted');

      // Potential value (sum of pending amounts)
      const { data: pendingData } = await supabase
        .from('abandoned_checkouts')
        .select('amount')
        .eq('remarketing_status', 'pending');

      const potentialValue = pendingData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

      setStats({
        total: total || 0,
        pending: pending || 0,
        converted: converted || 0,
        potentialValue
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchCheckouts();
    fetchStats();
  }, [currentPage, statusFilter, searchTerm]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('abandoned_checkouts')
        .update({ 
          remarketing_status: newStatus,
          contacted_at: ['contacted_whatsapp', 'contacted_email', 'converted'].includes(newStatus) 
            ? new Date().toISOString() 
            : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success("Status atualizado");
      fetchCheckouts();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error("Erro ao atualizar status");
    }
  };

  const saveNotes = async () => {
    if (!selectedCheckout) return;
    
    try {
      const { error } = await supabase
        .from('abandoned_checkouts')
        .update({ 
          notes: notesText,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCheckout.id);

      if (error) throw error;
      toast.success("Notas salvas");
      setNotesModalOpen(false);
      fetchCheckouts();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error("Erro ao salvar notas");
    }
  };

  const openWhatsApp = (checkout: AbandonedCheckout) => {
    if (!checkout.phone) {
      toast.error("Este lead não tem telefone cadastrado");
      return;
    }
    
    const name = checkout.name?.split(' ')[0] || 'cliente';
    const product = checkout.product_name || 'nosso produto';
    const message = encodeURIComponent(
      `Olá ${name}! 👋\n\nVi que você se interessou pelo ${product}. Posso te ajudar a finalizar sua compra?`
    );
    
    window.open(`https://api.whatsapp.com/send/?phone=${checkout.phone}&text=${message}`, '_blank');
    updateStatus(checkout.id, 'contacted_whatsapp');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      contacted_whatsapp: "bg-green-500/20 text-green-500 border-green-500/30",
      contacted_email: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      converted: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
      ignored: "bg-gray-500/20 text-gray-500 border-gray-500/30"
    };
    
    const labels: Record<string, string> = {
      pending: "Pendente",
      contacted_whatsapp: "WhatsApp",
      contacted_email: "Email",
      converted: "Convertido",
      ignored: "Ignorado"
    };
    
    return (
      <Badge className={`${styles[status] || styles.pending} border`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getStepBadge = (step: number | null) => {
    if (!step) return null;
    const stepLabels: Record<number, string> = {
      1: "Dados pessoais",
      2: "Endereço",
      3: "Pagamento",
      4: "Revisão",
      5: "Finalização"
    };
    return (
      <Badge variant="outline" className="text-xs">
        Etapa {step}: {stepLabels[step] || 'Desconhecida'}
      </Badge>
    );
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const conversionRate = stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(1) : '0';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Checkouts Abandonados</h1>
            <p className="text-muted-foreground">Gerencie leads para remarketing</p>
          </div>
          <Button onClick={() => { fetchCheckouts(); fetchStats(); }} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-full">
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Abandonados</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-full">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-full">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa Conversão</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-full">
                <DollarSign className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  R$ {stats.potentialValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">Valor Potencial</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
                <TabsTrigger value="contacted_whatsapp">WhatsApp</TabsTrigger>
                <TabsTrigger value="contacted_email">Email</TabsTrigger>
                <TabsTrigger value="converted">Convertidos</TabsTrigger>
                <TabsTrigger value="ignored">Ignorados</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Card>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : checkouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum checkout abandonado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  checkouts.map((checkout) => (
                    <TableRow key={checkout.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{checkout.name || 'Sem nome'}</p>
                          <p className="text-sm text-muted-foreground">{checkout.email}</p>
                          {checkout.phone && (
                            <p className="text-xs text-muted-foreground">{checkout.phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="text-sm truncate">{checkout.product_name || '-'}</p>
                          {checkout.offer_name && checkout.offer_name !== checkout.product_name && (
                            <p className="text-xs text-muted-foreground truncate">{checkout.offer_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {checkout.amount ? (
                          <span className="font-medium">
                            R$ {checkout.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {getStepBadge(checkout.checkout_step)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(checkout.remarketing_status)}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {format(new Date(checkout.abandoned_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openWhatsApp(checkout)}
                            className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => updateStatus(checkout.id, 'converted')}
                            className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                            title="Marcar como convertido"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => updateStatus(checkout.id, 'ignored')}
                            className="h-8 w-8 text-gray-500 hover:text-gray-600 hover:bg-gray-500/10"
                            title="Ignorar"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedCheckout(checkout);
                              setNotesText(checkout.notes || '');
                              setNotesModalOpen(true);
                            }}
                            className="h-8 w-8"
                            title="Adicionar notas"
                          >
                            <StickyNote className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
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
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Notes Modal */}
        <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Notas para {selectedCheckout?.name || selectedCheckout?.email}</DialogTitle>
            </DialogHeader>
            <Textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Adicione observações sobre este lead..."
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNotesModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveNotes}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminAbandonedCheckouts;