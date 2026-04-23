import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PIX_TYPE_LABELS: Record<string, string> = {
  cpf: "CPF", email: "E-mail", telefone: "Telefone", aleatoria: "Chave Aleatória",
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  saldoDisponivel: number;
  pixKey: string;
  pixKeyType: string;
  onSuccess: () => void;
  onEditPix: () => void;
}

const WithdrawalRequestModal = ({ open, onOpenChange, partnerId, saldoDisponivel, pixKey, pixKeyType, onSuccess, onEditPix }: Props) => {
  const [valor, setValor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const valorNum = parseFloat(valor.replace(",", ".")) || 0;
  const isValid = valorNum >= 100 && valorNum <= saldoDisponivel;

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("partner_withdrawals").insert({
        partner_id: partnerId,
        valor_solicitado: valorNum,
        pix_key: pixKey,
        pix_key_type: pixKeyType,
      });
      if (error) throw error;
      toast.success("Solicitação de saque enviada com sucesso!");
      onOpenChange(false);
      setValor("");
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao solicitar saque");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Saque</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-muted-foreground">Saldo disponível</p>
            <p className="text-2xl font-bold text-green-400">{formatBRL(saldoDisponivel)}</p>
          </div>
          <div>
            <Label>Valor do saque (mínimo R$ 100,00)</Label>
            <Input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="100,00"
              type="text"
              inputMode="decimal"
            />
            {valorNum > 0 && valorNum < 100 && (
              <p className="text-xs text-red-400 mt-1">Mínimo R$ 100,00</p>
            )}
            {valorNum > saldoDisponivel && (
              <p className="text-xs text-red-400 mt-1">Valor maior que o saldo disponível</p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Chave PIX</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {PIX_TYPE_LABELS[pixKeyType]}: {pixKey}
              </p>
              <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={onEditPix}>
                Alterar
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            ⏳ Saques são processados manualmente em até 5 dias úteis.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Enviando..." : "Confirmar Saque"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawalRequestModal;