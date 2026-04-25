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
import { useAIToolSettings } from "@/hooks/useAIToolSettings";

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
  total_credits: number;
  total_profit: number;
  queued_jobs: number;
  avg_queue_wait: number;
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

interface ToolRegistryEntry {
  id: string;
  tool_name: string;
  display_name: string;
  table_name: string;
  is_video_tool: boolean;
  input_image_column: string | null;
  output_column: string;
  cost_column: string | null;
  credit_column: string;
  has_failed_at_step: boolean;
  has_queue_tracking: boolean;
  has_started_at: boolean;
  badge_color: string;
  display_order: number;
  engine_filter_column: string | null;
  engine_filter_value: string | null;
  enabled: boolean;
}

type UserClientType = 'free' | 'bought_credits' | 'redeemed_credits' | 'free_trial' | 'premium' | 'premium_credits' | 'unlimited' | 'gpt_free_trial';

const ITEMS_PER_PAGE = 20;

// Conversion constants
const CUSTO_POR_RH_COIN = 0.002; // R$ per RH coin
const RECEITA_POR_CREDITO_PADRAO = 0.007;
const RECEITA_POR_CREDITO_HISTORICA = 0.007;
const RECEITA_CORTE_HISTORICO_ISO = "2026-04-11T21:50:00.000Z";
// gpt_free_trial NÃO entra aqui: é uma promo adicional concedida a assinantes
// pagantes (Starter/Pro/Ultimate) durante 7 dias — eles continuam gerando receita
// normal pelo plano que pagaram. Apenas planos sem cobrança de uso zeram receita.
const USER_TYPES_SEM_RECEITA = new Set<UserClientType>(["free", "free_trial", "unlimited"]);

// Ferramentas/engines que cobram crédito MESMO de Unlimited.
// Para esses, a receita NÃO deve ser zerada só porque o usuário é Unlimited.
// MovieLed: Kling 2.5 Turbo e Veo 3.1 são cobrados; Wan 2.2 é coberto pelo Unlimited.
// Seedance 2.0: cobra todos (forced billing).
const TOOLS_FORCE_CHARGE_UNLIMITED = new Set<string>(["Seedance 2.0"]);
const MOVIELED_FORCE_CHARGE_ENGINES = new Set<string>(["kling2.5", "veo3.1"]);

const API_COST_FALLBACK_MAP: Record<string, number> = {
  "Arcano Cloner": 0.36,
  "Gerador Avatar": 0.18,
  "Gerar Imagem - Nano Banana": 0.36,
  "GPT Image": 0.05,
  "GPT Image Evolink": 0.05,
};

const API_COST_SETTING_KEY_MAP: Record<string, string[]> = {
  "Arcano Cloner": ["Arcano Cloner"],
  "Gerador Avatar": ["Gerador Avatar"],
  "Gerar Imagem - Nano Banana": ["gerar_imagem_nano2", "gerar_imagem"],
  "Gerar Imagem - Flux 2": ["gerar_imagem", "gerar_imagem_nano2"],
  "GPT Image": ["GPT Image"],
  "GPT Image Evolink": ["GPT Image Evolink"],
  // MovieLed Maker NÃO usa custo fixo de ai_tool_settings.
  // Custo real vem do rh_cost salvo (consumeCoins do webhook RunningHub) +
  // custo Evolink quando engine = veo3.1 (calculado em getVideoCostBRL).
};

const getApiCostFromSettings = (
  toolName: string,
  settingsMap: Record<string, { has_api_cost: boolean; api_cost: number }>
) => {
  // MovieLed Maker é tratado por engine real (rh_cost + getVideoCostBRL). Nunca custo fixo.
  if (toolName === "MovieLed Maker") return 0;
  const settingKeys = API_COST_SETTING_KEY_MAP[toolName] ?? [toolName];

  for (const key of settingKeys) {
    const setting = settingsMap[key];
    if (setting?.has_api_cost) {
      return setting.api_cost;
    }
  }

  return API_COST_FALLBACK_MAP[toolName] ?? 0;
};

