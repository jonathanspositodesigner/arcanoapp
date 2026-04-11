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
  Cpu, ArrowUpDown, Ban, Loader2, AlertCircle, ExternalLink, ImageOff, AlertTriangle,
  Activity, Bug
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ZoomableBeforeAfter } from "@/components/admin/ZoomableBeforeAfter";
import { FullscreenModal } from "@/components/upscaler/FullscreenModal";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UsageRecord {
  id: string;
  tool_name: string;
  user_id: string;
  user_email: string;
  user_name: string;
  status: string;
  error_message: string | null;
  failed_at_step: string | null;
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

interface JobErrorDetails {
  error_message: string | null;
  failed_at_step: string | null;
  current_step: string | null;
  step_history: any | null;
  raw_api_response: any | null;
  raw_webhook_payload: any | null;
  credits_charged: boolean | null;
  credits_refunded: boolean | null;
  task_id: string | null;
  api_account: string | null;
}

type UserClientType = 'free' | 'bought_credits' | 'redeemed_credits' | 'free_trial' | 'premium' | 'premium_credits';

const ITEMS_PER_PAGE = 20;

// Conversion constants
const CUSTO_POR_RH_COIN = 0.002; // R$ per RH coin
const RECEITA_POR_CREDITO = 0.0043; // R$ per credit

// API cost map: display tool name → fixed API cost in BRL (from ai_tool_settings)
const API_COST_MAP: Record<string, number> = {
  "Arcano Cloner": 0.18,
  "Gerador Avatar": 0.18,
  "Gerar Imagem - Nano Banana": 0.18,
};

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  { value: "Gerar Imagem - Flux 2", label: "Gerar Imagem - Flux 2" },
  { value: "Gerar Imagem - Nano Banana", label: "Gerar Imagem - Nano Banana" },
  { value: "Gerar Vídeo", label: "Gerar Vídeo" },
  { value: "Flyer Maker", label: "Flyer Maker" },
  { value: "Remover Fundo", label: "Remover Fundo" },
  { value: "MovieLed Maker", label: "MovieLed Maker" },
];

const STATUS_FILTERS = [
  { value: "all", label: "Todos os status" },
  { value: "completed", label: "✅ Concluídos" },
  { value: "failed", label: "❌ Falhas" },
  { value: "running", label: "⚙️ Processando" },
  { value: "queued", label: "⏳ Na Fila" },
  { value: "pending", label: "🔄 Pendente" },
  { value: "starting", label: "🚀 Iniciando" },
];

