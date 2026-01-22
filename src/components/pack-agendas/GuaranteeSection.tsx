import { Shield, CheckCircle } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export const GuaranteeSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <div 
          ref={ref}
          className={`max-w-4xl mx-auto transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-green-900/20 via-zinc-900 to-emerald-900/20 border border-green-500/30 overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-green-500/10 blur-3xl rounded-full" />
            
            <div className="relative flex flex-col md:flex-row items-center gap-8">
              {/* Shield icon */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
                  <Shield className="w-12 h-12 md:w-16 md:h-16 text-white" />
                </div>
              </div>
              
              {/* Content */}
              <div className="text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Garantia Incondicional de{" "}
                  <span className="text-green-400">7 Dias</span>
                </h3>
                
                <p className="text-zinc-300 text-lg mb-6">
                  Se por qualquer motivo você não ficar 100% satisfeito com o material, 
                  basta enviar um e-mail dentro de 7 dias e devolvemos todo o seu dinheiro. 
                  Sem perguntas, sem burocracia.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span>Reembolso em até 24h</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span>Sem burocracia</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span>100% do valor</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
