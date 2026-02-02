import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Coins, Sparkles, Star, Zap, Wand2, Box, Shirt, PersonStanding, Clock, Video, Eraser, Image, Trash2, Monitor, Music, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ToolsHeader from "@/components/ToolsHeader";

const availableTools = [
  {
    name: "Upscaler Arcano",
    description: "Aumente a qualidade das suas imagens com IA",
    icon: Wand2,
    color: "from-purple-500 to-fuchsia-500"
  },
  {
    name: "Forja de Selos 3D",
    description: "Crie selos e emblemas 3D profissionais",
    icon: Box,
    color: "from-fuchsia-500 to-pink-500"
  },
  {
    name: "Mudar Roupa",
    description: "Troque a roupa de pessoas em fotos",
    icon: Shirt,
    color: "from-pink-500 to-rose-500"
  },
  {
    name: "Mudar Pose",
    description: "Altere a pose de pessoas em imagens",
    icon: PersonStanding,
    color: "from-rose-500 to-orange-500"
  }
];

const comingSoonTools = [
  { name: "Upscaler de Vídeo", icon: Video },
  { name: "Remoção de Fundo", icon: Eraser },
  { name: "Edição Automática", icon: Image },
  { name: "Remover Objeto", icon: Trash2 },
  { name: "Telões de LED", icon: Monitor },
  { name: "Narração e Música", icon: Music },
];

const creditPlans = [
  { 
    credits: "+1.500", 
    description: "~25 imagens", 
    price: "29,90",
    originalPrice: "39,90",
    savings: "25",
    link: "https://payfast.greenn.com.br/9trhhb9",
    icon: Coins,
    color: "from-purple-500 to-fuchsia-500"
  },
  { 
    credits: "+4.200", 
    description: "~70 imagens", 
    price: "39,90",
    originalPrice: "49,90",
    savings: "52",
    link: "https://payfast.greenn.com.br/y3u2u3d", 
    popular: true,
    icon: Zap,
    color: "from-fuchsia-500 to-pink-500"
  },
  { 
    credits: "+10.800", 
    description: "~180 imagens", 
    price: "99,90",
    originalPrice: "149,90",
    savings: "54",
    link: "https://payfast.greenn.com.br/vwfzrw2", 
    bestValue: true,
    icon: Star,
    color: "from-yellow-500 to-orange-500"
  },
];

const PlanosCreditos = () => {
  const navigate = useNavigate();

  // Countdown timer - 47 minutes (persisted in localStorage)
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('planos-creditos-countdown');
    if (saved) {
      const remaining = parseInt(saved, 10) - Date.now();
      if (remaining > 0) return remaining;
    }
    const initial = 47 * 60 * 1000; // 47 minutos
    localStorage.setItem('planos-creditos-countdown', String(Date.now() + initial));
    return initial;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          const newTime = 47 * 60 * 1000;
          localStorage.setItem('planos-creditos-countdown', String(Date.now() + newTime));
          return newTime;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0')
    };
  };

  const time = formatTime(timeLeft);

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
      <ToolsHeader
        title="Comprar Créditos"
        onBack={handleBack}
        showBackButton={true}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-8 space-y-12">
        
        {/* AI Tools Section */}
        <section className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Ferramentas de IA Integradas
          </h2>
          <p className="text-purple-300 max-w-lg mx-auto mb-8">
            Tudo em forma de aplicativo — <span className="text-fuchsia-400 font-medium">mais fácil e prático!</span>
          </p>

          {/* Available Tools Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-8">
            {availableTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card 
                  key={tool.name}
                  className="p-4 bg-[#1A0A2E] border-purple-500/20 hover:border-purple-400/40 transition-all duration-300"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center mx-auto mb-3`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1">{tool.name}</h3>
                  <p className="text-purple-400 text-xs leading-tight">{tool.description}</p>
                </Card>
              );
            })}
          </div>

          {/* Coming Soon Section */}
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 font-medium text-sm">Em Breve</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {comingSoonTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Badge 
                    key={tool.name}
                    variant="outline" 
                    className="bg-purple-900/30 border-purple-500/30 text-purple-300 py-1.5 px-3 gap-1.5"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tool.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="w-full max-w-md mx-auto h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

        {/* Credits Section */}
        <section>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 mb-4">
              <Coins className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Recarregue seus Créditos
            </h2>
            <p className="text-purple-300 max-w-md sm:max-w-none mx-auto mb-2">
              Créditos <span className="text-green-400 font-semibold">vitalícios</span> que nunca expiram — use quando quiser!
            </p>
            <p className="text-fuchsia-400 font-medium text-sm mb-4">
              🎉 Promoção na primeira recarga de créditos!
            </p>

            {/* Compact Countdown Timer */}
            <div className="inline-flex items-center gap-2 bg-red-900/30 border border-red-500/30 rounded-full px-4 py-2">
              <Clock className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-sm">Oferta expira em</span>
              <span className="text-red-100 font-mono font-medium text-sm">
                {time.hours}:{time.minutes}:{time.seconds}
              </span>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {creditPlans.map((plan) => {
              const Icon = plan.icon;
              return (
                <Card 
                  key={plan.credits}
                  className={`relative p-6 bg-[#1A0A2E] border-purple-500/20 flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.02] hover:border-purple-400/40 ${
                    plan.bestValue ? 'ring-2 ring-yellow-500/50 border-yellow-500/30' : ''
                  } ${plan.popular ? 'ring-2 ring-fuchsia-500/50 border-fuchsia-500/30' : ''}`}
                >
                  {/* Badges */}
                  {plan.bestValue && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 px-3 py-1 text-xs">
                      ⭐ MELHOR VALOR
                    </Badge>
                  )}
                  {plan.popular && !plan.bestValue && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white border-0 px-3 py-1 text-xs">
                      🔥 POPULAR
                    </Badge>
                  )}

                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center mb-3 mt-2`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Credits */}
                  <div className="mb-1">
                    <span className="text-2xl sm:text-3xl font-bold text-white">
                      {plan.credits}
                    </span>
                    <p className="text-purple-300 text-sm">créditos</p>
                  </div>

                  {/* Description */}
                  <p className="text-purple-400 text-sm mb-3">
                    {plan.description}
                  </p>

                  {/* Savings Badge */}
                  {plan.savings && (
                    <Badge className="bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-xs mb-2 gap-1">
                      <Tag className="w-3 h-3" />
                      Economize {plan.savings}%
                    </Badge>
                  )}

                  {/* Lifetime Badge */}
                  <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400 text-xs mb-3">
                    ♾️ Vitalício
                  </Badge>

                  {/* Content wrapper for consistent height - pushes button to bottom */}
                  <div className="flex-1 flex flex-col justify-end w-full">
                    {/* Price Section */}
                    <div className="mb-4">
                      {plan.originalPrice && (
                        <span className="text-sm text-purple-500 line-through block mb-1">R$ {plan.originalPrice}</span>
                      )}
                      <div>
                        <span className="text-sm text-purple-400">R$ </span>
                        <span className="text-2xl font-bold text-white">{plan.price}</span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button 
                      onClick={() => handlePurchase(plan.link)}
                      className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-semibold py-5`}
                    >
                      Comprar Agora
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Info Section */}
          <div className="mt-10 text-center">
            <p className="text-purple-400 text-sm max-w-lg mx-auto">
              💡 Os créditos vitalícios são consumidos <strong>após</strong> os créditos mensais da sua assinatura, 
              garantindo que você aproveite ao máximo seu plano.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PlanosCreditos;
