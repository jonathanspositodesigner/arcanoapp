import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Cloud, CheckCircle, XCircle, Loader2, Play } from "lucide-react";
import { toast } from "sonner";

interface TableConfig {
  table: string;
  column: string;
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
  { table: 'admin_artes', column: 'image_url', label: 'Admin Artes - Imagens' },
  { table: 'admin_artes', column: 'download_url', label: 'Admin Artes - Downloads' },
  { table: 'admin_prompts', column: 'image_url', label: 'Admin Prompts - Imagens' },
  { table: 'artes_packs', column: 'cover_url', label: 'Packs - Covers' },
  { table: 'artes_banners', column: 'image_url', label: 'Banners - Desktop' },
  { table: 'artes_banners', column: 'mobile_image_url', label: 'Banners - Mobile' },
  { table: 'partner_artes', column: 'image_url', label: 'Partner Artes - Imagens' },
  { table: 'partner_prompts', column: 'image_url', label: 'Partner Prompts - Imagens' },
  { table: 'community_artes', column: 'image_url', label: 'Community Artes' },
  { table: 'community_prompts', column: 'image_url', label: 'Community Prompts' },
];

type ValidTable = 'admin_artes' | 'admin_prompts' | 'artes_packs' | 'artes_banners' | 'partner_artes' | 'partner_prompts' | 'community_artes' | 'community_prompts';

export default function AdminCloudinaryMigration() {
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<Record<string, MigrationStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [runningTable, setRunningTable] = useState<string | null>(null);

  useEffect(() => {
    loadStatuses();
  }, []);

  const getKey = (config: TableConfig) => `${config.table}.${config.column}`;

  const loadStatuses = async () => {
    setIsLoading(true);
    const newStatuses: Record<string, MigrationStatus> = {};

    for (const config of TABLES_TO_MIGRATE) {
      const key = getKey(config);
      try {
        const tableName = config.table as ValidTable;
        
        // Count total with supabase URLs
        const { count: remaining } = await supabase
          .from(tableName)
          .select('id', { count: 'exact', head: true })
          .like(config.column as 'image_url', '%supabase%');

        // Count total with cloudinary URLs
        const { count: migrated } = await supabase
          .from(tableName)
          .select('id', { count: 'exact', head: true })
          .like(config.column as 'image_url', '%cloudinary%');

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

  const migrateTable = async (config: TableConfig) => {
    const key = getKey(config);
    setRunningTable(key);
    
    setStatuses(prev => ({
      ...prev,
      [key]: { ...prev[key], isRunning: true, errors: [] }
    }));

    const batchSize = 5;
    let hasMore = true;

    while (hasMore) {
      try {
        const { data, error } = await supabase.functions.invoke('migrate-to-cloudinary', {
          body: {
            table: config.table,
            column: config.column,
            limit: batchSize,
            offset: 0,
          }
        });

        if (error) throw error;

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

        if (data.errors && data.errors.length > 0) {
          setStatuses(prev => ({
            ...prev,
            [key]: {
              ...prev[key],
              errors: [...prev[key].errors, ...data.errors],
            }
          }));
        }

        hasMore = data.hasMore;
        
        if (!hasMore) {
          toast.success(`Migração de ${config.label} concluída!`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Migration error for ${key}:`, error);
        toast.error(`Erro na migração: ${(error as Error).message}`);
        hasMore = false;
      }
    }

    setStatuses(prev => ({
      ...prev,
      [key]: { ...prev[key], isRunning: false }
    }));
    setRunningTable(null);
  };

  const migrateAll = async () => {
    for (const config of TABLES_TO_MIGRATE) {
      const key = getKey(config);
      if (statuses[key]?.remaining > 0) {
        await migrateTable(config);
      }
    }
    toast.success('Migração completa de todas as tabelas!');
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin-dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Cloud className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Migração para Cloudinary</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Progresso Geral</span>
              <span className="text-sm font-normal text-muted-foreground">
                {totalStats.migrated} / {totalStats.total} arquivos
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={overallProgress} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="text-green-500 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                {totalStats.migrated} migrados
              </span>
              <span className="text-muted-foreground">
                {totalStats.remaining} restantes
              </span>
            </div>
            <Button 
              onClick={migrateAll} 
              disabled={!!runningTable || totalStats.remaining === 0}
              className="w-full"
            >
              {runningTable ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Migrando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Migrar Todos ({totalStats.remaining} arquivos)
                </>
              )}
            </Button>
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
                          <Cloud className="h-5 w-5 text-muted-foreground" />
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
      </div>
    </div>
  );
}
