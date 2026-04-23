import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WithdrawalRow {
  id: string;
  partner_id: string;
  valor_solicitado: number;
  pix_key: string;
  pix_key_type: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  partner_name?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  pago: { label: "Pago", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  recusado: { label: "Recusado", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const PIX_LABELS: Record<string, string> = {
  cpf: "CPF", email: "E-mail", telefone: "Telefone", aleatoria: "Aleatória",
};

const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const AdminPartnerWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [isLoading, setIsLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { fetchWithdrawals(); }, []);

  const fetchWithdrawals = async () => {
    const { data, error } = await supabase
      .from("partner_withdrawals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { console.error(error); setIsLoading(false); return; }

    // Fetch partner names
    const partnerIds = [...new Set((data || []).map(d => d.partner_id))];
    const { data: partners } = await supabase
      .from("partners")
      .select("id, name")
      .in("id", partnerIds);

    const nameMap = new Map((partners || []).map(p => [p.id, p.name]));
    setWithdrawals((data || []).map(w => ({ ...w, partner_name: nameMap.get(w.partner_id) || "Desconhecido" })));
    setIsLoading(false);
  };

  const handlePay = async () => {
    if (!selectedId) return;
    setIsProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("partner_withdrawals")
      .update({ status: "pago", processed_at: new Date().toISOString(), processed_by: user?.id })
      .eq("id", selectedId);
    if (error) toast.error("Erro ao processar");
    else { toast.success("Saque marcado como pago!"); fetchWithdrawals(); }
    setShowPayModal(false);
    setSelectedId(null);
    setIsProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedId || !rejectReason.trim()) { toast.error("Informe o motivo"); return; }
    setIsProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("partner_withdrawals")
      .update({ status: "recusado", admin_notes: rejectReason.trim(), processed_at: new Date().toISOString(), processed_by: user?.id })
      .eq("id", selectedId);
    if (error) toast.error("Erro ao processar");
    else { toast.success("Saque recusado"); fetchWithdrawals(); }
    setShowRejectModal(false);
    setSelectedId(null);
    setRejectReason("");
    setIsProcessing(false);
  };

  const filtered = statusFilter === "todos" ? withdrawals : withdrawals.filter(w => w.status === statusFilter);

  if (isLoading) return null;
  if (withdrawals.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <Banknote className="h-5 w-5" /> Saques de Colaboradores
      </h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {[{ key: "todos", label: "Todos" }, { key: "pendente", label: "Pendentes" }, { key: "pago", label: "Pagos" }, { key: "recusado", label: "Recusados" }].map(f => (
          <Button key={f.key} variant={statusFilter === f.key ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(w => {
          const cfg = STATUS_CONFIG[w.status] || STATUS_CONFIG.pendente;
          return (
            <Card key={w.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{w.partner_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatBRL(Number(w.valor_solicitado))} · {PIX_LABELS[w.pix_key_type]}: {w.pix_key}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(w.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {w.status === "recusado" && w.admin_notes && (
                    <p className="text-xs text-red-400 mt-1">Motivo: {w.admin_notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cfg.className}>{cfg.label}</Badge>
                  {w.status === "pendente" && (
                    <>
                      <Button size="sm" variant="outline" className="text-green-400" onClick={() => { setSelectedId(w.id); setShowPayModal(true); }}>
                        <Check className="h-4 w-4 mr-1" /> Pagar
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-400" onClick={() => { setSelectedId(w.id); setShowRejectModal(true); }}>
                        <X className="h-4 w-4 mr-1" /> Recusar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhum saque encontrado</p>
        )}
      </div>

      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Pagamento</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Tem certeza que deseja marcar este saque como pago?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayModal(false)}>Cancelar</Button>
            <Button onClick={handlePay} disabled={isProcessing}>{isProcessing ? "Processando..." : "Confirmar Pagamento"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recusar Saque</DialogTitle></DialogHeader>
          <div>
            <Label>Motivo da recusa *</Label>
            <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Informe o motivo..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing || !rejectReason.trim()}>
              {isProcessing ? "Processando..." : "Recusar Saque"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPartnerWithdrawals;