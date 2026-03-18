import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, ArrowLeft, Sparkles, Crown, Zap, ImagePlus, Infinity, Camera, Palette, Music, Upload, Download, Wand2, ArrowRight, Shield, Clock, Star, CreditCard, MousePointerClick, MessageCircle, ZoomIn, X, User, Rocket, PenTool, Image as ImageIcon, Award, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { preWarmCheckout } from "@/lib/checkoutFetch";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { AnimatedSection, AnimatedElement, StaggeredAnimation, ScrollIndicator, FadeIn } from "@/hooks/useScrollAnimation";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeroBeforeAfterSlider, HeroPlaceholder, SectionSkeleton, LazySocialProofWrapper } from "@/components/upscaler";
import { LazySection } from "@/components/combo-artes/LazySection";
import { useImagePreload, useImagesPreload } from "@/hooks/useImagePreload";
import PreCheckoutModal from "@/components/upscaler/PreCheckoutModal";

// Hero images - Desktop uses high-res, Mobile uses optimized 600x900 versions
const upscalerHeroAntesDesktop = "/images/upscaler-hero-antes.webp";
const upscalerHeroDepoisDesktop = "/images/upscaler-hero-depois.webp";
const upscalerHeroAntesMobile = "/images/upscaler-hero-antes-mobile.webp";
const upscalerHeroDepoisMobile = "/images/upscaler-hero-depois-mobile.webp";

