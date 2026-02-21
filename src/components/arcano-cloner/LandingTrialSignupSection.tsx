import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import { AnimatedSection } from "@/hooks/useScrollAnimation";

export const LandingTrialSignupSection = () => {
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
            Experimente o Arcano Cloner e veja o poder da clonagem com IA
          </p>
        </div>

        <Button
          asChild
          className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold py-6 rounded-xl text-base"
        >
          <a href="https://arcanoapp.voxvisual.com.br/arcano-cloner-tool" target="_blank" rel="noopener noreferrer">
            🚀 Ir para o Arcano Cloner
          </a>
        </Button>
      </AnimatedSection>
    </section>
  );
};

export default LandingTrialSignupSection;
