import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, DollarSign, TrendingUp, CalendarIcon, MousePointerClick, Banknote, Wallet } from "lucide-react";
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

    const [earningsRes, pixRes, withdrawalsRes] = await Promise.all([
      supabase.from('collaborator_unlock_earnings')
        .select('id, prompt_id, prompt_title, amount, unlock_date, unlocked_at, user_id')
        .eq('collaborator_id', partnerData.id)
        .order('unlocked_at', { ascending: false }),
      supabase.from('partner_pix_keys')
        .select('id, pix_key, pix_key_type')
        .eq('partner_id', partnerData.id)
        .maybeSingle(),
      supabase.from('partner_withdrawals')
        .select('id, valor_solicitado, pix_key, pix_key_type, status, admin_notes, created_at, processed_at')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false }),
    ]);

    if (earningsRes.error) console.error("Error fetching earnings:", earningsRes.error);
    else setEarnings(earningsRes.data || []);
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

  const saldoDisponivel = totalBalance - totalPago;
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Extrato de Ganhos</h1>
            <p className="text-muted-foreground">Acompanhe seus ganhos por desbloqueios de prompts</p>
          </div>
          </div>
          <Button onClick={() => setShowWithdrawalModal(true)} disabled={!canRequestWithdrawal} className="shrink-0">
            <Banknote className="h-4 w-4 mr-2" /> Solicitar Saque
          </Button>
        </div>

        {!pixKey && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-400">
            ⚠️ Cadastre sua chave PIX para poder solicitar saques.
          </div>
        )}
        {hasPendingWithdrawal && (
          <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400">
            ⏳ Você já possui uma solicitação de saque pendente. Aguarde o processamento.
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 bg-green-500/10 border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Total</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatBRL(totalBalance)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-emerald-500/10 border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disponível p/ Saque</p>
                <p className="text-2xl font-bold text-emerald-400">{formatBRL(saldoDisponivel)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-primary/10 border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ganho no Período</p>
                <p className="text-2xl font-bold text-primary">
                  {formatBRL(periodTotal)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-blue-500/10 border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <MousePointerClick className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Desbloqueios no Período</p>
                <p className="text-2xl font-bold text-blue-400">{filteredEarnings.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {partnerId && <PartnerPixKeySection partnerId={partnerId} pixKey={pixKey} onPixKeyChange={setPixKey} />}

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {filterButtons.map(fb => (
            <Button
              key={fb.key}
              variant={periodFilter === fb.key ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodFilter(fb.key)}
            >
              {fb.label}
            </Button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        {periodFilter === "custom" && (
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customFrom ? format(customFrom, "dd/MM/yyyy") : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
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
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {filteredEarnings.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <MousePointerClick className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum desbloqueio neste período</p>
              </div>
            ) : (
              filteredEarnings.map(e => (
                <div key={e.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{e.prompt_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(e.unlocked_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-3 shrink-0">
                    +R$ {Number(e.amount).toFixed(2).replace('.', ',')}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {filteredEarnings.length > 0 && (
          <div className="mt-4 text-right text-sm text-muted-foreground">
            {filteredEarnings.length} desbloqueio{filteredEarnings.length !== 1 ? 's' : ''} • Total: {formatBRL(periodTotal)}
          </div>
        )}

        <PartnerWithdrawalHistory withdrawals={withdrawals} />

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
    </div>
  );
};

export default PartnerEarnings;