const AdminAIToolsUsageTab = () => {
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState("7days");
  const [toolFilter, setToolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [userTypeMap, setUserTypeMap] = useState<Record<string, UserClientType>>({});
  
  // Job output modal state
  const [selectedJob, setSelectedJob] = useState<UsageRecord | null>(null);
  const [jobOutputUrl, setJobOutputUrl] = useState<string | null>(null);
  const [jobInputUrl, setJobInputUrl] = useState<string | null>(null);
  const [isLoadingOutput, setIsLoadingOutput] = useState(false);
  const [isOutputExpired, setIsOutputExpired] = useState(false);
  const [outputModalOpen, setOutputModalOpen] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  
  // Error details modal
  const [errorDetails, setErrorDetails] = useState<JobErrorDetails | null>(null);
  const [isLoadingErrorDetails, setIsLoadingErrorDetails] = useState(false);

  const isVideoTool = (toolName: string) => toolName === "Video Upscaler" || toolName === "Gerar Vídeo" || toolName === "MovieLed Maker";

  const getInputColumn = (toolName: string): string | null => {
    switch (toolName) {
      case "Upscaler Arcano": return "input_url";
      case "Arcano Cloner": return "user_image_url";
      case "Pose Changer": return "person_image_url";
      case "Veste AI": return "person_image_url";
      case "Gerador Avatar": return "front_image_url";
      case "Flyer Maker": return "reference_image_url";
      case "Remover Fundo": return "input_url";
      case "Gerar Imagem - Flux 2": return null;
      case "Gerar Imagem - Nano Banana": return null;
      case "Gerar Vídeo": return null;
      default: return null;
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
      case "Gerar Imagem - Flux 2": return "image_generator_jobs";
      case "Gerar Imagem - Nano Banana": return "image_generator_jobs";
      case "Gerar Vídeo": return "video_generator_jobs";
      case "Flyer Maker": return "flyer_maker_jobs";
      case "Remover Fundo": return "bg_remover_jobs";
      case "MovieLed Maker": return "movieled_maker_jobs";
      default: return "upscaler_jobs";
    }
  };

  const fetchErrorDetails = useCallback(async (record: UsageRecord) => {
    setIsLoadingErrorDetails(true);
    setErrorDetails(null);
    try {
      const tableName = getTableName(record.tool_name);
      const { data, error } = await supabase
        .from(tableName as any)
        .select('error_message, failed_at_step, current_step, step_history, raw_api_response, raw_webhook_payload, credits_charged, credits_refunded, task_id, api_account')
        .eq('id', record.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setErrorDetails(data as any as JobErrorDetails);
      }
    } catch (err) {
      console.error("Error fetching error details:", err);
    } finally {
      setIsLoadingErrorDetails(false);
    }
  }, []);

  const handleJobClick = useCallback(async (record: UsageRecord) => {
    setSelectedJob(record);
    setOutputModalOpen(true);
    setIsOutputExpired(false);
    setJobOutputUrl(null);
    setJobInputUrl(null);
    setShowFullscreen(false);
    setErrorDetails(null);

    // If failed or non-completed, fetch error details AND input image
    if (record.status !== "completed") {
      fetchErrorDetails(record);
      // Also fetch input image for failed jobs so admin can see what the user sent
      setIsLoadingOutput(true);
      try {
        const tableName = getTableName(record.tool_name);
        const inputCol = getInputColumn(record.tool_name);
        const selectFields = inputCol ? `output_url, thumbnail_url, ${inputCol}` : 'output_url, thumbnail_url';

        const { data, error } = await supabase
          .from(tableName as any)
          .select(selectFields)
          .eq('id', record.id)
          .maybeSingle();

        if (!error && data) {
          setJobOutputUrl((data as any)?.output_url || null);
          setJobInputUrl(inputCol ? (data as any)?.[inputCol] || null : null);
        }
      } catch (err) {
        console.error("Error fetching input for failed job:", err);
      } finally {
        setIsLoadingOutput(false);
      }
      return;
    }

    setIsLoadingOutput(true);
    try {
      const tableName = getTableName(record.tool_name);
      const inputCol = getInputColumn(record.tool_name);
      const selectFields = inputCol ? `output_url, ${inputCol}` : 'output_url';

      const { data, error } = await supabase
        .from(tableName as any)
        .select(selectFields)
        .eq('id', record.id)
        .maybeSingle();

      if (error) throw error;
      
      const outputUrl = (data as any)?.output_url || null;
      const inputUrl = inputCol ? (data as any)?.[inputCol] || null : null;

      setJobOutputUrl(outputUrl);
      setJobInputUrl(inputUrl);
    } catch (err) {
      console.error("Error fetching output_url:", err);
      setJobOutputUrl(null);
      setJobInputUrl(null);
    } finally {
      setIsLoadingOutput(false);
    }
  }, [fetchErrorDetails]);

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
      
      const { data: records, error: recordsError } = await supabase.rpc('get_ai_tools_usage', {
        p_start_date: start?.toISOString() || null,
        p_end_date: end?.toISOString() || null,
        p_page: currentPage,
        p_page_size: ITEMS_PER_PAGE
      });

      if (recordsError) throw recordsError;
      setUsageRecords(records || []);

      // Fetch user types
      const userIds = [...new Set((records || []).map((r: UsageRecord) => r.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const [subsRes, creditsRes, promoRes, trialRes] = await Promise.all([
          supabase.from('planos2_subscriptions').select('user_id').eq('is_active', true).neq('plan_slug', 'free').in('user_id', userIds),
          supabase.from('upscaler_credits').select('user_id, lifetime_balance').gt('lifetime_balance', 0).in('user_id', userIds),
          supabase.from('promo_claims').select('user_id').eq('promo_code', 'UPSCALER_1500').in('user_id', userIds),
          supabase.from('arcano_cloner_free_trials').select('user_id').in('user_id', userIds),
        ]);

        const premiumSet = new Set((subsRes.data || []).map(s => s.user_id));
        const lifetimeSet = new Set((creditsRes.data || []).map(c => c.user_id));
        const promoSet = new Set((promoRes.data || []).map(p => p.user_id));
        const trialSet = new Set((trialRes.data || []).map(t => t.user_id));

        const typeMap: Record<string, UserClientType> = {};
        for (const uid of userIds) {
          const isPremium = premiumSet.has(uid);
          const hasLifetime = lifetimeSet.has(uid);
          const hasPromo = promoSet.has(uid);
          const hasTrial = trialSet.has(uid);
          if (isPremium && hasLifetime) typeMap[uid] = 'premium_credits';
          else if (isPremium) typeMap[uid] = 'premium';
          else if (hasPromo) typeMap[uid] = 'redeemed_credits';
          else if (hasLifetime) typeMap[uid] = 'bought_credits';
          else if (hasTrial) typeMap[uid] = 'free_trial';
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
  }, [dateFilter, toolFilter, statusFilter]);

  const filteredRecords = useMemo(() => {
    let filtered = [...usageRecords];

    if (toolFilter !== "all") {
      filtered = filtered.filter(r => r.tool_name === toolFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.user_email?.toLowerCase().includes(term) ||
        r.user_name?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [usageRecords, toolFilter, statusFilter, searchTerm]);

  // Error analytics from current page data
  const errorAnalytics = useMemo(() => {
    const failedJobs = usageRecords.filter(r => r.status === 'failed');
    const errorByStep: Record<string, number> = {};
    const errorByTool: Record<string, number> = {};
    
    for (const job of failedJobs) {
      const step = job.failed_at_step || 'unknown';
      errorByStep[step] = (errorByStep[step] || 0) + 1;
      errorByTool[job.tool_name] = (errorByTool[job.tool_name] || 0) + 1;
    }
    
    return {
      totalFailed: failedJobs.length,
      errorRate: usageRecords.length > 0 ? ((failedJobs.length / usageRecords.length) * 100).toFixed(1) : '0',
      byStep: Object.entries(errorByStep).sort((a, b) => b[1] - a[1]),
      byTool: Object.entries(errorByTool).sort((a, b) => b[1] - a[1]),
    };
  }, [usageRecords]);

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
          </div>
        );
      case "running":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Processando</Badge>;
      case "queued":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Na Fila</Badge>;
      case "starting":
        return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Iniciando</Badge>;
      case "pending":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Pendente</Badge>;
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
      "Gerar Imagem - Flux 2": "bg-amber-500/20 text-amber-400 border-amber-500/30",
      "Gerar Imagem - Nano Banana": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      "Gerar Vídeo": "bg-rose-500/20 text-rose-400 border-rose-500/30",
      "Flyer Maker": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
      "Remover Fundo": "bg-teal-500/20 text-teal-400 border-teal-500/30",
      "MovieLed Maker": "bg-violet-500/20 text-violet-400 border-violet-500/30",
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
      case 'redeemed_credits':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Resgate Créditos</Badge>;
      case 'free_trial':
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Trial Gratuito</Badge>;
      case 'premium':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Premium</Badge>;
      case 'premium_credits':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Premium + Créditos</Badge>;
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
        fetchData();
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

  const getFailedAtStepBadge = (step: string | null) => {
    if (!step) return <span className="text-muted-foreground text-xs">-</span>;
    const stepColors: Record<string, string> = {
      'pending_timeout': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'uploading_user_image': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'uploading_reference_image': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'creating_task': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'webhook_received': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'downloading_result': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'consuming_credits': 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
      <Badge className={`text-[10px] ${stepColors[step] || 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
        {step}
      </Badge>
    );
  };

  const renderJsonBlock = (label: string, data: any) => {
    if (!data) return null;
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <ScrollArea className="max-h-[200px] rounded border border-border bg-muted/30 p-2">
          <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">
            {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
          </pre>
        </ScrollArea>
      </div>
    );
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

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map(f => (
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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

          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-xs text-red-400">Falhas</p>
                <p className="text-xl font-bold text-red-400">{summary.failed_jobs}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Activity className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-xs text-red-400">Taxa de Erro</p>
                <p className="text-xl font-bold text-red-400">{errorAnalytics.errorRate}%</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Coins className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Custo Total (R$)</p>
                <p className="text-xl font-bold">{formatBRL(summary.total_rh_cost * CUSTO_POR_RH_COIN)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Receita Usuários (R$)</p>
                <p className="text-xl font-bold">{formatBRL(summary.total_user_credits * RECEITA_POR_CREDITO)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xs text-green-400">Lucro Total (R$)</p>
                <p className="text-xl font-bold text-green-400">{formatBRL(summary.total_user_credits * RECEITA_POR_CREDITO - summary.total_rh_cost * CUSTO_POR_RH_COIN)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Breakdown Cards */}
      {errorAnalytics.totalFailed > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-red-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                <Bug className="h-4 w-4" />
                Erros por Etapa (página atual)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {errorAnalytics.byStep.map(([step, count]) => (
                  <div key={step} className="flex items-center justify-between text-sm">
                    {getFailedAtStepBadge(step)}
                    <span className="font-mono text-red-400 font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Erros por Ferramenta (página atual)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {errorAnalytics.byTool.map(([tool, count]) => (
                  <div key={tool} className="flex items-center justify-between text-sm">
                    {getToolBadge(tool)}
                    <span className="font-mono text-red-400 font-bold">{count}</span>
                  </div>
                ))}
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
            {statusFilter === 'failed' && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 ml-2">Somente Falhas</Badge>
            )}
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
                  <TableHead className="whitespace-nowrap">Etapa do Erro</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Fila?</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Espera</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Processamento</TableHead>
                   <TableHead className="whitespace-nowrap text-right">Custo (R$)</TableHead>
                   <TableHead className="whitespace-nowrap text-right">Receita (R$)</TableHead>
                   <TableHead className="whitespace-nowrap text-right">Lucro (R$)</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id} className={`cursor-pointer hover:bg-muted/50 ${record.status === 'failed' ? 'bg-red-500/5' : ''}`} onClick={() => handleJobClick(record)}>
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
                      <TableCell>
                        {record.status === 'failed' ? getFailedAtStepBadge(record.failed_at_step) : <span className="text-muted-foreground text-xs">-</span>}
                      </TableCell>
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
                      {(() => {
                        const rhCostBRL = record.rh_cost * CUSTO_POR_RH_COIN;
                        const apiCost = API_COST_MAP[record.tool_name] || 0;
                        const totalCost = rhCostBRL + (record.status === 'completed' ? apiCost : 0);
                        const receita = record.user_credit_cost * RECEITA_POR_CREDITO;
                        const lucro = receita - totalCost;
                        return (
                          <>
                            <TableCell className="text-right font-mono text-sm">
                              {totalCost > 0 ? formatBRL(totalCost) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {receita > 0 ? formatBRL(receita) : "-"}
                            </TableCell>
                            <TableCell className={`text-right font-mono text-sm font-bold ${lucro > 0 ? 'text-green-400' : lucro < 0 ? 'text-red-400' : ''}`}>
                              {record.user_credit_cost > 0 || totalCost > 0 ? formatBRL(lucro) : "-"}
                            </TableCell>
                          </>
                        );
                      })()}
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

      {/* Job Modal - Completed (output) or Failed (error details) */}
      <Dialog open={outputModalOpen} onOpenChange={setOutputModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedJob && getToolBadge(selectedJob.tool_name)}
              {selectedJob && getStatusBadge(selectedJob)}
              <span className="text-sm font-normal text-muted-foreground">
                {selectedJob?.user_email}
              </span>
            </DialogTitle>
            <DialogDescription>
              {selectedJob && formatDateTime(selectedJob.created_at)}
              {selectedJob?.id && (
                <span className="ml-2 text-xs font-mono text-muted-foreground">ID: {selectedJob.id.slice(0, 8)}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            {/* FAILED JOB - Show full error details */}
            {selectedJob && selectedJob.status !== "completed" ? (
              <>
                {/* Error summary from RPC data */}
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <h3 className="font-semibold text-red-400">Detalhes do Erro</h3>
                  </div>
                  
                  {selectedJob.error_message && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Mensagem de Erro</p>
                      <p className="text-sm text-red-300 bg-red-950/50 rounded p-2 font-mono break-all">{selectedJob.error_message}</p>
                    </div>
                  )}

                  {selectedJob.failed_at_step && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Etapa da falha:</span>
                      {getFailedAtStepBadge(selectedJob.failed_at_step)}
                    </div>
                  )}
                </div>

                {/* Detailed error data from direct table query */}
                {isLoadingErrorDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Carregando logs detalhados...</span>
                  </div>
                ) : errorDetails ? (
                  <div className="space-y-3">
                    {/* Credits status */}
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Créditos cobrados:</span>
                        {errorDetails.credits_charged ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Sim</Badge>
                        ) : (
                          <Badge variant="outline">Não</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Estornados:</span>
                        {errorDetails.credits_refunded ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Sim</Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Não</Badge>
                        )}
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {errorDetails.current_step && (
                        <span>Último step: <code className="text-foreground">{errorDetails.current_step}</code></span>
                      )}
                      {errorDetails.task_id && (
                        <span>Task ID: <code className="text-foreground">{errorDetails.task_id}</code></span>
                      )}
                      {errorDetails.api_account && (
                        <span>API: <code className="text-foreground">{errorDetails.api_account}</code></span>
                      )}
                    </div>

                    {/* Full error message from DB (may differ from RPC) */}
                    {errorDetails.error_message && errorDetails.error_message !== selectedJob.error_message && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Erro Completo (banco)</p>
                        <p className="text-sm text-red-300 bg-red-950/50 rounded p-2 font-mono break-all">{errorDetails.error_message}</p>
                      </div>
                    )}

                    {/* Step History */}
                    {renderJsonBlock("Step History (Timeline)", errorDetails.step_history)}

                    {/* Raw API Response */}
                    {renderJsonBlock("Raw API Response", errorDetails.raw_api_response)}

                    {/* Raw Webhook Payload */}
                    {renderJsonBlock("Raw Webhook Payload", errorDetails.raw_webhook_payload)}
                  </div>
                ) : null}

                {/* Input image for failed jobs */}
                {jobInputUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Imagem Enviada pelo Usuário</p>
                    <img
                      src={jobInputUrl}
                      alt="Imagem enviada"
                      className="w-full rounded-md max-h-[400px] object-contain border border-border cursor-pointer"
                      onClick={() => window.open(jobInputUrl, '_blank')}
                    />
                    <Button variant="outline" size="sm" asChild>
                      <a href={jobInputUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Imagem Original
                      </a>
                    </Button>
                  </div>
                )}
              </>
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
            ) : jobInputUrl && selectedJob && !isVideoTool(selectedJob.tool_name) ? (
              <ZoomableBeforeAfter
                beforeImage={jobInputUrl}
                afterImage={jobOutputUrl}
                onFullscreenClick={() => setShowFullscreen(true)}
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

          {jobOutputUrl && !isOutputExpired && selectedJob?.status === "completed" && (
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

      {/* Fullscreen Before/After Modal */}
      {jobInputUrl && jobOutputUrl && (
        <FullscreenModal
          isOpen={showFullscreen}
          onClose={() => setShowFullscreen(false)}
          beforeImage={jobInputUrl}
          afterImage={jobOutputUrl}
          locale="pt"
        />
      )}
    </div>
  );
};

export default AdminAIToolsUsageTab;
