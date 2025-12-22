import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Zap, 
  Cloud, 
  RefreshCw, 
  Trash2,
  TrendingUp,
  AlertTriangle,
  Timer
} from "lucide-react";
import {
  getMetrics,
  resetMetrics,
  subscribeToMetrics,
  calculateEstimatedCosts,
  type CloudCostMetrics
} from "@/hooks/useCloudCostTracker";

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

const CloudCostRealtime = () => {
  const [metrics, setMetrics] = useState<CloudCostMetrics>(getMetrics());
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;
    
    const unsubscribe = subscribeToMetrics(() => {
      setMetrics(getMetrics());
    });

    // Also refresh periodically
    const interval = setInterval(() => {
      setMetrics(getMetrics());
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isLive]);

  const costs = calculateEstimatedCosts(metrics);
  const sessionDuration = Date.now() - metrics.sessionStart;
  
  // Sort routes by invocations (descending)
  const routeEntries = Object.entries(metrics.byRoute)
    .sort((a, b) => b[1].invocations - a[1].invocations);

  const handleReset = () => {
    if (window.confirm("Resetar todas as métricas de custo? Isso não pode ser desfeito.")) {
      resetMetrics();
      setMetrics(getMetrics());
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Activity className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Monitoramento em Tempo Real</h2>
            <p className="text-sm text-muted-foreground">
              Rastreamento de invocations e bandwidth por rota
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={isLive ? "default" : "secondary"}
            className="gap-1"
          >
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground'}`} />
            {isLive ? 'LIVE' : 'PAUSED'}
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? 'Pausar' : 'Continuar'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleReset}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {metrics.totalInvocations.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Invocations (sessão)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Cloud className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatBytes(metrics.totalBandwidth)}
                </p>
                <p className="text-sm text-muted-foreground">Bandwidth (sessão)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  ${costs.totalCost.toFixed(4)}
                </p>
                <p className="text-sm text-muted-foreground">Custo (sessão)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${costs.projectedMonthlyCost > 10 ? 'from-red-500/10 to-red-600/5 border-red-500/20' : 'from-amber-500/10 to-amber-600/5 border-amber-500/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {costs.projectedMonthlyCost > 10 ? (
                <AlertTriangle className="h-8 w-8 text-red-500" />
              ) : (
                <Timer className="h-8 w-8 text-amber-500" />
              )}
              <div>
                <p className="text-2xl font-bold text-foreground">
                  ${costs.projectedMonthlyCost.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Projeção mensal</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-2">
        <span>Sessão iniciada há {formatDuration(sessionDuration)}</span>
        <span>{routeEntries.length} rotas rastreadas</span>
      </div>

      {/* Per-Route Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Invocations por Rota
          </CardTitle>
        </CardHeader>
        <CardContent>
          {routeEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma invocation detectada nesta sessão.</p>
              <p className="text-sm">Navegue pelo app para ver as métricas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {routeEntries.map(([route, data]) => {
                const percentage = (data.invocations / metrics.totalInvocations) * 100;
                const isHot = data.invocations > metrics.totalInvocations * 0.3;
                
                return (
                  <div 
                    key={route}
                    className={`p-3 rounded-lg border ${isHot ? 'border-red-500/30 bg-red-500/5' : 'border-border bg-muted/30'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-foreground">{route}</code>
                        {isHot && (
                          <Badge variant="destructive" className="text-xs">
                            HOT
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {data.invocations} invocations
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{percentage.toFixed(1)}% do total</span>
                      <span>Bandwidth: {formatBytes(data.bandwidth)}</span>
                      <span>
                        Última: {new Date(data.lastUpdated).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div 
                        className={`h-full transition-all ${isHot ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Detalhamento de Custos (Sessão)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Edge Function Invocations</p>
            <p className="text-lg font-semibold">
              ${costs.invocationCost.toFixed(6)}
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics.totalInvocations} × $0.000002
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bandwidth</p>
            <p className="text-lg font-semibold">
              ${costs.bandwidthCost.toFixed(6)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(metrics.totalBandwidth)} × $0.09/GB
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CloudCostRealtime;
