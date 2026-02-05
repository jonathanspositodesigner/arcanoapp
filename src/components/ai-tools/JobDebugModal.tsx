import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { STEP_LABELS } from './JobStepIndicator';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Copy, 
  ChevronDown,
  ChevronUp,
  Code,
  List,
  FileJson
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StepHistoryEntry {
  step: string;
  timestamp: string;
  [key: string]: any;
}

interface JobDebugData {
  id: string;
  status: string;
  current_step: string | null;
  failed_at_step: string | null;
  error_message: string | null;
  step_history: StepHistoryEntry[] | null;
  raw_api_response: Record<string, any> | null;
  raw_webhook_payload: Record<string, any> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  task_id: string | null;
  user_credit_cost: number | null;
  rh_cost: number | null;
  api_account: string | null;
}

interface JobDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  tableName: string;
}

/**
 * JobDebugModal - Modal para visualização detalhada de debug do job
 */
const JobDebugModal: React.FC<JobDebugModalProps> = ({
  isOpen,
  onClose,
  jobId,
  tableName,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [job, setJob] = useState<JobDebugData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    timeline: true,
    apiResponse: false,
    webhookPayload: false,
  });

  useEffect(() => {
    if (isOpen && jobId && tableName) {
      fetchJobData();
    }
  }, [isOpen, jobId, tableName]);

  const fetchJobData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select(`
          id, status, current_step, failed_at_step,
          error_message, step_history,
          raw_api_response, raw_webhook_payload,
          created_at, started_at, completed_at,
          task_id, user_credit_cost, rh_cost, api_account
        `)
        .eq('id', jobId)
        .maybeSingle();

      if (error) throw error;
      setJob(data as unknown as JobDebugData);
    } catch (error) {
      console.error('[JobDebugModal] Error fetching job:', error);
      toast.error('Erro ao carregar dados do job');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      completed: { 
        className: 'bg-green-500/20 text-green-400 border-green-500/30', 
        icon: <CheckCircle2 className="w-3 h-3" /> 
      },
      failed: { 
        className: 'bg-red-500/20 text-red-400 border-red-500/30', 
        icon: <XCircle className="w-3 h-3" /> 
      },
      cancelled: { 
        className: 'bg-gray-500/20 text-gray-400 border-gray-500/30', 
        icon: <AlertCircle className="w-3 h-3" /> 
      },
      running: { 
        className: 'bg-purple-500/20 text-purple-400 border-purple-500/30', 
        icon: <Loader2 className="w-3 h-3 animate-spin" /> 
      },
      queued: { 
        className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', 
        icon: <Clock className="w-3 h-3" /> 
      },
    };

    const variant = variants[status] || variants.queued;

    return (
      <Badge variant="outline" className={cn('flex items-center gap-1', variant.className)}>
        {variant.icon}
        {status.toUpperCase()}
      </Badge>
    );
  };

  const stepHistory = job?.step_history || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Debug do Job
          </DialogTitle>
          <DialogDescription>
            Visualização detalhada das etapas e payloads do job
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !job ? (
          <div className="text-center py-8 text-muted-foreground">
            Job não encontrado
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Job ID</p>
                  <p className="text-sm font-mono truncate">{job.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(job.status)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Etapa Atual</p>
                  <p className="text-sm">{STEP_LABELS[job.current_step || ''] || job.current_step || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Falhou Em</p>
                  <p className="text-sm text-red-400">
                    {job.failed_at_step ? STEP_LABELS[job.failed_at_step] || job.failed_at_step : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Créditos</p>
                  <p className="text-sm">{job.user_credit_cost || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Custo RH</p>
                  <p className="text-sm">{job.rh_cost || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">API Account</p>
                  <p className="text-sm">{job.api_account || 'primary'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Task ID</p>
                  <p className="text-sm font-mono truncate">{job.task_id || '-'}</p>
                </div>
              </div>

              {/* Error Message */}
              {job.error_message && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Mensagem de Erro
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(job.error_message || '', 'Erro')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <pre className="text-xs text-red-300 whitespace-pre-wrap break-all font-mono bg-black/20 p-2 rounded">
                    {job.error_message}
                  </pre>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Criado em</p>
                  <p className="text-xs font-mono">{formatTimestamp(job.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Iniciado em</p>
                  <p className="text-xs font-mono">{job.started_at ? formatTimestamp(job.started_at) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Concluído em</p>
                  <p className="text-xs font-mono">{job.completed_at ? formatTimestamp(job.completed_at) : '-'}</p>
                </div>
              </div>

              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="timeline" className="flex items-center gap-1">
                    <List className="w-3 h-3" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="api" className="flex items-center gap-1">
                    <FileJson className="w-3 h-3" />
                    API Response
                  </TabsTrigger>
                  <TabsTrigger value="webhook" className="flex items-center gap-1">
                    <FileJson className="w-3 h-3" />
                    Webhook
                  </TabsTrigger>
                </TabsList>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="mt-4">
                  {stepHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma etapa registrada
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {stepHistory.map((entry, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                {STEP_LABELS[entry.step] || entry.step}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatTimestamp(entry.timestamp)}
                              </p>
                            </div>
                            {Object.keys(entry).filter(k => !['step', 'timestamp'].includes(k)).length > 0 && (
                              <pre className="text-xs text-muted-foreground mt-1 font-mono bg-black/20 p-2 rounded overflow-x-auto">
                                {JSON.stringify(
                                  Object.fromEntries(
                                    Object.entries(entry).filter(([k]) => !['step', 'timestamp'].includes(k))
                                  ),
                                  null,
                                  2
                                )}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* API Response Tab */}
                <TabsContent value="api" className="mt-4">
                  {job.raw_api_response ? (
                    <div>
                      <div className="flex items-center justify-end mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(job.raw_api_response, null, 2), 'API Response')}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </Button>
                      </div>
                      <pre className="text-xs font-mono bg-black/40 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(job.raw_api_response, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma resposta de API registrada
                    </p>
                  )}
                </TabsContent>

                {/* Webhook Payload Tab */}
                <TabsContent value="webhook" className="mt-4">
                  {job.raw_webhook_payload ? (
                    <div>
                      <div className="flex items-center justify-end mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(job.raw_webhook_payload, null, 2), 'Webhook Payload')}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </Button>
                      </div>
                      <pre className="text-xs font-mono bg-black/40 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(job.raw_webhook_payload, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum payload de webhook registrado
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button variant="default" onClick={fetchJobData} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobDebugModal;
