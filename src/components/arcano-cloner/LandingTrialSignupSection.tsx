import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import { AnimatedSection } from "@/hooks/useScrollAnimation";
import ArcanoClonerAuthModal from "@/components/arcano-cloner/ArcanoClonerAuthModal";

export const LandingTrialSignupSection = () => {
  const [showModal, setShowModal] = useState(false);

  const handleAuthSuccess = () => {
    setShowModal(false);
    window.location.href = "https://arcanoapp.voxvisual.com.br/ferramentas-ia-aplicativo";
  };

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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-slate-400">
              grátis agora mesmo
            </span>
          </h2>
          <p className="text-white/50 text-sm">
            Experimente o Arcano Cloner e veja o poder da clonagem com IA
          </p>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          className="w-full bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 text-white font-bold py-6 rounded-xl text-base"
        >
          🚀 Ir para o Arcano Cloner
        </Button>
      </AnimatedSection>

      <ArcanoClonerAuthModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </section>
  );
};

export default LandingTrialSignupSection;
