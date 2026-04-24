import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, DollarSign, TrendingUp, CalendarIcon, MousePointerClick, Banknote, Wallet, Home, Upload, Trophy, User, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import PartnerPixKeySection from "@/components/partner/PartnerPixKeySection";
import PartnerWithdrawalHistory from "@/components/partner/PartnerWithdrawalHistory";
import WithdrawalRequestModal from "@/components/partner/WithdrawalRequestModal";

type PeriodFilter = "today" | "7days" | "30days" | "all" | "custom";

interface EarningRecord {
  id: string;
  prompt_id: string;
  prompt_title: string;
  amount: number;
  unlock_date: string;
  unlocked_at: string;
  user_id: string;
  earning_type: 'unlock' | 'tool_usage' | 'bonus';
  tool_table?: string;
  thumbnail_url?: string | null;
  prompt_text?: string | null;
  category?: string | null;
}

interface PixKey {
  id: string;
  pix_key: string;
  pix_key_type: string;
}

interface Withdrawal {
  id: string;
  valor_solicitado: number;
  pix_key: string;
  pix_key_type: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
}

const PartnerEarnings = () => {
  const navigate = useNavigate();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalUnlocks, setTotalUnlocks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30days");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [pixKey, setPixKey] = useState<PixKey | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [topPromptsPage, setTopPromptsPage] = useState(0);

  useEffect(() => {
    checkAccessAndFetch();
  }, []);

  const checkAccessAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/parceiro-login'); return; }

    const { data: partnerData } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!partnerData) { toast.error("Acesso negado"); navigate('/'); return; }

    setPartnerId(partnerData.id);

    // Fetch total balance
    const { data: balanceData } = await supabase
      .from('collaborator_balances')
      .select('total_earned, total_unlocks')
      .eq('collaborator_id', partnerData.id)
      .maybeSingle();

    setTotalBalance(balanceData?.total_earned || 0);
    setTotalUnlocks(balanceData?.total_unlocks || 0);

    const [earningsRes, toolEarningsRes, bonusRes, pixRes, withdrawalsRes] = await Promise.all([
      supabase.from('collaborator_unlock_earnings')
        .select('id, prompt_id, prompt_title, amount, unlock_date, unlocked_at, user_id')
        .eq('collaborator_id', partnerData.id)
        .order('unlocked_at', { ascending: false }),
      supabase.from('collaborator_tool_earnings')
        .select('id, prompt_id, prompt_title, amount, created_at, user_id, tool_table')
        .eq('collaborator_id', partnerData.id)
        .order('created_at', { ascending: false }),
      supabase.from('partner_bonus_payments' as any)
        .select('id, amount, reason, created_at')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false }),
      supabase.from('partner_pix_keys')
        .select('id, pix_key, pix_key_type')
        .eq('partner_id', partnerData.id)
        .maybeSingle(),
      supabase.from('partner_withdrawals')
        .select('id, valor_solicitado, pix_key, pix_key_type, status, admin_notes, created_at, processed_at')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false }),
    ]);

    // Merge unlock earnings + tool earnings into unified list
    const unlockRecords: EarningRecord[] = (earningsRes.data || []).map(e => ({
      ...e, earning_type: 'unlock' as const,
    }));
    const toolRecords: EarningRecord[] = (toolEarningsRes.data || []).map(e => ({
      id: e.id, prompt_id: e.prompt_id, prompt_title: e.prompt_title,
      amount: e.amount, unlock_date: e.created_at, unlocked_at: e.created_at,
      user_id: e.user_id, earning_type: 'tool_usage' as const, tool_table: e.tool_table,
    }));
    const bonusRecords: EarningRecord[] = ((bonusRes.data as any[]) || []).map((b: any) => ({
      id: b.id, prompt_id: '', prompt_title: b.reason || 'Bônus',
      amount: b.amount, unlock_date: b.created_at, unlocked_at: b.created_at,
      user_id: '', earning_type: 'bonus' as const,
    }));
    const merged = [...unlockRecords, ...toolRecords, ...bonusRecords].sort(
      (a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
    );

    // Fetch thumbnails/details for all unique prompt_ids in batch (from partner_prompts)
    const promptIds = Array.from(new Set(merged.filter(m => m.prompt_id).map(m => m.prompt_id)));
    if (promptIds.length > 0) {
      const { data: promptsData } = await supabase
        .from('partner_prompts')
        .select('id, image_url, thumbnail_url, prompt, category')
        .in('id', promptIds);
      const pMap = new Map<string, any>();
      (promptsData || []).forEach(p => pMap.set(p.id, p));
      merged.forEach(m => {
        const p = pMap.get(m.prompt_id);
        if (p) {
          m.thumbnail_url = p.thumbnail_url || p.image_url;
          m.prompt_text = p.prompt;
          m.category = p.category;
        }
      });
    }

    setEarnings(merged);
    setPixKey(pixRes.data || null);
    setWithdrawals((withdrawalsRes.data as Withdrawal[]) || []);

    setIsLoading(false);
  };

  const getDateRange = (): { from: Date | null; to: Date | null } => {
    const now = new Date();
    switch (periodFilter) {
      case "today":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "7days":
        return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
      case "30days":
        return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
      case "custom":
        return {
          from: customFrom ? startOfDay(customFrom) : null,
          to: customTo ? endOfDay(customTo) : endOfDay(now),
        };
      case "all":
      default:
        return { from: null, to: null };
    }
  };

  const totalPago = useMemo(() => {
    return withdrawals.filter(w => w.status === 'pago').reduce((sum, w) => sum + Number(w.valor_solicitado), 0);
  }, [withdrawals]);

  // SOURCE OF TRUTH: sum from real earnings records, not from (possibly stale) collaborator_balances.total_earned
  const realTotalEarned = useMemo(
    () => earnings.reduce((s, e) => s + Number(e.amount), 0),
    [earnings]
  );
  const saldoDisponivel = realTotalEarned - totalPago;
  const hasPendingWithdrawal = withdrawals.some(w => w.status === 'pendente');
  const canRequestWithdrawal = saldoDisponivel >= 100 && !hasPendingWithdrawal && !!pixKey;

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const refreshData = () => { setIsLoading(true); checkAccessAndFetch(); };

  const filteredEarnings = useMemo(() => {
    const { from, to } = getDateRange();
    if (!from && !to) return earnings;

    return earnings.filter(e => {
      const d = new Date(e.unlocked_at);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [earnings, periodFilter, customFrom, customTo]);

  const periodTotal = useMemo(() => {
    return filteredEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [filteredEarnings]);

  // Top prompts ranking: aggregate clicks (unlocks) + tool usages by prompt_id
  const topPrompts = useMemo(() => {
    const agg = new Map<string, { prompt_id: string; title: string; thumbnail_url?: string | null; category?: string | null; unlocks: number; tools: number; total_uses: number; total_earned: number }>();
    earnings.forEach(e => {
      if (!e.prompt_id || e.earning_type === 'bonus') return;
      const cur = agg.get(e.prompt_id) || {
        prompt_id: e.prompt_id,
        title: e.prompt_title,
        thumbnail_url: e.thumbnail_url,
        category: e.category,
        unlocks: 0,
        tools: 0,
        total_uses: 0,
        total_earned: 0,
      };
      if (e.earning_type === 'unlock') cur.unlocks += 1;
      if (e.earning_type === 'tool_usage') cur.tools += 1;
      cur.total_uses = cur.unlocks + cur.tools;
      cur.total_earned += Number(e.amount);
      if (!cur.thumbnail_url && e.thumbnail_url) cur.thumbnail_url = e.thumbnail_url;
      agg.set(e.prompt_id, cur);
    });
    return Array.from(agg.values()).sort((a, b) => b.total_uses - a.total_uses);
  }, [earnings]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  const filterButtons: { key: PeriodFilter; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "7days", label: "7 Dias" },
    { key: "30days", label: "30 Dias" },
    { key: "all", label: "Todo Período" },
    { key: "custom", label: "Personalizado" },
  ];

  const navigate_path = (p: string) => navigate(p);

  // Compute breakdown from earnings
  const unlockTotal = earnings.filter(e => e.earning_type === 'unlock').reduce((s, e) => s + Number(e.amount), 0);
  const unlockCount = earnings.filter(e => e.earning_type === 'unlock').length;
  const toolTotal = earnings.filter(e => e.earning_type === 'tool_usage').reduce((s, e) => s + Number(e.amount), 0);
  const toolCount = earnings.filter(e => e.earning_type === 'tool_usage').length;

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(topPrompts.length / PAGE_SIZE));
  const paginatedTop = topPrompts.slice(topPromptsPage * PAGE_SIZE, (topPromptsPage + 1) * PAGE_SIZE);

  const getEarningIcon = (e: EarningRecord) => {
    if (e.earning_type === 'bonus') return '🏆';
    if (e.earning_type === 'tool_usage') {
      if (e.tool_table?.includes('seedance')) return '🎬';
      if (e.tool_table?.includes('cloner')) return '🎭';
      if (e.tool_table?.includes('upscaler')) return '🔍';
      if (e.tool_table?.includes('flyer')) return '🎨';
      return '🤖';
    }
    return '🖱️';
  };

  const getEarningBg = (e: EarningRecord) => {
    if (e.earning_type === 'bonus') return 'bg-yellow-500/10';
    if (e.earning_type === 'tool_usage') return 'bg-green-500/10';
    return 'bg-primary/10';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* TopBar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-base font-bold text-foreground">💰 Extrato de Ganhos</h1>
          </div>
          {canRequestWithdrawal && (
            <button
              onClick={() => setShowWithdrawalModal(true)}
              className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
            >
              Solicitar Saque
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-20 md:pb-8">
        {!pixKey && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-500">
            ⚠️ Cadastre sua chave PIX para poder solicitar saques.
          </div>
        )}
        {hasPendingWithdrawal && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary">
            ⏳ Você já possui uma solicitação de saque pendente. Aguarde o processamento.
          </div>
        )}

        {/* Hero Card */}
        <div className="mx-4 mt-3 mb-3 rounded-2xl bg-card border border-border p-5 overflow-hidden">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Saldo Disponível</p>
          <p className="text-3xl font-extrabold text-foreground leading-none">{formatBRL(saldoDisponivel)}</p>
          <p className="text-xs text-muted-foreground mt-1.5 break-words">
            Total bruto: {formatBRL(realTotalEarned)} • Já sacado: {formatBRL(totalPago)}
          </p>
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">🖱️ Prompts Copiados</p>
              <p className="text-base font-bold text-primary">{formatBRL(unlockTotal)}</p>
              <p className="text-[10px] text-muted-foreground">{unlockCount} cópias</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">🤖 Ferramentas</p>
              <p className="text-base font-bold text-primary">{formatBRL(toolTotal)}</p>
              <p className="text-[10px] text-muted-foreground">{toolCount} jobs</p>
            </div>
          </div>
        </div>

        {/* Ganho no Período */}
        <div className="mx-4 mb-3 bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Ganho no Período</p>
            <p className="text-xl font-bold text-primary">{formatBRL(periodTotal)}</p>
          </div>
          <p className="text-xs text-muted-foreground">{filteredEarnings.length} registros</p>
        </div>

        {partnerId && <div className="px-4"><PartnerPixKeySection partnerId={partnerId} pixKey={pixKey} onPixKeyChange={setPixKey} /></div>}

        {/* Top Prompts Ranking */}
        {topPrompts.length > 0 && (
          <div className="mx-4 mb-3 bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <p className="text-sm font-bold text-foreground">Seus Top Prompts</p>
                <span className="text-[10px] text-muted-foreground">({topPrompts.length})</span>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTopPromptsPage(p => Math.max(0, p - 1))}
                    disabled={topPromptsPage === 0}
                    className="p-1 rounded hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <span className="text-[10px] text-muted-foreground">
                    {topPromptsPage + 1}/{totalPages}
                  </span>
                  <button
                    onClick={() => setTopPromptsPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={topPromptsPage >= totalPages - 1}
                    className="p-1 rounded hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
            <div className="divide-y divide-border">
              {paginatedTop.map((tp, idx) => {
                const rank = topPromptsPage * PAGE_SIZE + idx + 1;
                return (
                  <div key={tp.prompt_id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={cn(
                      "text-xs font-bold w-6 text-center flex-shrink-0",
                      rank === 1 && "text-yellow-500",
                      rank === 2 && "text-gray-400",
                      rank === 3 && "text-orange-600",
                      rank > 3 && "text-muted-foreground"
                    )}>#{rank}</span>
                    {tp.thumbnail_url ? (
                      <img
                        src={tp.thumbnail_url}
                        alt={tp.title}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-border"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center text-base">🖼️</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{tp.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>🖱️ {tp.unlocks}</span>
                        <span>🤖 {tp.tools}</span>
                        <span className="font-semibold text-primary">{tp.total_uses} usos</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary flex-shrink-0">{formatBRL(tp.total_earned)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex gap-2 px-4 mb-3 overflow-x-auto scrollbar-hide pb-1">
          {filterButtons.map(fb => (
            <button
              key={fb.key}
              onClick={() => setPeriodFilter(fb.key)}
              className={`flex-shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
                periodFilter === fb.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {fb.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        {periodFilter === "custom" && (
          <div className="flex flex-wrap gap-3 mb-4 px-4 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal text-xs", !customFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {customFrom ? format(customFrom, "dd/MM/yyyy") : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-xs">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal text-xs", !customTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {customTo ? format(customTo, "dd/MM/yyyy") : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Earnings List */}
        <div className="bg-card border border-border rounded-2xl mx-4 overflow-hidden">
          <div className="divide-y divide-border">
            {filteredEarnings.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <MousePointerClick className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum registro neste período</p>
              </div>
            ) : (
              filteredEarnings.map(e => {
                const isExpanded = expandedId === e.id;
                const canExpand = !!e.thumbnail_url || !!e.prompt_text;
                return (
                  <div key={e.id}>
                    <button
                      type="button"
                      onClick={() => canExpand && setExpandedId(isExpanded ? null : e.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                        canExpand && "hover:bg-muted/40 cursor-pointer"
                      )}
                    >
                      {e.thumbnail_url ? (
                        <img
                          src={e.thumbnail_url}
                          alt={e.prompt_title}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-border"
                          loading="lazy"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-lg ${getEarningBg(e)} flex items-center justify-center text-base flex-shrink-0`}>
                          {getEarningIcon(e)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{e.prompt_title}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(e.unlocked_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                          {e.earning_type === 'tool_usage' && <span className="text-[10px] text-green-500">🤖 Ferramenta</span>}
                          {e.earning_type === 'unlock' && <span className="text-[10px] text-primary">🖱️ Cópia</span>}
                          {e.earning_type === 'bonus' && <span className="text-[10px] text-yellow-400">🏆 Bônus</span>}
                        </div>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${e.earning_type === 'bonus' ? 'text-yellow-500' : 'text-primary'}`}>
                        +{formatBRL(Number(e.amount))}
                      </span>
                      {canExpand && (
                        isExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 bg-muted/20 border-t border-border">
                        <div className="flex flex-col sm:flex-row gap-3 mt-2">
                          {e.thumbnail_url && (
                            <img
                              src={e.thumbnail_url}
                              alt={e.prompt_title}
                              className="w-full sm:w-48 h-48 rounded-lg object-cover border border-border flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 space-y-2 text-xs">
                            {e.category && (
                              <div>
                                <span className="text-muted-foreground">Categoria: </span>
                                <span className="text-foreground font-medium">{e.category}</span>
                              </div>
                            )}
                            {e.tool_table && (
                              <div>
                                <span className="text-muted-foreground">Ferramenta: </span>
                                <span className="text-foreground font-medium">{e.tool_table.replace(/_jobs$/, '').replace(/_/g, ' ')}</span>
                              </div>
                            )}
                            {e.prompt_text && (
                              <div>
                                <p className="text-muted-foreground mb-1">Prompt:</p>
                                <div className="bg-background rounded-lg p-2 border border-border whitespace-pre-wrap text-foreground max-h-40 overflow-y-auto text-[11px]">
                                  {e.prompt_text}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {filteredEarnings.length > 0 && (
          <div className="mt-3 px-4 text-right text-xs text-muted-foreground">
            {filteredEarnings.length} registro{filteredEarnings.length !== 1 ? 's' : ''} • Total: {formatBRL(periodTotal)}
          </div>
        )}

        <div className="px-4">
          <PartnerWithdrawalHistory withdrawals={withdrawals} />
        </div>

        {partnerId && pixKey && (
          <WithdrawalRequestModal
            open={showWithdrawalModal}
            onOpenChange={setShowWithdrawalModal}
            partnerId={partnerId}
            saldoDisponivel={saldoDisponivel}
            pixKey={pixKey.pix_key}
            pixKeyType={pixKey.pix_key_type}
            onSuccess={refreshData}
            onEditPix={() => setShowWithdrawalModal(false)}
          />
        )}
      </div>

      {/* Bottom Navigation — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center">
          {[
            { icon: Home, label: 'Home', path: '/parceiro-dashboard', active: false },
            { icon: Upload, label: 'Enviar', path: '/parceiro-upload', active: false },
            { icon: Trophy, label: 'Conquistas', path: '/parceiro-conquistas', active: false },
            { icon: DollarSign, label: 'Extrato', path: '/parceiro-extrato', active: true },
            { icon: User, label: 'Perfil', path: '/parceiro-dashboard', active: false },
          ].map(({ icon: NavIcon, label, path, active }) => (
            <button
              key={label}
              onClick={() => navigate_path(path)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5"
            >
              <NavIcon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] font-semibold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
              {active && <div className="w-1 h-1 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};


export default PartnerEarnings;