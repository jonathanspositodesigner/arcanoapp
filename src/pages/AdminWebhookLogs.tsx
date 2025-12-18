import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Search, RefreshCw, CheckCircle, XCircle, AlertTriangle, Ban, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WebhookLog {
  id: string;
  received_at: string;
  payload: any;
  status: string | null;
  product_id: number | null;
  email: string | null;
  result: string | null;
  error_message: string | null;
  mapping_type: string | null;
}

const AdminWebhookLogs = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterResult, setFilterResult] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchLogs();
  }, []);

  const checkAdmin = async () => {
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
    setIsLoading(false);
  };

  const fetchLogs = async () => {
    setIsRefreshing(true);
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(500);

    if (error) {
      toast.error("Erro ao carregar logs");
      setIsRefreshing(false);
      return;
    }

    setLogs(data || []);
    setIsRefreshing(false);
  };

  const getResultBadge = (result: string | null) => {
    switch (result) {
      case 'success':
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" />Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Erro</Badge>;
      case 'blacklisted':
        return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" />Bloqueado</Badge>;
      case 'skipped':
        return <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" />Ignorado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
      case 'approved':
        return <Badge className="bg-green-500">Pago</Badge>;
      case 'refunded':
        return <Badge className="bg-orange-500">Reembolso</Badge>;
      case 'chargeback':
        return <Badge variant="destructive">Chargeback</Badge>;
      case 'canceled':
        return <Badge variant="secondary">Cancelado</Badge>;
      case 'unpaid':
        return <Badge variant="secondary">Não Pago</Badge>;
      default:
        return <Badge variant="outline">{status || 'N/A'}</Badge>;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.product_id?.toString().includes(searchQuery) ||
      log.status?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterResult === 'all' || log.result === filterResult;
    
    return matchesSearch && matchesFilter;
  });

  // Stats
  const last24h = logs.filter(l => {
    const logDate = new Date(l.received_at);
    const now = new Date();
    return (now.getTime() - logDate.getTime()) < 24 * 60 * 60 * 1000;
  });

  const errorCount = last24h.filter(l => l.result === 'error').length;
  const chargebackCount = last24h.filter(l => l.status === 'chargeback' || l.status === 'refunded').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin-artes-eventos/ferramentas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Logs de Webhook</h1>
            <p className="text-muted-foreground">
              Histórico de webhooks recebidos da Greenn
            </p>
          </div>
          <Button onClick={fetchLogs} variant="outline" className="gap-2" disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-primary/10 border-primary/20">
            <p className="text-sm text-muted-foreground">Últimas 24h</p>
            <p className="text-2xl font-bold text-foreground">{last24h.length}</p>
          </Card>
          <Card className="p-4 bg-green-500/10 border-green-500/20">
            <p className="text-sm text-muted-foreground">Sucesso (24h)</p>
            <p className="text-2xl font-bold text-foreground">
              {last24h.filter(l => l.result === 'success').length}
            </p>
          </Card>
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <p className="text-sm text-muted-foreground">Erros (24h)</p>
            <p className="text-2xl font-bold text-foreground">{errorCount}</p>
          </Card>
          <Card className="p-4 bg-orange-500/10 border-orange-500/20">
            <p className="text-sm text-muted-foreground">Reembolsos/Chargebacks (24h)</p>
            <p className="text-2xl font-bold text-foreground">{chargebackCount}</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email, product ID ou status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
            className="p-2 border rounded-md bg-background min-w-[150px]"
          >
            <option value="all">Todos</option>
            <option value="success">Sucesso</option>
            <option value="error">Erro</option>
            <option value="blacklisted">Bloqueado</option>
            <option value="skipped">Ignorado</option>
          </select>
        </div>

        {/* Logs List */}
        <div className="space-y-2">
          {filteredLogs.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhum log encontrado</p>
            </Card>
          ) : (
            filteredLogs.map((log) => (
              <Card 
                key={log.id} 
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedLog(log)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {getResultBadge(log.result)}
                      {getStatusBadge(log.status)}
                      {log.mapping_type && (
                        <Badge variant="outline" className="text-xs">
                          {log.mapping_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-foreground font-medium">{log.email || 'N/A'}</span>
                      {log.product_id && (
                        <span className="text-muted-foreground">ID: {log.product_id}</span>
                      )}
                    </div>
                    {log.error_message && (
                      <p className="text-sm text-destructive mt-1 truncate">{log.error_message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.received_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Webhook</DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Recebido em</p>
                    <p className="font-medium">
                      {format(new Date(selectedLog.received_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Resultado</p>
                    <div className="mt-1">{getResultBadge(selectedLog.result)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedLog.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Product ID</p>
                    <p className="font-medium">{selectedLog.product_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Mapeamento</p>
                    <p className="font-medium">{selectedLog.mapping_type || 'N/A'}</p>
                  </div>
                </div>
                
                {selectedLog.error_message && (
                  <div>
                    <p className="text-sm text-muted-foreground">Erro</p>
                    <p className="text-destructive bg-destructive/10 p-2 rounded text-sm">
                      {selectedLog.error_message}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Payload Completo</p>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminWebhookLogs;
