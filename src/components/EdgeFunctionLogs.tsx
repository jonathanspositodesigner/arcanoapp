import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Zap, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type TimeFilter = "10min" | "1day" | "3days";

interface EdgeLog {
  id: string;
  timestamp: string;
  function_id: string;
  execution_time_ms: number;
  status_code: number;
  method: string;
}

const EdgeFunctionLogs = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("1day");

  const getTimeRange = () => {
    const now = new Date();
    switch (timeFilter) {
      case "10min":
        return new Date(now.getTime() - 10 * 60 * 1000).toISOString();
      case "1day":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case "3days":
        return new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["edge-function-logs", timeFilter],
    queryFn: async () => {
      const startTime = getTimeRange();
      
      // Query the analytics endpoint for edge function logs
      const { data, error } = await supabase.rpc('get_edge_function_stats' as any, {
        start_time: startTime
      });
      
      if (error) {
        // If the function doesn't exist, we'll return empty data
        console.log("Edge function stats not available:", error.message);
        return { logs: [], stats: { total: 0, success: 0, errors: 0, avgTime: 0 } };
      }
      
      return data;
    },
    refetchInterval: false,
  });

  // Calculate stats from webhook_logs as a fallback for function invocation tracking
  const { data: webhookStats } = useQuery({
    queryKey: ["webhook-stats", timeFilter],
    queryFn: async () => {
      const startTime = getTimeRange();
      
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("id, received_at, status, platform")
        .gte("received_at", startTime)
        .order("received_at", { ascending: false });
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const success = data?.filter(l => l.status === "success").length || 0;
      const errors = data?.filter(l => l.status === "error").length || 0;
      
      // Group by platform/function
      const byFunction: Record<string, number> = {};
      data?.forEach(log => {
        const fn = log.platform || "webhook";
        byFunction[fn] = (byFunction[fn] || 0) + 1;
      });
      
      return { total, success, errors, byFunction, logs: data || [] };
    },
  });

  const timeFilters: { value: TimeFilter; label: string }[] = [
    { value: "10min", label: "10 minutos" },
    { value: "1day", label: "1 dia" },
    { value: "3days", label: "3 dias" },
  ];

  const stats = webhookStats || { total: 0, success: 0, errors: 0, byFunction: {}, logs: [] };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Edge Functions</h2>
          <p className="text-muted-foreground">Monitoramento de chamadas às funções</p>
        </div>
        
        <div className="flex items-center gap-2">
          {timeFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={timeFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Chamadas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sucesso</p>
                <p className="text-2xl font-bold text-green-600">{stats.success}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Erros</p>
                <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Function */}
      {Object.keys(stats.byFunction || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Função/Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byFunction).map(([fn, count]) => (
                <Badge key={fn} variant="secondary" className="text-sm px-3 py-1">
                  {fn}: {count as number}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Logs Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando logs...
            </div>
          ) : stats.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum log encontrado no período selecionado
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stats.logs.slice(0, 50).map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={log.status === "success" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {log.status || "N/A"}
                    </Badge>
                    <span className="text-sm font-medium">{log.platform || "webhook"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {log.received_at ? format(new Date(log.received_at), "dd/MM HH:mm:ss", { locale: ptBR }) : "N/A"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EdgeFunctionLogs;
