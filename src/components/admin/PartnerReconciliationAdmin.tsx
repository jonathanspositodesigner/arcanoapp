import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface ReconciliationRow {
  tool_table: string;
  tool_display_name: string;
  job_id: string;
  prompt_id: string;
  user_id: string;
  completed_at: string | null;
  earning_registered: boolean;
  amount_paid: number;
  active_rate: number;
  rate_match: boolean;
  partner_name: string;
  reconciliation_status: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  ok: {
    label: "OK",
    icon: <CheckCircle className="h-4 w-4" />,
    cls: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  missing: {
    label: "Não registrado",
    icon: <XCircle className="h-4 w-4" />,
    cls: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  mismatch: {
    label: "Valor diferente",
    icon: <AlertTriangle className="h-4 w-4" />,
    cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
};

const PAGE_SIZE = 50;

const PartnerReconciliationAdmin = () => {
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = async (pageNum = 0, statusFilter = filter) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_reconcile_tool_earnings", {
        _limit: PAGE_SIZE + 1,
        _offset: pageNum * PAGE_SIZE,
        _filter_status: statusFilter,
      });

      if (error) {
        console.error("[Reconciliation] RPC error:", error);
        setRows([]);
        setHasMore(false);
      } else {
        const results = (data || []) as unknown as ReconciliationRow[];
        setHasMore(results.length > PAGE_SIZE);
        setRows(results.slice(0, PAGE_SIZE));
      }
    } catch (e) {
      console.error("[Reconciliation] Error:", e);
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData(0, filter);
  }, [filter]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData(newPage, filter);
  };

  // Summary stats
  const totalRows = rows.length;
  const okCount = rows.filter((r) => r.reconciliation_status === "ok").length;
  const missingCount = rows.filter((r) => r.reconciliation_status === "missing").length;
  const mismatchCount = rows.filter((r) => r.reconciliation_status === "mismatch").length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border-border/50">
          <p className="text-xs text-muted-foreground">Jobs com ref_prompt</p>
          <p className="text-2xl font-bold text-foreground">{totalRows}</p>
        </Card>
        <Card className="p-4 border-green-500/30 bg-green-500/5">
          <p className="text-xs text-green-400">OK ✅</p>
          <p className="text-2xl font-bold text-green-400">{okCount}</p>
        </Card>
        <Card className="p-4 border-red-500/30 bg-red-500/5">
          <p className="text-xs text-red-400">Não registrado ❌</p>
          <p className="text-2xl font-bold text-red-400">{missingCount}</p>
        </Card>
        <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
          <p className="text-xs text-yellow-400">Valor diferente ⚠️</p>
          <p className="text-2xl font-bold text-yellow-400">{mismatchCount}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(0); }}>
          <SelectTrigger className="w-48 bg-card border-border/50">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ok">✅ OK</SelectItem>
            <SelectItem value="missing">❌ Não registrado</SelectItem>
            <SelectItem value="mismatch">⚠️ Valor diferente</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => { setPage(0); fetchData(0, filter); }}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Ferramenta</TableHead>
                <TableHead className="text-xs">Job ID</TableHead>
                <TableHead className="text-xs">Colaborador</TableHead>
                <TableHead className="text-xs">Valor Pago</TableHead>
                <TableHead className="text-xs">Taxa Ativa</TableHead>
                <TableHead className="text-xs">Concluído em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum job com reference_prompt_id encontrado
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const cfg = STATUS_CONFIG[row.reconciliation_status] || STATUS_CONFIG.missing;
                  return (
                    <TableRow key={`${row.tool_table}-${row.job_id}`} className="border-border/20">
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${cfg.cls}`}>
                          {cfg.icon} {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {row.tool_display_name}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground max-w-[120px] truncate" title={row.job_id}>
                        {row.job_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {row.partner_name}
                      </TableCell>
                      <TableCell className={`text-sm font-medium ${row.earning_registered ? "text-green-400" : "text-red-400"}`}>
                        {row.earning_registered ? formatBRL(row.amount_paid) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatBRL(row.active_rate)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.completed_at
                          ? format(new Date(row.completed_at), "dd/MM/yy HH:mm", { locale: ptBR })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {(page > 0 || hasMore) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 0 || loading}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <span className="text-xs text-muted-foreground">Página {page + 1}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={!hasMore || loading}
              className="gap-1"
            >
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PartnerReconciliationAdmin;