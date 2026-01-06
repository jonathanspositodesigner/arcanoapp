import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Zap, Clock, AlertCircle, CheckCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type TimeFilter = "10min" | "1day" | "3days";

interface EdgeLogResponse {
  success: boolean;
  data: {
    functions: Array<{
      function_name: string;
      total_calls: number;
      success_count: number;
      error_count: number;
    }>;
    total_calls: number;
    total_success: number;
    total_errors: number;
    recent_logs: Array<{
      function_name: string;
      status: number | string;
      timestamp: string;
      method?: string;
      execution_time?: number;
    }>;
    source: string;
    note?: string;
  };
  timeFilter: string;
  startTime: string;
}

const EdgeFunctionLogs = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("1day");

  const { data: response, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["edge-logs", timeFilter],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<EdgeLogResponse>('get-edge-logs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: null,
      });
      
      // Build URL with query param since invoke doesn't support query params well
      const projectUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const res = await fetch(`${projectUrl}/functions/v1/get-edge-logs?timeFilter=${timeFilter}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch edge logs: ${res.status}`);
      }
      
      return await res.json() as EdgeLogResponse;
    },
    refetchInterval: false,
  });

  const timeFilters: { value: TimeFilter; label: string }[] = [
    { value: "10min", label: "10 minutos" },
    { value: "1day", label: "1 dia" },
    { value: "3days", label: "3 dias" },
  ];

  const stats = response?.data || { 
    functions: [], 
    total_calls: 0, 
    total_success: 0, 
    total_errors: 0, 
    recent_logs: [],
    source: 'unknown'
  };

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

      {/* Source Info */}
      {response?.data?.note && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <Info className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">{response.data.note}</p>
        </div>
      )}

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
                <p className="text-2xl font-bold">{stats.total_calls}</p>
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
                <p className="text-2xl font-bold text-green-600">{stats.total_success}</p>
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
                <p className="text-2xl font-bold text-red-600">{stats.total_errors}</p>
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
                  {stats.total_calls > 0 ? Math.round((stats.total_success / stats.total_calls) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Function */}
      {stats.functions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Função/Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.functions.map((fn) => (
                <Badge key={fn.function_name} variant="secondary" className="text-sm px-3 py-1">
                  {fn.function_name}: {fn.total_calls} 
                  {fn.error_count > 0 && <span className="text-red-500 ml-1">({fn.error_count} erros)</span>}
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
          ) : stats.recent_logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum log encontrado no período selecionado
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stats.recent_logs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        (typeof log.status === 'number' && log.status >= 200 && log.status < 400) || 
                        log.status === 'success' 
                          ? "default" 
                          : "destructive"
                      }
                      className="text-xs min-w-[50px] justify-center"
                    >
                      {log.status}
                    </Badge>
                    {log.method && (
                      <Badge variant="outline" className="text-xs">
                        {log.method}
                      </Badge>
                    )}
                    <span className="text-sm font-medium">{log.function_name}</span>
                    {log.execution_time !== undefined && (
                      <span className="text-xs text-muted-foreground">{log.execution_time}ms</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {log.timestamp ? format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR }) : "N/A"}
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
