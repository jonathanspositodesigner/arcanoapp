import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ChevronLeft, ChevronRight, Receipt, Calendar, Mail, MailX, AlertTriangle, RefreshCw, Loader2, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import RenewalEmailsMonitoring from "./RenewalEmailsMonitoring";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import SaleDetailDialog from "./SaleDetailDialog";

export interface SaleRecord {
  id: string;
  user_email: string;
  amount: number;
  net_amount: number | null;
  status: string;
  paid_at: string | null;
  created_at: string;
  product_title: string;
  source_platform: string;
  payment_method: string | null;
  utm_data?: Record<string, string> | null;
  user_name?: string;
  name?: string;
  whatsapp?: string;
  whatsapp_welcome_sent?: boolean;
}

interface EmailLogStatus {
  status: string;
  error_message: string | null;
}

const PAGE_SIZE = 20;

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Aprovada", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  refunded: { label: "Reembolsada", variant: "destructive" },
  chargeback: { label: "Chargeback", variant: "destructive" },
};

const statusFilters = [
  { id: "all", label: "Todas" },
  { id: "paid", label: "Aprovadas" },
  { id: "pending", label: "Pendentes" },
  { id: "refunded", label: "Reembolsadas" },
  { id: "chargeback", label: "Chargebacks" },
];

type RangePreset = "today" | "7d" | "30d" | "90d" | "custom";

const platformFilters = [
  { id: "all", label: "Todas" },
  { id: "pagarme", label: "Pagar.me" },
  { id: "stripe", label: "Stripe" },
  { id: "mercadopago", label: "Mercado Pago" },
  { id: "greenn", label: "Greenn" },
  { id: "hotmart", label: "Hotmart" },
];

