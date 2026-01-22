import { CheckCircle } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export const GuaranteeSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section className="py-20 bg-gradient-to-b from-black to-zinc-950">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className={`max-w-4xl mx-auto transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-3xl p-8 md:p-12 border border-green-500/20 overflow-hidden">
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-3xl rounded-full" />
            
            <div className="relative flex flex-col md:flex-row items-center gap-8">
              {/* Guarantee seal image */}
              <div className="flex-shrink-0">
                <img 
                  src="https://voxvisual.com.br/wp-content/uploads/2024/12/Selo-garantia.png"
                  alt="Garantia 7 Dias"
                  className="w-32 h-32 md:w-40 md:h-40 object-contain"
                />
              </div>
              
              <div className="text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Garantia Incondicional de{" "}
                  <span className="text-green-400">7 Dias</span>
                </h2>
                
                <p className="text-zinc-400 mb-6">
                  Se por qualquer motivo você não ficar satisfeito com o Pack de Agendas, 
                  basta enviar um e-mail em até 7 dias após a compra e devolvemos 100% do seu dinheiro. 
                  Sem perguntas, sem burocracia.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-zinc-300">Reembolso total garantido</span>
                  </div>
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-zinc-300">Sem perguntas ou burocracia</span>
                  </div>
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-zinc-300">Compra 100% segura</span>
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
