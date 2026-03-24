import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Loader2 } from "lucide-react";

interface MPEmailModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (email: string) => void;
  loading?: boolean;
}

export function MPEmailModal({ open, onClose, onConfirm, loading }: MPEmailModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const validate = () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Preencha seu e-mail");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("E-mail inválido");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onConfirm(email.trim().toLowerCase());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#1a0a2e] border-fuchsia-500/20">
        <DialogHeader>
          <DialogTitle className="text-white text-xl text-center">
            Informe seu e-mail para continuar
          </DialogTitle>
          <p className="text-white/50 text-sm text-center mt-1">
            Seu acesso será liberado neste e-mail após o pagamento
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="mp-email" className="text-white/70 flex items-center gap-2">
              <Mail className="w-4 h-4" /> E-mail
            </Label>
            <Input
              id="mp-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-fuchsia-500"
              autoFocus
              disabled={loading}
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
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
