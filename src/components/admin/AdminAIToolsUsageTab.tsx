import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  RefreshCw, Coins, TrendingUp, Clock, Users, 
  CheckCircle, XCircle, Timer, ChevronLeft, ChevronRight,
  Cpu, ArrowUpDown, Ban, Loader2, AlertCircle, ExternalLink, ImageOff, AlertTriangle
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UsageRecord {
  id: string;
  tool_name: string;
  user_id: string;
  user_email: string;
  user_name: string;
  status: string;
  error_message: string | null;
  rh_cost: number;
  user_credit_cost: number;
  profit: number;
  waited_in_queue: boolean;
  queue_wait_seconds: number;
  processing_seconds: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface UsageSummary {
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  total_rh_cost: number;
  total_user_credits: number;
  total_profit: number;
  jobs_with_queue: number;
  avg_queue_wait_seconds: number;
  avg_processing_seconds: number;
}

type UserClientType = 'free' | 'bought_credits' | 'premium' | 'premium_credits';

const ITEMS_PER_PAGE = 20;

const DATE_FILTERS = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "30days", label: "Últimos 30 dias" },
  { value: "90days", label: "Últimos 90 dias" },
  { value: "all", label: "Todo período" },
];

const TOOL_FILTERS = [
  { value: "all", label: "Todas as ferramentas" },
  { value: "Upscaler Arcano", label: "Upscaler Arcano" },
  { value: "Pose Changer", label: "Pose Changer" },
  { value: "Veste AI", label: "Veste AI" },
  { value: "Video Upscaler", label: "Video Upscaler" },
  { value: "Arcano Cloner", label: "Arcano Cloner" },
  { value: "Gerador Avatar", label: "Gerador Avatar" },
  { value: "Gerar Imagem", label: "Gerar Imagem" },
  { value: "Gerar Vídeo", label: "Gerar Vídeo" },
  { value: "Flyer Maker", label: "Flyer Maker" },
];

