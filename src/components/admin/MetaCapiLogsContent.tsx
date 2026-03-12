import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, CheckCircle2, XCircle, ChevronDown, Activity, ShoppingCart, CreditCard, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CapiLog {
  id: string;
  event_name: string;
  email: string | null;
  value: number | null;
  currency: string | null;
  event_id: string | null;
  fbp: string | null;
  fbc: string | null;
  client_ip_address: string | null;
  client_user_agent: string | null;
  utm_data: Record<string, string> | null;
  event_source_url: string | null;
  meta_response_status: number | null;
  meta_response_body: string | null;
  success: boolean | null;
  created_at: string | null;
}

const MetaCapiLogsContent = () => {
  const [logs, setLogs] = useState<CapiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("today");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("meta_capi_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (eventFilter !== "all") {
        query = query.eq("event_name", eventFilter);
      }
      if (statusFilter === "success") {
        query = query.eq("success", true);
      } else if (statusFilter === "error") {
        query = query.eq("success", false);
      }

      const now = new Date();
      if (periodFilter === "today") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte("created_at", start);
      } else if (periodFilter === "7d") {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", start);
      } else if (periodFilter === "30d") {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", start);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data as unknown as CapiLog[]) || []);
    } catch (err) {
      console.error("Error fetching CAPI logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [eventFilter, statusFilter, periodFilter]);

  const todayLogs = logs.filter((l) => {
    const d = new Date(l.created_at || "");
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const totalToday = todayLogs.length;
  const initiateToday = todayLogs.filter((l) => l.event_name === "InitiateCheckout").length;
  const purchaseToday = todayLogs.filter((l) => l.event_name === "Purchase").length;
  const successRate = totalToday > 0 ? Math.round((todayLogs.filter((l) => l.success).length / totalToday) * 100) : 0;
  const matchRate = totalToday > 0 ? Math.round((todayLogs.filter((l) => l.fbp || l.fbc).length / totalToday) * 100) : 0;

  const StatusIcon = ({ ok }: { ok: boolean | null | undefined }) =>
    ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-destructive" />;

  const PresenceBadge = ({ value, label }: { value: string | null | undefined; label: string }) => (
    <Badge variant={value ? "default" : "destructive"} className={`text-[10px] px-1.5 py-0.5 ${value ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
      {label} {value ? "✓" : "✗"}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Pixel / CAPI Monitor</h2>
          <p className="text-sm text-muted-foreground">Monitoramento de eventos Meta Conversions API</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <Activity className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold text-foreground">{totalToday}</p>
          <p className="text-xs text-muted-foreground">Eventos Hoje</p>
        </Card>
        <Card className="p-4 text-center">
          <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-amber-500" />
          <p className="text-2xl font-bold text-foreground">{initiateToday}</p>
          <p className="text-xs text-muted-foreground">InitiateCheckout</p>
        </Card>
        <Card className="p-4 text-center">
          <CreditCard className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
          <p className="text-2xl font-bold text-foreground">{purchaseToday}</p>
          <p className="text-xs text-muted-foreground">Purchase</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-blue-500" />
          <p className="text-2xl font-bold text-foreground">{successRate}%</p>
          <p className="text-xs text-muted-foreground">Taxa Sucesso</p>
        </Card>
        <Card className="p-4 text-center">
          <Activity className="h-5 w-5 mx-auto mb-1 text-violet-500" />
          <p className="text-2xl font-bold text-foreground">{matchRate}%</p>
          <p className="text-xs text-muted-foreground">Match Rate (fbp/fbc)</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os eventos</SelectItem>
            <SelectItem value="InitiateCheckout">InitiateCheckout</SelectItem>
            <SelectItem value="Purchase">Purchase</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="all">Tudo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Data/Hora</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>event_id</TableHead>
                <TableHead>UTMs</TableHead>
                <TableHead className="text-center">Meta</TableHead>
                <TableHead className="text-center">OK</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum evento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <Collapsible key={log.id} asChild>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-accent/50">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {log.created_at ? format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR }) : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={log.event_name === "Purchase" ? "default" : "secondary"}
                              className={log.event_name === "Purchase" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                            >
                              {log.event_name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[160px] truncate">{log.email || "-"}</TableCell>
                          <TableCell className="text-right text-xs font-medium">
                            {log.value ? `R$ ${Number(log.value).toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <PresenceBadge value={log.fbp} label="fbp" />
                              <PresenceBadge value={log.fbc} label="fbc" />
                            </div>
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground max-w-[100px] truncate">
                            {log.event_id || "-"}
                          </TableCell>
                          <TableCell>
                            {log.utm_data && Object.keys(log.utm_data).length > 0 ? (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-[10px]">
                                  {Object.keys(log.utm_data).length} UTMs
                                </Badge>
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {log.meta_response_status || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusIcon ok={log.success} />
                          </TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={9}>
                            <div className="p-3 space-y-2 text-xs">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                  <p className="text-muted-foreground font-medium">fbp</p>
                                  <p className="text-foreground break-all">{log.fbp || "Não capturado"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground font-medium">fbc</p>
                                  <p className="text-foreground break-all">{log.fbc || "Não capturado"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground font-medium">IP</p>
                                  <p className="text-foreground">{log.client_ip_address || "N/A"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground font-medium">User-Agent</p>
                                  <p className="text-foreground truncate max-w-[250px]">{log.client_user_agent || "N/A"}</p>
                                </div>
                              </div>
                              {log.utm_data && Object.keys(log.utm_data).length > 0 && (
                                <div>
                                  <p className="text-muted-foreground font-medium mb-1">UTMs</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(log.utm_data).map(([key, val]) => (
                                      <Badge key={key} variant="outline" className="text-[10px]">
                                        {key}: {String(val)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {log.meta_response_body && (
                                <div>
                                  <p className="text-muted-foreground font-medium">Resposta Meta</p>
                                  <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto max-w-full">
                                    {log.meta_response_body}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default MetaCapiLogsContent;
