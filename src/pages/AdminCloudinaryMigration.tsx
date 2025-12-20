import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Cloud, CheckCircle, XCircle, Loader2, Play, Square, Database } from "lucide-react";
import { toast } from "sonner";

interface TableConfig {
  table: string;
  label: string;
}

interface MigrationStatus {
  total: number;
  migrated: number;
  remaining: number;
  isRunning: boolean;
  errors: string[];
}

const TABLES_TO_MIGRATE: TableConfig[] = [
  { table: 'admin_artes', label: 'Admin Artes' },
  { table: 'admin_prompts', label: 'Admin Prompts' },
  { table: 'artes_packs', label: 'Packs (Covers)' },
  { table: 'artes_banners', label: 'Banners' },
  { table: 'partner_artes', label: 'Partner Artes' },
  { table: 'partner_prompts', label: 'Partner Prompts' },
  { table: 'partner_artes_musicos', label: 'Partner Artes Músicos' },
  { table: 'community_artes', label: 'Community Artes' },
  { table: 'community_prompts', label: 'Community Prompts' },
];

type ValidTable = 'admin_artes' | 'admin_prompts' | 'artes_packs' | 'artes_banners' | 'partner_artes' | 'partner_prompts' | 'partner_artes_musicos' | 'community_artes' | 'community_prompts';

