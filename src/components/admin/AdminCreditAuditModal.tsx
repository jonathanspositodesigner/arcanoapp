import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, AlertTriangle, ArrowDownCircle, ArrowUpCircle,
  ShieldAlert, TrendingDown, TrendingUp, RotateCcw, Wrench
} from "lucide-react";

interface AuditUser {
  user_id: string;
  email: string;
  name: string;
  monthly_balance: number;
  lifetime_balance: number;
  total_balance: number;
}

interface Transaction {
  id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  description: string;
  credit_type: string;
  created_at: string;
}

interface AuditAlert {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  txId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AuditUser | null;
}

const formatNumber = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
const formatDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
    " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const AdminCreditAuditModal = ({ open, onOpenChange, user }: Props) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("resumo");

  useEffect(() => {
    if (open && user) {
      fetchAll();
    }
  }, [open, user]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("upscaler_credit_transactions")
        .select("id, amount, balance_after, transaction_type, description, credit_type, created_at")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(500);
      setTransactions(data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // Computed audit data
  const audit = useMemo(() => {
    if (!transactions.length || !user) return null;

    const consumptions = transactions.filter(t => t.transaction_type === "consumption");
    const autoRefunds = transactions.filter(t => t.transaction_type === "refund" && !t.description?.toLowerCase().includes("manual"));
    const manualRefunds = transactions.filter(t => t.transaction_type === "refund" && t.description?.toLowerCase().includes("manual"));
    const credits = transactions.filter(t => ["credit", "bonus", "arcano_free_trial", "admin", "admin_adjustment"].includes(t.transaction_type));
    const corrections = transactions.filter(t => ["correction", "reset"].includes(t.transaction_type));

    const totalConsumed = consumptions.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalAutoRefund = autoRefunds.reduce((s, t) => s + t.amount, 0);
    const totalManualRefund = manualRefunds.reduce((s, t) => s + t.amount, 0);
    const totalCredited = credits.reduce((s, t) => s + t.amount, 0);

    // Detect alerts
    const alerts: AuditAlert[] = [];

    // 1. Type mismatch: refund as monthly when user has no monthly subscription but has lifetime
    const monthlyRefunds = transactions.filter(t => t.transaction_type === "refund" && t.credit_type === "monthly");
    const lifetimeConsumptions = transactions.filter(t => t.transaction_type === "consumption" && t.credit_type === "lifetime");

    // If user has lifetime balance but refunds are monthly, flag it
    if (user.lifetime_balance > 0 && monthlyRefunds.length > 0) {
      for (const mr of monthlyRefunds) {
        // Check if there's a matching consumption nearby that was lifetime
        const nearbyLifetimeConsumption = lifetimeConsumptions.find(lc => {
          const refundTime = new Date(mr.created_at).getTime();
          const consumeTime = new Date(lc.created_at).getTime();
          return Math.abs(refundTime - consumeTime) < 60000 && Math.abs(lc.amount) === mr.amount;
        });
        if (nearbyLifetimeConsumption) {
          alerts.push({
            severity: "critical",
            title: "Estorno mensal para consumo vitalício",
            detail: `Estorno de ${formatNumber(mr.amount)} registrado como MENSAL, mas consumo correspondente era VITALÍCIO. Descrição: "${mr.description}"`,
            txId: mr.id
          });
        }
      }
    }

    // 2. Refund as lifetime when consumption was monthly
    const lifetimeRefunds = transactions.filter(t => t.transaction_type === "refund" && t.credit_type === "lifetime");
    const monthlyConsumptions = transactions.filter(t => t.transaction_type === "consumption" && t.credit_type === "monthly");

    if (user.monthly_balance > 0 && lifetimeRefunds.length > 0) {
      for (const lr of lifetimeRefunds) {
        const nearbyMonthlyConsumption = monthlyConsumptions.find(mc => {
          const refundTime = new Date(lr.created_at).getTime();
          const consumeTime = new Date(mc.created_at).getTime();
          return Math.abs(refundTime - consumeTime) < 60000 && Math.abs(mc.amount) === lr.amount;
        });
        if (nearbyMonthlyConsumption) {
          alerts.push({
            severity: "critical",
            title: "Estorno vitalício para consumo mensal",
            detail: `Estorno de ${formatNumber(lr.amount)} registrado como VITALÍCIO, mas consumo correspondente era MENSAL. Descrição: "${lr.description}"`,
            txId: lr.id
          });
        }
      }
    }

    // 3. Double refund: manual + auto for same description pattern in same minute
    for (const mr of manualRefunds) {
      const mrTime = new Date(mr.created_at).getTime();
      const duplicate = autoRefunds.find(ar => {
        const arTime = new Date(ar.created_at).getTime();
        return Math.abs(arTime - mrTime) < 300000 && ar.amount === mr.amount;
      });
      if (duplicate) {
        alerts.push({
          severity: "warning",
          title: "Possível estorno duplicado",
          detail: `Estorno manual de ${formatNumber(mr.amount)} e estorno automático de ${formatNumber(duplicate.amount)} ocorreram em <5min. Descrição manual: "${mr.description}"`,
          txId: mr.id
        });
      }
    }

    // 4. Balance integrity: compute expected balance from all transactions
    // Walk from oldest to newest
    const sorted = [...transactions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const lastTx = sorted[sorted.length - 1];
    if (lastTx && lastTx.balance_after !== user.total_balance) {
      alerts.push({
        severity: "warning",
        title: "Saldo divergente do último registro",
        detail: `Saldo atual: ${formatNumber(user.total_balance)}, último balance_after: ${formatNumber(lastTx.balance_after)}. Pode haver transações não registradas.`,
      });
    }

    // 5. Large manual refunds
    for (const mr of manualRefunds) {
      if (mr.amount >= 1000) {
        alerts.push({
          severity: "info",
          title: "Estorno manual alto",
          detail: `Estorno manual de ${formatNumber(mr.amount)} créditos em ${formatDate(mr.created_at)}. "${mr.description}"`,
          txId: mr.id
        });
      }
    }

    return {
      consumptions, autoRefunds, manualRefunds, credits, corrections,
      totalConsumed, totalAutoRefund, totalManualRefund, totalCredited,
      alerts
    };
  }, [transactions, user]);

  if (!user) return null;

  const getSeverityColor = (s: AuditAlert["severity"]) => {
    switch (s) {
      case "critical": return "bg-red-500/20 border-red-500/50 text-red-300";
      case "warning": return "bg-amber-500/20 border-amber-500/50 text-amber-300";
      case "info": return "bg-blue-500/20 border-blue-500/50 text-blue-300";
    }
  };

  const getSeverityIcon = (s: AuditAlert["severity"]) => {
    switch (s) {
      case "critical": return <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />;
      case "info": return <Wrench className="h-4 w-4 text-blue-400 shrink-0" />;
    }
  };

  const getTxTypeBadge = (tx: Transaction) => {
    if (tx.transaction_type === "consumption") return <Badge variant="outline" className="border-red-500 text-red-400 text-[9px]">Consumo</Badge>;
    if (tx.transaction_type === "refund" && tx.description?.toLowerCase().includes("manual"))
      return <Badge variant="outline" className="border-orange-500 text-orange-400 text-[9px]">Estorno Manual</Badge>;
    if (tx.transaction_type === "refund")
      return <Badge variant="outline" className="border-yellow-500 text-yellow-400 text-[9px]">Estorno Auto</Badge>;
    if (["credit", "bonus", "admin", "admin_adjustment", "arcano_free_trial"].includes(tx.transaction_type))
      return <Badge variant="outline" className="border-green-500 text-green-400 text-[9px]">Crédito</Badge>;
    return <Badge variant="outline" className="text-[9px]">{tx.transaction_type}</Badge>;
  };

  const getCreditTypeBadge = (ct: string) => {
    if (ct === "monthly") return <Badge variant="secondary" className="text-[9px] px-1">Mensal</Badge>;
    if (ct === "lifetime") return <Badge variant="secondary" className="text-[9px] px-1 bg-accent">Vitalício</Badge>;
    if (ct === "mixed") return <Badge variant="secondary" className="text-[9px] px-1 bg-amber-500/20 text-amber-400">Misto</Badge>;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Auditoria de Créditos
          </DialogTitle>
          <div className="flex items-center gap-3 pt-2">
            <div className="p-2 bg-muted rounded-lg flex-1">
              <p className="font-medium text-sm">{user.name || "Sem nome"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="px-3">
                <p className="text-[10px] text-muted-foreground">Mensal</p>
                <p className="text-sm font-bold text-blue-400">{formatNumber(user.monthly_balance)}</p>
              </div>
              <div className="px-3">
                <p className="text-[10px] text-muted-foreground">Vitalício</p>
                <p className="text-sm font-bold text-muted-foreground">{formatNumber(user.lifetime_balance)}</p>
              </div>
              <div className="px-3">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-bold text-green-400">{formatNumber(user.total_balance)}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : audit ? (
          <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="alertas" className="relative">
                Alertas
                {audit.alerts.length > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[9px] rounded-full px-1.5 py-0.5 font-bold">
                    {audit.alerts.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="estornos">Estornos</TabsTrigger>
              <TabsTrigger value="consumos">Consumos</TabsTrigger>
            </TabsList>

            {/* RESUMO */}
            <TabsContent value="resumo" className="flex-1 overflow-y-auto mt-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <TrendingDown className="h-5 w-5 text-red-400 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">Consumido</p>
                    <p className="text-lg font-bold text-red-400">{formatNumber(audit.totalConsumed)}</p>
                    <p className="text-[10px] text-muted-foreground">{audit.consumptions.length} ops</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <RotateCcw className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">Estorno Auto</p>
                    <p className="text-lg font-bold text-yellow-400">{formatNumber(audit.totalAutoRefund)}</p>
                    <p className="text-[10px] text-muted-foreground">{audit.autoRefunds.length} ops</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <Wrench className="h-5 w-5 text-orange-400 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">Estorno Manual</p>
                    <p className="text-lg font-bold text-orange-400">{formatNumber(audit.totalManualRefund)}</p>
                    <p className="text-[10px] text-muted-foreground">{audit.manualRefunds.length} ops</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <TrendingUp className="h-5 w-5 text-green-400 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">Creditado</p>
                    <p className="text-lg font-bold text-green-400">{formatNumber(audit.totalCredited)}</p>
                    <p className="text-[10px] text-muted-foreground">{audit.credits.length} ops</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick alerts summary */}
              {audit.alerts.filter(a => a.severity === "critical").length > 0 && (
                <div className="p-3 rounded-lg border border-red-500/50 bg-red-500/10">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-medium text-red-300">
                      {audit.alerts.filter(a => a.severity === "critical").length} alerta(s) crítico(s) encontrado(s)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Veja a aba "Alertas" para detalhes</p>
                </div>
              )}

              {/* Balance breakdown by type */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3">Breakdown por Tipo de Crédito</h4>
                  <div className="space-y-2">
                    {["monthly", "lifetime", "mixed"].map(ct => {
                      const txs = transactions.filter(t => t.credit_type === ct);
                      if (!txs.length) return null;
                      const consumed = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
                      const added = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
                      return (
                        <div key={ct} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <div className="flex items-center gap-2">
                            {getCreditTypeBadge(ct)}
                            <span className="text-xs text-muted-foreground">{txs.length} transações</span>
                          </div>
                          <div className="flex gap-4 text-xs">
                            <span className="text-green-400">+{formatNumber(added)}</span>
                            <span className="text-red-400">-{formatNumber(consumed)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ALERTAS */}
            <TabsContent value="alertas" className="flex-1 overflow-y-auto mt-4 space-y-2">
              {audit.alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ShieldAlert className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">Nenhuma divergência encontrada</p>
                  <p className="text-xs">Tudo parece consistente ✓</p>
                </div>
              ) : (
                audit.alerts.map((alert, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs mt-0.5 opacity-80">{alert.detail}</p>
                        {alert.txId && (
                          <p className="text-[9px] mt-1 opacity-50 font-mono">TX: {alert.txId.slice(0, 8)}...</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {alert.severity === "critical" ? "Crítico" : alert.severity === "warning" ? "Atenção" : "Info"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* ESTORNOS */}
            <TabsContent value="estornos" className="flex-1 overflow-y-auto mt-4">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Crédito</TableHead>
                      <TableHead className="text-xs">Descrição</TableHead>
                      <TableHead className="text-xs text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...audit.autoRefunds, ...audit.manualRefunds]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map(tx => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs whitespace-nowrap">{formatDate(tx.created_at)}</TableCell>
                          <TableCell>{getTxTypeBadge(tx)}</TableCell>
                          <TableCell>{getCreditTypeBadge(tx.credit_type)}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{tx.description}</TableCell>
                          <TableCell className="text-right text-xs font-bold text-green-400">+{formatNumber(tx.amount)}</TableCell>
                        </TableRow>
                      ))}
                    {audit.autoRefunds.length + audit.manualRefunds.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">
                          Nenhum estorno registrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* CONSUMOS */}
            <TabsContent value="consumos" className="flex-1 overflow-y-auto mt-4">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Crédito</TableHead>
                      <TableHead className="text-xs">Descrição</TableHead>
                      <TableHead className="text-xs text-right">Valor</TableHead>
                      <TableHead className="text-xs text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.consumptions.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(tx.created_at)}</TableCell>
                        <TableCell>{getCreditTypeBadge(tx.credit_type)}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{tx.description}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-red-400">{formatNumber(tx.amount)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{formatNumber(tx.balance_after)}</TableCell>
                      </TableRow>
                    ))}
                    {audit.consumptions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">
                          Nenhum consumo registrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Nenhuma transação</div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Recarregar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminCreditAuditModal;