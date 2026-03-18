import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, ArrowLeft, Sparkles, Crown, Zap, ImagePlus, Infinity, Camera, Palette, Music, Upload, Download, Wand2, ArrowRight, Shield, Clock, Star, CreditCard, MessageCircle, ZoomIn, X, User, Rocket, PenTool, Flame, ShieldCheck, Headset, Image, Video, Award } from "lucide-react";
import { invokeCheckout, preWarmCheckout } from "@/lib/checkoutFetch";
import { useProcessingButton } from "@/hooks/useProcessingButton";
import PreCheckoutModal from "@/components/upscaler/PreCheckoutModal";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { AnimatedSection, AnimatedElement, StaggeredAnimation, ScrollIndicator, FadeIn } from "@/hooks/useScrollAnimation";

import { HeroBeforeAfterSlider, HeroPlaceholder, SectionSkeleton, LazySocialProofWrapper } from "@/components/upscaler";
import { useIsMobile } from "@/hooks/use-mobile";
import { useImagePreload, useImagesPreload } from "@/hooks/useImagePreload";

// Hero images - Desktop uses high-res, Mobile uses optimized 600x900 versions
const upscalerHeroAntesDesktop = "/images/upscaler-hero-antes.webp";
const upscalerHeroDepoisDesktop = "/images/upscaler-hero-depois.webp";
const upscalerHeroAntesMobile = "/images/upscaler-hero-antes-mobile.webp";
const upscalerHeroDepoisMobile = "/images/upscaler-hero-depois-mobile.webp";

// Lazy load heavy gallery sections - images will only load when user scrolls to section
const BeforeAfterGalleryPT = lazy(() => import("@/components/upscaler/sections/BeforeAfterGalleryPT"));

interface ToolData {
  id: string;
  name: string;
  slug: string;
  price_vitalicio: number | null;
  checkout_link_vitalicio: string | null;
  checkout_link_membro_vitalicio: string | null;
  cover_url: string | null;
}