const AdminAIToolsUsageTab = () => {
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState("7days");
  const [toolFilter, setToolFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [userTypeMap, setUserTypeMap] = useState<Record<string, UserClientType>>({});
  
  // Job output modal state
  const [selectedJob, setSelectedJob] = useState<UsageRecord | null>(null);
  const [jobOutputUrl, setJobOutputUrl] = useState<string | null>(null);
  const [isLoadingOutput, setIsLoadingOutput] = useState(false);
  const [isOutputExpired, setIsOutputExpired] = useState(false);
  const [outputModalOpen, setOutputModalOpen] = useState(false);

  const isVideoTool = (toolName: string) => toolName === "Video Upscaler" || toolName === "Gerar Vídeo";

  const handleJobClick = useCallback(async (record: UsageRecord) => {
    setSelectedJob(record);
    setOutputModalOpen(true);
    setIsOutputExpired(false);
    setJobOutputUrl(null);

    if (record.status !== "completed") {
      setIsLoadingOutput(false);
      return;
    }

    setIsLoadingOutput(true);
    try {
      const tableName = getTableName(record.tool_name);
      const { data, error } = await supabase
        .from(tableName as any)
        .select('output_url')
        .eq('id', record.id)
        .single();

      if (error) throw error;
      setJobOutputUrl((data as any)?.output_url || null);
    } catch (err) {
      console.error("Error fetching output_url:", err);
      setJobOutputUrl(null);
    } finally {
      setIsLoadingOutput(false);
    }
  }, []);

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case "7days":
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case "30days":
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case "90days":
        return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
      default:
        return { start: null, end: null };
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { start, end } = getDateRange();
      
      // Fetch usage records
      const { data: records, error: recordsError } = await supabase.rpc('get_ai_tools_usage', {
        p_start_date: start?.toISOString() || null,
        p_end_date: end?.toISOString() || null,
        p_page: currentPage,
        p_page_size: ITEMS_PER_PAGE
      });

      if (recordsError) throw recordsError;
      setUsageRecords(records || []);

      // Fetch user types (subscription + credits) for all unique user_ids
      const userIds = [...new Set((records || []).map((r: UsageRecord) => r.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const [subsRes, creditsRes] = await Promise.all([
          supabase
            .from('planos2_subscriptions')
            .select('user_id')
            .eq('is_active', true)
            .neq('plan_slug', 'free')
            .in('user_id', userIds),
          supabase
            .from('upscaler_credits')
            .select('user_id, lifetime_balance')
            .gt('lifetime_balance', 0)
            .in('user_id', userIds),
        ]);

        const premiumSet = new Set((subsRes.data || []).map(s => s.user_id));
        const lifetimeSet = new Set((creditsRes.data || []).map(c => c.user_id));

        const typeMap: Record<string, UserClientType> = {};
        for (const uid of userIds) {
          const isPremium = premiumSet.has(uid);
          const hasLifetime = lifetimeSet.has(uid);
          if (isPremium && hasLifetime) typeMap[uid] = 'premium_credits';
          else if (isPremium) typeMap[uid] = 'premium';
          else if (hasLifetime) typeMap[uid] = 'bought_credits';
          else typeMap[uid] = 'free';
        }
        setUserTypeMap(typeMap);
      }

      // Fetch total count
      const { data: countData, error: countError } = await supabase.rpc('get_ai_tools_usage_count', {
        p_start_date: start?.toISOString() || null,
        p_end_date: end?.toISOString() || null
      });

      if (countError) throw countError;
      setTotalCount(countData || 0);

      // Fetch summary
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_ai_tools_usage_summary', {
        p_start_date: start?.toISOString() || null,
        p_end_date: end?.toISOString() || null
      });

      if (summaryError) throw summaryError;
      setSummary(summaryData?.[0] || null);

    } catch (error) {
      console.error("Error fetching AI tools usage:", error);
      toast.error("Erro ao carregar dados de uso");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, dateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, toolFilter]);

  const filteredRecords = useMemo(() => {
    let filtered = [...usageRecords];

    if (toolFilter !== "all") {
      filtered = filtered.filter(r => r.tool_name === toolFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.user_email?.toLowerCase().includes(term) ||
        r.user_name?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [usageRecords, toolFilter, searchTerm]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const getStatusBadge = (record: UsageRecord) => {
    switch (record.status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Concluído</Badge>;
      case "failed":
        return (
          <div className="flex items-center gap-1.5">
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Falhou</Badge>
            {record.error_message && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle className="h-4 w-4 text-red-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-red-950 border-red-500/30">
                    <p className="text-sm">{record.error_message}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      case "running":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Processando</Badge>;
      case "queued":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Na Fila</Badge>;
      default:
        return <Badge variant="outline">{record.status}</Badge>;
    }
  };

  const getToolBadge = (toolName: string) => {
    const colors: Record<string, string> = {
      "Upscaler Arcano": "bg-purple-500/20 text-purple-400 border-purple-500/30",
      "Pose Changer": "bg-orange-500/20 text-orange-400 border-orange-500/30",
      "Veste AI": "bg-pink-500/20 text-pink-400 border-pink-500/30",
      "Video Upscaler": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      "Arcano Cloner": "bg-blue-500/20 text-blue-400 border-blue-500/30",
      "Gerador Avatar": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      "Gerar Imagem": "bg-amber-500/20 text-amber-400 border-amber-500/30",
      "Gerar Vídeo": "bg-rose-500/20 text-rose-400 border-rose-500/30",
      "Flyer Maker": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    };
    return <Badge className={colors[toolName] || ""}>{toolName}</Badge>;
  };

  const getUserTypeBadge = (userId: string) => {
    const type = userTypeMap[userId] || 'free';
    switch (type) {
      case 'free':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Free</Badge>;
      case 'bought_credits':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Comprou Créditos</Badge>;
      case 'premium':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Premium</Badge>;
      case 'premium_credits':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Premium + Créditos</Badge>;
    }
  };

  const getTableName = (toolName: string): string => {
    switch (toolName) {
      case "Upscaler Arcano": return "upscaler_jobs";
      case "Pose Changer": return "pose_changer_jobs";
      case "Veste AI": return "veste_ai_jobs";
      case "Video Upscaler": return "video_upscaler_jobs";
      case "Arcano Cloner": return "arcano_cloner_jobs";
      case "Gerador Avatar": return "character_generator_jobs";
      case "Gerar Imagem": return "image_generator_jobs";
      case "Gerar Vídeo": return "video_generator_jobs";
      case "Flyer Maker": return "flyer_maker_jobs";
      default: return "upscaler_jobs";
    }
  };

  const handleCancelJob = async (record: UsageRecord) => {
    if (cancellingJobId) return;
    
    const confirmed = window.confirm(
      `Cancelar job de "${record.user_name || record.user_email}"?\n\n` +
      `Serão estornados ${record.user_credit_cost} créditos automaticamente.`
    );
    
    if (!confirmed) return;
    
    setCancellingJobId(record.id);
    
    try {
      const tableName = getTableName(record.tool_name);
      
      const { data, error } = await supabase.rpc('admin_cancel_job', {
        p_table_name: tableName,
        p_job_id: record.id
      });
      
      if (error) throw error;
      
      const result = data?.[0];
      
      if (result?.success) {
        toast.success(`Job cancelado! ${result.refunded_amount} créditos estornados.`);
        fetchData(); // Refresh the list
      } else {
        toast.error(result?.error_message || "Erro ao cancelar job");
      }
    } catch (error: any) {
      console.error("Error cancelling job:", error);
      toast.error(error.message || "Erro ao cancelar job");
    } finally {
      setCancellingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <Label>Período</Label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FILTERS.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ferramenta</Label>
          <Select value={toolFilter} onValueChange={setToolFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOOL_FILTERS.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 flex-1 min-w-[200px]">
          <Label>Buscar usuário</Label>
          <Input
            placeholder="Email ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Cpu className="h-8 w-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total de Jobs</p>
                <p className="text-xl font-bold">{summary.total_jobs}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Concluídos</p>
                <p className="text-xl font-bold">{summary.completed_jobs}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Falhas</p>
                <p className="text-xl font-bold">{summary.failed_jobs}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Coins className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Custo RH</p>
                <p className="text-xl font-bold">{summary.total_rh_cost}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Créditos Usuários</p>
                <p className="text-xl font-bold">{summary.total_user_credits}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xs text-green-400">Lucro Total</p>
                <p className="text-xl font-bold text-green-400">{summary.total_profit}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Average Times */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Timer className="h-6 w-6 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Jobs que entraram na fila</p>
                <p className="text-lg font-bold">{summary.jobs_with_queue} ({totalCount > 0 ? Math.round((summary.jobs_with_queue / summary.total_jobs) * 100) : 0}%)</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Tempo médio na fila</p>
                <p className="text-lg font-bold">{formatDuration(Math.round(summary.avg_queue_wait_seconds))}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Cpu className="h-6 w-6 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Tempo médio de processamento</p>
                <p className="text-lg font-bold">{formatDuration(Math.round(summary.avg_processing_seconds))}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Histórico de Uso ({totalCount} registros)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Data/Hora</TableHead>
                   <TableHead className="whitespace-nowrap">Usuário</TableHead>
                   <TableHead className="whitespace-nowrap">Tipo</TableHead>
                   <TableHead className="whitespace-nowrap">Ferramenta</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Fila?</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Espera</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Processamento</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Custo RH</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Crédito Usuário</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Lucro</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleJobClick(record)}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(record.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium text-sm truncate">{record.user_name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground truncate">{record.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getUserTypeBadge(record.user_id)}</TableCell>
                      <TableCell>{getToolBadge(record.tool_name)}</TableCell>
                      <TableCell>{getStatusBadge(record)}</TableCell>
                      <TableCell className="text-center">
                        {record.waited_in_queue ? (
                          <Badge variant="outline" className="text-orange-400 border-orange-500/30">Sim</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {record.waited_in_queue ? formatDuration(record.queue_wait_seconds) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {record.processing_seconds > 0 ? formatDuration(record.processing_seconds) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {record.rh_cost > 0 ? record.rh_cost : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {record.user_credit_cost > 0 ? record.user_credit_cost : "-"}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm font-bold ${record.profit > 0 ? 'text-green-400' : record.profit < 0 ? 'text-red-400' : ''}`}>
                        {record.profit !== 0 ? (record.profit > 0 ? '+' : '') + record.profit : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {(record.status === 'running' || record.status === 'queued') ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleCancelJob(record); }}
                            disabled={cancellingJobId === record.id}
                            className="h-7 px-2 text-xs"
                          >
                            {cancellingJobId === record.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Ban className="h-3 w-3 mr-1" />
                                Cancelar
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Job Output Modal */}
      <Dialog open={outputModalOpen} onOpenChange={setOutputModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedJob && getToolBadge(selectedJob.tool_name)}
              <span className="text-sm font-normal text-muted-foreground">
                {selectedJob?.user_email}
              </span>
            </DialogTitle>
            <DialogDescription>
              {selectedJob && formatDateTime(selectedJob.created_at)}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            {selectedJob && selectedJob.status !== "completed" ? (
              <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                <AlertTriangle className="h-10 w-10" />
                <p>Este job não gerou resultado</p>
                <Badge variant="outline">{selectedJob.status}</Badge>
              </div>
            ) : isLoadingOutput ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !jobOutputUrl ? (
              <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                <ImageOff className="h-10 w-10" />
                <p>Resultado não disponível</p>
              </div>
            ) : isOutputExpired ? (
              <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                <AlertTriangle className="h-10 w-10 text-yellow-500" />
                <p className="text-yellow-500 font-medium">Resultado expirado (mais de 24h)</p>
              </div>
            ) : selectedJob && isVideoTool(selectedJob.tool_name) ? (
              <video
                src={jobOutputUrl}
                controls
                className="w-full rounded-md max-h-[500px]"
                onError={() => setIsOutputExpired(true)}
              />
            ) : (
              <img
                src={jobOutputUrl}
                alt="Resultado do job"
                className="w-full rounded-md max-h-[500px] object-contain"
                onError={() => setIsOutputExpired(true)}
              />
            )}
          </div>

          {jobOutputUrl && !isOutputExpired && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <a href={jobOutputUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir em nova aba
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAIToolsUsageTab;