const VIDEO_COST_PER_SECOND: Record<string, number> = {
  "vgj:wan2.2": 0,
  "vgj:veo3.1:no_audio": 0.294,
  "vgj:veo3.1:audio": 0.294,
  "vgj:veo3.1-fast:no_audio": 0.504,
  "vgj:veo3.1-fast:audio": 0.758,
  "vgj:veo3.1-pro:no_audio": 0.984,
  "vgj:veo3.1-pro:audio": 1.924,
  "mlj:wan2.2": 0,
  "mlj:veo3.1": 0.504,
  "mlj:kling2.5": 0,
  "sdj:fast:480p:i2v": 0.344,
  "sdj:fast:480p:t2v": 0.374,
  "sdj:fast:720p:i2v": 0.724,
  "sdj:fast:720p:t2v": 0.794,
  "sdj:standard:480p:i2v": 0.424,
  "sdj:standard:480p:t2v": 0.467,
  "sdj:standard:720p:i2v": 0.884,
  "sdj:standard:720p:t2v": 0.974,
};

const MOVIELED_DURATION: Record<string, number> = { "wan2.2": 15, "veo3.1": 8, "kling2.5": 8 };

interface VideoJobDetail {
  id: string;
  model?: string;
  engine?: string;
  duration?: number;
  quality?: string;
  hasAudio?: boolean;
  hasImage?: boolean;
}

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatBRLPerCredit = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

const getReceitaPorCreditoAplicada = (createdAt: string, receitaAtual: number) => {
  const createdAtDate = new Date(createdAt);
  if (Number.isNaN(createdAtDate.getTime())) return receitaAtual;
  return createdAtDate < new Date(RECEITA_CORTE_HISTORICO_ISO)
    ? RECEITA_POR_CREDITO_HISTORICA
    : receitaAtual;
};

const DATE_FILTERS = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "30days", label: "Últimos 30 dias" },
  { value: "90days", label: "Últimos 90 dias" },
  { value: "all", label: "Todo período" },
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

const VIDEO_TOOL_NAMES = new Set(["Gerar Vídeo", "MovieLed Maker", "Seedance 2.0", "Video Upscaler"]);