export default function AdminCloudinaryMigration() {
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<Record<string, MigrationStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [runningTable, setRunningTable] = useState<string | null>(null);
  const [shouldStop, setShouldStop] = useState(false);
  const shouldStopRef = useRef(false);

  useEffect(() => {
    loadStatuses();
  }, []);

  const getKey = (config: TableConfig) => config.table;

  const getColumnForTable = (table: string): string => {
    if (table === 'artes_packs') return 'cover_url';
    return 'image_url';
  };

  const loadStatuses = async () => {
    setIsLoading(true);
    const newStatuses: Record<string, MigrationStatus> = {};

    for (const config of TABLES_TO_MIGRATE) {
      const key = getKey(config);
      const column = getColumnForTable(config.table);
      
      try {
        const tableName = config.table as ValidTable;
        
        // Count total with cloudinary URLs (ainda não migrado) - usar domínio específico
        const { count: remaining } = await supabase
          .from(tableName)
          .select('id', { count: 'exact', head: true })
          .like(column as 'image_url', '%res.cloudinary.com%');

        // Count total with supabase URLs (já migrado pro Lovable Cloud)
        const { count: migrated } = await supabase
          .from(tableName)
          .select('id', { count: 'exact', head: true })
          .like(column as 'image_url', '%supabase%');

        newStatuses[key] = {
          total: (remaining || 0) + (migrated || 0),
          migrated: migrated || 0,
          remaining: remaining || 0,
          isRunning: false,
          errors: [],
        };
      } catch (error) {
        console.error(`Error loading status for ${key}:`, error);
        newStatuses[key] = {
          total: 0,
          migrated: 0,
          remaining: 0,
          isRunning: false,
          errors: [(error as Error).message],
        };
      }
    }

    setStatuses(newStatuses);
    setIsLoading(false);
  };

  const migrateTable = async (config: TableConfig): Promise<boolean> => {
    const key = getKey(config);
    setRunningTable(key);
    setShouldStop(false);
    shouldStopRef.current = false;
    
    setStatuses(prev => ({
      ...prev,
      [key]: { ...prev[key], isRunning: true, errors: [] }
    }));

    const batchSize = 5;
    let hasMore = true;
    let wasStopped = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (hasMore && !shouldStopRef.current) {
      try {
        const { data, error } = await supabase.functions.invoke('migrate-cloudinary-to-storage', {
          body: {
            table: config.table,
            batchSize,
            dryRun: false,
          }
        });

        if (error) throw error;

        // Reset retry count on success
        retryCount = 0;

        // Check again after async operation
        if (shouldStopRef.current) {
          wasStopped = true;
          break;
        }

        if (data.migrated > 0) {
          setStatuses(prev => ({
            ...prev,
            [key]: {
              ...prev[key],
              migrated: prev[key].migrated + data.migrated,
              remaining: prev[key].remaining - data.migrated,
            }
          }));
        }

        if (data.errors && data.errors > 0) {
          setStatuses(prev => ({
            ...prev,
            [key]: {
              ...prev[key],
              errors: [...prev[key].errors, `${data.errors} erros no batch`],
            }
          }));
        }

        hasMore = data.hasMore;
        
        if (!hasMore) {
          toast.success(`Migração de ${config.label} concluída!`);
        }

        // Delay entre batches
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        const errorMessage = (error as Error).message;
        console.error(`Migration error for ${key}:`, error);
        
        // Retry com exponential backoff
        if (errorMessage.includes('WORKER_LIMIT') || errorMessage.includes('Memory') || errorMessage.includes('limit')) {
          retryCount++;
          if (retryCount <= maxRetries) {
            const backoffDelay = Math.pow(2, retryCount) * 1000;
            toast.warning(`Erro de memória. Tentativa ${retryCount}/${maxRetries} em ${backoffDelay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
        }
        
        toast.error(`Erro na migração: ${errorMessage}`);
        hasMore = false;
      }
    }

    if (shouldStopRef.current) {
      wasStopped = true;
      toast.info('Migração interrompida');
    }

    setStatuses(prev => ({
      ...prev,
      [key]: { ...prev[key], isRunning: false }
    }));
    setRunningTable(null);
    setShouldStop(false);
    shouldStopRef.current = false;
    
    return !wasStopped;
  };

  const stopMigration = () => {
    setShouldStop(true);
    shouldStopRef.current = true;
  };

  const migrateAll = async () => {
    for (const config of TABLES_TO_MIGRATE) {
      const key = getKey(config);
      if (statuses[key]?.remaining > 0 && !shouldStop) {
        const completed = await migrateTable(config);
        if (!completed) break;
      }
    }
    if (!shouldStop) {
      toast.success('Migração completa de todas as tabelas!');
    }
  };

  const totalStats = Object.values(statuses).reduce(
    (acc, status) => ({
      total: acc.total + status.total,
      migrated: acc.migrated + status.migrated,
      remaining: acc.remaining + status.remaining,
    }),
    { total: 0, migrated: 0, remaining: 0 }
  );

  const overallProgress = totalStats.total > 0 
    ? (totalStats.migrated / totalStats.total) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin-hub')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Migração Cloudinary → Lovable Cloud</h1>
          </div>
        </div>

        <Card className="bg-gradient-to-r from-orange-500/10 to-blue-500/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-primary" />
                <span>Progresso Geral</span>
              </div>
              <span className="text-sm font-normal text-muted-foreground">
                {totalStats.migrated} / {totalStats.total} imagens
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={overallProgress} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="text-green-500 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                {totalStats.migrated} no Lovable Cloud
              </span>
              <span className="text-orange-500">
                {totalStats.remaining} ainda no Cloudinary
              </span>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={migrateAll} 
                disabled={!!runningTable || totalStats.remaining === 0}
                className="flex-1"
              >
                {runningTable ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Migrando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Migrar Todos ({totalStats.remaining} imagens)
                  </>
                )}
              </Button>
              {runningTable && (
                <Button 
                  onClick={stopMigration} 
                  variant="destructive"
                  disabled={shouldStop}
                >
                  <Square className="h-4 w-4 mr-2" />
                  {shouldStop ? 'Parando...' : 'Parar'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            TABLES_TO_MIGRATE.map((config) => {
              const key = getKey(config);
              const status = statuses[key];
              if (!status) return null;

              const progress = status.total > 0 
                ? (status.migrated / status.total) * 100 
                : 100;
              const isComplete = status.remaining === 0;
              const isRunning = status.isRunning;

              return (
                <Card key={key} className={isComplete ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isComplete ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : isRunning ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <Cloud className="h-5 w-5 text-orange-500" />
                        )}
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {status.migrated}/{status.total}
                        </span>
                        <Button
                          size="sm"
                          variant={isComplete ? "ghost" : "outline"}
                          onClick={() => migrateTable(config)}
                          disabled={!!runningTable || isComplete}
                        >
                          {isRunning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isComplete ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Progress value={progress} className="h-2" />
                    {status.errors.length > 0 && (
                      <div className="mt-2 text-xs text-red-500">
                        {status.errors.slice(-3).map((err, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            {err}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">Sobre esta migração:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Migra imagens do Cloudinary para Lovable Cloud Storage</li>
              <li>Imagens já otimizadas são baixadas e re-enviadas</li>
              <li>URLs no banco de dados são atualizadas automaticamente</li>
              <li>Custo zero após migração (armazenamento incluído no plano)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
