import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Loader2, User, FileText } from "lucide-react";

export interface MPCustomerData {
  name: string;
  email: string;
  document: string;
}

interface MPEmailModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: MPCustomerData) => void;
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
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(digits[10]);
}

export function MPEmailModal({ open, onClose, onConfirm, loading }: MPEmailModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; confirmEmail?: string; cpf?: string }>({});

  // Reset campos ao reabrir o modal
  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setConfirmEmail("");
      setCpf("");
      setErrors({});
    }
  }, [open]);

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim() || name.trim().length < 3) e.name = "Preencha seu nome completo";
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) e.email = "Preencha seu e-mail";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) e.email = "E-mail inválido";
    const trimmedConfirm = confirmEmail.trim().toLowerCase();
    if (!trimmedConfirm) e.confirmEmail = "Confirme seu e-mail";
    else if (trimmedEmail !== trimmedConfirm) e.confirmEmail = "Os e-mails não coincidem. Confira e tente novamente.";
    const cpfDigits = cpf.replace(/\D/g, "");
    if (!cpfDigits) e.cpf = "Preencha seu CPF";
    else if (!isValidCPF(cpfDigits)) e.cpf = "CPF inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onConfirm({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      document: cpf.replace(/\D/g, ""),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#1a0a2e] border-fuchsia-500/20">
        <DialogHeader>
          <DialogTitle className="text-white text-xl text-center">
            Preencha seus dados para continuar
          </DialogTitle>
          <DialogDescription className="text-white/50 text-sm text-center mt-1">
            Seu acesso será liberado neste e-mail após o pagamento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="mp-name" className="text-white/70 flex items-center gap-2">
              <User className="w-4 h-4" /> Nome completo
            </Label>
            <Input
              id="mp-name"
              type="text"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-fuchsia-500"
              autoFocus
              disabled={loading}
            />
            {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mp-email" className="text-white/70 flex items-center gap-2">
              <Mail className="w-4 h-4" /> E-mail
            </Label>
            <Input
              id="mp-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined })); }}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-fuchsia-500"
              disabled={loading}
            />
            {errors.email && <p className="text-red-400 text-xs">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mp-cpf" className="text-white/70 flex items-center gap-2">
              <FileText className="w-4 h-4" /> CPF
            </Label>
            <Input
              id="mp-cpf"
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => { setCpf(formatCPF(e.target.value)); setErrors(prev => ({ ...prev, cpf: undefined })); }}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-fuchsia-500"
              disabled={loading}
              maxLength={14}
            />
            {errors.cpf && <p className="text-red-400 text-xs">{errors.cpf}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white font-semibold h-12"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Ir para pagamento <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
