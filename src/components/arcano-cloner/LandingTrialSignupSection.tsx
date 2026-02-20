import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, Sparkles, Gift, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AnimatedSection } from "@/hooks/useScrollAnimation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LandingTrialSignupSection = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !whatsapp.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-landing-trial-email", {
        body: { name: name.trim(), email: email.trim().toLowerCase(), whatsapp: whatsapp.trim() },
      });

      if (error) throw error;

      if (data?.success) {
        setIsSuccess(true);
      } else {
        toast({
          title: data?.error || "Erro ao cadastrar",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Trial signup error:", err);
      toast({ title: "Erro ao enviar. Tente novamente.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <section className="px-4 py-16 md:py-20 bg-black/30">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-gradient-to-b from-fuchsia-500/10 to-purple-600/10 border border-fuchsia-500/30 rounded-3xl p-10">
            <div className="w-16 h-16 rounded-full bg-fuchsia-500/20 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-fuchsia-400" />
            </div>
            <h3 className="text-white text-xl font-bold mb-3">Verifique seu email!</h3>
            <p className="text-white/60 text-sm leading-relaxed mb-2">
              Enviamos um link de ativação para <strong className="text-fuchsia-400">{email}</strong>
            </p>
            <p className="text-white/40 text-xs">
              Clique no link do email para ativar seus 240 créditos gratuitos
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-16 md:py-20 bg-black/30">
      <AnimatedSection className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full px-4 py-1.5 mb-4">
            <Gift className="w-4 h-4 text-fuchsia-400" />
            <span className="text-fuchsia-300 text-xs font-medium">Teste Grátis</span>
          </div>
          <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl text-white mb-3">
            Teste{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">
              grátis agora mesmo
            </span>
          </h2>
          <p className="text-white/50 text-sm">
            Cadastre-se e receba <strong className="text-fuchsia-400">240 créditos</strong> para testar o Arcano Cloner por <strong className="text-fuchsia-400">24 horas</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <span className="text-white/70 text-xs">240 créditos • 24h de acesso</span>
            <Clock className="w-3.5 h-3.5 text-white/40 ml-auto" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">Nome</Label>
            <Input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-fuchsia-500/50"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">Email</Label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-fuchsia-500/50"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">WhatsApp</Label>
            <Input
              type="tel"
              placeholder="(00) 00000-0000"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              maxLength={30}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-fuchsia-500/50"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold py-6 rounded-xl text-base"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "🚀 Ativar Teste Grátis"
            )}
          </Button>

          <p className="text-white/30 text-[11px] text-center">
            Ao se cadastrar, você receberá um email para confirmar e ativar seus créditos
          </p>
        </form>
      </AnimatedSection>
    </section>
  );
};

export default LandingTrialSignupSection;
