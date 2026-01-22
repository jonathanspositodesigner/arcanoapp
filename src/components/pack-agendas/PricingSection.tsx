import { Button } from "@/components/ui/button";
import { Check, Crown, Zap } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface PricingSectionProps {
  onPurchase: (planType: "basic" | "complete") => void;
}

const plans = [
  {
    id: "basic" as const,
    name: "Pacote Básico",
    originalPrice: 87,
    price: 27,
    period: "6 meses de acesso",
    icon: Zap,
    features: [
      "+60 Artes Exclusivas",
      "Vídeo Aulas Explicativas",
      "7 Dias de Garantia",
      "100% Editável Canva e Photoshop",
      "6 Meses de Acesso"
    ],
    highlight: false
  },
  {
    id: "complete" as const,
    name: "Pacote Completo",
    originalPrice: 197,
    price: 37,
    period: "1 ano de acesso",
    icon: Crown,
    features: [
      "+60 Artes Exclusivas",
      "Vídeo Aulas Explicativas",
      "7 Dias de Garantia",
      "100% Editável Canva e Photoshop",
      "1 Ano de Acesso",
      "Atualizações Semanais",
      "Pack 190 Flyers Animados Canva",
      "Pack 19 Flyers After Effects",
      "Pack 16GB de Elementos PNG",
      "Pack +2200 Fontes",
      "Pack +500 Texturas"
    ],
    highlight: true,
    badge: "Mais Vendido"
  }
];

export const PricingSection = ({ onPurchase }: PricingSectionProps) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section id="pricing" className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <div 
          ref={ref}
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Escolha seu{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              Plano
            </span>
          </h2>
          <p className="text-zinc-400 text-lg">
            Investimento único. Sem mensalidades. Acesso imediato.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const discount = Math.round((1 - plan.price / plan.originalPrice) * 100);
            
            return (
              <div
                key={plan.id}
                className={`relative p-8 rounded-3xl transition-all duration-500 ${
                  plan.highlight
                    ? "bg-gradient-to-br from-orange-900/50 via-zinc-900 to-amber-900/50 border-2 border-orange-500/50 scale-105"
                    : "bg-zinc-900 border border-zinc-800"
                } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg shadow-orange-500/25">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Box image for complete plan */}
                {plan.highlight && (
                  <div className="flex justify-center mb-6">
                    <img 
                      src="https://voxvisual.com.br/wp-content/uploads/2025/03/BOX-AGENDAS-COMPLETO.png"
                      alt="Pack Completo"
                      className="h-32 w-auto object-contain"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    plan.highlight 
                      ? "bg-gradient-to-br from-orange-500 to-amber-500" 
                      : "bg-zinc-800"
                  }`}>
                    <Icon className={`w-6 h-6 ${plan.highlight ? "text-white" : "text-orange-400"}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="text-zinc-400 text-sm">{plan.period}</p>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-3">
                    <span className="text-zinc-500 line-through text-xl">
                      R$ {plan.originalPrice}
                    </span>
                    <span className="bg-green-500/20 text-green-400 text-sm font-bold px-2 py-1 rounded">
                      -{discount}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl font-bold text-white">R$ {plan.price}</span>
                    <span className="text-zinc-400">à vista</span>
                  </div>
                  <p className="text-zinc-500 text-sm mt-2">
                    ou 12x de R$ {(plan.price / 12 * 1.2).toFixed(2).replace('.', ',')}
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        plan.highlight 
                          ? "bg-gradient-to-br from-orange-500 to-amber-500" 
                          : "bg-orange-500/20"
                      }`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  onClick={() => onPurchase(plan.id)}
                  className={`w-full py-6 text-lg font-bold rounded-xl transition-all hover:scale-105 ${
                    plan.highlight
                      ? "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-lg shadow-orange-500/25"
                      : "bg-zinc-800 hover:bg-zinc-700 text-white"
                  }`}
                >
                  Quero este Pacote
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