// Lazy load heavy gallery sections - images will only load when user scrolls to section
const BeforeAfterGalleryPT = lazy(() => import("@/components/upscaler/sections/BeforeAfterGalleryPT"));
const ExpandingGallery = lazy(() => import("@/components/combo-artes/ExpandingGallery"));

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
const CTAButton = ({ onClick, isPremium, t }: { onClick: () => void; isPremium: boolean; t: (key: string) => string }) => (
  <Button
    onClick={onClick}
    className="w-full max-w-md py-6 text-lg font-bold rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white shadow-2xl shadow-fuchsia-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-fuchsia-500/40"
  >
    {t('tools:upscaler.cta')}
    <ArrowRight className="h-5 w-5 ml-2" />
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

const PlanosUpscalerArcano = () => {
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

  // Pre-warm checkout edge function after 3s
  useEffect(() => {
    const timer = setTimeout(() => preWarmCheckout(), 3000);
    return () => clearTimeout(timer);
  }, []);

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

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutProductSlug, setCheckoutProductSlug] = useState("upscaller-arcano-vitalicio");

  const handlePurchase = (productSlug = "upscaller-arcano-vitalicio") => {
    setCheckoutProductSlug(productSlug);
    setCheckoutModalOpen(true);
  };

  // Countdown timer - 48 minutes
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('upscaler-countdown');
    if (saved) {
      const remaining = parseInt(saved, 10) - Date.now();
      if (remaining > 0) return remaining;
    }
    const initial = 48 * 60 * 1000;
    localStorage.setItem('upscaler-countdown', String(Date.now() + initial));
    return initial;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          const newTime = 48 * 60 * 1000;
          localStorage.setItem('upscaler-countdown', String(Date.now() + newTime));
          return newTime;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return { hours, minutes, seconds };
  };

  const countdown = formatTime(timeLeft);

  const hasAccess = hasAccessToPack(TOOL_SLUG);

  // Loading state removido do Hero para otimizar LCP
  // O loading agora é usado apenas nas seções que dependem dos dados (preço)

  const price = 9990;
  const originalPrice = 9700;
  const installmentPrice = Math.ceil(price / 3);

  // beforeAfterExamples and userResults are now handled by lazy-loaded components

  const features = [
    { icon: Sparkles, text: t('tools:upscaler.benefits.improveImages') },
    { icon: ImagePlus, text: t('tools:upscaler.benefits.removeBackground') },
    { icon: Infinity, text: t('tools:upscaler.benefits.lifetimeAccess') },
    { icon: Zap, text: t('tools:upscaler.benefits.futureUpdates') },
  ];

  const pricingPlans = [
    {
      key: "vitalicio",
      name: "Vitalício",
      price: "99,90",
      credits: "Acesso vitalício",
      creditsCount: "Uso ilimitado para sempre",
      tagline: "Pague uma vez, use para sempre",
      productSlug: "upscaller-arcano-vitalicio",
      isLifetime: true,
      desktopOrder: "xl:order-4",
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
      key: "ultimate",
      name: "Ultimate",
      price: "79,90",
      credits: "233 imagens",
      creditsCount: "14.000 créditos",
      tagline: "Ideal para designers e criadores ativos",
      productSlug: "landing-ultimate-avulso",
      bestValue: true,
      desktopOrder: "xl:order-3",
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
      key: "pro",
      name: "Pro",
      price: "37,00",
      credits: "70 imagens",
      creditsCount: "4.200 créditos",
      tagline: "3x mais créditos por mais R$12",
      productSlug: "landing-pro-avulso",
      bestSeller: true,
      desktopOrder: "xl:order-2",
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
      key: "starter",
      name: "Starter",
      price: "24,90",
      credits: "25 imagens",
      creditsCount: "1.500 créditos",
      tagline: "Para começar",
      productSlug: "landing-starter-avulso",
      desktopOrder: "xl:order-1",
      features: [
        { text: "Atualizações diárias", included: true },
        { text: "Acesso às Ferramentas de IA", included: true },
        { text: "Suporte exclusivo via WhatsApp", included: true },
        { text: "Prompts premium ilimitados", included: true },
        { text: "Geração de Imagem com NanoBanana Pro", included: false },
        { text: "Geração de Vídeo com Veo 3", included: false },
      ],
    },
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
    },
    {
      question: "Como funciona a garantia de 7 dias?",
      answer: "Você tem 7 dias após a compra para testar o Upscaler Arcano. Se por qualquer motivo não ficar satisfeito, basta solicitar o reembolso e devolvemos 100% do seu dinheiro — sem perguntas, sem burocracia."
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
          {/* HERO SECTION - Layout com respiro */}
           <section className="px-4 md:px-6 pt-12 md:pt-20 pb-6 md:pb-10 w-full">
            <div className="flex flex-col items-center text-center max-w-7xl mx-auto">
              
              {/* Social proof badge */}
              <FadeIn delay={0} duration={400}>
                <div className="inline-flex items-center gap-2.5 bg-white/[0.07] border border-white/10 rounded-full px-4 py-2 mb-5 md:mb-6 scale-[0.84] md:scale-100 origin-center">
                  <div className="flex -space-x-2">
                    <img src="/images/social-proof-1.webp" alt="" width="24" height="24" decoding="async" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                    <img src="/images/social-proof-2.webp" alt="" width="24" height="24" decoding="async" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                    <img src="/images/social-proof-3.webp" alt="" width="24" height="24" decoding="async" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                  </div>
                  <span className="text-white/80 text-xs font-medium">+3.200 profissionais já estão usando</span>
                </div>
              </FadeIn>

              {/* Título principal */}
              <h1 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white mb-3 md:mb-4 leading-[1.25]">
                {t('tools:upscaler.hero.title1')}{' '}
                <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">
                  {t('tools:upscaler.hero.title2')}
                </span>
              </h1>

              {/* Subtítulo */}
              <FadeIn delay={0} duration={400}>
                <p className="text-xs md:text-sm text-white/60 mb-4 md:mb-6 max-w-lg leading-relaxed mx-auto">
                  {t('tools:upscaler.hero.subtitle')} <span className="text-fuchsia-400 font-semibold">{t('tools:upscaler.hero.sharp')}</span>
                </p>
              </FadeIn>

              {/* Before/After Slider - menos largo */}
              <FadeIn delay={0} duration={400}>
                <div className="w-[90vw] md:w-[50vw] lg:w-[42vw] md:[&_.space-y-3>div:first-child]:!aspect-[5/3] [&_.space-y-3>div:first-child]:!h-auto mb-5 md:mb-6">
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
              </FadeIn>

              {/* Feature badges */}
              <FadeIn delay={0} duration={400}>
                <div className="flex flex-wrap justify-center items-center gap-3 md:gap-0 md:divide-x md:divide-white/10">
                  <div className="flex items-center gap-1.5 text-white/60 text-xs px-3 py-1">
                    <Infinity className="h-3.5 w-3.5 text-fuchsia-400" />
                    <span>Acesso vitalício</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/60 text-xs px-3 py-1">
                    <MousePointerClick className="h-3.5 w-3.5 text-fuchsia-400" />
                    <span>Fácil de usar</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/60 text-xs px-3 py-1">
                    <Star className="h-3.5 w-3.5 text-fuchsia-400" />
                    <span>+5.000 imagens melhoradas</span>
                  </div>
                </div>
              </FadeIn>

              {/* Scroll Indicator */}
              <FadeIn delay={800} duration={700}>
                <ScrollIndicator className="mt-10 hidden md:flex" text={t('tools:upscaler.scrollMore')} />
              </FadeIn>
            </div>
          </section>

          {/* COMO FUNCIONA - Logo após o Hero */}
          <LazySection rootMargin="100px">
          <AnimatedSection className="px-4 py-20">
            <div className="max-w-4xl mx-auto">
              <AnimatedSection as="div" delay={100}>
                <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-12">
                  {t('tools:upscaler.howItWorks.title')} <span className="text-fuchsia-400">{t('tools:upscaler.howItWorks.subtitle')}</span>
                </h2>
              </AnimatedSection>
              
              <StaggeredAnimation className="flex flex-col md:flex-row md:justify-center gap-8 md:gap-12 max-w-3xl mx-auto" staggerDelay={200}>
                {steps.map((step, index) => {
                  const IconComponent = step.icon;
                  return (
                    <div key={index} className="text-center flex flex-col items-center relative">
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
          </LazySection>

          {/* SEÇÃO ANTES/DEPOIS - Lazy loaded */}
          <LazySection rootMargin="100px">
          <Suspense fallback={<SectionSkeleton height="600px" />}>
            <BeforeAfterGalleryPT onZoomClick={openModal} isMobile={isMobile} />
          </Suspense>
          </LazySection>

          {/* PARA QUEM É */}
          <LazySection rootMargin="100px">
          <AnimatedSection className="px-4 py-20 bg-black/30">
            <div className="max-w-4xl mx-auto">
              <AnimatedSection as="div" delay={100}>
                <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-12">
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
          </LazySection>


          {/* PROVA SOCIAL - Lazy loaded with Intersection Observer */}
          <LazySection rootMargin="100px">
          <LazySocialProofWrapper locale="pt" onZoomClick={openModal} isMobile={isMobile} />
          </LazySection>

          {/* SEÇÃO DE PREÇO E CTA - Com Card + Garantia */}
          <LazySection rootMargin="100px">
          <AnimatedSection className="px-3 md:px-4 py-16 md:py-20" animation="scale">
            {/* Banner promo com countdown */}
            <div className="max-w-5xl mx-auto mb-6 rounded-xl overflow-hidden border border-red-500/30 bg-gradient-to-r from-red-950/80 via-purple-950/60 to-red-950/80">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3">
                <div className="flex items-center gap-2 animate-pulse">
                  <span className="text-lg">🔥</span>
                  <span className="text-white font-bold tracking-wide text-sm md:text-base">Promoção por tempo limitado!</span>
                  <span className="text-lg">🔥</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 text-xs sm:text-sm font-medium">Essa oferta expira em</span>
                  <div className="flex items-center gap-1">
                    <div className="bg-red-900/60 border border-red-500/40 rounded-md px-2 py-1 min-w-[28px] text-center">
                      <span className="text-white font-mono font-bold text-sm">{countdown.hours}</span>
                    </div>
                    <span className="text-red-400 font-bold text-sm">:</span>
                    <div className="bg-red-900/60 border border-red-500/40 rounded-md px-2 py-1 min-w-[28px] text-center">
                      <span className="text-white font-mono font-bold text-sm">{countdown.minutes}</span>
                    </div>
                    <span className="text-red-400 font-bold text-sm">:</span>
                    <div className="bg-red-900/60 border border-red-500/40 rounded-md px-2 py-1 min-w-[28px] text-center">
                      <span className="text-white font-mono font-bold text-sm">{countdown.seconds}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats inline customizado para Upscaler - hidden on mobile, shown after cards on mobile */}
            <div className="max-w-5xl mx-auto mb-8 px-2 hidden md:block">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-0">
                <div className="flex items-center gap-3 sm:flex-1 min-w-0">
                  <div className="flex -space-x-2 shrink-0">
                    {["/images/social-proof-1.webp", "/images/social-proof-2.webp", "/images/social-proof-3.webp"].map((src, i) => (
                      <img key={i} src={src} alt="" width="32" height="32" decoding="async" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#0d0b1a] object-cover" />
                    ))}
                  </div>
                  <span className="text-white/80 text-xs sm:text-sm font-medium leading-tight">
                    Junte-se a mais de 3.000 criadores em todo o mundo.
                  </span>
                </div>
                <div className="flex items-center gap-6 sm:gap-8 shrink-0">
                  <div className="flex flex-col items-center gap-0.5">
                    <ImageIcon className="w-5 h-5 text-purple-400 mb-1" />
                    <div className="flex items-center gap-1">
                      <span className="text-white font-bold text-base sm:text-lg">5.184</span>
                      <span className="text-purple-400 text-lg font-bold">+</span>
                    </div>
                    <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium">Upscalers de Imagens</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <User className="w-5 h-5 text-purple-400 mb-1" />
                    <div className="flex items-center gap-1">
                      <span className="text-white font-bold text-base sm:text-lg">3.248</span>
                      <span className="text-purple-400 text-lg font-bold">+</span>
                    </div>
                    <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium">Usuários Ativos</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Award className="w-5 h-5 text-yellow-500 mb-1" />
                    <div className="flex items-center gap-0.5">
                      <span className="text-white font-bold text-base sm:text-lg">100</span>
                      <span className="text-yellow-500 text-lg font-bold">%</span>
                    </div>
                    <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium">Satisfação</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-4 gap-6 items-stretch pt-5 max-w-md xl:max-w-6xl mx-auto">
              {pricingPlans.map((plan) => (
                <Card
                  key={plan.key}
                  className={`relative rounded-3xl overflow-visible shadow-2xl ${plan.desktopOrder} ${
                    plan.isLifetime
                      ? "bg-gradient-to-br from-[#1a0f25] to-[#150a1a] border-2 border-fuchsia-500/30 shadow-fuchsia-500/10"
                      : plan.bestSeller
                      ? "bg-white/[0.03] border-2 border-lime-400 shadow-[0_0_40px_-8px_rgba(163,230,53,0.25)]"
                      : plan.bestValue
                      ? "bg-white/[0.03] border-2 border-fuchsia-500 shadow-[0_0_40px_-8px_rgba(217,70,239,0.25)]"
                      : "bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors"
                  }`}
                >
                  {plan.bestSeller && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 border-0 text-[11px] whitespace-nowrap bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold px-4 py-1">
                      Mais Vendido
                    </Badge>
                  )}
                  {plan.bestValue && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 border-0 text-[11px] whitespace-nowrap bg-gradient-to-r from-fuchsia-600 to-blue-500 text-white px-4 py-1">
                      MELHOR CUSTO/BENEFÍCIO
                    </Badge>
                  )}
                  {plan.isLifetime && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 border-0 text-[11px] whitespace-nowrap bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold px-4 py-1">
                      🔥 69% OFF
                    </Badge>
                  )}

                  <CardContent className="p-5 md:p-6 text-center h-full flex flex-col">
                    <div className="flex justify-center mb-3 lg:mb-5">
                      {plan.isLifetime ? (
                        <Infinity className="w-8 h-8 lg:w-10 lg:h-10 text-fuchsia-400" />
                      ) : plan.bestSeller ? (
                        <Crown className="w-8 h-8 lg:w-10 lg:h-10 text-lime-400" />
                      ) : plan.bestValue ? (
                        <Flame className="w-8 h-8 lg:w-10 lg:h-10 text-fuchsia-500" />
                      ) : (
                        <Rocket className="w-8 h-8 lg:w-10 lg:h-10 text-white/60" />
                      )}
                    </div>

                    <div className="text-center mb-4 lg:mb-5 min-h-[36px] flex items-center justify-center">
                      <h3 className="text-lg lg:text-xl font-bold text-white">{plan.name}</h3>
                    </div>

                    <div className="text-center mb-5 lg:mb-6">
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="text-fuchsia-400 text-base lg:text-lg">R$</span>
                        <span className="text-4xl lg:text-5xl font-bold text-white">{plan.price}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handlePurchase(plan.productSlug)}
                      className={`w-full mb-2 text-sm lg:text-base h-10 lg:h-12 ${
                        plan.isLifetime
                          ? "bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white font-semibold"
                          : plan.bestSeller
                          ? "bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 text-black font-semibold"
                          : plan.bestValue
                          ? "bg-gradient-to-r from-fuchsia-600 to-blue-500 hover:from-fuchsia-700 hover:to-blue-600 text-white font-semibold"
                          : "bg-white/10 hover:bg-white/20 text-white/80"
                      }`}
                    >
                      Comprar agora
                    </Button>

                    {plan.tagline && (
                      <p className="text-[10px] lg:text-[11px] text-fuchsia-400 text-center mb-2 italic">{plan.tagline}</p>
                    )}

                    <div className="flex flex-col items-center mb-5 lg:mb-6 mt-3 gap-1.5">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs lg:text-sm font-bold text-white bg-gradient-to-r from-fuchsia-600 to-blue-500">
                        <Sparkles className="w-3.5 h-3.5" />
                        {plan.credits}
                      </span>
                      <span className="text-[10px] lg:text-[11px] text-white/40 font-medium">{plan.creditsCount}</span>
                    </div>

                    <ul className="space-y-2.5 lg:space-y-3 flex-1 text-left">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs lg:text-sm">
                          {feature.included ? (
                            <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-fuchsia-400 shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-orange-500 shrink-0 mt-0.5" />
                          )}
                          <span className={feature.included ? "text-white/70" : "text-orange-500"}>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Stats mobile - abaixo dos cards */}
            <div className="max-w-5xl mx-auto mt-6 px-2 md:hidden">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm px-4 sm:px-6 py-4 flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2 shrink-0">
                    {["/images/social-proof-1.webp", "/images/social-proof-2.webp", "/images/social-proof-3.webp"].map((src, i) => (
                      <img key={i} src={src} alt="" width="32" height="32" decoding="async" className="w-7 h-7 rounded-full border-2 border-[#0d0b1a] object-cover" />
                    ))}
                  </div>
                  <span className="text-white/80 text-xs font-medium leading-tight">
                    Junte-se a mais de 3.000 criadores em todo o mundo.
                  </span>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="flex flex-col items-center gap-0.5">
                    <ImageIcon className="w-5 h-5 text-purple-400 mb-1" />
                    <div className="flex items-center gap-1">
                      <span className="text-white font-bold text-base">5.184</span>
                      <span className="text-purple-400 text-lg font-bold">+</span>
                    </div>
                    <span className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Upscalers de Imagens</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <User className="w-5 h-5 text-purple-400 mb-1" />
                    <div className="flex items-center gap-1">
                      <span className="text-white font-bold text-base">3.248</span>
                      <span className="text-purple-400 text-lg font-bold">+</span>
                    </div>
                    <span className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Usuários Ativos</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Award className="w-5 h-5 text-yellow-500 mb-1" />
                    <div className="flex items-center gap-0.5">
                      <span className="text-white font-bold text-base">100</span>
                      <span className="text-yellow-500 text-lg font-bold">%</span>
                    </div>
                    <span className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Satisfação</span>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
          </LazySection>

          {/* ==================== GARANTIA ==================== */}
          <AnimatedSection className="px-4 py-16 md:py-20">
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/30 rounded-3xl p-8 md:p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-green-400" />
                </div>
                <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl text-white mb-4">
                  Garantia incondicional de{" "}
                  <span className="text-green-400">7 dias</span>
                </h2>
                <p className="text-white/60 max-w-md mx-auto">
                  Se dentro de 7 dias você não gostar por qualquer motivo, basta nos enviar uma mensagem e devolveremos 100% do seu dinheiro. Sem perguntas, sem burocracia.
                </p>
              </div>
            </div>
          </AnimatedSection>


          {/* GALERIA - O que o Upscaler faz */}
          <LazySection rootMargin="100px">
          <AnimatedSection className="px-4 py-20 bg-black/30">
            <div className="max-w-5xl mx-auto">
              <AnimatedSection as="div" delay={100}>
                <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-3">
                  Melhorado com o <span className="text-fuchsia-400">Upscaler Arcano</span>
                </h2>
                <p className="text-white/50 text-base md:text-lg text-center mb-12">Veja o poder da nossa ferramenta</p>
              </AnimatedSection>
              
              <Suspense fallback={<div className="h-[400px] md:h-[600px] bg-white/5 rounded-xl animate-pulse" />}>
                <ExpandingGallery badgeText="Melhorado com o Upscaler Arcano" items={[
                  { imageUrl: "/images/gallery/gallery-1.webp", label: "Qualidade impressionante" },
                  { imageUrl: "/images/gallery/gallery-2.webp", label: "Detalhes nítidos" },
                  { imageUrl: "/images/gallery/gallery-3.webp", label: "Cores vibrantes" },
                  { imageUrl: "/images/gallery/gallery-4.webp", label: "Alta resolução" },
                  { imageUrl: "/images/gallery/gallery-5.webp", label: "Resultado profissional" },
                  { imageUrl: "/images/gallery/gallery-6.webp", label: "Detalhes e texturas realistas" },
                ]} />
              </Suspense>
            </div>

            {/* CTA abaixo da galeria */}
            <div className="max-w-md mx-auto mt-10">
              <div className="px-0 md:px-2">
                <CTAButton onClick={handlePurchase} isPremium={isPremium} t={t} />
              </div>
            </div>
          </AnimatedSection>
          </LazySection>

          {/* FAQ SECTION - Depois do preço */}
          <LazySection rootMargin="100px">
          <AnimatedSection className="px-4 py-20">
            <div className="max-w-2xl mx-auto">
              <AnimatedSection as="div" delay={100}>
                <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-12">
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
          </LazySection>

        </>
      )}

      {/* Pre-checkout Modal */}
      <PreCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        userEmail={user?.email}
        userId={user?.id}
        productSlug={checkoutProductSlug}
      />

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

export default PlanosUpscalerArcano;

