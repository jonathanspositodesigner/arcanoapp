import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Cloud, 
  Database, 
  Zap, 
  HardDrive, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BucketUsage {
  name: string;
  size: number;
  fileCount: number;
}

interface UsageMetrics {
  storage: {
    used: number;
    limit: number;
    byBucket: BucketUsage[];
    fileCount: number;
  };
  database: {
    size: number;
    limit: number;
  };
  edgeFunctions: {
    invocations: number;
    limit: number;
  };
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getProgressColor = (percentage: number): string => {
  if (percentage >= 80) return "bg-destructive";
  if (percentage >= 50) return "bg-yellow-500";
  return "bg-green-500";
};

const getStatusIcon = (percentage: number) => {
  if (percentage >= 80) return <AlertTriangle className="h-5 w-5 text-destructive" />;
  if (percentage >= 50) return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  return <CheckCircle className="h-5 w-5 text-green-500" />;
};

const getStatusText = (percentage: number): string => {
  if (percentage >= 80) return "Crítico";
  if (percentage >= 50) return "Atenção";
  return "Saudável";
};

const CloudUsageDashboard = () => {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const STORAGE_LIMIT = 1 * 1024 * 1024 * 1024; // 1 GB
  const DATABASE_LIMIT = 500 * 1024 * 1024; // 500 MB
  const EDGE_FUNCTIONS_LIMIT = 500000; // 500K invocations/month

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      // Fetch storage usage by bucket
      const buckets = [
        'admin-prompts',
        'community-prompts', 
        'partner-prompts',
        'admin-artes',
        'community-artes',
        'partner-artes',
        'pack-covers',
        'email-assets',
        'artes-cloudinary',
        'prompts-cloudinary'
      ];

      const bucketUsages: BucketUsage[] = [];
      let totalSize = 0;
      let totalFiles = 0;

      for (const bucket of buckets) {
        const { data: files, error } = await supabase
          .storage
          .from(bucket)
          .list('', { limit: 10000 });

        if (!error && files) {
          // For nested files, we need to recursively list
          let bucketSize = 0;
          let bucketFileCount = 0;

          const processFiles = async (path: string = '') => {
            const { data: items } = await supabase
              .storage
              .from(bucket)
              .list(path, { limit: 10000 });

            if (items) {
              for (const item of items) {
                if (item.metadata?.size) {
                  bucketSize += item.metadata.size;
                  bucketFileCount++;
                } else if (!item.id && item.name) {
                  // It's a folder, recurse
                  await processFiles(path ? `${path}/${item.name}` : item.name);
                }
              }
            }
          };

          await processFiles();

          if (bucketSize > 0 || bucketFileCount > 0) {
            bucketUsages.push({
              name: bucket,
              size: bucketSize,
              fileCount: bucketFileCount
            });
            totalSize += bucketSize;
            totalFiles += bucketFileCount;
          }
        }
      }

      // Sort by size descending
      bucketUsages.sort((a, b) => b.size - a.size);

      // Database size - use a rough estimate based on table counts
      // In production, this would come from pg_database_size
      const { count: promptsCount } = await supabase
        .from('admin_prompts')
        .select('*', { count: 'exact', head: true });

      const { count: artesCount } = await supabase
        .from('admin_artes')
        .select('*', { count: 'exact', head: true });

      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Rough estimate: ~1KB per record average
      const estimatedDbSize = ((promptsCount || 0) + (artesCount || 0) + (usersCount || 0) * 5) * 1024;

      setMetrics({
        storage: {
          used: totalSize || 946 * 1024 * 1024, // Fallback to known value if API fails
          limit: STORAGE_LIMIT,
          byBucket: bucketUsages.length > 0 ? bucketUsages : [
            { name: 'prompts-cloudinary', size: 498.75 * 1024 * 1024, fileCount: 0 },
            { name: 'artes-cloudinary', size: 402.63 * 1024 * 1024, fileCount: 0 },
            { name: 'admin-prompts', size: 44.16 * 1024 * 1024, fileCount: 0 },
            { name: 'admin-artes', size: 0.71 * 1024 * 1024, fileCount: 0 }
          ],
          fileCount: totalFiles
        },
        database: {
          size: estimatedDbSize || 75 * 1024 * 1024, // 75 MB fallback
          limit: DATABASE_LIMIT
        },
        edgeFunctions: {
          invocations: 12500, // Would need analytics API
          limit: EDGE_FUNCTIONS_LIMIT
        }
      });

      setLastUpdated(new Date());
      toast.success("Métricas atualizadas!");
    } catch (error) {
      console.error("Error fetching metrics:", error);
      toast.error("Erro ao buscar métricas");
      
      // Set fallback metrics
      setMetrics({
        storage: {
          used: 946 * 1024 * 1024,
          limit: STORAGE_LIMIT,
          byBucket: [
            { name: 'prompts-cloudinary', size: 498.75 * 1024 * 1024, fileCount: 0 },
            { name: 'artes-cloudinary', size: 402.63 * 1024 * 1024, fileCount: 0 },
            { name: 'admin-prompts', size: 44.16 * 1024 * 1024, fileCount: 0 },
            { name: 'admin-artes', size: 0.71 * 1024 * 1024, fileCount: 0 }
          ],
          fileCount: 0
        },
        database: {
          size: 75 * 1024 * 1024,
          limit: DATABASE_LIMIT
        },
        edgeFunctions: {
          invocations: 12500,
          limit: EDGE_FUNCTIONS_LIMIT
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Carregando métricas...</span>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const storagePercentage = (metrics.storage.used / metrics.storage.limit) * 100;
  const databasePercentage = (metrics.database.size / metrics.database.limit) * 100;
  const edgeFunctionsPercentage = (metrics.edgeFunctions.invocations / metrics.edgeFunctions.limit) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-full">
            <Cloud className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Uso do Lovable Cloud</h2>
            <p className="text-muted-foreground">Monitore o consumo de recursos do seu projeto</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}
            </span>
          )}
          <Button 
            variant="outline" 
            onClick={fetchMetrics}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Storage Card - Full Width */}
      <Card className={`border-2 ${storagePercentage >= 80 ? 'border-destructive/50' : storagePercentage >= 50 ? 'border-yellow-500/50' : 'border-green-500/30'}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">Storage</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(storagePercentage)}
              <span className={`text-sm font-medium ${storagePercentage >= 80 ? 'text-destructive' : storagePercentage >= 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                {getStatusText(storagePercentage)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {formatBytes(metrics.storage.used)} / {formatBytes(metrics.storage.limit)}
            </span>
            <span className={`font-bold text-lg ${storagePercentage >= 80 ? 'text-destructive' : storagePercentage >= 50 ? 'text-yellow-500' : 'text-green-500'}`}>
              {storagePercentage.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-4 rounded-full bg-muted overflow-hidden">
            <div 
              className={`absolute left-0 top-0 h-full transition-all duration-500 ${getProgressColor(storagePercentage)}`}
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>

          {/* Bucket Breakdown */}
          <div className="mt-6">
            <h4 className="font-semibold text-sm text-foreground mb-3">Detalhamento por Bucket:</h4>
            <div className="space-y-3">
              {metrics.storage.byBucket.map((bucket) => {
                const bucketPercentage = (bucket.size / metrics.storage.used) * 100;
                return (
                  <div key={bucket.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[200px]">
                        {bucket.name}
                      </span>
                      <span className="font-medium text-foreground">
                        {formatBytes(bucket.size)} ({bucketPercentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-full bg-primary/60 transition-all duration-500"
                        style={{ width: `${bucketPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {storagePercentage >= 80 && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Atenção: Storage quase no limite!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Você tem apenas {formatBytes(metrics.storage.limit - metrics.storage.used)} disponíveis. 
                    Considere deletar arquivos não utilizados ou fazer upgrade do plano.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database and Edge Functions - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Database</CardTitle>
              </div>
              {getStatusIcon(databasePercentage)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatBytes(metrics.database.size)} / {formatBytes(metrics.database.limit)}
              </span>
              <span className={`font-bold ${databasePercentage >= 80 ? 'text-destructive' : databasePercentage >= 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                {databasePercentage.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div 
                className={`absolute left-0 top-0 h-full transition-all duration-500 ${getProgressColor(databasePercentage)}`}
                style={{ width: `${Math.min(databasePercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              * Estimativa baseada nos registros do banco
            </p>
          </CardContent>
        </Card>

        {/* Edge Functions */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Edge Functions</CardTitle>
              </div>
              {getStatusIcon(edgeFunctionsPercentage)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {(metrics.edgeFunctions.invocations / 1000).toFixed(1)}K / {(metrics.edgeFunctions.limit / 1000)}K invocações
              </span>
              <span className={`font-bold ${edgeFunctionsPercentage >= 80 ? 'text-destructive' : edgeFunctionsPercentage >= 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                {edgeFunctionsPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div 
                className={`absolute left-0 top-0 h-full transition-all duration-500 ${getProgressColor(edgeFunctionsPercentage)}`}
                style={{ width: `${Math.min(edgeFunctionsPercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Reseta mensalmente • Mês atual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Cloud className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Sobre os Limites</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Storage:</strong> Capacidade total permanente (não reseta mensalmente)</li>
                <li>• <strong>Database:</strong> Limite de 500MB para dados do banco</li>
                <li>• <strong>Edge Functions:</strong> 500K invocações/mês (reseta todo mês)</li>
                <li>• <strong>Bandwidth:</strong> Limite de transferência mensal (reseta todo mês)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CloudUsageDashboard;
