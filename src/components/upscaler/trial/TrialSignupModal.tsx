import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, ArrowLeft } from "lucide-react";

interface TrialSignupModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: (email: string, usesRemaining: number) => void;
}

export default function TrialSignupModal({ open, onClose, onVerified }: TrialSignupModalProps) {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("landing-trial-code/send", {
        body: { email: email.trim(), name: name.trim() },
      });

      if (error) throw error;

      if (data?.already_verified) {
        onVerified(email.trim().toLowerCase(), data.uses_remaining);
        toast.success("Teste já liberado! Aproveite.");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Código enviado! Verifique seu email.");
      setStep("otp");
    } catch (err: any) {
      console.error("Send code error:", err);
      toast.error("Erro ao enviar código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("Digite o código completo de 6 dígitos");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("landing-trial-code/verify", {
        body: { email: email.trim(), code },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("🎉 Teste liberado com sucesso!");
      onVerified(email.trim().toLowerCase(), data.uses_remaining);
    } catch (err: any) {
      console.error("Verify error:", err);
      toast.error("Erro ao verificar código.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#1A0A2E] border-purple-500/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {step === "form" ? "🎁 Libere 3 Testes Grátis" : "🔑 Digite o Código"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4 pt-2">
            <p className="text-purple-200 text-sm text-center">
              Preencha seus dados e receba um código de verificação no email para liberar 3 upscales gratuitos.
            </p>

            <div className="space-y-2">
              <Label htmlFor="trial-name" className="text-purple-200">Nome Completo</Label>
              <Input
                id="trial-name"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trial-email" className="text-purple-200">Email</Label>
              <Input
                id="trial-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <Button
              className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold"
              onClick={handleSendCode}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Enviar Código
                </span>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-purple-200 text-sm text-center">
              Enviamos um código de 6 dígitos para <strong className="text-white">{email}</strong>
            </p>

            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="bg-white/5 border-white/10 text-white text-lg w-12 h-12" />
                  <InputOTPSlot index={1} className="bg-white/5 border-white/10 text-white text-lg w-12 h-12" />
                  <InputOTPSlot index={2} className="bg-white/5 border-white/10 text-white text-lg w-12 h-12" />
                  <InputOTPSlot index={3} className="bg-white/5 border-white/10 text-white text-lg w-12 h-12" />
                  <InputOTPSlot index={4} className="bg-white/5 border-white/10 text-white text-lg w-12 h-12" />
                  <InputOTPSlot index={5} className="bg-white/5 border-white/10 text-white text-lg w-12 h-12" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold"
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : (
                "Verificar Código"
              )}
            </Button>

            <button
              onClick={() => { setStep("form"); setCode(""); }}
              className="w-full text-sm text-purple-400 hover:text-purple-300 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
