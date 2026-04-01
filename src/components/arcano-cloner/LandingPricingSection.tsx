import { useState, useEffect } from "react";
import { Check, X, Sparkles, Image, Video, Award, ShieldCheck, Zap, Headset, Rocket, Crown, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { supabase } from "@/integrations/supabase/client";
import { usePagarmeCheckout } from "@/hooks/usePagarmeCheckout";

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
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm px-4 sm:px-6 py-4 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3 w-full justify-center">
          <div className="flex -space-x-2 shrink-0">
            {socialProofImages.map((src, i) => (
              <img key={i} src={src} alt="" width="32" height="32" decoding="async" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-black object-cover" />
            ))}
          </div>
          <span className="text-white/80 text-xs sm:text-sm font-medium leading-tight">
            Junte-se a + de 3200 criadores em todo o mundo.
          </span>
        </div>
        <div className="flex items-center justify-center gap-8 w-full">
          <div className="flex flex-col items-center gap-0.5">
            <Image className="w-5 h-5 text-fuchsia-400 mb-1" />
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-base sm:text-lg">{animatedImages.displayValue.toLocaleString('pt-BR')}</span>
              <span className="text-fuchsia-400 text-lg font-bold">+</span>
            </div>
            <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium text-center">Imagens Geradas</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Video className="w-5 h-5 text-fuchsia-400 mb-1" />
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-base sm:text-lg">{animatedVideos.displayValue.toLocaleString('pt-BR')}</span>
              <span className="text-fuchsia-400 text-lg font-bold">+</span>
            </div>
            <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium text-center">Vídeos Gerados</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Award className="w-5 h-5 text-yellow-500 mb-1" />
            <div className="flex items-center gap-0.5">
              <span className="text-white font-bold text-base sm:text-lg">{animatedSatisfaction.displayValue}</span>
              <span className="text-yellow-500 text-lg font-bold">%</span>
            </div>
            <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium text-center">Satisfação</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface Plan {
  name: string;
  price: string;
  originalPrice: string | null;
  credits: string;
  creditsCount: string;
  images: number | string;
  tagline?: string;
  features: { text: string; included: boolean }[];
  bestSeller?: boolean;
  hasCountdown?: boolean;
  productSlug: string;
}

const landingPlans: Plan[] = [
  {
    name: "Starter",
    price: "24,90",
    originalPrice: null,
    credits: "25 imagens",
    creditsCount: "1.500 créditos",
    images: 25,
    tagline: "Para começar",
    productSlug: "landing-starter-avulso",
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
    price: "37,00",
    originalPrice: null,
    credits: "70 imagens",
    creditsCount: "4.200 créditos",
    images: 70,
    tagline: "3x mais créditos por mais R$12",
    bestSeller: true,
    productSlug: "landing-pro-avulso",
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
    price: "79,90",
    originalPrice: null,
    credits: "233 imagens",
    creditsCount: "14.000 créditos",
    images: 233,
    tagline: "Ideal para designers e criadores ativos",
    hasCountdown: true,
    productSlug: "landing-ultimate-avulso",
    features: [
      { text: "Atualizações diárias", included: true },
      { text: "Acesso às Ferramentas de IA", included: true },
      { text: "Suporte exclusivo via WhatsApp", included: true },
      { text: "Prompts premium ilimitados", included: true },
      { text: "Geração de Imagem com NanoBanana Pro", included: true },
      { text: "Geração de Vídeo com Veo 3", included: true },
    ],
  },
];