// Modal fullscreen para visualização ampliada
const FullscreenModal = ({ 
  isOpen, 
  onClose, 
  beforeImage, 
  afterImage 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  beforeImage: string; 
  afterImage: string; 
}) => {
  const { t } = useTranslation();
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      >
        <X className="h-6 w-6 text-white" />
      </button>
      
      <div 
        ref={containerRef}
        className="relative w-full max-w-4xl aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize select-none"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        {/* Imagem "Depois" (background) */}
        <img 
          src={afterImage} 
          alt="Depois" 
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />
        
        {/* Imagem "Antes" (clipped) */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img 
            src={beforeImage} 
            alt="Antes" 
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        </div>

        {/* Slider line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-6 bg-gray-400 rounded-full" />
              <div className="w-0.5 h-6 bg-gray-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 bg-black/80 text-white text-base font-semibold px-5 py-2.5 rounded-full">
          {t('tools:upscaler.beforeAfter.before')}
        </div>
        <div className="absolute top-4 right-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-base font-semibold px-5 py-2.5 rounded-full">
          {t('tools:upscaler.beforeAfter.after')}
        </div>
      </div>
    </div>
  );
};

// CTA Button Component - estilo pill
const CTAButton = ({ onClick, isPremium, t, loading }: { onClick: () => void; isPremium: boolean; t: (key: string) => string; loading?: boolean }) => (
  <Button
    onClick={onClick}
    disabled={loading}
    className="w-full max-w-md py-6 text-lg font-bold rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white shadow-2xl shadow-fuchsia-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-fuchsia-500/40 disabled:opacity-70 disabled:cursor-wait"
  >
    {loading ? 'Gerando checkout...' : t('tools:upscaler.cta')}
    {!loading && <ArrowRight className="h-5 w-5 ml-2" />}
  </Button>
);

// Trust Badges Component
const TrustBadges = ({ t }: { t: (key: string) => string }) => (
  <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
    <span className="flex items-center gap-1.5 bg-white/5 text-white/70 text-xs px-3 py-1.5 rounded-full border border-white/10">
      <Shield className="h-3 w-3 text-green-400" />
      {t('tools:upscaler.trustBadges.secure')}
    </span>
    <span className="flex items-center gap-1.5 bg-white/5 text-white/70 text-xs px-3 py-1.5 rounded-full border border-white/10">
      <Zap className="h-3 w-3 text-yellow-400" />
      {t('tools:upscaler.trustBadges.immediate')}
    </span>
    <span className="flex items-center gap-1.5 bg-white/5 text-white/70 text-xs px-3 py-1.5 rounded-full border border-white/10">
      <Infinity className="h-3 w-3 text-fuchsia-400" />
      {t('tools:upscaler.trustBadges.lifetime')}
    </span>
  </div>
);

// Social proof images for stats bar
const socialProofImages = [
  "/images/social-proof-1.webp",
  "/images/social-proof-2.webp",
  "/images/social-proof-3.webp",
];

const PricingStatsBar = () => {
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

interface UpscalerPlan {
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
  isLifetime?: boolean;
  productSlug: string;
}

const upscalerPlans: UpscalerPlan[] = [
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
  {
    name: "Vitalício",
    price: "99,90",
    originalPrice: null,
    credits: "Acesso vitalício",
    creditsCount: "Todas as ferramentas para sempre",
    images: "∞",
    tagline: "Acesso permanente a tudo",
    isLifetime: true,
    productSlug: "",
    features: [
      { text: "Melhore imagens com IA", included: true },
      { text: "Remova fundos automaticamente", included: true },
      { text: "Acesso vitalício", included: true },
      { text: "Todas as atualizações futuras", included: true },
      { text: "Geração de Imagem com NanoBanana Pro", included: true },
      { text: "Geração de Vídeo com Veo 3", included: true },
    ],
  },
];

const UpscalerPricingSection = ({ isPremium, tool, handlePurchaseLegacy, t }: { isPremium: boolean; tool: ToolData | null; handlePurchaseLegacy: () => void; t: (key: string) => string }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showPreCheckout, setShowPreCheckout] = useState(false);
  const [preCheckoutSlug, setPreCheckoutSlug] = useState<string | null>(null);
  const { isSubmitting: isProcessing, startSubmit: startCheckout, endSubmit: endCheckout } = useProcessingButton();

  useEffect(() => {
    const timer = setTimeout(() => preWarmCheckout(), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email ?? null);
      }
    };
    getUser();
  }, []);

  const handlePurchase = (plan: UpscalerPlan) => {
    if (plan.isLifetime) {
      handlePurchaseLegacy();
      return;
    }
    if (!startCheckout()) return;
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "InitiateCheckout", {
        content_name: plan.productSlug,
        content_category: "Upscaler Bundle",
        content_type: "product",
        currency: "BRL",
      });
    }
    setPreCheckoutSlug(plan.productSlug);
    setShowPreCheckout(true);
    endCheckout();
  };

  return (
    <AnimatedSection className="px-3 md:px-4 py-16 md:py-20" animation="scale">
      <div className="max-w-7xl mx-auto">
        <AnimatedSection as="div" delay={100}>
          <h2 className="font-bebas text-3xl md:text-4xl lg:text-5xl text-white text-center mb-3 tracking-wide">
            {t('tools:upscaler.finalCTA.title')} <span className="text-fuchsia-400">{t('tools:upscaler.finalCTA.subtitle')}</span>
          </h2>
          <p className="text-white/50 text-center text-sm mb-8 max-w-xl mx-auto">
            Escolha o melhor pacote para você e comece agora
          </p>
        </AnimatedSection>

        <PricingStatsBar />

        <StaggeredAnimation
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 lg:gap-5 max-w-6xl mx-auto px-2 sm:px-4"
          itemClassName="w-full"
          staggerDelay={100}
          animation="fade-up"
        >
          {upscalerPlans.map((plan) => (
            <div key={plan.name} className="flex flex-col h-full w-full">
              <Card className={`relative flex flex-col rounded-2xl bg-white/[0.03] w-full h-full p-5 sm:p-6 lg:p-7 min-h-[420px] lg:min-h-[520px] ${
                plan.bestSeller ? "border-2 border-lime-400 shadow-[0_0_40px_-8px_rgba(163,230,53,0.25)]" :
                plan.hasCountdown ? "border-2 border-fuchsia-500 shadow-[0_0_40px_-8px_rgba(217,70,239,0.25)]" :
                plan.isLifetime ? "border-2 border-amber-500 shadow-[0_0_40px_-8px_rgba(245,158,11,0.25)]" :
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
                {plan.isLifetime && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-0 text-[11px] whitespace-nowrap bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold px-4 py-1">
                    ♾️ ACESSO VITALÍCIO
                  </Badge>
                )}

                {/* Plan Icon */}
                <div className="flex justify-center mb-3 lg:mb-5">
                  {plan.isLifetime ? (
                    <Infinity className="w-8 h-8 lg:w-10 lg:h-10 text-amber-400" />
                  ) : plan.bestSeller ? (
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
                  onClick={() => handlePurchase(plan)}
                  disabled={isProcessing}
                  className={`w-full mb-2 text-sm lg:text-base h-10 lg:h-12 ${
                    plan.isLifetime ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold" :
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

                {/* Images badge */}
                <div className="flex flex-col items-center mb-5 lg:mb-6 mt-3 gap-1.5">
                  <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs lg:text-sm font-bold text-white ${
                    plan.isLifetime ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-fuchsia-600 to-blue-500"
                  }`}>
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
          <h3 className="font-bebas text-3xl md:text-4xl lg:text-5xl text-white tracking-tight mb-6">
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

      {/* PreCheckout Modal */}
      <PreCheckoutModal
        isOpen={showPreCheckout}
        onClose={() => { setShowPreCheckout(false); setPreCheckoutSlug(null); }}
        userEmail={userEmail}
        userId={userId}
        productSlug={preCheckoutSlug || undefined}
        modalTitle="Finalizar Compra"
        colorScheme="fuchsia"
      />
    </AnimatedSection>
  );
};


  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isPremium, hasAccessToPack, isLoading: authLoading } = usePremiumArtesStatus();
  const isMobile = useIsMobile();
  const [tool, setTool] = useState<ToolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<{ before: string; after: string } | null>(null);
  const [heroRevealed, setHeroRevealed] = useState(false);

  // Preload: Mobile loads preview + antes/depois mobile, Desktop loads high-res versions
  useImagesPreload(
    ["/images/upscaler-hero-preview.webp", "/images/upscaler-hero-antes-mobile.webp", "/images/upscaler-hero-depois-mobile.webp"],
    isMobile
  );
  useImagesPreload(
    ["/images/upscaler-hero-antes.webp", "/images/upscaler-hero-depois.webp"],
    !isMobile
  );

  const openModal = (before: string, after: string) => {
    setModalImages({ before, after });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalImages(null);
  };

  const TOOL_SLUG = "upscaller-arcano";

  useEffect(() => {
    fetchToolData();
  }, []);

  const fetchToolData = async () => {
    const { data, error } = await supabase
      .from("artes_packs")
      .select(`
        id, name, slug, cover_url,
        price_vitalicio,
        checkout_link_vitalicio,
        checkout_link_membro_vitalicio
      `)
      .eq("slug", TOOL_SLUG)
      .single();

    if (!error && data) {
      setTool(data as ToolData);
    }
    setLoading(false);
  };

  const formatPrice = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  const handlePurchase = () => {
    if (!tool) return;
    const checkoutLink = (isPremium ? tool.checkout_link_membro_vitalicio : tool.checkout_link_vitalicio);
    if (checkoutLink) {
      window.open(checkoutLink, '_blank');
    }
  };

  const hasAccess = hasAccessToPack(TOOL_SLUG);

  // Loading state removido do Hero para otimizar LCP
  // O loading agora é usado apenas nas seções que dependem dos dados (preço)

  // Preço fixo para esta página: R$39,90 (3990 centavos)
  const price = 3990;
  const originalPrice = 4990; // R$49,90 riscado
  const installmentPrice = Math.ceil(price / 3);

  // beforeAfterExamples and userResults are now handled by lazy-loaded components

  const features = [
    { icon: Sparkles, text: t('tools:upscaler.benefits.improveImages') },
    { icon: ImagePlus, text: t('tools:upscaler.benefits.removeBackground') },
    { icon: Infinity, text: t('tools:upscaler.benefits.lifetimeAccess') },
    { icon: Zap, text: t('tools:upscaler.benefits.futureUpdates') },
  ];

  const targetAudience = [
    {
      icon: Camera,
      title: t('tools:upscaler.targetAudience.photographers.title'),
      description: t('tools:upscaler.targetAudience.photographers.description')
    },
    {
      icon: Music,
      title: t('tools:upscaler.targetAudience.musicians.title'),
      description: t('tools:upscaler.targetAudience.musicians.description')
    },
    {
      icon: Rocket,
      title: t('tools:upscaler.targetAudience.infoproducers.title'),
      description: t('tools:upscaler.targetAudience.infoproducers.description')
    },
    {
      icon: PenTool,
      title: t('tools:upscaler.targetAudience.designers.title'),
      description: t('tools:upscaler.targetAudience.designers.description')
    },
    {
      icon: MessageCircle,
      title: t('tools:upscaler.targetAudience.socialMedia.title'),
      description: t('tools:upscaler.targetAudience.socialMedia.description')
    },
    {
      icon: User,
      title: t('tools:upscaler.targetAudience.common.title'),
      description: t('tools:upscaler.targetAudience.common.description')
    }
  ];

  const steps = [
    {
      icon: Upload,
      title: t('tools:upscaler.howItWorks.upload.title'),
      description: t('tools:upscaler.howItWorks.upload.description')
    },
    {
      icon: Wand2,
      title: t('tools:upscaler.howItWorks.chooseMode.title'),
      description: t('tools:upscaler.howItWorks.chooseMode.description')
    },
    {
      icon: Download,
      title: t('tools:upscaler.howItWorks.download.title'),
      description: t('tools:upscaler.howItWorks.download.description')
    }
  ];

  const faqItems = [
    {
      question: t('tools:upscaler.faq.q1'),
      answer: t('tools:upscaler.faq.a1')
    },
    {
      question: t('tools:upscaler.faq.q2'),
      answer: t('tools:upscaler.faq.a2')
    },
    {
      question: t('tools:upscaler.faq.q3'),
      answer: t('tools:upscaler.faq.a3')
    },
    {
      question: t('tools:upscaler.faq.q4'),
      answer: t('tools:upscaler.faq.a4')
    },
    {
      question: t('tools:upscaler.faq.q5'),
      answer: t('tools:upscaler.faq.a5')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510]">

      {/* Se já tem acesso */}
      {hasAccess ? (
        <div className="max-w-lg mx-auto px-4 py-12">
          <Card className="bg-[#1a0f25]/80 border-green-500/50 rounded-3xl">
            <CardContent className="p-8 text-center">
              <Badge className="bg-green-500 text-white text-lg px-6 py-3 rounded-full mb-6">
                <Check className="h-5 w-5 mr-2" />
                {t('tools:upscaler.alreadyHaveAccess')}
              </Badge>
              <p className="text-white/70 mb-6 text-lg">
                {t('tools:upscaler.alreadyHaveAccessDesc')}
              </p>
              <Button
                onClick={() => navigate("/biblioteca-artes")}
                className="bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-full px-8 py-6"
              >
                {t('tools:upscaler.goToLibrary')}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* HERO SECTION - Renderiza imediatamente para LCP */}
          <section className="px-3 md:px-4 py-10 md:py-20 w-full">
            <div className="flex flex-col items-center text-center">
              {/* H1 sem FadeIn para ser visível imediatamente (LCP) */}
              <div className="w-full max-w-[95vw] md:max-w-[60vw]">
                <h1 className="font-bebas text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white mb-4 md:mb-6 leading-tight tracking-wide">
                  {t('tools:upscaler.hero.title1')}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">
                    {t('tools:upscaler.hero.title2')}
                  </span>
                </h1>
              </div>

              {/* Hero Image sem FadeIn para LCP */}
              <div className="w-full max-w-[95vw] md:max-w-[60vw] mb-6 md:mb-8">
                {isMobile && !heroRevealed ? (
                  <HeroPlaceholder
                    onReveal={() => setHeroRevealed(true)}
                    buttonText={t('tools:upscaler.hero.seeToolPower')}
                    locale="pt"
                  />
                ) : (
                  <HeroBeforeAfterSlider
                    beforeImage={isMobile ? upscalerHeroAntesMobile : upscalerHeroAntesDesktop}
                    afterImage={isMobile ? upscalerHeroDepoisMobile : upscalerHeroDepoisDesktop}
                    label={t('tools:upscaler.hero.dragToCompare')}
                    locale="pt"
                  />
                )}
              </div>
              
              <FadeIn delay={400} duration={700}>
                <p className="text-base md:text-lg lg:text-xl text-white/70 mb-4 md:mb-6 max-w-2xl">
                  {t('tools:upscaler.hero.subtitle')} <span className="text-fuchsia-400 font-semibold">{t('tools:upscaler.hero.sharp')}</span>
                </p>
              </FadeIn>

              <FadeIn delay={500} duration={700}>
                <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/40 rounded-2xl px-6 py-3 mb-6 md:mb-8 max-w-xl">
                  <p className="text-red-400 font-bold text-sm md:text-base flex items-center justify-center gap-2">
                    🔥 Últimos dias de venda do Upscaler na versão vitalícia
                  </p>
                </div>
              </FadeIn>

              {/* Scroll Indicator */}
              <FadeIn delay={800} duration={700}>
                <ScrollIndicator className="mt-12 hidden md:flex" text={t('tools:upscaler.scrollMore')} />
              </FadeIn>
            </div>
          </section>

          {/* SEÇÃO DA DOR */}
          <AnimatedSection className="px-3 md:px-4 py-16 md:py-20 bg-black/30">
            <div className="max-w-5xl mx-auto">
              <AnimatedSection as="div" className="text-center" delay={100}>
                <h2 className="font-bebas text-3xl md:text-4xl lg:text-5xl text-white text-center mb-8 md:mb-12 tracking-wide">
                  {t('tools:upscaler.pain.title')}
                </h2>
              </AnimatedSection>
              
              {/* Grid responsivo: 1 coluna mobile, 2 tablet, 3 cards em cima + 2 centralizados embaixo no desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 md:gap-6 items-stretch">
                <AnimatedElement className="h-full lg:col-span-2" delay={0}>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 text-center hover:border-fuchsia-500/30 transition-all duration-300 flex flex-col items-center justify-center h-full lg:min-h-[200px]">
                    <div className="text-4xl md:text-5xl mb-4 md:mb-6">📱</div>
                    <p className="text-white/80 text-base md:text-lg">
                      {t('tools:upscaler.pain.phone')} <span className="text-fuchsia-400 font-semibold">{t('tools:upscaler.pain.bad')}</span>?
                    </p>
                  </div>
                </AnimatedElement>

                <AnimatedElement className="h-full lg:col-span-2" delay={100}>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 text-center hover:border-fuchsia-500/30 transition-all duration-300 flex flex-col items-center justify-center h-full lg:min-h-[200px]">
                    <div className="text-4xl md:text-5xl mb-4 md:mb-6">😤</div>
                    <p className="text-white/80 text-base md:text-lg">
                      {t('tools:upscaler.pain.client')} <span className="text-fuchsia-400 font-semibold">{t('tools:upscaler.pain.lowQuality')}</span>?
                    </p>
                  </div>
                </AnimatedElement>

                <AnimatedElement className="h-full lg:col-span-2" delay={200}>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 text-center hover:border-fuchsia-500/30 transition-all duration-300 flex flex-col items-center justify-center h-full lg:min-h-[200px]">
                    <div className="text-4xl md:text-5xl mb-4 md:mb-6">📷</div>
                    <p className="text-white/80 text-base md:text-lg">
                      {t('tools:upscaler.pain.aiGenerated')} <span className="text-fuchsia-400 font-semibold">{t('tools:upscaler.pain.notGood')}</span>?
                    </p>
                  </div>
                </AnimatedElement>

                <AnimatedElement className="h-full lg:col-span-2 lg:col-start-2" delay={300}>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 text-center hover:border-fuchsia-500/30 transition-all duration-300 flex flex-col items-center justify-center h-full lg:min-h-[200px]">
                    <div className="text-4xl md:text-5xl mb-4 md:mb-6">🤖</div>
                    <p className="text-white/80 text-base md:text-lg">
                      {t('tools:upscaler.pain.aiImage')} <span className="text-fuchsia-400 font-semibold">{t('tools:upscaler.pain.aiNotGood')}</span>?
                    </p>
                  </div>
                </AnimatedElement>

                <AnimatedElement className="h-full lg:col-span-2 lg:col-start-4" delay={400}>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 text-center hover:border-fuchsia-500/30 transition-all duration-300 flex flex-col items-center justify-center h-full lg:min-h-[200px]">
                    <div className="text-4xl md:text-5xl mb-4 md:mb-6">🎸</div>
                    <p className="text-white/80 text-base md:text-lg">
                      {t('tools:upscaler.pain.lostContract')} <span className="text-fuchsia-400 font-semibold">{t('tools:upscaler.pain.noProPhotos')}</span>?
                    </p>
                  </div>
                </AnimatedElement>
              </div>
              
              <AnimatedSection as="div" delay={400}>
                <p className="text-center text-xl md:text-2xl text-white mt-10 md:mt-12">
                  {t('tools:upscaler.pain.solution')}
                </p>
              </AnimatedSection>
            </div>
          </AnimatedSection>

          {/* SEÇÃO ANTES/DEPOIS - Lazy loaded */}
          <Suspense fallback={<SectionSkeleton height="600px" />}>
            <BeforeAfterGalleryPT onZoomClick={openModal} isMobile={isMobile} />
          </Suspense>

          {/* PARA QUEM É */}
          <AnimatedSection className="px-4 py-20 bg-black/30">
            <div className="max-w-4xl mx-auto">
              <AnimatedSection as="div" delay={100}>
                <h2 className="font-bebas text-3xl md:text-4xl lg:text-5xl text-white text-center mb-12 tracking-wide">
                  {t('tools:upscaler.targetAudience.titlePart1')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">{t('tools:upscaler.targetAudience.titlePart2')}</span>
                </h2>
              </AnimatedSection>
              
              <StaggeredAnimation className="grid md:grid-cols-3 gap-6" staggerDelay={150}>
                {targetAudience.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <div 
                      key={index}
                      className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 text-center hover:border-fuchsia-500/50 transition-all duration-300 hover:transform hover:scale-[1.02] h-full flex flex-col"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
                        <IconComponent className="h-8 w-8 text-fuchsia-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                      <p className="text-white/60 flex-1">{item.description}</p>
                    </div>
                  );
                })}
              </StaggeredAnimation>
            </div>
          </AnimatedSection>

          {/* COMO FUNCIONA */}
          <AnimatedSection className="px-4 py-20">
            <div className="max-w-4xl mx-auto">
              <AnimatedSection as="div" delay={100}>
                <h2 className="font-bebas text-3xl md:text-4xl lg:text-5xl text-white text-center mb-12 tracking-wide">
                  {t('tools:upscaler.howItWorks.title')} <span className="text-fuchsia-400">{t('tools:upscaler.howItWorks.subtitle')}</span>
                </h2>
              </AnimatedSection>
              
              <StaggeredAnimation className="flex flex-col md:flex-row md:justify-center gap-8 md:gap-12 max-w-3xl mx-auto" staggerDelay={200}>
                {steps.map((step, index) => {
                  const IconComponent = step.icon;
                  return (
                    <div key={index} className="text-center flex flex-col items-center relative">
                      {/* Linha conectora para desktop */}
                      {index < steps.length - 1 && (
                        <div className="hidden md:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-fuchsia-500/50 to-transparent" />
                      )}
                      
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg mb-4 shadow-lg shadow-fuchsia-500/30">
                        {index + 1}
                      </div>
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/30 flex items-center justify-center mb-5">
                        <IconComponent className="h-10 w-10 text-fuchsia-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                      <p className="text-white/60 max-w-[180px]">{step.description}</p>
                    </div>
                  );
                })}
              </StaggeredAnimation>
            </div>
          </AnimatedSection>

          {/* PROVA SOCIAL - Lazy loaded with Intersection Observer */}
          <LazySocialProofWrapper locale="pt" onZoomClick={openModal} isMobile={isMobile} />

          {/* SEÇÃO DE PREÇO E CTA - 4 Cards */}
          <UpscalerPricingSection isPremium={isPremium} tool={tool} handlePurchaseLegacy={handlePurchase} t={t} />

          {/* BENEFÍCIOS (O QUE FAZ) */}
          <AnimatedSection className="px-4 py-20 bg-black/30">
            <div className="max-w-4xl mx-auto">
              <AnimatedSection as="div" delay={100}>
                <h2 className="font-bebas text-3xl md:text-4xl lg:text-5xl text-white text-center mb-12 tracking-wide">
                  {t('tools:upscaler.benefits.title')} <span className="text-fuchsia-400">{t('tools:upscaler.benefits.subtitle')}</span>?
                </h2>
              </AnimatedSection>
              
              <StaggeredAnimation className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto" staggerDelay={100}>
                {features.map((feature, index) => {
                  const IconComponent = feature.icon;
                  return (
                    <div 
                      key={index}
                      className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-fuchsia-500/30 transition-all duration-300"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <IconComponent className="h-6 w-6 text-fuchsia-400" />
                      </div>
                      <span className="text-white/90 text-lg">{feature.text}</span>
                    </div>
                  );
                })}
              </StaggeredAnimation>
            </div>
          </AnimatedSection>

          {/* FAQ SECTION - Depois do preço */}
          <AnimatedSection className="px-4 py-20">
            <div className="max-w-2xl mx-auto">
              <AnimatedSection as="div" delay={100}>
                <h2 className="font-bebas text-3xl md:text-4xl lg:text-5xl text-white text-center mb-12 tracking-wide">
                  {t('tools:upscaler.faq.title')} <span className="text-fuchsia-400">{t('tools:upscaler.faq.subtitle')}</span>
                </h2>
              </AnimatedSection>
              
              <AnimatedSection as="div" delay={200}>
                <Accordion type="single" collapsible className="space-y-4">
                  {faqItems.map((item, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`item-${index}`}
                      className="bg-white/5 border border-white/10 rounded-2xl px-6 data-[state=open]:border-fuchsia-500/30"
                    >
                      <AccordionTrigger className="text-white text-left text-lg font-medium py-5 hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-white/70 pb-5">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </AnimatedSection>
            </div>
          </AnimatedSection>

        </>
      )}

      {/* Modal Fullscreen */}
      {modalImages && (
        <FullscreenModal
          isOpen={modalOpen}
          onClose={closeModal}
          beforeImage={modalImages.before}
          afterImage={modalImages.after}
        />
      )}
    </div>
  );
};

export default PlanosUpscalerArcano69v2;
