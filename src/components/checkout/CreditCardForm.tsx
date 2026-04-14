import { useState, useEffect, useRef } from "react";
import { CreditCard, Lock, Loader2, X, MapPin } from "lucide-react";
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

export interface CardAddressData {
  line_1: string;
  zip_code: string;
  city: string;
  state: string;
  country: string;
}

interface CreditCardFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTokenGenerated: (cardToken: string, addressData: CardAddressData) => void;
  isProcessing: boolean;
  planName?: string;
}

const UF_OPTIONS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

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

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

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

  const handleCepChange = async (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setCep(formatted);

    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro || "");
          setCity(data.localidade || "");
          setUf(data.uf || "");
        }
      } catch {
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 16) { toast.error("Número do cartão inválido"); return; }
    if (!cardName.trim()) { toast.error("Informe o nome impresso no cartão"); return; }
    const month = parseInt(expMonth, 10);
    const year = parseInt(expYear, 10);
    if (!month || month < 1 || month > 12) { toast.error("Mês de validade inválido"); return; }
    if (!year || year < 25 || year > 40) { toast.error("Ano de validade inválido (ex: 26)"); return; }
    if (cvv.length < 3 || cvv.length > 4) { toast.error("CVV inválido"); return; }

    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) { toast.error("Preencha o CEP para continuar"); return; }
    if (!street.trim() || !number.trim()) { toast.error("Preencha o endereço e número para continuar"); return; }
    if (!city.trim()) { toast.error("Preencha a cidade para continuar"); return; }
    if (!uf) { toast.error("Selecione o estado para continuar"); return; }

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

      const line1 = `${street.trim()}, ${number.trim()}`;
      const addressData: CardAddressData = {
        line_1: line1,
        zip_code: cleanCep,
        city: city.trim(),
        state: uf,
        country: "BR",
      };

      onTokenGenerated(token, addressData);
    } catch (err: any) {
      console.error("Erro na tokenização:", err);
      toast.error("Erro ao processar cartão. Tente novamente.");
      setTokenizing(false);
    }
  };

  const busy = tokenizing || isProcessing;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md bg-popover border-border max-h-[90vh] overflow-y-auto">
        {busy ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-border text-muted-foreground border-t-current animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-semibold text-lg">
                {tokenizing ? "Processando cartão..." : "Criando assinatura..."}
              </p>
              <p className="text-muted-foreground text-sm mt-1">Aguarde, isso pode levar alguns segundos</p>
            </div>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground/50 text-xs">
              <Lock className="h-3 w-3" />
              <span>Pagamento 100% seguro e criptografado</span>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl font-bold text-center text-foreground flex items-center justify-center gap-2">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                Dados do Cartão
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                {planName
                  ? `Assinatura recorrente — ${planName}`
                  : "Preencha os dados do seu cartão de crédito"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Número do Cartão</Label>
                <Input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="0000 0000 0000 0000"
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground text-lg tracking-wider"
                  maxLength={19}
                  inputMode="numeric"
                  autoComplete="cc-number"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Nome Impresso no Cartão</Label>
                <Input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  placeholder="NOME COMPLETO"
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground uppercase"
                  autoComplete="cc-name"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Mês</Label>
                  <Input
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="MM"
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground text-center"
                    maxLength={2}
                    inputMode="numeric"
                    autoComplete="cc-exp-month"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Ano</Label>
                  <Input
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="AA"
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground text-center"
                    maxLength={2}
                    inputMode="numeric"
                    autoComplete="cc-exp-year"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">CVV</Label>
                  <Input
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="000"
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground text-center"
                    maxLength={4}
                    inputMode="numeric"
                    type="password"
                    autoComplete="cc-csc"
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="border-t border-border pt-4 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm font-medium">Endereço de Cobrança</span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">CEP *</Label>
                      <Input
                        value={cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground text-sm"
                        maxLength={9}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Estado *</Label>
                      <select
                        value={uf}
                        onChange={(e) => setUf(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="" className="bg-popover">UF</option>
                        {UF_OPTIONS.map(u => (
                          <option key={u} value={u} className="bg-popover">{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-muted-foreground text-xs">Rua *</Label>
                      <Input
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Rua / Av."
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground text-sm"
                        disabled={cepLoading}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Nº *</Label>
                      <Input
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="123"
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Cidade *</Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Cidade"
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground text-sm"
                      disabled={cepLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-accent border border-border rounded-lg p-3 flex items-start gap-2">
                <Lock className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Seus dados são criptografados e enviados diretamente ao gateway de pagamento. 
                  Nenhuma informação do cartão é armazenada em nossos servidores.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-semibold py-5"
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