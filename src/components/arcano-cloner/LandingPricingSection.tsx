import { useState, useEffect } from "react";
import { Check, X, Sparkles, Image, Video, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { supabase } from "@/integrations/supabase/client";

const socialProofImages = [
  "/images/social-proof-1.webp",
  "/images/social-proof-2.webp",
  "/images/social-proof-3.webp",
];

const StatsBar = () => {
  const [totalImages, setTotalImages] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase.rpc('get_ai_tools_cost_averages');
      if (data) {
        const total = data.reduce((acc: number, tool: any) => acc + (tool.total_completed || 0), 0);
        setTotalImages(total);
      }
      setLoaded(true);
    };
    fetchStats();
  }, []);

  const animatedImages = useAnimatedNumber(totalImages, 1500);
  const animatedVideos = useAnimatedNumber(loaded ? 247 : 0, 1500);
  const animatedSatisfaction = useAnimatedNumber(loaded ? 100 : 0, 1500);

  return (
    <div className="max-w-4xl mx-auto mb-10 px-2">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-0">
        <div className="flex items-center gap-3 sm:flex-1 min-w-0">
          <div className="flex -space-x-2 shrink-0">
            {socialProofImages.map((src, i) => (
              <img key={i} src={src} alt="" width="32" height="32" decoding="async" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-black object-cover" />
            ))}
          </div>
          <span className="text-white/80 text-xs sm:text-sm font-medium leading-tight">
            Junte-se a + de 3200 criadores em todo o mundo.
          </span>
        </div>
        <div className="flex items-center gap-6 sm:gap-8 shrink-0">
          <div className="flex flex-col items-center gap-0.5">
            <Image className="w-5 h-5 text-fuchsia-400 mb-1" />
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-base sm:text-lg">{animatedImages.displayValue.toLocaleString('pt-BR')}</span>
              <span className="text-fuchsia-400 text-lg font-bold">+</span>
            </div>
            <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium">Imagens Geradas</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Video className="w-5 h-5 text-fuchsia-400 mb-1" />
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-base sm:text-lg">{animatedVideos.displayValue.toLocaleString('pt-BR')}</span>
              <span className="text-fuchsia-400 text-lg font-bold">+</span>
            </div>
            <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium">Vídeos Gerados</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Award className="w-5 h-5 text-yellow-500 mb-1" />
            <div className="flex items-center gap-0.5">
              <span className="text-white font-bold text-base sm:text-lg">{animatedSatisfaction.displayValue}</span>
              <span className="text-yellow-500 text-lg font-bold">%</span>
            </div>
            <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium">Satisfação</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CHECKOUT_BASE = "https://arcanoapp.lovable.app/planos-2";

interface Plan {
  name: string;
  price: string;
  originalPrice: string | null;
  credits: string;
  images: number | string;
  tagline?: string;
  features: { text: string; included: boolean }[];
  bestSeller?: boolean;
  hasCountdown?: boolean;
  isUnlimitedBadge?: boolean;
}

const plansData: { mensal: Plan[]; anual: Plan[] } = {
  mensal: [
    {
      name: "Starter",
      price: "24,90",
      originalPrice: "29,90",
      credits: "1.500 créditos de IA",
      images: 25,
      tagline: "Para começar",
      features: [
        { text: "Atualizações diárias", included: true },
        { text: "Acesso às Ferramentas de IA", included: true },
        { text: "Suporte exclusivo via WhatsApp", included: true },
        { text: "Prompts premium ilimitados", included: true },
        { text: "Geração de Imagem com NanoBanana Pro", included: false },
        { text: "Geração de Vídeo com Veo 3", included: false },
      ],
    },
    {
      name: "Pro",
      price: "39,90",
      originalPrice: "49,90",
      credits: "5.000 créditos de IA",
      images: 83,
      tagline: "3x mais créditos por mais R$15",
      bestSeller: true,
      features: [
        { text: "Atualizações diárias", included: true },
        { text: "Acesso às Ferramentas de IA", included: true },
        { text: "Suporte exclusivo via WhatsApp", included: true },
        { text: "Prompts premium ilimitados", included: true },
        { text: "Geração de Imagem com NanoBanana Pro", included: true },
        { text: "Geração de Vídeo com Veo 3", included: true },
      ],
    },
    {
      name: "Ultimate",
      price: "59,90",
      originalPrice: "79,90",
      credits: "14.000 créditos de IA",
      images: 233,
      tagline: "Ideal para designers e criadores ativos",
      hasCountdown: true,
      features: [
        { text: "Atualizações diárias", included: true },
        { text: "Acesso às Ferramentas de IA", included: true },
        { text: "Suporte exclusivo via WhatsApp", included: true },
        { text: "Prompts premium ilimitados", included: true },
        { text: "Geração de Imagem com NanoBanana Pro", included: true },
        { text: "Geração de Vídeo com Veo 3", included: true },
      ],
    },
    {
      name: "IA Unlimited",
      price: "149,90",
      originalPrice: "249,90",
      credits: "Créditos Ilimitados",
      images: "Ilimitadas",
      tagline: "Máxima liberdade",
      isUnlimitedBadge: true,
      features: [
        { text: "Atualizações diárias", included: true },
        { text: "Acesso às Ferramentas de IA", included: true },
        { text: "Suporte exclusivo via WhatsApp", included: true },
        { text: "Prompts premium ilimitados", included: true },
        { text: "Geração de Imagem com NanoBanana Pro", included: true },
        { text: "Geração de Vídeo com Veo 3", included: true },
        { text: "Fila prioritária nas gerações de IA", included: true },
      ],
    },
  ],
  anual: [
    {
      name: "Starter",
      price: "24,90",
      originalPrice: null,
      credits: "1.500 créditos de IA",
      images: 25,
      tagline: "Para começar",
      features: [
        { text: "Atualizações diárias", included: true },
        { text: "Acesso às Ferramentas de IA", included: true },
        { text: "Suporte exclusivo via WhatsApp", included: true },
        { text: "Prompts premium ilimitados", included: true },
        { text: "Geração de Imagem com NanoBanana Pro", included: false },
        { text: "Geração de Vídeo com Veo 3", included: false },
      ],
    },
    {
      name: "Pro",
      price: "33,90",
      originalPrice: "39,90",
      credits: "5.000 créditos de IA",
      images: 83,
      tagline: "3x mais créditos por mais R$15",
      bestSeller: true,
      features: [
        { text: "Atualizações diárias", included: true },
        { text: "Acesso às Ferramentas de IA", included: true },
        { text: "Suporte exclusivo via WhatsApp", included: true },
        { text: "Prompts premium ilimitados", included: true },
        { text: "Geração de Imagem com NanoBanana Pro", included: true },
        { text: "Geração de Vídeo com Veo 3", included: true },
      ],
    },
    {
      name: "Ultimate",
      price: "49,90",
      originalPrice: "59,90",
      credits: "14.000 créditos de IA",
      images: 233,
      tagline: "Ideal para designers e criadores ativos",
      hasCountdown: true,
      features: [
        { text: "Atualizações diárias", included: true },
        { text: "Acesso às Ferramentas de IA", included: true },
        { text: "Suporte exclusivo via WhatsApp", included: true },
        { text: "Prompts premium ilimitados", included: true },
        { text: "Geração de Imagem com NanoBanana Pro", included: true },
        { text: "Geração de Vídeo com Veo 3", included: true },
      ],
    },
    {
      name: "IA Unlimited",
      price: "119,90",
      originalPrice: "149,90",
      credits: "Créditos Ilimitados",
      images: "Ilimitadas",
      tagline: "Máxima liberdade",
      isUnlimitedBadge: true,
      features: [
        { text: "Atualizações diárias", included: true },
        { text: "Acesso às Ferramentas de IA", included: true },
        { text: "Suporte exclusivo via WhatsApp", included: true },
        { text: "Prompts premium ilimitados", included: true },
        { text: "Geração de Imagem com NanoBanana Pro", included: true },
        { text: "Geração de Vídeo com Veo 3", included: true },
        { text: "Fila prioritária nas gerações de IA", included: true },
      ],
    },
  ],
};

const LandingPricingSection = () => {
  const [billingPeriod, setBillingPeriod] = useState<"mensal" | "anual">("mensal");
  const currentPlans = plansData[billingPeriod];

  return (
    <AnimatedSection className="px-4 py-16 md:py-20">
      <div className="max-w-7xl mx-auto">
        <AnimatedSection as="div" delay={100}>
          <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-3">
            Escolha o plano ideal{" "}
            <span className="text-fuchsia-400">para você</span>
          </h2>
          <p className="text-white/50 text-center text-sm mb-8 max-w-xl mx-auto">
            Comece grátis ou desbloqueie todo o potencial com um plano premium
          </p>
        </AnimatedSection>

        <StatsBar />

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <Tabs value={billingPeriod} onValueChange={v => setBillingPeriod(v as "mensal" | "anual")} className="inline-flex">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="mensal" className="data-[state=active]:bg-fuchsia-600 data-[state=active]:text-white text-white/60 px-6">
                Mensal
              </TabsTrigger>
              <TabsTrigger value="anual" className="data-[state=active]:bg-fuchsia-600 data-[state=active]:text-white text-white/60 px-6 relative flex items-center gap-2">
                Anual
                <span className="bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  52% OFF
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Plans Grid */}
        <StaggeredAnimation
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto"
          itemClassName="w-full"
          staggerDelay={100}
          animation="fade-up"
        >
          {currentPlans.map((plan) => (
            <div key={plan.name} className="flex flex-col h-full w-full">
              <Card className={`relative p-4 flex flex-col rounded-2xl bg-white/[0.03] w-full h-full ${
                plan.isUnlimitedBadge ? "border-2 border-yellow-400 shadow-lg shadow-yellow-400/20" :
                plan.bestSeller ? "border-2 border-lime-400 shadow-lg shadow-lime-400/20" :
                plan.hasCountdown ? "border-2 border-fuchsia-500 shadow-lg shadow-fuchsia-500/20" :
                "border border-white/10"
              }`}>
                {plan.bestSeller && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 border-0 text-[10px] whitespace-nowrap bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold px-3 py-0.5">
                    Mais Vendido
                  </Badge>
                )}
                {plan.hasCountdown && !plan.isUnlimitedBadge && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 border-0 text-[10px] whitespace-nowrap bg-gradient-to-r from-fuchsia-600 to-blue-500 text-white px-3 py-0.5">
                    MELHOR CUSTO/BENEFÍCIO
                  </Badge>
                )}
                {plan.isUnlimitedBadge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-0 text-[11px] whitespace-nowrap bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 text-black font-extrabold px-4 py-1 shadow-lg shadow-yellow-400/40 tracking-wider">
                    ✨ CRIE SEM LIMITES ✨
                  </Badge>
                )}

                <div className="text-center mb-3 min-h-[32px] flex items-center justify-center">
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                </div>

                {/* Price */}
                <div className="text-center mb-3">
                  {plan.originalPrice ? (
                    <p className="text-white/40 line-through text-xs">R${plan.originalPrice}/mês</p>
                  ) : (
                    <p className="text-transparent text-xs">.</p>
                  )}
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-fuchsia-400 text-sm">R$</span>
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    <span className="text-fuchsia-400 text-xs">/mês</span>
                  </div>
                </div>

                {/* CTA */}
                <Button
                  onClick={() => window.open(CHECKOUT_BASE, '_blank')}
                  className={`w-full mb-1 text-sm h-9 ${
                    plan.isUnlimitedBadge ? "bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 hover:from-yellow-500 hover:via-amber-600 hover:to-yellow-500 text-black font-bold" :
                    plan.bestSeller ? "bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 text-black font-semibold" :
                    plan.hasCountdown ? "bg-gradient-to-r from-fuchsia-600 to-blue-500 hover:from-fuchsia-700 hover:to-blue-600 text-white font-semibold" :
                    "bg-white/10 hover:bg-white/20 text-white/80"
                  }`}
                >
                  {plan.name === "Free" ? "Criar conta grátis" : "Assinar agora"}
                </Button>
                {plan.tagline && (
                  <p className="text-[10px] text-fuchsia-400 text-center mb-1 italic">{plan.tagline}</p>
                )}

                {/* Credits badge */}
                <div className="flex flex-col items-center mb-4 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white bg-gradient-to-r from-fuchsia-600 to-blue-500">
                    <Sparkles className="w-2.5 h-2.5" />
                    {plan.credits}/mês
                  </span>
                  {plan.images && (
                    <span className="text-[9px] text-fuchsia-400 mt-0.5">
                      ≈ {typeof plan.images === "string" ? plan.images : `${plan.images} imagens/mês`}
                    </span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      {f.included ? (
                        <Check className="w-3 h-3 text-fuchsia-400 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                      )}
                      <span className={f.included ? "text-white/70" : "text-orange-500"}>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </StaggeredAnimation>
      </div>
    </AnimatedSection>
  );
};

export default LandingPricingSection;
