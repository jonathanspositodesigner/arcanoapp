import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SaleRecord {
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
  name?: string;
}

const PAGE_SIZE = 10;

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Aprovada", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  refunded: { label: "Reembolsada", variant: "destructive" },
};

const LatestSales = () => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchLatestSales = async () => {
      setIsLoading(true);
      try {
        // Fetch last 90 days of orders
        const now = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 90);

        const { data, error } = await supabase.rpc("get_unified_dashboard_orders" as any, {
          _start: start.toISOString(),
          _end: now.toISOString(),
        });

        if (error) {
          console.error("Error fetching latest sales:", error);
          setSales([]);
          return;
        }

        // Sort by most recent first, only paid
        const sorted = ((data as SaleRecord[]) || [])
          .filter((o) => o.status === "paid")
          .sort((a, b) => {
            const dateA = a.paid_at || a.created_at;
            const dateB = b.paid_at || b.created_at;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          });

        // Try to enrich with names from profiles
        const emails = [...new Set(sorted.map((s) => s.user_email))];
        if (emails.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("email, name")
            .in("email", emails);

          if (profiles) {
            const nameMap = new Map(profiles.map((p) => [p.email?.toLowerCase(), p.name]));
            sorted.forEach((s) => {
              s.name = nameMap.get(s.user_email?.toLowerCase()) || undefined;
            });
          }
        }

        setSales(sorted);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestSales();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return sales;
    const q = search.toLowerCase();
    return sales.filter(
      (s) =>
        s.user_email?.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        s.product_title?.toLowerCase().includes(q)
    );
  }, [sales, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [search]);

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

  return (
    <Card className="p-4 md:p-6 bg-card border-border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Últimas Vendas</h3>
          <Badge variant="outline" className="text-xs">
            {filtered.length} vendas
          </Badge>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email, nome ou produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground text-sm">Carregando vendas...</p>
        </div>
      ) : paginated.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground text-sm">
            {search ? "Nenhuma venda encontrada para essa busca." : "Nenhuma venda encontrada."}
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
                  <th className="text-right py-2 px-3 font-medium">Valor</th>
                  <th className="text-center py-2 px-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((sale) => {
                  const st = statusMap[sale.status] || { label: sale.status, variant: "outline" as const };
                  return (
                    <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(sale.paid_at || sale.created_at)}
                      </td>
                      <td className="py-2.5 px-3 text-foreground font-medium truncate max-w-[160px]">
                        {sale.name || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-foreground truncate max-w-[200px]">
                        {sale.user_email}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[180px]">
                        {sale.product_title}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-xs capitalize">
                          {sale.source_platform || "—"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-400 whitespace-nowrap">
                        {formatCurrency(sale.net_amount ?? sale.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant={st.variant} className="text-xs">
                          {st.label}
                        </Badge>
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
                <div key={sale.id} className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(sale.paid_at || sale.created_at)}
                    </span>
                    <Badge variant={st.variant} className="text-xs">
                      {st.label}
                    </Badge>
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
  );
};

export default LatestSales;
