import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Users, TrendingUp, Clock, CalendarIcon, Check, X, Trophy, ArrowUpDown, Search, Banknote, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import PartnerToolRatesAdmin from "./PartnerToolRatesAdmin";
import PartnerGamificationAdmin from "./PartnerGamificationAdmin";
import PartnerReconciliationAdmin from "./PartnerReconciliationAdmin";
import PartnersManagementContent from "@/components/PartnersManagementContent";
import CollaboratorRequestsContent from "./CollaboratorRequestsContent";

const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  pago: { label: "Pago", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
  recusado: { label: "Recusado", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const PIX_LABELS: Record<string, string> = { cpf: "CPF", email: "E-mail", telefone: "Telefone", aleatoria: "Aleatória" };

function maskPix(type: string, key: string): string {
  if (type === "cpf" && key.length >= 3) return `***.***.***-${key.slice(-2)}`;
  if (type === "email" && key.includes("@")) { const [l, d] = key.split("@"); return `${l.slice(0, 2)}***@${d}`; }
  if (type === "telefone" && key.length >= 4) return `****${key.slice(-4)}`;
  return key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : key;
}

interface PartnerRow {
  id: string; name: string; email: string; is_active: boolean;
  total_earned: number; total_unlocks: number;
  approved_prompts: number; total_paid: number;
  pix_key?: string; pix_key_type?: string;
  unlock_earned: number;
  tool_earned: number;
  tool_jobs: number;
  bonus_earned: number;
}

interface WithdrawalRow {
  id: string; partner_id: string; partner_name: string;
  valor_solicitado: number; pix_key: string; pix_key_type: string;
  status: string; admin_notes: string | null;
  created_at: string; processed_at: string | null;
}

interface EarningRow {
  id: string; prompt_title: string; amount: number; unlocked_at: string; user_id: string;
  earning_type: 'unlock' | 'tool_usage' | 'bonus'; tool_table?: string;
}

type Tab = "overview" | "withdrawals" | "ranking" | "detail" | "gamification" | "reconciliation" | "manage-partners" | "requests";
type PeriodFilter = "today" | "7days" | "30days" | "all" | "custom";
type RankCriteria = "earnings" | "unlocks" | "prompts";
type SortKey = "name" | "total_earned" | "total_paid" | "available" | "total_unlocks" | "approved_prompts" | "tool_jobs" | "tool_earned";

const PartnerEarningsAdminContent = () => {
  const [tab, setTab] = useState<Tab>("overview");
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total_earned");
  const [sortAsc, setSortAsc] = useState(false);
  const [wdFilter, setWdFilter] = useState("todos");
  const [rankBy, setRankBy] = useState<RankCriteria>("earnings");
  const [rankPage, setRankPage] = useState(1);
  const RANK_PER_PAGE = 20;

  // Detail tab state
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [detailEarnings, setDetailEarnings] = useState<EarningRow[]>([]);
  const [detailPeriod, setDetailPeriod] = useState<PeriodFilter>("30days");
  const [detailCustomFrom, setDetailCustomFrom] = useState<Date | undefined>();
  const [detailCustomTo, setDetailCustomTo] = useState<Date | undefined>();
  const [detailPage, setDetailPage] = useState(0);
  const PAGE_SIZE = 20;

  // Modals
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [modalWdId, setModalWdId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    const [pRes, bRes, ppRes, wRes, pixRes, uRes, tRes, bonusRes] = await Promise.all([
      supabase.from("partners").select("id, name, email, is_active"),
      supabase.from("collaborator_balances").select("collaborator_id, total_earned, total_unlocks"),
      supabase.from("partner_prompts").select("partner_id").eq("approved", true),
      supabase.from("partner_withdrawals").select("*").order("created_at", { ascending: false }),
      supabase.from("partner_pix_keys").select("partner_id, pix_key, pix_key_type"),
      supabase.from("collaborator_unlock_earnings").select("collaborator_id, amount"),
      supabase.from("collaborator_tool_earnings").select("collaborator_id, amount"),
      supabase.from("partner_bonus_payments" as any).select("partner_id, amount"),
    ]);

    const balMap = new Map((bRes.data || []).map(b => [b.collaborator_id, b]));
    const promptMap = new Map<string, number>();
    (ppRes.data || []).forEach(p => promptMap.set(p.partner_id, (promptMap.get(p.partner_id) || 0) + 1));
    const pixMap = new Map((pixRes.data || []).map(p => [p.partner_id, p]));

    // Aggregate from source-of-truth tables
    const unlockSumMap = new Map<string, number>();
    const unlockCountMap = new Map<string, number>();
    (uRes.data || []).forEach(r => {
      unlockSumMap.set(r.collaborator_id, (unlockSumMap.get(r.collaborator_id) || 0) + Number(r.amount || 0));
      unlockCountMap.set(r.collaborator_id, (unlockCountMap.get(r.collaborator_id) || 0) + 1);
    });
    const toolSumMap = new Map<string, number>();
    const toolCountMap = new Map<string, number>();
    (tRes.data || []).forEach(r => {
      toolSumMap.set(r.collaborator_id, (toolSumMap.get(r.collaborator_id) || 0) + Number(r.amount || 0));
      toolCountMap.set(r.collaborator_id, (toolCountMap.get(r.collaborator_id) || 0) + 1);
    });
    const bonusSumMap = new Map<string, number>();
    ((bonusRes?.data as any[]) || []).forEach((r: any) => {
      bonusSumMap.set(r.partner_id, (bonusSumMap.get(r.partner_id) || 0) + Number(r.amount || 0));
    });

    // Compute paid totals per partner
    const paidMap = new Map<string, number>();
    (wRes.data || []).filter(w => w.status === "pago").forEach(w => {
      paidMap.set(w.partner_id, (paidMap.get(w.partner_id) || 0) + Number(w.valor_solicitado));
    });

    const nameMap = new Map((pRes.data || []).map(p => [p.id, p.name]));

    const rows: PartnerRow[] = (pRes.data || []).map(p => {
      const pix = pixMap.get(p.id);
      const unlockEarned = unlockSumMap.get(p.id) || 0;
      const toolEarned = toolSumMap.get(p.id) || 0;
      const bonusEarned = bonusSumMap.get(p.id) || 0;
      const realEarned = unlockEarned + toolEarned + bonusEarned;
      const realUnlocks = unlockCountMap.get(p.id) || 0;
      return {
        id: p.id, name: p.name, email: p.email, is_active: p.is_active,
        total_earned: realEarned,
        total_unlocks: realUnlocks,
        approved_prompts: promptMap.get(p.id) || 0,
        total_paid: paidMap.get(p.id) || 0,
        pix_key: pix?.pix_key, pix_key_type: pix?.pix_key_type,
        unlock_earned: unlockEarned,
        tool_earned: toolEarned,
        tool_jobs: toolCountMap.get(p.id) || 0,
        bonus_earned: bonusEarned,
      };
    });
    setPartners(rows);

    const wRows: WithdrawalRow[] = (wRes.data || []).map(w => ({
      ...w, partner_name: nameMap.get(w.partner_id) || "Desconhecido",
    }));
    setWithdrawals(wRows);
    setIsLoading(false);
  };

  // Detail: fetch earnings for selected partner
  useEffect(() => {
    if (!selectedPartnerId) return;
    const fetchDetail = async () => {
      const [unlockRes, toolRes, bonusDetailRes] = await Promise.all([
        supabase
        .from("collaborator_unlock_earnings")
        .select("id, prompt_title, amount, unlocked_at, user_id")
        .eq("collaborator_id", selectedPartnerId)
        .order("unlocked_at", { ascending: false }),
        supabase
          .from("collaborator_tool_earnings")
          .select("id, prompt_title, amount, created_at, user_id, tool_table")
          .eq("collaborator_id", selectedPartnerId)
          .order("created_at", { ascending: false }),
        supabase
          .from('partner_bonus_payments' as any)
          .select('id, amount, reason, created_at')
          .eq('partner_id', selectedPartnerId)
          .order('created_at', { ascending: false }),
      ]);
      const unlocks: EarningRow[] = (unlockRes.data || []).map(e => ({ ...e, earning_type: 'unlock' as const }));
      const tools: EarningRow[] = (toolRes.data || []).map(e => ({
        id: e.id, prompt_title: e.prompt_title, amount: e.amount,
        unlocked_at: e.created_at, user_id: e.user_id,
        earning_type: 'tool_usage' as const, tool_table: e.tool_table,
      }));
      const bonuses: EarningRow[] = ((bonusDetailRes?.data as any[]) || []).map((b: any) => ({
        id: b.id,
        prompt_title: b.reason || 'Bônus Ranking',
        amount: b.amount,
        unlocked_at: b.created_at,
        user_id: '',
        earning_type: 'bonus' as const,
      }));
      const merged = [...unlocks, ...tools, ...bonuses].sort(
        (a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
      );
      setDetailEarnings(merged);
      setDetailPage(0);
    };
    fetchDetail();
  }, [selectedPartnerId]);

  const getDetailRange = () => {
    const now = new Date();
    switch (detailPeriod) {
      case "today": return { from: startOfDay(now), to: endOfDay(now) };
      case "7days": return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
      case "30days": return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
      case "custom": return { from: detailCustomFrom ? startOfDay(detailCustomFrom) : null, to: detailCustomTo ? endOfDay(detailCustomTo) : endOfDay(now) };
      default: return { from: null, to: null };
    }
  };

  const filteredDetailEarnings = useMemo(() => {
    const { from, to } = getDetailRange();
    if (!from && !to) return detailEarnings;
    return detailEarnings.filter(e => {
      const d = new Date(e.unlocked_at);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [detailEarnings, detailPeriod, detailCustomFrom, detailCustomTo]);

  const detailPeriodTotal = useMemo(() => filteredDetailEarnings.reduce((s, e) => s + Number(e.amount), 0), [filteredDetailEarnings]);
  const pagedDetailEarnings = filteredDetailEarnings.slice(detailPage * PAGE_SIZE, (detailPage + 1) * PAGE_SIZE);
  const detailTotalPages = Math.ceil(filteredDetailEarnings.length / PAGE_SIZE);

  // Withdrawal actions
  const handlePay = async () => {
    if (!modalWdId) return;
    setIsProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("partner_withdrawals").update({ status: "pago", processed_at: new Date().toISOString(), processed_by: user?.id }).eq("id", modalWdId);
    if (error) toast.error("Erro"); else { toast.success("Saque pago!"); fetchAll(); }
    setShowPayModal(false); setModalWdId(null); setIsProcessing(false);
  };

  const handleReject = async () => {
    if (!modalWdId || !rejectReason.trim()) { toast.error("Informe o motivo"); return; }
    setIsProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("partner_withdrawals").update({ status: "recusado", admin_notes: rejectReason.trim(), processed_at: new Date().toISOString(), processed_by: user?.id }).eq("id", modalWdId);
    if (error) toast.error("Erro"); else { toast.success("Saque recusado"); fetchAll(); }
    setShowRejectModal(false); setModalWdId(null); setRejectReason(""); setIsProcessing(false);
  };

  // Computed
  const totalPaid = withdrawals.filter(w => w.status === "pago").reduce((s, w) => s + Number(w.valor_solicitado), 0);
  const totalPending = withdrawals.filter(w => w.status === "pendente").reduce((s, w) => s + Number(w.valor_solicitado), 0);
  const totalUnlocksAll = partners.reduce((s, p) => s + p.total_unlocks, 0);
  const totalToolJobsAll = partners.reduce((s, p) => s + p.tool_jobs, 0);
  const activeWithEarnings = partners.filter(p => p.total_earned > 0).length;

  // Sorting & filtering
  const sortedPartners = useMemo(() => {
    let list = partners.filter(p => {
      if (!search) return true;
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    });
    list.sort((a, b) => {
      let va: number, vb: number;
      switch (sortKey) {
        case "name": return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        case "total_earned": va = a.total_earned; vb = b.total_earned; break;
        case "total_paid": va = a.total_paid; vb = b.total_paid; break;
        case "available": va = a.total_earned - a.total_paid; vb = b.total_earned - b.total_paid; break;
        case "total_unlocks": va = a.total_unlocks; vb = b.total_unlocks; break;
        case "approved_prompts": va = a.approved_prompts; vb = b.approved_prompts; break;
        case "tool_jobs": va = a.tool_jobs; vb = b.tool_jobs; break;
        case "tool_earned": va = a.tool_earned; vb = b.tool_earned; break;
        default: va = 0; vb = 0;
      }
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [partners, search, sortKey, sortAsc]);

  const filteredWithdrawals = wdFilter === "todos" ? withdrawals : withdrawals.filter(w => w.status === wdFilter);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const openDetail = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    setTab("detail");
  };

  // Ranking
  const ranked = useMemo(() => {
    const list = [...partners].filter(p => p.total_earned > 0 || p.approved_prompts > 0);
    switch (rankBy) {
      case "earnings": list.sort((a, b) => b.total_earned - a.total_earned); break;
      case "unlocks": list.sort((a, b) => b.total_unlocks - a.total_unlocks); break;
      case "prompts": list.sort((a, b) => b.approved_prompts - a.approved_prompts); break;
    }
    return list;
  }, [partners, rankBy]);

  const rankTotalPages = Math.max(1, Math.ceil(ranked.length / RANK_PER_PAGE));
  const rankedPage = ranked.slice((rankPage - 1) * RANK_PER_PAGE, rankPage * RANK_PER_PAGE);

  const MEDAL_COLORS = ["text-yellow-400", "text-gray-400", "text-amber-600"];

  if (isLoading) return <p className="text-muted-foreground text-center py-12">Carregando...</p>;

  const selectedPartner = partners.find(p => p.id === selectedPartnerId);
  const selectedPartnerWithdrawals = withdrawals.filter(w => w.partner_id === selectedPartnerId);
  const selectedPendingWd = selectedPartnerWithdrawals.find(w => w.status === "pendente");

  const tabs: { id: Tab; label: string }[] = [
    { id: "manage-partners", label: "👥 Gerenciar Parceiros" },
    { id: "requests", label: "📋 Solicitações" },
    { id: "overview", label: "Visão Geral" },
    { id: "withdrawals", label: "Saques" },
    { id: "ranking", label: "Ranking" },
    { id: "detail", label: "Extrato por Colaborador" },
    { id: "gamification", label: "🎮 Gamificação" },
    { id: "reconciliation", label: "🔍 Reconciliação" },
  ];

  const SortHeader = ({ label, sk }: { label: string; sk: SortKey }) => (
    <button onClick={() => handleSort(sk)} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
      {label} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Painel de Colaboradores</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(t => (
          <Button key={t.id} variant={tab === t.id ? "default" : "outline"} size="sm" onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {tab === "overview" && (
        <div>
          {/* Tool Rates Management */}
          <PartnerToolRatesAdmin />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Card className="p-4 bg-green-500/10 border-green-500/20">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-green-400" />
                <div><p className="text-xs text-muted-foreground">Total Pago</p><p className="text-xl font-bold text-green-400">{formatBRL(totalPaid)}</p></div>
              </div>
            </Card>
            <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-400" />
                <div><p className="text-xs text-muted-foreground">Pendente de Saque</p><p className="text-xl font-bold text-yellow-400">{formatBRL(totalPending)}</p></div>
              </div>
            </Card>
            <Card className="p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                <div><p className="text-xs text-muted-foreground">Prompts Copiados Totais</p><p className="text-xl font-bold text-blue-400">{totalUnlocksAll}</p></div>
              </div>
            </Card>
            <Card className="p-4 bg-purple-500/10 border-purple-500/20">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                <div><p className="text-xs text-muted-foreground">Jobs IA Totais</p><p className="text-xl font-bold text-purple-400">{totalToolJobsAll}</p></div>
              </div>
            </Card>
            <Card className="p-4 bg-primary/10 border-primary/20">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div><p className="text-xs text-muted-foreground">Colaboradores com Ganhos</p><p className="text-xl font-bold text-primary">{activeWithEarnings}</p></div>
              </div>
            </Card>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2"><SortHeader label="Nome" sk="name" /></th>
                  <th className="text-right py-2 px-2"><SortHeader label="Saldo Bruto" sk="total_earned" /></th>
                  <th className="text-right py-2 px-2"><SortHeader label="Saques Pagos" sk="total_paid" /></th>
                  <th className="text-right py-2 px-2"><SortHeader label="Disponível" sk="available" /></th>
                   <th className="text-right py-2 px-2"><SortHeader label="P. Copiados" sk="total_unlocks" /></th>
                  <th className="text-right py-2 px-2"><SortHeader label="🤖 Jobs IA" sk="tool_jobs" /></th>
                  <th className="text-right py-2 px-2"><SortHeader label="R$ Ferramentas" sk="tool_earned" /></th>
                  <th className="text-right py-2 px-2"><SortHeader label="Prompts" sk="approved_prompts" /></th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground">PIX</th>
                  <th className="text-right py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {sortedPartners.map(p => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </td>
                    <td className="text-right py-2 px-2 text-green-400 font-medium">{formatBRL(p.total_earned)}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground">{formatBRL(p.total_paid)}</td>
                    <td className="text-right py-2 px-2 text-emerald-400 font-medium">{formatBRL(p.total_earned - p.total_paid)}</td>
                    <td className="text-right py-2 px-2">{p.total_unlocks}</td>
                    <td className="text-right py-2 px-2 text-purple-400 font-medium">{p.tool_jobs}</td>
                    <td className="text-right py-2 px-2 text-purple-300">{formatBRL(p.tool_earned)}</td>
                    <td className="text-right py-2 px-2">{p.approved_prompts}</td>
                    <td className="py-2 px-2 text-xs">
                      {p.pix_key ? <span>{PIX_LABELS[p.pix_key_type || ""] || ""}: {maskPix(p.pix_key_type || "", p.pix_key)}</span> : <span className="text-yellow-400">Não cadastrada</span>}
                    </td>
                    <td className="text-right py-2 px-2">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(p.id)}>Ver Extrato</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedPartners.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum colaborador encontrado</p>}
          </div>
        </div>
      )}

      {/* TAB: WITHDRAWALS */}
      {tab === "withdrawals" && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {["todos", "pendente", "pago", "recusado"].map(f => (
              <Button key={f} variant={wdFilter === f ? "default" : "outline"} size="sm" onClick={() => setWdFilter(f)}>
                {f === "todos" ? "Todos" : f === "pendente" ? "Pendentes" : f === "pago" ? "Pagos" : "Recusados"}
              </Button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground">Data</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground">Colaborador</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">Valor</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground">PIX</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-right py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredWithdrawals.map(w => {
                  const cfg = STATUS_CFG[w.status] || STATUS_CFG.pendente;
                  return (
                    <tr key={w.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 text-muted-foreground">{format(new Date(w.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
                      <td className="py-2 px-2 font-medium text-foreground">{w.partner_name}</td>
                      <td className="text-right py-2 px-2 font-medium">{formatBRL(Number(w.valor_solicitado))}</td>
                      <td className="py-2 px-2 text-xs">{PIX_LABELS[w.pix_key_type]}: {w.pix_key}</td>
                      <td className="text-center py-2 px-2"><Badge className={cfg.cls}>{cfg.label}</Badge></td>
                      <td className="text-right py-2 px-2">
                        {w.status === "pendente" && (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline" onClick={() => { setModalWdId(w.id); setShowPayModal(true); }}><Check className="h-3 w-3 mr-1" /> Pagar</Button>
                            <Button size="sm" variant="outline" onClick={() => { setModalWdId(w.id); setShowRejectModal(true); }}><X className="h-3 w-3 mr-1" /> Recusar</Button>
                          </div>
                        )}
                        {w.status === "pago" && w.processed_at && <span className="text-xs text-muted-foreground">{format(new Date(w.processed_at), "dd/MM/yyyy", { locale: ptBR })}</span>}
                        {w.status === "recusado" && w.admin_notes && <span className="text-xs text-red-400" title={w.admin_notes}>Motivo: {w.admin_notes.slice(0, 30)}{w.admin_notes.length > 30 ? "..." : ""}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredWithdrawals.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum saque encontrado</p>}
          </div>
        </div>
      )}

      {/* TAB: RANKING */}
      {tab === "ranking" && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
             {([["earnings", "Por Ganhos"], ["unlocks", "Por Prompts Copiados"], ["prompts", "Por Prompts"]] as [RankCriteria, string][]).map(([k, l]) => (
              <Button key={k} variant={rankBy === k ? "default" : "outline"} size="sm" onClick={() => { setRankBy(k); setRankPage(1); }}>{l}</Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mb-4">{ranked.length} colaboradores • Página {rankPage} de {rankTotalPages}</p>
          <div className="space-y-3">
            {rankedPage.map((p, idx) => {
              const i = (rankPage - 1) * RANK_PER_PAGE + idx;
               const mainValue = rankBy === "earnings" ? formatBRL(p.total_earned) : rankBy === "unlocks" ? `${p.total_unlocks} prompts copiados` : `${p.approved_prompts} prompts`;
              const isTop3 = i < 3;
              return (
                <Card key={p.id} className={cn("p-4 flex items-center gap-4", isTop3 && "border-2", i === 0 && "border-yellow-500/40", i === 1 && "border-gray-400/40", i === 2 && "border-amber-600/40")}>
                  <div className={cn("text-2xl font-bold w-10 text-center", isTop3 ? MEDAL_COLORS[i] : "text-muted-foreground")}>
                    {isTop3 ? <Trophy className={cn("h-6 w-6 mx-auto", MEDAL_COLORS[i])} /> : `#${i + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{p.name}</p>
                    <p className="text-lg font-bold text-primary">{mainValue}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground space-y-0.5">
                    {rankBy !== "earnings" && <p>{formatBRL(p.total_earned)}</p>}
                     {rankBy !== "unlocks" && <p>{p.total_unlocks} prompts copiados</p>}
                    {rankBy !== "prompts" && <p>{p.approved_prompts} prompts</p>}
                  </div>
                </Card>
              );
            })}
            {ranked.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum colaborador com ganhos</p>}
          </div>
          {rankTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" disabled={rankPage <= 1} onClick={() => setRankPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: rankTotalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === rankTotalPages || Math.abs(p - rankPage) <= 2)
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  typeof p === 'string' ? (
                    <span key={`ellipsis-${idx}`} className="text-muted-foreground px-1">…</span>
                  ) : (
                    <Button key={p} variant={p === rankPage ? "default" : "outline"} size="sm" className="w-9 h-9" onClick={() => setRankPage(p)}>
                      {p}
                    </Button>
                  )
                )}
              <Button variant="outline" size="sm" disabled={rankPage >= rankTotalPages} onClick={() => setRankPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB: DETAIL */}
      {tab === "detail" && (
        <div>
          <div className="mb-6">
            <Label>Selecionar Colaborador</Label>
            <Select value={selectedPartnerId || ""} onValueChange={v => setSelectedPartnerId(v)}>
              <SelectTrigger><SelectValue placeholder="Escolha um colaborador..." /></SelectTrigger>
              <SelectContent>
                {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.email})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedPartner && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <Card className="p-4 bg-green-500/10 border-green-500/20">
                  <p className="text-xs text-muted-foreground">Saldo Bruto</p>
                  <p className="text-xl font-bold text-green-400">{formatBRL(selectedPartner.total_earned)}</p>
                </Card>
                <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
                  <p className="text-xs text-muted-foreground">Disponível p/ Saque</p>
                  <p className="text-xl font-bold text-emerald-400">{formatBRL(selectedPartner.total_earned - selectedPartner.total_paid)}</p>
                </Card>
                <Card className="p-4 bg-blue-500/10 border-blue-500/20">
                   <p className="text-xs text-muted-foreground">Prompts Copiados</p>
                  <p className="text-xl font-bold text-blue-400">{selectedPartner.total_unlocks}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Chave PIX</p>
                  <p className="text-sm font-medium text-foreground">
                    {selectedPartner.pix_key ? `${PIX_LABELS[selectedPartner.pix_key_type || ""]}: ${maskPix(selectedPartner.pix_key_type || "", selectedPartner.pix_key)}` : "Não cadastrada"}
                  </p>
                </Card>
              </div>

              {/* Breakdown por tipo de ganho */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <Card className="p-3 bg-blue-500/5 border-blue-500/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">🖱️ Prompts Copiados</p>
                  <p className="text-base font-bold text-blue-400">{formatBRL(selectedPartner.unlock_earned)}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedPartner.total_unlocks} cópias</p>
                </Card>
                <Card className="p-3 bg-purple-500/5 border-purple-500/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">🤖 Ferramentas de IA</p>
                  <p className="text-base font-bold text-purple-400">{formatBRL(selectedPartner.tool_earned)}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedPartner.tool_jobs} jobs</p>
                </Card>
                <Card className="p-3 bg-yellow-500/5 border-yellow-500/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">🏆 Bônus Ranking</p>
                  <p className="text-base font-bold text-yellow-400">{formatBRL(selectedPartner.bonus_earned)}</p>
                </Card>
              </div>

              {selectedPendingWd && (
                <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between">
                  <span className="text-sm text-yellow-400">Saque pendente: {formatBRL(Number(selectedPendingWd.valor_solicitado))}</span>
                  <Button size="sm" onClick={() => { setModalWdId(selectedPendingWd.id); setShowPayModal(true); }}>Processar</Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {([["today", "Hoje"], ["7days", "7 Dias"], ["30days", "30 Dias"], ["all", "Todo Período"], ["custom", "Personalizado"]] as [PeriodFilter, string][]).map(([k, l]) => (
                  <Button key={k} variant={detailPeriod === k ? "default" : "outline"} size="sm" onClick={() => setDetailPeriod(k)}>{l}</Button>
                ))}
              </div>

              {detailPeriod === "custom" && (
                <div className="flex flex-wrap gap-3 mb-4 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !detailCustomFrom && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />{detailCustomFrom ? format(detailCustomFrom, "dd/MM/yyyy") : "Início"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={detailCustomFrom} onSelect={setDetailCustomFrom} locale={ptBR} className="p-3 pointer-events-auto" /></PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">até</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !detailCustomTo && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />{detailCustomTo ? format(detailCustomTo, "dd/MM/yyyy") : "Fim"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={detailCustomTo} onSelect={setDetailCustomTo} locale={ptBR} className="p-3 pointer-events-auto" /></PopoverContent>
                  </Popover>
                </div>
              )}

              <Card className="overflow-hidden mb-4">
                <div className="divide-y divide-border">
                  {pagedDetailEarnings.length === 0 ? (
                     <p className="text-center text-muted-foreground py-8">Nenhum prompt copiado neste período</p>
                  ) : pagedDetailEarnings.map(e => (
                    <div key={e.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {e.prompt_title}
                          {e.earning_type === 'tool_usage' && (
                            <span className="ml-1.5 text-xs text-blue-400">🛠 Uso na ferramenta</span>
                          )}
                          {e.earning_type === 'bonus' && (
                            <span className="ml-1.5 text-xs font-semibold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                              🏆 Bônus Ranking
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{format(new Date(e.unlocked_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 shrink-0">+{formatBRL(Number(e.amount))}</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              {detailTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Button variant="outline" size="sm" disabled={detailPage === 0} onClick={() => setDetailPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm text-muted-foreground">{detailPage + 1} / {detailTotalPages}</span>
                  <Button variant="outline" size="sm" disabled={detailPage >= detailTotalPages - 1} onClick={() => setDetailPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              )}

              <div className="text-right text-sm text-muted-foreground mb-6">
                {filteredDetailEarnings.length} prompt{filteredDetailEarnings.length !== 1 ? "s" : ""} copiado{filteredDetailEarnings.length !== 1 ? "s" : ""} • Total: {formatBRL(detailPeriodTotal)}
              </div>

              {/* Partner's withdrawal history */}
              {selectedPartnerWithdrawals.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Saques deste Colaborador</h3>
                  <Card className="overflow-hidden">
                    <div className="divide-y divide-border">
                      {selectedPartnerWithdrawals.map(w => {
                        const cfg = STATUS_CFG[w.status] || STATUS_CFG.pendente;
                        return (
                          <div key={w.id} className="px-4 py-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">{formatBRL(Number(w.valor_solicitado))}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(w.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                              {w.status === "recusado" && w.admin_notes && <p className="text-xs text-red-400 mt-0.5">Motivo: {w.admin_notes}</p>}
                            </div>
                            <Badge className={cfg.cls}>{cfg.label}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Pay Modal */}
      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Pagamento</DialogTitle></DialogHeader>
          {modalWdId && (() => {
            const w = withdrawals.find(x => x.id === modalWdId);
            return w ? (
              <div className="space-y-2">
                <p><strong>Colaborador:</strong> {w.partner_name}</p>
                <p><strong>Valor:</strong> {formatBRL(Number(w.valor_solicitado))}</p>
                <p><strong>PIX:</strong> {PIX_LABELS[w.pix_key_type]}: {w.pix_key}</p>
              </div>
            ) : null;
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayModal(false)}>Cancelar</Button>
            <Button onClick={handlePay} disabled={isProcessing}>{isProcessing ? "Processando..." : "Confirmar Pagamento"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recusar Saque</DialogTitle></DialogHeader>
          <div><Label>Motivo da recusa *</Label><Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Informe o motivo..." /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing || !rejectReason.trim()}>{isProcessing ? "Processando..." : "Recusar Saque"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TAB: GAMIFICATION */}
      {tab === "gamification" && <PartnerGamificationAdmin />}

      {/* TAB: RECONCILIATION */}
      {tab === "reconciliation" && <PartnerReconciliationAdmin />}

      {/* TAB: MANAGE PARTNERS */}
      {tab === "manage-partners" && <PartnersManagementContent />}

      {/* TAB: REQUESTS */}
      {tab === "requests" && <CollaboratorRequestsContent />}
    </div>
  );
};

export default PartnerEarningsAdminContent;