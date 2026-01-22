import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { Check, ArrowLeft, Sparkles, Crown, Zap, ImagePlus, Infinity, Camera, Palette, Music, Upload, Download, Wand2, ArrowRight, Shield, Clock, Star, CreditCard, MessageCircle, ZoomIn, X, User, Rocket, PenTool } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { AnimatedSection, AnimatedElement, StaggeredAnimation, ScrollIndicator, FadeIn } from "@/hooks/useScrollAnimation";
import { appendUtmToUrl } from "@/lib/utmUtils";
import upscalerAntes1 from "@/assets/upscaler-antes-1.webp";
import upscalerDepois1 from "@/assets/upscaler-depois-1.webp";
import upscalerHeroAntes from "@/assets/upscaler-hero-antes.webp";
import upscalerHeroDepois from "@/assets/upscaler-hero-depois.webp";
import upscalerSeloAntes from "@/assets/upscaler-selo-antes.webp";
import upscalerSeloDepois from "@/assets/upscaler-selo-depois.webp";
import upscalerLogoAntes from "@/assets/upscaler-logo-antes.webp";
import upscalerLogoDepois from "@/assets/upscaler-logo-depois.webp";
import upscalerAntigaAntes from "@/assets/upscaler-antiga-antes.webp";
import upscalerAntigaDepois from "@/assets/upscaler-antiga-depois.webp";
import upscalerMockupAntes from "@/assets/upscaler-mockup-antes.webp";
import upscalerMockupDepois from "@/assets/upscaler-mockup-depois.webp";
import upscalerUser1Antes from "@/assets/upscaler-user1-antes.webp";
import upscalerUser1Depois from "@/assets/upscaler-user1-depois.webp";
import upscalerUser2Antes from "@/assets/upscaler-user2-antes.webp";
import upscalerUser2Depois from "@/assets/upscaler-user2-depois.webp";
import upscalerUser3Antes from "@/assets/upscaler-user3-antes.webp";
import upscalerUser3Depois from "@/assets/upscaler-user3-depois.webp";
import upscalerFoodAntes from "@/assets/upscaler-food-antes.webp";
import upscalerFoodDepois from "@/assets/upscaler-food-depois.webp";
import upscalerUser4Antes from "@/assets/upscaler-user4-antes.webp";
import upscalerUser4Depois from "@/assets/upscaler-user4-depois.webp";
import upscalerUser5Antes from "@/assets/upscaler-user5-antes.webp";
import upscalerUser5Depois from "@/assets/upscaler-user5-depois.webp";
import upscalerUser6Antes from "@/assets/upscaler-user6-antes.webp";
import upscalerUser6Depois from "@/assets/upscaler-user6-depois.webp";

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
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center'
          }}
        />
        
        {/* Imagem "Antes" (clipped) */}
        <div 
          style={{ 
            position: 'absolute',
            inset: 0,
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
            overflow: 'hidden'
          }}
        >
          <img 
            src={beforeImage} 
            alt="Antes" 
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center'
            }}
          />
        </div>

        {/* Slider line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center">
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

// Componente de slider antes/depois
const BeforeAfterSlider = ({ 
  beforeImage, 
  afterImage, 
  label,
  size = "default",
  onZoomClick
}: { 
  beforeImage: string; 
  afterImage: string; 
  label?: string;
  size?: "default" | "large";
  onZoomClick?: () => void;
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

  return (
    <div className="space-y-3">
      <div 
        ref={containerRef}
        className={`relative w-full ${size === "large" ? "aspect-[4/3]" : "aspect-square"} rounded-3xl overflow-hidden cursor-ew-resize select-none border-2 border-white/10 shadow-2xl shadow-fuchsia-500/10`}
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
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center'
          }}
        />
        
        {/* Imagem "Antes" (clipped) */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img 
            src={beforeImage} 
            alt="Antes" 
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center'
            }}
          />
        </div>

        {/* Slider line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-5 bg-gray-400 rounded-full" />
              <div className="w-0.5 h-5 bg-gray-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Labels maiores */}
        <div className="absolute top-4 left-4 bg-black/80 text-white text-sm font-semibold px-4 py-2 rounded-full">
          {t('tools:upscaler.beforeAfter.before')}
        </div>
        <div className="absolute top-4 right-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-full">
          {t('tools:upscaler.beforeAfter.after')}
        </div>

        {/* Botão de zoom */}
        {onZoomClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onZoomClick();
            }}
            className="absolute bottom-4 right-4 p-3 bg-black/70 hover:bg-black/90 rounded-full transition-all duration-300 hover:scale-110 border border-white/20"
          >
            <ZoomIn className="h-5 w-5 text-white" />
          </button>
        )}
      </div>
      {label && <p className="text-center text-white/60 text-sm">{label}</p>}
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

