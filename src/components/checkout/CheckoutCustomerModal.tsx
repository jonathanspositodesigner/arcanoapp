import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface CheckoutCustomerData {
  name: string;
  email: string;
  document: string;
}

interface CheckoutCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: CheckoutCustomerData) => void;
  loading?: boolean;
}

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(digits[9]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return parseInt(digits[10]) === check;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function CheckoutCustomerModal({ open, onClose, onConfirm, loading }: CheckoutCustomerModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 3) newErrors.name = "Digite seu nome completo";
    if (!isValidEmail(email)) newErrors.email = "Digite um e-mail válido";
    if (!isValidCPF(cpf)) newErrors.cpf = "Digite um CPF válido";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onConfirm({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      document: cpf.replace(/\D/g, ""),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#1a1a2e] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">Dados para pagamento</DialogTitle>
          <DialogDescription className="text-white/60">
            Preencha seus dados para prosseguir ao checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="checkout-name" className="text-white/80">Nome completo</Label>
            <Input
              id="checkout-name"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
            {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="checkout-email" className="text-white/80">E-mail</Label>
            <Input
              id="checkout-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
            {errors.email && <p className="text-red-400 text-xs">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="checkout-cpf" className="text-white/80">CPF</Label>
            <Input
              id="checkout-cpf"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(formatCPF(e.target.value))}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              maxLength={14}
            />
            {errors.cpf && <p className="text-red-400 text-xs">{errors.cpf}</p>}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-slate-600 to-violet-600 hover:from-slate-500 hover:to-violet-500 text-white h-12 text-base font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando checkout...
              </>
            ) : (
              "Ir para pagamento"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