const AdminAIToolsUsageTab = () => {
  const { settingsMap: aiToolSettingsMap } = useAIToolSettings();
  const [toolRegistry, setToolRegistry] = useState<ToolRegistryEntry[]>([]);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [toolCompletedCounts, setToolCompletedCounts] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState("7days");
  const [toolFilter, setToolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [userTypeMap, setUserTypeMap] = useState<Record<string, UserClientType>>({});
  const [receitaPorCreditoAtual, setReceitaPorCreditoAtual] = useState(RECEITA_POR_CREDITO_PADRAO);
  const [videoJobDetailsMap, setVideoJobDetailsMap] = useState<Record<string, VideoJobDetail>>({});
  
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

  // === Registry-driven helpers ===
  const getToolConfig = useCallback((toolName: string) => {
    return toolRegistry.find(t => t.display_name === toolName);
  }, [toolRegistry]);

  const isVideoTool = useCallback((toolName: string) => {
    const config = getToolConfig(toolName);
    return config?.is_video_tool ?? VIDEO_TOOL_NAMES.has(toolName);
  }, [getToolConfig]);

  const getInputColumn = useCallback((toolName: string): string | null => {
    return getToolConfig(toolName)?.input_image_column || null;
  }, [getToolConfig]);

  const getTableName = useCallback((toolName: string): string => {
    return getToolConfig(toolName)?.table_name || 'upscaler_jobs';
  }, [getToolConfig]);

  const getToolBadge = useCallback((toolName: string) => {
    const config = getToolConfig(toolName);
    const color = config?.badge_color || '';
    return <Badge className={color}>{toolName}</Badge>;
  }, [getToolConfig]);

  // Dynamic tool filters from registry
  const toolFilters = useMemo(() => [
    { value: "all", label: "Todas as ferramentas" },
    ...toolRegistry.map(t => ({ value: t.display_name, label: t.display_name }))
  ], [toolRegistry]);

  // Fetch registry on mount
  useEffect(() => {
    const fetchRegistry = async () => {
      const { data, error } = await supabase
        .from('ai_tool_registry')
        .select('*')
        .eq('enabled', true)
        .order('display_order');
      
      if (!error && data) {
        setToolRegistry(data as unknown as ToolRegistryEntry[]);
      }
    };
    fetchRegistry();
  }, []);

  const fetchErrorDetails = useCallback(async (record: UsageRecord) => {
    setIsLoadingErrorDetails(true);
    setErrorDetails(null);
    try {
      const tableName = getTableName(record.tool_name);
      // Build select dynamically based on registry capabilities (some tables lack failed_at_step)
      const entry = toolRegistry.find((t) => t.display_name === record.tool_name || t.tool_name === record.tool_name);
      const baseFields = ['error_message', 'raw_api_response', 'raw_webhook_payload', 'credits_charged', 'credits_refunded', 'task_id', 'api_account'];
      if (entry?.has_failed_at_step) baseFields.push('failed_at_step', 'current_step', 'step_history');
      const selectStr = baseFields.join(', ');

      const { data, error } = await supabase
        .from(tableName as any)
        .select(selectStr)
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
  }, [getTableName, toolRegistry]);

  const handleJobClick = useCallback(async (record: UsageRecord) => {
    setSelectedJob(record);
    setOutputModalOpen(true);
    setIsOutputExpired(false);
    setJobOutputUrl(null);
    setJobInputUrl(null);
    setShowFullscreen(false);
    setErrorDetails(null);

    if (record.status !== "completed") {
      fetchErrorDetails(record);
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
  }, [fetchErrorDetails, getTableName, getInputColumn]);

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

  const fetchReceitaPorCreditoAtual = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_receita_por_credito' as any);
      if (error) throw error;
      const result = data as { receita_por_credito?: number } | null;
      const receitaAtual = Number(result?.receita_por_credito);
      if (Number.isFinite(receitaAtual) && receitaAtual > 0) {
        setReceitaPorCreditoAtual(receitaAtual);
      }
    } catch (error) {
      console.error("Error fetching current revenue per credit:", error);
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { start, end } = getDateRange();
      
      const toolFilterParam = toolFilter === 'all' ? null : toolFilter;
      const statusFilterParam = statusFilter === 'all' ? null : statusFilter;
      const searchTermParam = debouncedSearch.trim() || null;
      
      // Use v2 RPCs with server-side status + search filter
      const { data: records, error: recordsError } = await supabase.rpc('get_ai_tools_usage_v2' as any, {
        p_start_date: start?.toISOString() || null,
        p_end_date: end?.toISOString() || null,
        p_page: currentPage,
        p_page_size: ITEMS_PER_PAGE,
        p_tool_filter: toolFilterParam,
        p_status_filter: statusFilterParam,
        p_search_term: searchTermParam
      });

      if (recordsError) throw recordsError;
      setUsageRecords(records || []);

      // Fetch video job details for per-second cost
      const videoRecords = (records || []).filter((r: UsageRecord) => isVideoTool(r.tool_name));
      if (videoRecords.length > 0) {
        const vgjIds = videoRecords.filter((r: UsageRecord) => r.tool_name === 'Gerar Vídeo').map((r: UsageRecord) => r.id);
        const mljIds = videoRecords.filter((r: UsageRecord) => r.tool_name === 'MovieLed Maker').map((r: UsageRecord) => r.id);
        const sdjIds = videoRecords.filter((r: UsageRecord) => r.tool_name === 'Seedance 2.0').map((r: UsageRecord) => r.id);
        const detailMap: Record<string, VideoJobDetail> = {};
        if (vgjIds.length > 0) {
          const { data } = await supabase.from('video_generator_jobs' as any).select('id, model, duration_seconds, job_payload').in('id', vgjIds);
          for (const row of (data || []) as any[]) { const p = row.job_payload as any; detailMap[row.id] = { id: row.id, model: row.model, duration: row.duration_seconds, hasAudio: p?.generateAudio === true }; }
        }
        if (mljIds.length > 0) {
          const { data } = await supabase.from('movieled_maker_jobs' as any).select('id, engine').in('id', mljIds);
          for (const row of (data || []) as any[]) { detailMap[row.id] = { id: row.id, engine: row.engine, duration: MOVIELED_DURATION[row.engine] || 8 }; }
        }
        if (sdjIds.length > 0) {
          const { data } = await supabase.from('seedance_jobs' as any).select('id, model, duration, quality, input_image_urls').in('id', sdjIds);
          for (const row of (data || []) as any[]) { const m = (row.model || '') as string; detailMap[row.id] = { id: row.id, model: m.includes('fast') ? 'fast' : 'standard', duration: row.duration || 8, quality: row.quality || '480p', hasImage: !m.includes('text-to-video') }; }
        }
        setVideoJobDetailsMap(detailMap);
      } else { setVideoJobDetailsMap({}); }

      // Fetch user types
      const userIds = [...new Set((records || []).map((r: UsageRecord) => r.user_id).filter(Boolean))] as string[];
      if (userIds.length > 0) {
        const [subsRes, creditsRes, promoRes, trialRes] = await Promise.all([
          supabase.from('planos2_subscriptions').select('user_id, plan_slug, gpt_image_free_until').eq('is_active', true).neq('plan_slug', 'free').in('user_id', userIds as string[]),
          supabase.from('upscaler_credits').select('user_id, lifetime_balance').gt('lifetime_balance', 0).in('user_id', userIds as string[]),
          supabase.from('promo_claims').select('user_id').eq('promo_code', 'UPSCALER_1500').in('user_id', userIds as string[]),
          supabase.from('arcano_cloner_free_trials').select('user_id').in('user_id', userIds as string[]),
        ]);

        const subsData = (subsRes.data || []) as any[];
        const unlimitedSet = new Set(subsData.filter((s: any) => s.plan_slug === 'unlimited').map((s: any) => s.user_id as string));
        const gptFreeSet = new Set(subsData.filter((s: any) => s.gpt_image_free_until && new Date(s.gpt_image_free_until) > new Date()).map((s: any) => s.user_id as string));
        const premiumSet = new Set(subsData.map((s: any) => s.user_id as string));
        const lifetimeSet = new Set((creditsRes.data || []).map((c: any) => c.user_id as string));
        const promoSet = new Set((promoRes.data || []).map((p: any) => p.user_id as string));
        const trialSet = new Set((trialRes.data || []).map((t: any) => t.user_id as string));

        const typeMap: Record<string, UserClientType> = {};
        for (const uid of userIds) {
          const isPremium = premiumSet.has(uid);
          const hasLifetime = lifetimeSet.has(uid);
          const hasPromo = promoSet.has(uid);
          const hasTrial = trialSet.has(uid);
          if (isPremium && hasLifetime) typeMap[uid] = 'premium_credits';
          else if (unlimitedSet.has(uid)) typeMap[uid] = 'unlimited';
          else if (isPremium) typeMap[uid] = 'premium';
          else if (gptFreeSet.has(uid)) typeMap[uid] = 'gpt_free_trial';
          else if (hasPromo) typeMap[uid] = 'redeemed_credits';
          else if (hasLifetime) typeMap[uid] = 'bought_credits';
          else if (hasTrial) typeMap[uid] = 'free_trial';
          else typeMap[uid] = 'free';
        }
        setUserTypeMap(typeMap);
      }

      // Fetch total count (v2 with status + search filter)
      const { data: countData, error: countError } = await supabase.rpc('get_ai_tools_usage_count_v2' as any, {
        p_start_date: start?.toISOString() || null,
        p_end_date: end?.toISOString() || null,
        p_tool_filter: toolFilterParam,
        p_status_filter: statusFilterParam,
        p_search_term: searchTermParam
      });

      if (countError) throw countError;
      setTotalCount(countData || 0);

      // Fetch summary and per-tool completed counts in parallel
      const [summaryRes, toolCountsRes] = await Promise.all([
        supabase.rpc('get_ai_tools_usage_summary_v2' as any, {
          p_start_date: start?.toISOString() || null,
          p_end_date: end?.toISOString() || null,
          p_tool_filter: toolFilterParam,
          p_status_filter: statusFilterParam,
          p_search_term: searchTermParam
        }),
        supabase.rpc('get_ai_tools_completed_by_tool' as any, {
          p_start_date: start?.toISOString() || null,
          p_end_date: end?.toISOString() || null,
          p_tool_filter: toolFilterParam,
          p_status_filter: statusFilterParam,
          p_search_term: searchTermParam
        })
      ]);

      if (summaryRes.error) throw summaryRes.error;
      setSummary(summaryRes.data?.[0] || null);

      // Build per-tool completed counts map
      const countsMap: Record<string, number> = {};
      for (const row of (toolCountsRes.data || []) as any[]) {
        countsMap[row.tool_name] = Number(row.completed_count) || 0;
      }
      setToolCompletedCounts(countsMap);

    } catch (error) {
      console.error("Error fetching AI tools usage:", error);
      toast.error("Erro ao carregar dados de uso");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (toolRegistry.length > 0) {
      fetchData();
    }
  }, [currentPage, dateFilter, toolFilter, statusFilter, debouncedSearch, toolRegistry]);

  useEffect(() => {
    fetchReceitaPorCreditoAtual();
    const intervalId = window.setInterval(() => { fetchReceitaPorCreditoAtual(); }, 60000);
    return () => window.clearInterval(intervalId);
  }, [fetchReceitaPorCreditoAtual]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, toolFilter, statusFilter, debouncedSearch]);

  // Debounce search input (400ms)
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  // No more client-side status filter — it's now server-side
  const filteredRecords = useMemo(() => {
    if (!searchTerm) return usageRecords;
    const term = searchTerm.toLowerCase();
    return usageRecords.filter(r =>
      r.user_email?.toLowerCase().includes(term) ||
      r.user_name?.toLowerCase().includes(term)
    );
  }, [usageRecords, searchTerm]);

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

  // Per-page revenue for per-row display only
  const receitaPaginaCalculada = useMemo(() => {
    let totalReceita = 0;
    for (const record of usageRecords) {
      totalReceita += getRecordRevenueInternal(record);
    }
    return totalReceita;
  }, [usageRecords, receitaPorCreditoAtual, userTypeMap]);

  function getRecordRevenueInternal(record: UsageRecord): number {
    if (record.status === 'failed') return 0;
    const userType = userTypeMap[record.user_id] || 'free';
    // Forced-charge tools/engines geram receita mesmo para Unlimited.
    const forced = isForcedChargeRecord(record);
    if (USER_TYPES_SEM_RECEITA.has(userType) && !forced) return 0;
    const receitaPorCreditoAplicada = getReceitaPorCreditoAplicada(record.created_at, receitaPorCreditoAtual);
    return record.user_credit_cost * receitaPorCreditoAplicada;
  }

  // ===== SUMMARY-LEVEL METRICS (all jobs in period, not just current page) =====
  
  // Error rate from summary totals
  const errorRateTotal = summary && summary.total_jobs > 0
    ? ((summary.failed_jobs / summary.total_jobs) * 100).toFixed(1)
    : '0';
  
  // Revenue from summary: total_credits (non-failed) * receita por crédito
  // Note: includes free/trial users but is accurate across ALL jobs
  const receitaTotalResumo = summary
    ? summary.total_credits * receitaPorCreditoAtual
    : 0;
  
  // Cost: RH cost + API cost (per-tool completed counts * api_cost from settings)
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const custoRHResumo = summary ? summary.total_rh_cost * CUSTO_POR_RH_COIN : 0;
  
  const custoAPIResumo = useMemo(() => {
    let total = 0;
    for (const [toolName, count] of Object.entries(toolCompletedCounts)) {
      const apiCost = getApiCostFromSettings(toolName, aiToolSettingsMap);
      total += count * apiCost;
      // Custo de vídeo (Evolink/Kling/etc) é calculado por linha em getVideoCostBRL com o
      // detalhamento real do job (engine, duração, áudio). Não somar média no resumo —
      // isso causava cobrança duplicada (ex.: MovieLed Kling = R$2 fixo + custo por segundo).
      // Mantemos apenas custos fixos de API por job vindos de ai_tool_settings.
    }
    return total;
  }, [toolCompletedCounts, aiToolSettingsMap]);
  
  const custoTotalResumo = custoRHResumo + custoAPIResumo;
  
  // Lucro: receita total - custo total (ambos do summary, mesmo escopo)
  const lucroTotalResumo = receitaTotalResumo - custoTotalResumo;

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

  const getUserTypeBadge = (userId: string) => {
    const type = userTypeMap[userId] || 'free';
    switch (type) {
      case 'free':
        return <Badge className="bg-accent0/20 text-muted-foreground border-gray-500/30">Free</Badge>;
      case 'bought_credits':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Comprou Créditos</Badge>;
      case 'redeemed_credits':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Resgate Créditos</Badge>;
      case 'free_trial':
        return <Badge className="bg-accent0/20 text-slate-400 border-slate-500/30">Trial Gratuito</Badge>;
      case 'premium':
        return <Badge className="bg-accent0/20 text-muted-foreground border-border">Premium</Badge>;
      case 'premium_credits':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Premium + Créditos</Badge>;
      case 'unlimited':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Unlimited</Badge>;
      case 'gpt_free_trial':
        return <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">GPT Grátis 7d</Badge>;
    }
  };

  const getVideoCostBRL = useCallback((record: UsageRecord): number => {
    if (!isVideoTool(record.tool_name) || record.status !== 'completed') return 0;
    const d = videoJobDetailsMap[record.id];
    if (!d) return 0;
    let cps = 0;
    const dur = d.duration || 8;
    if (record.tool_name === 'Gerar Vídeo') {
      const m = d.model || 'wan2.2';
      if (m === 'wan2.2') return 0;
      cps = VIDEO_COST_PER_SECOND[`vgj:${m}:${d.hasAudio ? 'audio' : 'no_audio'}`] || 0;
    } else if (record.tool_name === 'MovieLed Maker') {
      const e = d.engine || 'wan2.2';
      if (e === 'wan2.2') return 0;
      cps = VIDEO_COST_PER_SECOND[`mlj:${e}`] || 0;
    } else if (record.tool_name === 'Seedance 2.0') {
      cps = VIDEO_COST_PER_SECOND[`sdj:${d.model || 'fast'}:${d.quality || '480p'}:${d.hasImage ? 'i2v' : 't2v'}`] || 0;
    }
    return cps * dur;
  }, [videoJobDetailsMap, isVideoTool]);

  const getRecordRevenue = useCallback((record: UsageRecord) => {
    if (record.status === 'failed') return 0;
    const userType = userTypeMap[record.user_id] || 'free';
    const forced = isForcedChargeRecord(record);
    if (USER_TYPES_SEM_RECEITA.has(userType) && !forced) return 0;
    const receitaPorCreditoAplicada = getReceitaPorCreditoAplicada(record.created_at, receitaPorCreditoAtual);
    return record.user_credit_cost * receitaPorCreditoAplicada;
  }, [receitaPorCreditoAtual, userTypeMap, videoJobDetailsMap]);

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
      'webhook_received': 'bg-accent0/20 text-muted-foreground border-border',
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
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {toolFilters.map(f => (
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
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
                <p className="text-xl font-bold text-red-400">{errorRateTotal}%</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Coins className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Custo Total (R$)</p>
                <p className="text-xl font-bold">{formatBRL(custoTotalResumo)}</p>
                <p className="text-[0.6rem] text-muted-foreground">
                  Infra: {formatBRL(custoRHResumo)} · API/Vídeo: {formatBRL(custoAPIResumo)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Receita Total (R$)</p>
                <p className="text-xl font-bold">{formatBRL(receitaTotalResumo)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Receita por Crédito</p>
                <p className="text-xl font-bold">{formatBRLPerCredit(receitaPorCreditoAtual)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xs text-green-400">Lucro Total (R$)</p>
                <p className="text-xl font-bold text-green-400">{formatBRL(lucroTotalResumo)}</p>
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
                <p className="text-lg font-bold">{summary.queued_jobs} ({totalCount > 0 ? Math.round((summary.queued_jobs / summary.total_jobs) * 100) : 0}%)</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Tempo médio na fila</p>
                <p className="text-lg font-bold">{formatDuration(Math.round(summary.avg_queue_wait))}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Cpu className="h-6 w-6 text-slate-400" />
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
            {statusFilter !== 'all' && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 ml-2">
                Filtro: {STATUS_FILTERS.find(f => f.value === statusFilter)?.label}
              </Badge>
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
                        const isFailed = record.status === 'failed';
                        const rhCostBRL = isFailed ? 0 : record.rh_cost * CUSTO_POR_RH_COIN;
                        const apiCost = getApiCostFromSettings(record.tool_name, aiToolSettingsMap);
                        const videoCost = isFailed ? 0 : getVideoCostBRL(record);
                        const totalCost = isFailed ? 0 : rhCostBRL + (record.status === 'completed' ? apiCost : 0) + videoCost;
                        const receita = getRecordRevenue(record);
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
            {selectedJob && selectedJob.status !== "completed" ? (
              <>
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

                {isLoadingErrorDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Carregando logs detalhados...</span>
                  </div>
                ) : errorDetails ? (
                  <div className="space-y-3">
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

                    {errorDetails.error_message && errorDetails.error_message !== selectedJob.error_message && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Erro Completo (banco)</p>
                        <p className="text-sm text-red-300 bg-red-950/50 rounded p-2 font-mono break-all">{errorDetails.error_message}</p>
                      </div>
                    )}

                    {renderJsonBlock("Step History (Timeline)", errorDetails.step_history)}
                    {renderJsonBlock("Raw API Response", errorDetails.raw_api_response)}
                    {renderJsonBlock("Raw Webhook Payload", errorDetails.raw_webhook_payload)}
                  </div>
                ) : null}

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
