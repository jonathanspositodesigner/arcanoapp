import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, ArrowLeft, Sparkles, Crown, Zap, ImagePlus, Infinity, Camera, Palette, Music, Upload, Download, Wand2, ArrowRight, Shield, Clock, Star, CreditCard, MousePointerClick, MessageCircle, ZoomIn, X, User, Rocket, PenTool, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { AnimatedSection, AnimatedElement, StaggeredAnimation, ScrollIndicator, FadeIn } from "@/hooks/useScrollAnimation";
import { appendUtmToUrl } from "@/lib/utmUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeroBeforeAfterSlider, HeroPlaceholder, SectionSkeleton, LazySocialProofWrapper } from "@/components/upscaler";
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
        className="relative w-full max-w-4xl aspect-[3/4] md:aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize select-none"
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

const PlanosUpscalerCreditos = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isPremium, hasAccessToPack, isLoading: authLoading } = usePremiumArtesStatus();
  const isMobile = useIsMobile();
  const [tool, setTool] = useState<ToolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<{ before: string; after: string } | null>(null);
  const [heroRevealed, setHeroRevealed] = useState(false);

  // Expandable AI tools state
  const [expandedAiTools, setExpandedAiTools] = useState<Record<string, boolean>>({});

  const aiToolsList = [
    "Arcano Cloner",
    "IA que muda a roupa",
    "IA que muda pose",
    "Upscale Arcano v2.0",
    "Forja de Selos 3D",
    "Gerador de Personagens",
    "E muito mais..."
  ];

  // Countdown timer - 1 hour with localStorage persistence
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('planos-upscaler-countdown');
    if (saved) {
      const remaining = parseInt(saved, 10) - Date.now();
      if (remaining > 0) return remaining;
    }
    const initial = 60 * 60 * 1000;
    localStorage.setItem('planos-upscaler-countdown', String(Date.now() + initial));
    return initial;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          const newTime = 60 * 60 * 1000;
          localStorage.setItem('planos-upscaler-countdown', String(Date.now() + newTime));
          return newTime;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0')
    };
  };

  const countdown = formatCountdown(timeLeft);

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

    const checkoutLink = isPremium && tool.checkout_link_membro_vitalicio
      ? tool.checkout_link_membro_vitalicio
      : tool.checkout_link_vitalicio;

    if (checkoutLink) {
      window.open(appendUtmToUrl(checkoutLink), "_blank");
    } else {
      window.open(appendUtmToUrl("https://voxvisual.com.br/linksbio/"), "_blank");
    }
  };

  const hasAccess = hasAccessToPack(TOOL_SLUG);

  // Loading state removido do Hero para otimizar LCP
  // O loading agora é usado apenas nas seções que dependem dos dados (preço)

  const price = tool?.price_vitalicio || 2990;
  const originalPrice = 9700;
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
          {/* HERO SECTION - Layout com respiro */}
           <section className="px-4 md:px-6 pt-12 md:pt-20 pb-6 md:pb-10 w-full">
            <div className="flex flex-col items-center text-center max-w-7xl mx-auto">
              
              {/* Social proof badge */}
              <FadeIn delay={100} duration={600}>
                <div className="inline-flex items-center gap-2.5 bg-white/[0.07] border border-white/10 rounded-full px-4 py-2 mb-5 md:mb-6 scale-[0.84] md:scale-100 origin-center">
                  <div className="flex -space-x-2">
                    <img src="/images/social-proof-1.png" alt="" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                    <img src="/images/social-proof-2.png" alt="" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                    <img src="/images/social-proof-3.png" alt="" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                  </div>
                  <span className="text-white/80 text-xs font-medium">+5.000 profissionais já estão usando</span>
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
              <FadeIn delay={300} duration={700}>
                <p className="text-xs md:text-sm text-white/60 mb-4 md:mb-6 max-w-lg leading-relaxed mx-auto">
                  {t('tools:upscaler.hero.subtitle')} <span className="text-fuchsia-400 font-semibold">{t('tools:upscaler.hero.sharp')}</span>
                </p>
              </FadeIn>

              {/* Before/After Slider - menos largo */}
              <FadeIn delay={400} duration={700}>
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
              <FadeIn delay={600} duration={700}>
                <div className="flex flex-wrap justify-center items-center gap-3 md:gap-0 md:divide-x md:divide-white/10">
                  <div className="flex items-center gap-1.5 text-white/60 text-xs px-3 py-1">
                    <Clock className="h-3.5 w-3.5 text-fuchsia-400" />
                    <span>Resultados em segundos</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/60 text-xs px-3 py-1">
                    <MousePointerClick className="h-3.5 w-3.5 text-fuchsia-400" />
                    <span>Fácil de usar</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/60 text-xs px-3 py-1">
                    <Star className="h-3.5 w-3.5 text-fuchsia-400" />
                    <span>+10.000 imagens melhoradas</span>
                  </div>
                </div>
              </FadeIn>

              {/* Scroll Indicator */}
              <FadeIn delay={800} duration={700}>
                <ScrollIndicator className="mt-10 hidden md:flex" text={t('tools:upscaler.scrollMore')} />
              </FadeIn>
            </div>
          </section>

          {/* SEÇÃO DA DOR */}
          <AnimatedSection className="px-3 md:px-4 py-16 md:py-20 bg-black/30">
            <div className="max-w-5xl mx-auto">
              <AnimatedSection as="div" className="text-center" delay={100}>
                <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-8 md:mb-12">
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

          {/* COMO FUNCIONA */}
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

          {/* SEÇÃO DE PREÇO E CTA - Grid de 3 Planos */}
          <AnimatedSection className="px-3 md:px-4 py-16 md:py-20" animation="scale">
            <div className="max-w-5xl mx-auto">
              <div className="max-w-2xl mx-auto text-center mb-6">
                <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-2 tracking-tight leading-tight">
                  Melhore agora mesmo suas <span className="text-fuchsia-400">imagens!</span>
                </h2>
                <p className="text-white/60 text-sm md:text-base font-space-grotesk">
                  Escolha o plano que melhor te atende — sem mensalidade, pague apenas uma vez!
                </p>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center justify-center gap-2 mb-8 md:mb-10">
                <span className="text-purple-300 text-sm">Essa oferta expira em</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-red-500" />
                  <div className="flex items-center gap-0.5">
                    <div className="bg-red-950/80 border border-red-500/30 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                      <span className="text-red-400 font-mono font-bold text-xs">{countdown.hours}</span>
                    </div>
                    <span className="text-red-400 font-bold text-xs">:</span>
                    <div className="bg-red-950/80 border border-red-500/30 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                      <span className="text-red-400 font-mono font-bold text-xs">{countdown.minutes}</span>
                    </div>
                    <span className="text-red-400 font-bold text-xs">:</span>
                    <div className="bg-red-950/80 border border-red-500/30 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                      <span className="text-red-400 font-mono font-bold text-xs">{countdown.seconds}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plans Grid */}
              <StaggeredAnimation 
                className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-4xl mx-auto"
                itemClassName="w-full"
                staggerDelay={150}
                animation="fade-up"
              >
                {/* Starter */}
                <div className="flex flex-col h-full w-full">
                  <Card className="relative p-4 flex flex-col rounded-lg bg-[#1A0A2E] border border-purple-500/20 w-full h-full">
                    <div className="text-center mb-3 min-h-[32px] flex items-center justify-center">
                      <h3 className="text-base font-bold text-white">Starter</h3>
                    </div>
                    <div className="text-center mb-2 h-[60px] flex flex-col justify-center">
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="text-purple-400 text-sm">R$</span>
                        <span className="text-3xl font-bold text-white">29,90</span>
                      </div>
                      <p className="text-purple-400 text-xs mt-1">Pagamento único</p>
                    </div>
                    <Button 
                      onClick={handlePurchase}
                      className="w-full mb-3 text-sm h-9 bg-purple-900/50 hover:bg-purple-900/70 text-purple-200"
                    >
                      Comprar
                    </Button>
                    <div className="flex flex-col items-center mb-4 h-[36px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500">
                        <Sparkles className="w-2.5 h-2.5" />
                        1.800 créditos
                      </span>
                      <span className="text-[9px] text-purple-400 mt-0.5">~30 upscalers</span>
                    </div>
                    <ul className="space-y-2 flex-1">
                      <li className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-purple-200">Atualizações constantes na ferramenta</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-purple-200">Liberação imediata</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-purple-200">Suporte exclusivo via WhatsApp</span>
                      </li>

                      {/* Bonus section */}
                      <li className="pt-2 border-t border-purple-500/20 mt-2">
                        <p className="text-[10px] text-purple-400 uppercase tracking-wide mb-1.5">Bônus</p>
                      </li>
                      <li>
                        <div 
                          className="flex items-start gap-1.5 text-xs cursor-pointer select-none"
                          onClick={() => setExpandedAiTools(prev => ({ ...prev, starter: !prev.starter }))}
                        >
                          <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                          <span className="text-purple-200 flex items-center gap-1.5">
                            Acesso à todas Ferramentas de IA
                          </span>
                          <ChevronDown className={`w-3 h-3 shrink-0 mt-0.5 text-purple-400 transition-transform duration-200 ${expandedAiTools.starter ? 'rotate-180' : ''}`} />
                        </div>
                        {expandedAiTools.starter && (
                          <ul className="ml-5 mt-1 space-y-0.5">
                            {aiToolsList.map((tool, tIndex) => (
                              <li key={tIndex} className={`text-[10px] ${tIndex === aiToolsList.length - 1 ? 'text-purple-400 italic' : 'text-purple-300/70'}`}>
                                • {tool}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                      <li className="flex items-start gap-1.5 text-xs">
                        <X className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                        <span className="text-orange-500">Fila prioritária nos upscalers</span>
                      </li>
                    </ul>
                  </Card>
                </div>

                {/* Pro - MAIS VENDIDO */}
                <div className="flex flex-col h-full w-full">
                  <Card className="relative p-4 flex flex-col rounded-lg bg-[#1A0A2E] border-2 border-lime-400 shadow-lg shadow-lime-400/30 w-full h-full">
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 border-0 text-[10px] whitespace-nowrap bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold px-3 py-0.5">
                      MAIS VENDIDO
                    </Badge>
                    <div className="text-center mb-3 min-h-[32px] flex items-center justify-center">
                      <h3 className="text-base font-bold text-white">Pro</h3>
                    </div>
                    <div className="text-center mb-2 h-[60px] flex flex-col justify-center">
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="text-purple-400 text-sm">R$</span>
                        <span className="text-3xl font-bold text-white">39,90</span>
                      </div>
                      <p className="text-purple-400 text-xs mt-1">Pagamento único</p>
                    </div>
                    <Button 
                      onClick={handlePurchase}
                      className="w-full mb-3 text-sm h-9 bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 text-black font-semibold"
                    >
                      Comprar
                    </Button>
                    <div className="flex flex-col items-center mb-4 h-[36px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500">
                        <Sparkles className="w-2.5 h-2.5" />
                        5.000 créditos
                      </span>
                      <span className="text-[9px] text-purple-400 mt-0.5">~83 upscalers</span>
                    </div>
                    <ul className="space-y-2 flex-1">
                      <li className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-purple-200">Atualizações constantes na ferramenta</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-purple-200">Liberação imediata</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-purple-200">Suporte exclusivo via WhatsApp</span>
                      </li>

                      {/* Bonus section */}
                      <li className="pt-2 border-t border-purple-500/20 mt-2">
                        <p className="text-[10px] text-purple-400 uppercase tracking-wide mb-1.5">Bônus</p>
                      </li>
                      <li>
                        <div 
                          className="flex items-start gap-1.5 text-xs cursor-pointer select-none"
                          onClick={() => setExpandedAiTools(prev => ({ ...prev, pro: !prev.pro }))}
                        >
                          <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                          <span className="text-purple-200 flex items-center gap-1.5">
                            Acesso à todas Ferramentas de IA
                          </span>
                          <ChevronDown className={`w-3 h-3 shrink-0 mt-0.5 text-purple-400 transition-transform duration-200 ${expandedAiTools.pro ? 'rotate-180' : ''}`} />
                        </div>
                        {expandedAiTools.pro && (
                          <ul className="ml-5 mt-1 space-y-0.5">
                            {aiToolsList.map((tool, tIndex) => (
                              <li key={tIndex} className={`text-[10px] ${tIndex === aiToolsList.length - 1 ? 'text-purple-400 italic' : 'text-purple-300/70'}`}>
                                • {tool}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                      <li className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-purple-200">Fila prioritária nos upscalers</span>
                      </li>
                    </ul>
                  </Card>
                </div>

                {/* Studio - MELHOR CUSTO/BENEFÍCIO */}
                <div className="flex flex-col h-full w-full">
                  <Card className="relative p-4 flex flex-col rounded-lg bg-[#1A0A2E] border-2 border-purple-500 shadow-lg shadow-purple-500/30 w-full h-full">
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 border-0 text-[10px] whitespace-nowrap bg-gradient-to-r from-purple-600 to-blue-500 text-white px-3 py-0.5">
                      MELHOR CUSTO/BENEFÍCIO
                    </Badge>
                    <div className="text-center mb-3 min-h-[32px] flex items-center justify-center">
                      <h3 className="text-base font-bold text-white">Studio</h3>
                    </div>
                    <div className="text-center mb-2 h-[60px] flex flex-col justify-center">
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="text-purple-400 text-sm">R$</span>
                        <span className="text-3xl font-bold text-white">99,90</span>
                      </div>
                      <p className="text-purple-400 text-xs mt-1">Pagamento único</p>
                    </div>
                    <Button 
                      onClick={handlePurchase}
                      className="w-full mb-3 text-sm h-9 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-semibold"
                    >
                      Comprar
                    </Button>
                    <div className="flex flex-col items-center mb-4 h-[36px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500">
                        <Sparkles className="w-2.5 h-2.5" />
                        10.800 créditos
                      </span>
                      <span className="text-[9px] text-purple-400 mt-0.5">~160 upscalers</span>
                    </div>
                    <ul className="space-y-2 flex-1">
                      <li className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-purple-200">Atualizações constantes na ferramenta</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-purple-200">Liberação imediata</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-purple-200">Suporte exclusivo via WhatsApp</span>
                      </li>

                      {/* Bonus section */}
                      <li className="pt-2 border-t border-purple-500/20 mt-2">
                        <p className="text-[10px] text-purple-400 uppercase tracking-wide mb-1.5">Bônus</p>
                      </li>
                      <li>
                        <div 
                          className="flex items-start gap-1.5 text-xs cursor-pointer select-none"
                          onClick={() => setExpandedAiTools(prev => ({ ...prev, studio: !prev.studio }))}
                        >
                          <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                          <span className="text-purple-200 flex items-center gap-1.5">
                            Acesso à todas Ferramentas de IA
                          </span>
                          <ChevronDown className={`w-3 h-3 shrink-0 mt-0.5 text-purple-400 transition-transform duration-200 ${expandedAiTools.studio ? 'rotate-180' : ''}`} />
                        </div>
                        {expandedAiTools.studio && (
                          <ul className="ml-5 mt-1 space-y-0.5">
                            {aiToolsList.map((tool, tIndex) => (
                              <li key={tIndex} className={`text-[10px] ${tIndex === aiToolsList.length - 1 ? 'text-purple-400 italic' : 'text-purple-300/70'}`}>
                                • {tool}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                      <li className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-purple-200">Fila prioritária nos upscalers</span>
                      </li>
                    </ul>
                  </Card>
                </div>
              </StaggeredAnimation>

              {/* Trust badges */}
              <TrustBadges t={t} />
            </div>
          </AnimatedSection>

          {/* BENEFÍCIOS (O QUE FAZ) */}
          <AnimatedSection className="px-4 py-20 bg-black/30">
            <div className="max-w-4xl mx-auto">
              <AnimatedSection as="div" delay={100}>
                <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-12">
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

export default PlanosUpscalerCreditos;

