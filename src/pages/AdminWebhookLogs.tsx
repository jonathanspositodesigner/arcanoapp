import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Search, RefreshCw, CheckCircle, XCircle, AlertCircle, Clock, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WebhookLog {
  id: string;
  received_at: string;
  platform: string | null;
  email: string | null;
  product_id: number | null;
  status: string | null;
  result: string | null;
  error_message: string | null;
  payload: any;
}

const AdminWebhookLogs = () => {
  const navigate = useNavigate();
  const [searchEmail, setSearchEmail] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [daysFilter, setDaysFilter] = useState("7");

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['webhook-logs', searchEmail, platformFilter, resultFilter, daysFilter],
    queryFn: async () => {
      let query = supabase
        .from('webhook_logs')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(100);

      // Filtro de dias
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(daysFilter));
      query = query.gte('received_at', daysAgo.toISOString());

      // Filtro de email
      if (searchEmail.trim()) {
        query = query.ilike('email', `%${searchEmail.trim()}%`);
      }

      // Filtro de plataforma
      if (platformFilter !== 'all') {
        query = query.eq('platform', platformFilter);
      }

      // Filtro de resultado
      if (resultFilter !== 'all') {
        query = query.eq('result', resultFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WebhookLog[];
    }
  });

  // Stats
  const stats = {
    total: logs?.length || 0,
    success: logs?.filter(l => l.result === 'success').length || 0,
    failed: logs?.filter(l => l.result === 'failed').length || 0,
    blocked: logs?.filter(l => l.result === 'blocked').length || 0,
    received: logs?.filter(l => l.result === 'received').length || 0,
    ignored: logs?.filter(l => l.result === 'ignored').length || 0
  };

  const getResultBadge = (result: string | null) => {
    switch (result) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Sucesso</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Falha</Badge>;
      case 'blocked':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20"><AlertCircle className="w-3 h-3 mr-1" />Bloqueado</Badge>;
      case 'received':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="w-3 h-3 mr-1" />Recebido</Badge>;
      case 'ignored':
        return <Badge className="bg-muted text-muted-foreground"><Clock className="w-3 h-3 mr-1" />Ignorado</Badge>;
      default:
        return <Badge variant="outline">{result || 'N/A'}</Badge>;
    }
  };

  const getPlatformBadge = (platform: string | null) => {
    const colors: Record<string, string> = {
      'hotmart-es': 'bg-purple-500/10 text-purple-500',
      'artes-eventos': 'bg-amber-500/10 text-amber-500',
      'app': 'bg-blue-500/10 text-blue-500',
      'prompts': 'bg-cyan-500/10 text-cyan-500',
      'artes-musicos': 'bg-pink-500/10 text-pink-500',
    };
    return <Badge className={colors[platform || ''] || 'bg-muted text-muted-foreground'}>{platform || 'N/A'}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin-artes-eventos/ferramentas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Logs de Webhook</h1>
            <p className="text-muted-foreground">Histórico de webhooks recebidos (últimos {daysFilter} dias)</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </Card>
          <Card className="p-4 text-center border-green-500/30">
            <div className="text-2xl font-bold text-green-500">{stats.success}</div>
            <div className="text-xs text-muted-foreground">Sucesso</div>
          </Card>
          <Card className="p-4 text-center border-red-500/30">
            <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Falhas</div>
          </Card>
          <Card className="p-4 text-center border-orange-500/30">
            <div className="text-2xl font-bold text-orange-500">{stats.blocked}</div>
            <div className="text-xs text-muted-foreground">Bloqueados</div>
          </Card>
          <Card className="p-4 text-center border-blue-500/30">
            <div className="text-2xl font-bold text-blue-500">{stats.received}</div>
            <div className="text-xs text-muted-foreground">Pendentes</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{stats.ignored}</div>
            <div className="text-xs text-muted-foreground">Ignorados</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas plataformas</SelectItem>
                <SelectItem value="hotmart-es">Hotmart ES</SelectItem>
                <SelectItem value="artes-eventos">Artes Eventos</SelectItem>
                <SelectItem value="app">App</SelectItem>
                <SelectItem value="prompts">Prompts</SelectItem>
                <SelectItem value="artes-musicos">Músicos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="failed">Falha</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
                <SelectItem value="received">Recebido</SelectItem>
                <SelectItem value="ignored">Ignorado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={daysFilter} onValueChange={setDaysFilter}>
              <SelectTrigger className="w-full md:w-[130px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Último dia</SelectItem>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Erro</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum log encontrado
                  </TableCell>
                </TableRow>
              ) : (
                logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {log.received_at ? format(new Date(log.received_at), "dd/MM HH:mm:ss", { locale: ptBR }) : 'N/A'}
                    </TableCell>
                    <TableCell>{getPlatformBadge(log.platform)}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">{log.email || 'N/A'}</TableCell>
                    <TableCell className="text-sm">{log.status || 'N/A'}</TableCell>
                    <TableCell>{getResultBadge(log.result)}</TableCell>
                    <TableCell className="text-xs text-red-500 max-w-[150px] truncate">{log.error_message || '-'}</TableCell>
                    <TableCell>
                      {log.payload && Object.keys(log.payload).length > 0 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>Payload do Webhook</DialogTitle>
                            </DialogHeader>
                            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Info Card */}
        <Card className="p-4 mt-6 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Otimização:</strong> Logs com sucesso têm payload limpo automaticamente para economizar espaço.
            Payload completo é mantido apenas para falhas (debug). Logs mais antigos que 30 dias são removidos automaticamente.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default AdminWebhookLogs;