// Infinite Carousel Component
const carouselImages = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=95",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=95",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=95",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=95",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=95",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=95",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&q=95",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=95",
];

const InfiniteCarousel = () => (
  <div className="w-full overflow-hidden py-8">
    <div 
      className="flex gap-4"
      style={{
        animation: 'scroll 25s linear infinite',
        width: 'fit-content'
      }}
    >
      {/* Duplicate images for seamless loop */}
      {[...carouselImages, ...carouselImages].map((img, i) => (
        <img 
          key={i} 
          src={img} 
          alt={`Exemplo ${i + 1}`}
          className="h-52 md:h-48 w-auto rounded-xl object-cover flex-shrink-0 border border-white/10"
        />
      ))}
    </div>
    <style>{`
      @keyframes scroll {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
    `}</style>
  </div>
);

const PlanosUpscalerArcano69v2 = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isPremium, hasAccessToPack, isLoading: authLoading } = usePremiumArtesStatus();
  const [tool, setTool] = useState<ToolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<{ before: string; after: string } | null>(null);

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
    // Link fixo para o checkout de R$69,90
    window.open(appendUtmToUrl("https://payfast.greenn.com.br/redirect/257117"), "_blank");
  };

  const hasAccess = hasAccessToPack(TOOL_SLUG);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fuchsia-500"></div>
      </div>
    );
  }

  // Preço fixo para esta página: R$49,90 (4990 centavos)
  const price = 4990;
  const originalPrice = 6990; // R$69,90 riscado
  const installmentPrice = Math.ceil(price / 3);

  const beforeAfterExamples = [
    {
      before: upscalerAntes1,
      after: upscalerDepois1,
      label: t('tools:upscaler.beforeAfter.photoImproved4K'),
      badge: t('tools:upscaler.beforeAfter.badges.photo'),
      badgeColor: "from-fuchsia-500 to-pink-500"
    },
    {
      before: upscalerSeloAntes,
      after: upscalerSeloDepois,
      label: t('tools:upscaler.beforeAfter.seal3DHD'),
      badge: t('tools:upscaler.beforeAfter.badges.seals3D'),
      badgeColor: "from-purple-500 to-violet-600"
    },
    {
      before: upscalerLogoAntes,
      after: upscalerLogoDepois,
      label: t('tools:upscaler.beforeAfter.logoHD'),
      badge: t('tools:upscaler.beforeAfter.badges.logo'),
      badgeColor: "from-blue-500 to-cyan-500"
    },
    {
      before: upscalerMockupAntes,
      after: upscalerMockupDepois,
      label: t('tools:upscaler.beforeAfter.mockupSharp'),
      badge: t('tools:upscaler.beforeAfter.badges.mockup'),
      badgeColor: "from-emerald-500 to-green-500"
    },
    {
      before: upscalerAntigaAntes,
      after: upscalerAntigaDepois,
      label: t('tools:upscaler.beforeAfter.oldPhotoRestored'),
      badge: t('tools:upscaler.beforeAfter.badges.oldPhoto'),
      badgeColor: "from-amber-500 to-orange-500"
    },
    {
      before: upscalerFoodAntes,
      after: upscalerFoodDepois,
      label: "fotos de comida com aspecto foodporn",
      badge: "Fotos de Alimentos",
      badgeColor: "from-red-500 to-orange-500"
    }
  ];

  const userResults = [
    {
      before: upscalerUser1Antes,
      after: upscalerUser1Depois,
      label: t('tools:upscaler.socialProof.userResult')
    },
    {
      before: upscalerUser2Antes,
      after: upscalerUser2Depois,
      label: t('tools:upscaler.socialProof.userResult')
    },
    {
      before: upscalerUser3Antes,
      after: upscalerUser3Depois,
      label: t('tools:upscaler.socialProof.userResult')
    },
    {
      before: upscalerUser4Antes,
      after: upscalerUser4Depois,
      label: t('tools:upscaler.socialProof.userResult')
    },
    {
      before: upscalerUser5Antes,
      after: upscalerUser5Depois,
      label: t('tools:upscaler.socialProof.userResult')
    },
    {
      before: upscalerUser6Antes,
      after: upscalerUser6Depois,
      label: t('tools:upscaler.socialProof.userResult')
    }
  ];

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
          {/* HERO SECTION - Vertical no mobile */}
          <section className="px-3 md:px-4 py-10 md:py-20 w-full">
            <div className="flex flex-col items-center text-center">
              <FadeIn delay={0} duration={700}>
                <h1 className="font-bebas text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white mb-4 md:mb-6 leading-tight tracking-wide">
                  {t('tools:upscaler.hero.title1')}
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">
                    {t('tools:upscaler.hero.title2')}
                  </span>
                </h1>
              </FadeIn>

              {/* Slider - logo abaixo do título */}
              <FadeIn delay={200} duration={700} className="w-full max-w-[95vw] md:max-w-[60vw] mb-6 md:mb-8">
                <BeforeAfterSlider
                  beforeImage={upscalerHeroAntes}
                  afterImage={upscalerHeroDepois}
                  label={t('tools:upscaler.hero.dragToCompare')}
                  size="large"
                />
              </FadeIn>
              
              <FadeIn delay={400} duration={700}>
                <p className="text-base md:text-lg lg:text-xl text-white/70 mb-6 md:mb-8 max-w-2xl">
                  {t('tools:upscaler.hero.subtitle')} <span className="text-fuchsia-400 font-semibold">{t('tools:upscaler.hero.sharp')}</span>
                </p>
              </FadeIn>

              <FadeIn delay={600} duration={700}>
                <div className="flex flex-col items-center">
                  <CTAButton onClick={handlePurchase} isPremium={isPremium} t={t} />
                  <TrustBadges t={t} />
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

          {/* SEÇÃO ANTES/DEPOIS */}
          <section className="px-3 md:px-4 py-16 md:py-20 relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/5 via-purple-500/5 to-transparent pointer-events-none" />
            
            <div className="max-w-6xl mx-auto relative">
              <h2 className="font-bebas text-3xl md:text-4xl lg:text-5xl text-white text-center mb-3 md:mb-4 tracking-wide">
                {t('tools:upscaler.beforeAfter.title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">{t('tools:upscaler.beforeAfter.anyImage')}</span>
              </h2>
              <p className="text-white/60 text-center text-sm md:text-lg mb-10 md:mb-14 max-w-2xl mx-auto">
                {t('tools:upscaler.beforeAfter.subtitle')}
              </p>
              
              {/* Grid 3x2: 3 cards por linha */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {beforeAfterExamples.map((example, index) => (
                  <div 
                    key={index} 
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-white/5 border border-white/10 rounded-3xl p-4 hover:border-fuchsia-500/30 transition-all duration-300 hover:transform hover:scale-[1.02]">
                      <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-gradient-to-r ${example.badgeColor} text-white border-0 rounded-full px-4 py-1 font-semibold shadow-lg`}>
                        {example.badge}
                      </Badge>
                      <div className="pt-2">
                        <BeforeAfterSlider
                          beforeImage={example.before}
                          afterImage={example.after}
                          label={example.label}
                          onZoomClick={() => openModal(example.before, example.after)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Carrossel infinito de imagens */}
              <div className="mt-14 -mx-4 md:-mx-8">
                <InfiniteCarousel />
              </div>
            </div>
          </section>

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

          {/* BENEFÍCIOS */}
          <AnimatedSection className="px-4 py-20">
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

          {/* COMO FUNCIONA */}
          <AnimatedSection className="px-4 py-20 bg-black/30">
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

          {/* PROVA SOCIAL - Resultados de usuários */}
          <AnimatedSection className="px-4 py-20">
            <div className="max-w-4xl mx-auto">
              <AnimatedSection as="div" delay={100}>
                <h2 className="font-bebas text-3xl md:text-4xl lg:text-5xl text-white text-center mb-2 tracking-wide leading-tight px-2">
                  {t('tools:upscaler.socialProof.title')} <span className="text-fuchsia-400">{t('tools:upscaler.socialProof.result')}</span>
                  <span className="block sm:inline"> {t('tools:upscaler.socialProof.subtitle')}</span>
                </h2>
                <p className="text-white/60 text-center text-base sm:text-lg mb-8 md:mb-12 px-4">
                  {t('tools:upscaler.socialProof.description')}
                </p>
              </AnimatedSection>
              
              {/* Versão MOBILE - Carrossel */}
              <div className="md:hidden px-6">
                <Carousel opts={{ watchDrag: false }} className="w-full max-w-xs mx-auto">
                  <CarouselContent>
                    {userResults.map((result, index) => (
                      <CarouselItem key={index}>
                        <BeforeAfterSlider
                          beforeImage={result.before}
                          afterImage={result.after}
                          label={result.label}
                          onZoomClick={() => openModal(result.before, result.after)}
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="-left-4 h-10 w-10 bg-fuchsia-500 hover:bg-fuchsia-600 border-none text-white shadow-lg shadow-fuchsia-500/30" />
                  <CarouselNext className="-right-4 h-10 w-10 bg-fuchsia-500 hover:bg-fuchsia-600 border-none text-white shadow-lg shadow-fuchsia-500/30" />
                </Carousel>
              </div>

              {/* Versão DESKTOP - Grid */}
              <StaggeredAnimation className="hidden md:grid md:grid-cols-3 gap-6" staggerDelay={150}>
                {userResults.map((result, index) => (
                  <BeforeAfterSlider
                    key={index}
                    beforeImage={result.before}
                    afterImage={result.after}
                    label={result.label}
                    onZoomClick={() => openModal(result.before, result.after)}
                  />
                ))}
              </StaggeredAnimation>
            </div>
          </AnimatedSection>

          {/* SEÇÃO DE PREÇO E CTA - Com Card */}
          <AnimatedSection className="px-3 md:px-4 py-16 md:py-20 bg-black/30" animation="scale">
            <div className="max-w-lg mx-auto">
              <Card className="bg-gradient-to-br from-[#1a0f25] to-[#150a1a] border-2 border-fuchsia-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-fuchsia-500/10">
                <CardContent className="p-5 md:p-8 text-center">
                  {/* Badge de desconto */}
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 rounded-full px-4 md:px-6 py-1.5 md:py-2 text-sm md:text-lg font-bold mb-4 md:mb-6">
                    🔥 30% OFF
                  </Badge>

                  {isPremium && (
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 rounded-full mb-4 md:mb-6">
                      <Crown className="h-3 w-3 md:h-4 md:w-4" />
                      {t('tools:upscaler.finalCTA.memberDiscount')}
                    </div>
                  )}

                  <h2 className="font-bebas text-2xl md:text-3xl lg:text-4xl text-white mb-4 md:mb-6 tracking-wide">
                    {t('tools:upscaler.finalCTA.title')} <span className="text-fuchsia-400">{t('tools:upscaler.finalCTA.subtitle')}</span>
                  </h2>

                  {/* Preços */}
                  <div className="mb-5 md:mb-6">
                    <span className="text-white/40 text-lg md:text-xl line-through block mb-1">{formatPrice(originalPrice)}</span>
                    <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2">
                      {formatPrice(price)}
                    </div>
                    <p className="text-white/60 text-base md:text-lg">
                      {t('tools:upscaler.finalCTA.or')} <span className="text-fuchsia-400 font-semibold">{t('tools:upscaler.finalCTA.installments')} {formatPrice(installmentPrice)}</span>
                    </p>
                    <p className="text-white/40 text-xs md:text-sm mt-2">{t('tools:upscaler.finalCTA.oneTimePayment')}</p>
                  </div>

                  {/* Features checklist */}
                  <div className="grid gap-2 md:gap-3 mb-5 md:mb-6 text-left">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 md:gap-3 text-white/80">
                        <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 md:h-4 md:w-4 text-green-400" />
                        </div>
                        <span className="text-xs md:text-sm">{feature.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Alerta de urgência */}
                  <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl md:rounded-2xl p-2.5 md:p-3 mb-5 md:mb-6">
                    <div className="flex items-center justify-center gap-2 text-fuchsia-300 text-xs md:text-sm">
                      <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      <span className="font-medium">{t('tools:upscaler.finalCTA.limitedOffer')}</span>
                    </div>
                  </div>

                  <div className="px-0 md:px-2">
                    <CTAButton onClick={handlePurchase} isPremium={isPremium} t={t} />
                  </div>

                  {/* Badges de pagamento */}
                  <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-5 md:mt-6 text-white/50 text-xs">
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      {t('tools:upscaler.finalCTA.card')}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-sm">💵</span>
                      {t('tools:upscaler.finalCTA.pix')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {t('tools:upscaler.finalCTA.secure')}
                    </span>
                  </div>
                </CardContent>
              </Card>
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
