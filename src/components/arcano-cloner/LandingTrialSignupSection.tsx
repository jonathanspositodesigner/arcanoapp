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
    <section className="px-4 py-16 md:py-20 bg-muted/50">
      <AnimatedSection className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-accent0/10 border border-border rounded-full px-4 py-1.5 mb-4">
            <Gift className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground text-xs font-medium">Teste Grátis</span>
          </div>
          <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl text-foreground mb-3">
            Teste{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-400">
              grátis agora mesmo
            </span>
          </h2>
          <p className="text-muted-foreground text-sm">
            Experimente o Arcano Cloner e veja o poder da clonagem com IA
          </p>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-6 rounded-xl text-base"
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