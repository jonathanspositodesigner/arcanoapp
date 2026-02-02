import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, Sparkles, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const creditPlans = [
  { 
    credits: 1500, 
    description: "~25 upscales Standard", 
    price: "XX,XX", 
    link: "#",
    icon: Coins,
    color: "from-purple-500 to-fuchsia-500"
  },
  { 
    credits: 4200, 
    description: "~70 upscales Standard", 
    price: "XX,XX", 
    link: "#", 
    popular: true,
    icon: Zap,
    color: "from-fuchsia-500 to-pink-500"
  },
  { 
    credits: 10800, 
    description: "~180 upscales Standard", 
    price: "XX,XX", 
    link: "#", 
    bestValue: true,
    icon: Star,
    color: "from-yellow-500 to-orange-500"
  },
];

const PlanosCreditos = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const handlePurchase = (link: string) => {
    if (link !== "#") {
      window.open(link, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0221] via-[#1A0A2E] to-[#0D0221]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0D0221]/95 backdrop-blur-lg border-b border-purple-500/20">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-purple-300 hover:text-white hover:bg-purple-500/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Comprar Créditos
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Recarregue seus Créditos de IA
          </h2>
          <p className="text-purple-300 max-w-md mx-auto">
            Créditos <span className="text-green-400 font-semibold">vitalícios</span> que nunca expiram — use quando quiser!
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {creditPlans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card 
                key={plan.credits}
                className={`relative p-6 bg-[#1A0A2E] border-purple-500/20 flex flex-col items-center text-center transition-all duration-300 hover:scale-105 hover:border-purple-400/40 ${
                  plan.bestValue ? 'ring-2 ring-yellow-500/50 border-yellow-500/30' : ''
                } ${plan.popular ? 'ring-2 ring-fuchsia-500/50 border-fuchsia-500/30' : ''}`}
              >
                {/* Badges */}
                {plan.bestValue && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 px-3 py-1">
                    ⭐ MELHOR VALOR
                  </Badge>
                )}
                {plan.popular && !plan.bestValue && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white border-0 px-3 py-1">
                    🔥 POPULAR
                  </Badge>
                )}

                {/* Icon */}
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4 mt-2`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                {/* Credits */}
                <div className="mb-2">
                  <span className="text-3xl sm:text-4xl font-bold text-white">
                    {plan.credits.toLocaleString('pt-BR')}
                  </span>
                  <p className="text-purple-300 text-sm mt-1">créditos</p>
                </div>

                {/* Description */}
                <p className="text-purple-400 text-sm mb-4">
                  {plan.description}
                </p>

                {/* Lifetime Badge */}
                <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400 mb-4">
                  ♾️ Vitalício
                </Badge>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-sm text-purple-400">R$ </span>
                  <span className="text-2xl font-bold text-white">{plan.price}</span>
                </div>

                {/* CTA Button */}
                <Button 
                  onClick={() => handlePurchase(plan.link)}
                  className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-semibold py-5`}
                >
                  Comprar Agora
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-12 text-center">
          <p className="text-purple-400 text-sm max-w-lg mx-auto">
            💡 Os créditos vitalícios são consumidos <strong>após</strong> os créditos mensais da sua assinatura, 
            garantindo que você aproveite ao máximo seu plano.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlanosCreditos;