const SalesManagementContent = () => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [rangePreset, setRangePreset] = useState<RangePreset>("30d");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [emailStatuses, setEmailStatuses] = useState<Map<string, EmailLogStatus>>(new Map());
  const [resendingEmails, setResendingEmails] = useState<Set<string>>(new Set());
  const [platformFilter, setPlatformFilter] = useState("all");
  // Map<email, { count, lastWaivedAt, waivers }>
  const [waiverMap, setWaiverMap] = useState<Map<string, { count: number; lastWaivedAt: string | null; waivers: any[] }>>(new Map());

  const dateRange = useMemo(() => {
    const now = new Date();
    const end = now;
    let start = new Date();
    switch (rangePreset) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "7d":
        start.setDate(start.getDate() - 7);
        break;
      case "30d":
        start.setDate(start.getDate() - 30);
        break;
      case "90d":
        start.setDate(start.getDate() - 90);
        break;
      case "custom":
        if (customStart && customEnd) {
          return { start: customStart, end: customEnd };
        }
        start.setDate(start.getDate() - 30);
        break;
    }
    return { start, end };
  }, [rangePreset, customStart, customEnd]);

  const fetchEmailStatuses = useCallback(async (emails: string[]) => {
    if (emails.length === 0) return;
    
    const uniqueEmails = [...new Set(emails.map(e => e.toLowerCase()))];
    const statusMap = new Map<string, EmailLogStatus>();
    
    // Fetch in chunks of 100
    for (let i = 0; i < uniqueEmails.length; i += 100) {
      const chunk = uniqueEmails.slice(i, i + 100);
      const { data } = await supabase
        .from("welcome_email_logs")
        .select("email, status, error_message")
        .in("email", chunk)
        .order("sent_at", { ascending: false });
      
      if (data) {
        for (const log of data) {
          const key = log.email?.toLowerCase();
          if (key && !statusMap.has(key)) {
            statusMap.set(key, {
              status: log.status || 'unknown',
              error_message: log.error_message,
            });
          }
        }
      }
    }
    
    setEmailStatuses(statusMap);
  }, []);

  useEffect(() => {
    const fetchSales = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_unified_dashboard_orders" as any, {
          _start: dateRange.start.toISOString(),
          _end: dateRange.end.toISOString(),
        });

        if (error) {
          console.error("Error fetching sales:", error);
          setSales([]);
          return;
        }

        const rawOrders = ((data as SaleRecord[]) || []).sort((a, b) => {
          const dateA = a.paid_at || a.created_at;
          const dateB = b.paid_at || b.created_at;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        // Deduplicate: if a "paid" order exists for same email+product, hide the "pending" one
        const paidKeys = new Set(
          rawOrders
            .filter((o) => o.status === "paid")
            .map((o) => `${o.user_email?.toLowerCase()}|${o.product_title?.toLowerCase()}|${o.amount}`)
        );
        const sorted = rawOrders.filter((o) => {
          if (o.status !== "pending") return true;
          const key = `${o.user_email?.toLowerCase()}|${o.product_title?.toLowerCase()}|${o.amount}`;
          return !paidKeys.has(key);
        });

        // Enrich with profile names
        const emails = [...new Set(sorted.map((s) => s.user_email))];
        if (emails.length > 0) {
          const allProfiles: { email: string; name: string | null }[] = [];
          for (let i = 0; i < emails.length; i += 100) {
            const chunk = emails.slice(i, i + 100);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("email, name")
              .in("email", chunk);
            if (profiles) allProfiles.push(...(profiles as any));
          }
          const profileMap = new Map(allProfiles.map((p) => [p.email?.toLowerCase(), p]));
          sorted.forEach((s) => {
            const profile = profileMap.get(s.user_email?.toLowerCase());
            if (profile?.name) {
              s.name = profile.name;
            } else if (s.user_name) {
              s.name = s.user_name;
            }
          });
        }

        setSales(sorted);
        
        // Fetch email statuses for paid sales
        const paidEmails = sorted
          .filter((s) => s.status === "paid")
          .map((s) => s.user_email);
        await fetchEmailStatuses(paidEmails);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSales();
  }, [dateRange, fetchEmailStatuses]);

  const handleResendEmail = async (sale: SaleRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setResendingEmails((prev) => new Set(prev).add(sale.id));
    
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/resend-purchase-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: sale.user_email,
            order_id: sale.id,
            product_name: sale.product_title,
            source_platform: sale.source_platform,
          }),
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Email reenviado para ${sale.user_email}`);
        // Update local status
        setEmailStatuses((prev) => {
          const newMap = new Map(prev);
          newMap.set(sale.user_email, { status: 'sent', error_message: null });
          return newMap;
        });
      } else {
        toast.error(`Falha ao reenviar: ${result.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      toast.error("Erro ao reenviar email");
    } finally {
      setResendingEmails((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sale.id);
        return newSet;
      });
    }
  };

  const renderEmailStatus = (sale: SaleRecord) => {
    if (sale.status !== "paid") return null;
    
    const emailLog = emailStatuses.get(sale.user_email.toLowerCase());
    const isResending = resendingEmails.has(sale.id);
    
    if (isResending) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    
    if (!emailLog) {
      // No log found — likely a sale from before the logging system existed
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => handleResendEmail(sale, e)}
              >
                <Mail className="h-4 w-4 text-muted-foreground/50" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sem registro de envio — Clique para enviar</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    if (emailLog.status === 'sent') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Mail className="h-4 w-4 text-emerald-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Email enviado com sucesso</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    if (emailLog.status === 'failed') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => handleResendEmail(sale, e)}
              >
                <MailX className="h-4 w-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Email falhou — Clique para reenviar</p>
              {emailLog.error_message && (
                <p className="text-xs text-muted-foreground max-w-[200px] truncate">{emailLog.error_message}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    // pending or other
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <RefreshCw className="h-4 w-4 text-yellow-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Email pendente ({emailLog.status})</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const filtered = useMemo(() => {
    let result = sales;
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (platformFilter !== "all") {
      result = result.filter((s) => s.source_platform === platformFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.user_email?.toLowerCase().includes(q) ||
          s.name?.toLowerCase().includes(q) ||
          s.product_title?.toLowerCase().includes(q) ||
          s.id?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sales, search, statusFilter, platformFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [search, dateRange, statusFilter, platformFilter]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd/MM/yy HH:mm", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  const presets: { id: RangePreset; label: string }[] = [
    { id: "today", label: "Hoje" },
    { id: "7d", label: "7 dias" },
    { id: "30d", label: "30 dias" },
    { id: "90d", label: "90 dias" },
    { id: "custom", label: "Personalizado" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="sales">🛒 Vendas</TabsTrigger>
          <TabsTrigger value="renewal">📧 Emails de Renovação</TabsTrigger>
        </TabsList>

        <TabsContent value="renewal">
          <RenewalEmailsMonitoring />
        </TabsContent>

        <TabsContent value="sales">
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Vendas</h2>
          <p className="text-sm text-muted-foreground">Listagem completa de vendas com filtros</p>
        </div>
      </div>

      <Card className="p-4 md:p-6 bg-card border-border">
        {/* Filters */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button
                key={p.id}
                variant={rangePreset === p.id ? "default" : "outline"}
                size="sm"
                onClick={() => setRangePreset(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((sf) => (
              <Button
                key={sf.id}
                variant={statusFilter === sf.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter(sf.id)}
                className="text-xs"
              >
                {sf.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {platformFilters.map((pf) => (
              <Button
                key={pf.id}
                variant={platformFilter === pf.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPlatformFilter(pf.id)}
                className="text-xs"
              >
                {pf.label}
              </Button>
            ))}
          </div>

          {rangePreset === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("gap-2", !customStart && "text-muted-foreground")}>
                    <Calendar className="h-4 w-4" />
                    {customStart ? format(customStart, "dd/MM/yyyy") : "Data início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customStart}
                    onSelect={setCustomStart}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground text-sm">até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("gap-2", !customEnd && "text-muted-foreground")}>
                    <Calendar className="h-4 w-4" />
                    {customEnd ? format(customEnd, "dd/MM/yyyy") : "Data fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customEnd}
                    onSelect={setCustomEnd}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, nome ou produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Badge variant="outline" className="whitespace-nowrap">{filtered.length} vendas</Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">Carregando vendas...</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">
              {search ? "Nenhuma venda encontrada para essa busca." : "Nenhuma venda no período."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-3 font-medium">Data</th>
                    <th className="text-left py-2 px-3 font-medium">Nome</th>
                    <th className="text-left py-2 px-3 font-medium">Email</th>
                    <th className="text-left py-2 px-3 font-medium">Produto</th>
                    <th className="text-left py-2 px-3 font-medium">Plataforma</th>
                    <th className="text-left py-2 px-3 font-medium">Pagamento</th>
                    <th className="text-right py-2 px-3 font-medium">Valor</th>
                    <th className="text-center py-2 px-3 font-medium">Status</th>
                    <th className="text-center py-2 px-3 font-medium">📧</th>
                    <th className="text-center py-2 px-3 font-medium">📱</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((sale) => {
                    const st = statusMap[sale.status] || { label: sale.status, variant: "outline" as const };
                    return (
                      <tr
                        key={sale.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedSale(sale)}
                      >
                        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(sale.paid_at || sale.created_at)}
                        </td>
                        <td className="py-2.5 px-3 text-foreground font-medium truncate max-w-[140px]">
                          {sale.name || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-foreground truncate max-w-[180px]">
                          {sale.user_email}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[160px]">
                          {sale.product_title}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-xs capitalize">
                            {sale.source_platform || "—"}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-xs capitalize">
                          {sale.payment_method || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-400 whitespace-nowrap">
                          {formatCurrency(sale.net_amount ?? sale.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {renderEmailStatus(sale)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {sale.status === "paid" ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className={sale.whatsapp_welcome_sent ? "text-emerald-500" : "text-muted-foreground/40"}>
                                    📱
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{sale.whatsapp_welcome_sent ? "WhatsApp enviado ✅" : "WhatsApp não enviado"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {paginated.map((sale) => {
                const st = statusMap[sale.status] || { label: sale.status, variant: "outline" as const };
                return (
                  <div
                    key={sale.id}
                    className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-1.5 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => setSelectedSale(sale)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(sale.paid_at || sale.created_at)}
                      </span>
                      <div className="flex items-center gap-2">
                        {renderEmailStatus(sale)}
                        {sale.status === "paid" && (
                          <span className={sale.whatsapp_welcome_sent ? "text-emerald-500" : "text-muted-foreground/40"}>
                            📱
                          </span>
                        )}
                        <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {sale.name || sale.user_email}
                    </p>
                    {sale.name && (
                      <p className="text-xs text-muted-foreground truncate">{sale.user_email}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground truncate max-w-[60%]">
                        {sale.product_title}
                      </span>
                      <span className="font-semibold text-emerald-400 text-sm">
                        {formatCurrency(sale.net_amount ?? sale.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Página {page + 1} de {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <SaleDetailDialog
        sale={selectedSale}
        open={!!selectedSale}
        onClose={() => setSelectedSale(null)}
      />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesManagementContent;