const LandingPricingSection = () => {
  const { openCheckout, isLoading, PagarmeCheckoutModal } = usePagarmeCheckout({ source_page: "arcanocloner-teste" });

  return (
    <AnimatedSection className="px-4 py-16 md:py-20">
      <div className="max-w-7xl mx-auto">
        <AnimatedSection as="div" delay={100}>
          <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-3">
            Comece agora mesmo a gerar suas próprias{" "}
            <span className="text-fuchsia-400">fotos profissionais!</span>
          </h2>
          <p className="text-white/50 text-center text-sm mb-8 max-w-xl mx-auto">
            Sem <strong className="text-white/70">prompts complexos! Sem dificuldade!</strong> Escolha o melhor pacote para você iniciar
          </p>
        </AnimatedSection>

        <StatsBar />

        {/* Plans Grid */}
        <StaggeredAnimation
          className="grid grid-cols-1 sm:grid-cols-3 gap-12 sm:gap-6 lg:gap-8 max-w-5xl mx-auto px-2 sm:px-4"
          itemClassName="w-full"
          staggerDelay={100}
          animation="fade-up"
        >
          {landingPlans.map((plan) => (
            <div key={plan.name} className="flex flex-col h-full w-full">
              <Card className={`relative flex flex-col rounded-2xl bg-white/[0.03] w-full h-full p-5 sm:p-6 lg:p-8 min-h-[420px] lg:min-h-[520px] ${
                plan.bestSeller ? "border-2 border-lime-400 shadow-[0_0_40px_-8px_rgba(163,230,53,0.25)]" :
                plan.hasCountdown ? "border-2 border-fuchsia-500 shadow-[0_0_40px_-8px_rgba(217,70,239,0.25)]" :
                "border border-white/10 hover:border-white/20 transition-colors"
              }`}>
                {plan.bestSeller && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-0 text-[11px] whitespace-nowrap bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold px-4 py-1">
                    Mais Vendido
                  </Badge>
                )}
                {plan.hasCountdown && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-0 text-[11px] whitespace-nowrap bg-gradient-to-r from-fuchsia-600 to-blue-500 text-white px-4 py-1">
                    MELHOR CUSTO/BENEFÍCIO
                  </Badge>
                )}

                {/* Plan Icon */}
                <div className="flex justify-center mb-3 lg:mb-5">
                  {plan.bestSeller ? (
                    <Crown className="w-8 h-8 lg:w-10 lg:h-10 text-lime-400" />
                  ) : plan.hasCountdown ? (
                    <Flame className="w-8 h-8 lg:w-10 lg:h-10 text-fuchsia-500" />
                  ) : (
                    <Rocket className="w-8 h-8 lg:w-10 lg:h-10 text-white/60" />
                  )}
                </div>

                <div className="text-center mb-4 lg:mb-5 min-h-[36px] flex items-center justify-center">
                  <h3 className="text-lg lg:text-xl font-bold text-white">{plan.name}</h3>
                </div>

                {/* Price */}
                <div className="text-center mb-5 lg:mb-6">
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-fuchsia-400 text-base lg:text-lg">R$</span>
                    <span className="text-4xl lg:text-5xl font-bold text-white">{plan.price}</span>
                  </div>
                </div>

                {/* CTA */}
                <Button
                  onClick={() => openCheckout(plan.productSlug)}
                  disabled={isLoading}
                  className={`w-full mb-2 text-sm lg:text-base h-10 lg:h-12 ${
                    plan.bestSeller ? "bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 text-black font-semibold" :
                    plan.hasCountdown ? "bg-gradient-to-r from-fuchsia-600 to-blue-500 hover:from-fuchsia-700 hover:to-blue-600 text-white font-semibold" :
                    "bg-white/10 hover:bg-white/20 text-white/80"
                  }`}
                >
                  Comprar agora
                </Button>
                {plan.tagline && (
                  <p className="text-[10px] lg:text-[11px] text-fuchsia-400 text-center mb-2 italic">{plan.tagline}</p>
                )}

                {/* Images badge (highlighted) */}
                <div className="flex flex-col items-center mb-5 lg:mb-6 mt-3 gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs lg:text-sm font-bold text-white bg-gradient-to-r from-fuchsia-600 to-blue-500">
                    <Sparkles className="w-3.5 h-3.5" />
                    {plan.credits}
                  </span>
                  <span className="text-[10px] lg:text-[11px] text-white/40 font-medium">{plan.creditsCount}</span>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 lg:space-y-3 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs lg:text-sm">
                      {f.included ? (
                        <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-fuchsia-400 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-orange-500 shrink-0 mt-0.5" />
                      )}
                      <span className={f.included ? "text-white/70" : "text-orange-500"}>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </StaggeredAnimation>

        {/* Acesso Imediato + Trust Badges */}
        <div className="mt-12 text-center">
          <h3 className="font-space-grotesk font-extrabold text-3xl md:text-4xl lg:text-5xl text-white tracking-tight mb-6">
            ACESSO <span className="text-fuchsia-400">IMEDIATO</span>
          </h3>
          <div className="max-w-4xl mx-auto rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-5 sm:gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <ShieldCheck className="w-5 h-5 text-fuchsia-400 shrink-0" />
              <div className="text-left">
                <p className="text-white text-sm font-semibold leading-tight">Pagamento seguro</p>
                <p className="text-white/50 text-xs">transmissão criptografada SSL</p>
              </div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-white/10" />
            <div className="block sm:hidden w-full h-px bg-white/10" />
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Zap className="w-5 h-5 text-fuchsia-400 shrink-0" />
              <div className="text-left">
                <p className="text-white text-sm font-semibold leading-tight">Pagamento instantâneo</p>
                <p className="text-white/50 text-xs">Os pontos chegam instantaneamente.</p>
              </div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-white/10" />
            <div className="block sm:hidden w-full h-px bg-white/10" />
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Headset className="w-5 h-5 text-fuchsia-400 shrink-0" />
              <div className="text-left">
                <p className="text-white text-sm font-semibold leading-tight">Suporte 24/7</p>
                <p className="text-white/50 text-xs">estamos aqui para ajudar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MPCheckoutModal />

    </AnimatedSection>
  );
};

export default LandingPricingSection;
