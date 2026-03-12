import { useState, useEffect, useRef } from "react";
import { CreditCard, Lock, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CreditCardFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTokenGenerated: (cardToken: string) => void;
  isProcessing: boolean;
  planName?: string;
}

const CreditCardForm = ({
  open,
  onOpenChange,
  onTokenGenerated,
  isProcessing,
  planName,
}: CreditCardFormProps) => {
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [tokenizing, setTokenizing] = useState(false);
  const publicKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (open && !publicKeyRef.current) {
      supabase.functions.invoke("get-pagarme-public-key").then(({ data, error }) => {
        if (!error && data?.publicKey) {
          publicKeyRef.current = data.publicKey;
        }
      });
    }
  }, [open]);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 16) {
      toast.error("Número do cartão inválido");
      return;
    }
    if (!cardName.trim()) {
      toast.error("Informe o nome impresso no cartão");
      return;
    }
    const month = parseInt(expMonth, 10);
    const year = parseInt(expYear, 10);
    if (!month || month < 1 || month > 12) {
      toast.error("Mês de validade inválido");
      return;
    }
    if (!year || year < 25 || year > 40) {
      toast.error("Ano de validade inválido (ex: 26)");
      return;
    }
    if (cvv.length < 3 || cvv.length > 4) {
      toast.error("CVV inválido");
      return;
    }

    setTokenizing(true);

    try {
      const publicKey = publicKeyRef.current;
      if (!publicKey) {
        toast.error("Chave pública de pagamento não disponível. Tente novamente.");
        setTokenizing(false);
        return;
      }

      const response = await fetch(
        `https://api.pagar.me/core/v5/tokens?appId=${publicKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "card",
            card: {
              number: digits,
              holder_name: cardName.trim().toUpperCase(),
              exp_month: month,
              exp_year: year,
              cvv: cvv,
            },
          }),
        }
      );

      if (!response.ok) {
        const errBody = await response.text();
        console.error("Erro ao tokenizar cartão:", response.status, errBody);
        toast.error("Erro ao processar cartão. Verifique os dados e tente novamente.");
        setTokenizing(false);
        return;
      }

      const data = await response.json();
      const token = data.id;

      if (!token) {
        toast.error("Erro ao gerar token do cartão");
        setTokenizing(false);
        return;
      }

      onTokenGenerated(token);
    } catch (err: any) {
      console.error("Erro na tokenização:", err);
      toast.error("Erro ao processar cartão. Tente novamente.");
      setTokenizing(false);
    }
  };

  const busy = tokenizing || isProcessing;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md bg-[#1A0A2E] border-purple-500/30">
        {busy ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-white/10 text-purple-400 border-t-current animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">
                {tokenizing ? "Processando cartão..." : "Criando assinatura..."}
              </p>
              <p className="text-white/50 text-sm mt-1">Aguarde, isso pode levar alguns segundos</p>
            </div>
            <div className="flex items-center gap-2 mt-2 text-white/30 text-xs">
              <Lock className="h-3 w-3" />
              <span>Pagamento 100% seguro e criptografado</span>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl font-bold text-center text-white flex items-center justify-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                Dados do Cartão
              </DialogTitle>
              <DialogDescription className="text-center text-purple-300">
                {planName
                  ? `Assinatura recorrente — ${planName}`
                  : "Preencha os dados do seu cartão de crédito"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-purple-200 text-sm">Número do Cartão</Label>
                <Input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="0000 0000 0000 0000"
                  className="bg-purple-900/20 border-purple-500/30 text-white placeholder:text-purple-500/50 text-lg tracking-wider"
                  maxLength={19}
                  inputMode="numeric"
                  autoComplete="cc-number"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-purple-200 text-sm">Nome Impresso no Cartão</Label>
                <Input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  placeholder="NOME COMPLETO"
                  className="bg-purple-900/20 border-purple-500/30 text-white placeholder:text-purple-500/50 uppercase"
                  autoComplete="cc-name"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-purple-200 text-sm">Mês</Label>
                  <Input
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="MM"
                    className="bg-purple-900/20 border-purple-500/30 text-white placeholder:text-purple-500/50 text-center"
                    maxLength={2}
                    inputMode="numeric"
                    autoComplete="cc-exp-month"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-purple-200 text-sm">Ano</Label>
                  <Input
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="AA"
                    className="bg-purple-900/20 border-purple-500/30 text-white placeholder:text-purple-500/50 text-center"
                    maxLength={2}
                    inputMode="numeric"
                    autoComplete="cc-exp-year"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-purple-200 text-sm">CVV</Label>
                  <Input
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="000"
                    className="bg-purple-900/20 border-purple-500/30 text-white placeholder:text-purple-500/50 text-center"
                    maxLength={4}
                    inputMode="numeric"
                    type="password"
                    autoComplete="cc-csc"
                  />
                </div>
              </div>

              <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-3 flex items-start gap-2">
                <Lock className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <p className="text-purple-300/70 text-xs leading-relaxed">
                  Seus dados são criptografados e enviados diretamente ao gateway de pagamento. 
                  Nenhuma informação do cartão é armazenada em nossos servidores.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-semibold py-5"
              >
                Confirmar Pagamento
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreditCardForm;
