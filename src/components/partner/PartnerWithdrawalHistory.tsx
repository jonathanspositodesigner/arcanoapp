import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  pago: { label: "Pago", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  recusado: { label: "Recusado", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const PIX_TYPE_LABELS: Record<string, string> = {
  cpf: "CPF", email: "E-mail", telefone: "Telefone", aleatoria: "Aleatória",
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const PartnerWithdrawalHistory = ({ withdrawals }: { withdrawals: Withdrawal[] }) => {
  if (withdrawals.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-foreground mb-3">Histórico de Saques</h2>
      <Card className="overflow-hidden">
        <div className="divide-y divide-border">
          {withdrawals.map((w) => {
            const cfg = STATUS_CONFIG[w.status] || STATUS_CONFIG.pendente;
            return (
              <div key={w.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="font-medium text-foreground text-sm">
                        {formatBRL(Number(w.valor_solicitado))}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(w.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {" · "}{PIX_TYPE_LABELS[w.pix_key_type]}
                    </p>
                  </div>
                  <Badge className={cfg.className}>{cfg.label}</Badge>
                </div>
                {w.status === "recusado" && w.admin_notes && (
                  <p className="text-xs text-red-400 mt-1 ml-6">Motivo: {w.admin_notes}</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default PartnerWithdrawalHistory;