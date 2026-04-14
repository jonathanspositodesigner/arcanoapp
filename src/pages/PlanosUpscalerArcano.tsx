import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import galleryBefore2 from "@/assets/upscaler/2a.webp";
import galleryAfter2 from "@/assets/upscaler/2d.webp";
import galleryBefore3 from "@/assets/upscaler/3a.webp";
import galleryAfter3 from "@/assets/upscaler/3d.webp";
import galleryBefore4 from "@/assets/upscaler/5a.webp";
import galleryAfter4 from "@/assets/upscaler/5d.webp";
// Mobile-optimized gallery images
import galleryBefore2Cel from "@/assets/upscaler/2a_cel.webp";
import galleryAfter2Cel from "@/assets/upscaler/2d_cel.webp";
import galleryBefore3Cel from "@/assets/upscaler/3a_cel.webp";
import galleryAfter3Cel from "@/assets/upscaler/3d_cel.webp";
import galleryBefore4Cel from "@/assets/upscaler/5a_cel.webp";
import galleryAfter4Cel from "@/assets/upscaler/5d_cel.webp";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, ArrowLeft, Sparkles, Crown, Zap, ImagePlus, Infinity, Camera, Palette, Music, Upload, Download, Wand2, ArrowRight, Shield, Clock, Star, CreditCard, MousePointerClick, MessageCircle, ZoomIn, X, User, Rocket, PenTool, Image as ImageIcon, Award, Flame, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePagarmeCheckout } from "@/hooks/usePagarmeCheckout";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { AnimatedSection, AnimatedElement, StaggeredAnimation, ScrollIndicator, FadeIn } from "@/hooks/useScrollAnimation";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeroBeforeAfterSlider, HeroPlaceholder, SectionSkeleton, LazySocialProofWrapper } from "@/components/upscaler";
import { LazySection } from "@/components/combo-artes/LazySection";
import { useImagePreload, useImagesPreload } from "@/hooks/useImagePreload";


// Hero images - Desktop uses high-res, Mobile uses optimized 600x900 versions
const upscalerHeroAntesDesktop = "/images/upscaler-hero-antes.webp";
const upscalerHeroDepoisDesktop = "/images/upscaler-hero-depois.webp";
const upscalerHeroAntesMobile = "/images/upscaler-hero-antes-mobile.webp";
const upscalerHeroDepoisMobile = "/images/upscaler-hero-depois-mobile.webp";

// Lazy load heavy gallery sections - images will only load when user scrolls to section
const BeforeAfterGalleryPT = lazy(() => import("@/components/upscaler/sections/BeforeAfterGalleryPT"));
const ExpandingGallery = lazy(() => import("@/components/combo-artes/ExpandingGallery"));
const ScrollDrivenGallery = lazy(() => import("@/components/upscaler/ScrollDrivenGallery"));
const MobileBeforeAfterGallery = lazy(() => import("@/components/upscaler/MobileBeforeAfterGallery"));
const FullscreenModal = lazy(() => import("@/components/upscaler/FullscreenModal"));

// Desktop gallery items
const galleryItemsDesktop = [
  { beforeImage: galleryBefore2, afterImage: galleryAfter2, label: "Detalhes nítidos" },
  { beforeImage: galleryBefore3, afterImage: galleryAfter3, label: "Cores vibrantes" },
  { beforeImage: galleryBefore4, afterImage: galleryAfter4, label: "Alta resolução" },
];

// Mobile gallery items (optimized for phone screens)
const galleryItemsMobile = [
  { beforeImage: galleryBefore2Cel, afterImage: galleryAfter2Cel, label: "Detalhes nítidos" },
  { beforeImage: galleryBefore3Cel, afterImage: galleryAfter3Cel, label: "Cores vibrantes" },
  { beforeImage: galleryBefore4Cel, afterImage: galleryAfter4Cel, label: "Alta resolução" },
];
interface ToolData {
  id: string;
  name: string;
  slug: string;
  price_vitalicio: number | null;
  checkout_link_vitalicio: string | null;
  checkout_link_membro_vitalicio: string | null;
  cover_url: string | null;
}

// ── Fake Purchase Notifications ──
const FAKE_NAMES = [
  "Lucas Oliveira", "Ana Souza", "Pedro Santos", "Mariana Costa", "Rafael Lima",
  "Camila Ferreira", "Gabriel Almeida", "Juliana Ribeiro", "Thiago Martins", "Beatriz Rocha",
  "Felipe Carvalho", "Larissa Gomes", "Matheus Pereira", "Amanda Nascimento", "Bruno Araújo",
  "Fernanda Barbosa", "Diego Mendes", "Isabela Cardoso", "Vinícius Correia", "Letícia Dias",
];

const FakePurchaseNotifications = () => {
  const [notification, setNotification] = useState<{ name: string; id: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const countRef = useRef(0);

  useEffect(() => {
    const scheduleNext = () => {
      if (countRef.current >= 4) return;
      const delay = 5000 + Math.random() * 5000;
      timeoutRef.current = setTimeout(() => {
        const name = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
        setNotification({ name, id: Date.now() });
        setIsVisible(true);
        countRef.current += 1;
        setTimeout(() => setIsVisible(false), 5000);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  if (!notification) return null;

  return (
    <div
      key={notification.id}
      className={`fixed top-16 right-4 z-[100] max-w-xs transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 bg-emerald-600 text-white rounded-xl px-4 py-3 shadow-lg shadow-emerald-900/40 border border-emerald-400/20">
        <ShoppingCart className="h-4 w-4 shrink-0" />
        <span className="text-xs font-medium leading-tight">{notification.name} acabou de comprar!</span>
        <button onClick={() => setIsVisible(false)} className="shrink-0 ml-1 hover:bg-white/10 rounded p-0.5">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

const LazyFakePurchaseNotifications = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return <FakePurchaseNotifications />;
};

// ── Sticky Footer Bar with Countdown ──
const StickyFooterBar = () => {
  const scrollToPlanos = () => {
    document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-fuchsia-600 to-purple-700 border-b border-white/10 shadow-[0_4px_20px_rgba(217,70,239,0.3)]">
      <div className="max-w-7xl mx-auto px-3 py-3 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 text-white text-xs sm:text-sm font-medium min-w-0">
          <span className="truncate">🔥 Suas imagens em qualidade cinematográfica</span>
        </div>
        <button
          onClick={scrollToPlanos}
          className="bg-amber-400 text-gray-900 font-bold text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-2 rounded-full hover:bg-amber-300 transition-colors shrink-0 shadow-lg shadow-amber-400/30"
        >
          ADQUIRIR AGORA
        </button>
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


  // SEO meta tags for this specific page
  useEffect(() => {
    document.title = "Upscaler Arcano — Melhore Qualquer Imagem com IA em 1 Clique | ArcanoApp";
    
    const metaTags: Record<string, string> = {
      'description': 'Transforme fotos desfocadas em imagens 4K profissionais com IA. Mais de 3.200 fotógrafos, designers e criadores já usam. Acesso vitalício por R$99,90.',
      'robots': 'index, follow',
    };
    const ogTags: Record<string, string> = {
      'og:title': 'Upscaler Arcano — Melhore Qualquer Imagem com IA',
      'og:description': 'De amador para profissional em 1 clique. Upscale até 4K, remoção de fundo e muito mais.',
      'og:type': 'website',
      'og:url': 'https://arcanoapp.voxvisual.com.br/planos-upscaler-arcano',
      'twitter:card': 'summary_large_image',
      'twitter:title': 'Upscaler Arcano — Melhore Qualquer Imagem com IA',
    };

    const createdElements: HTMLElement[] = [];

    // Set name-based meta tags
    Object.entries(metaTags).forEach(([name, content]) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement('meta');
        el.name = name;
        document.head.appendChild(el);
        createdElements.push(el);
      }
      el.content = content;
    });

    // Set property-based meta tags (OG, Twitter)
    Object.entries(ogTags).forEach(([property, content]) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
        createdElements.push(el);
      }
      el.content = content;
    });

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
      createdElements.push(canonical);
    }
    canonical.href = 'https://arcanoapp.voxvisual.com.br/planos-upscaler-arcano';

    // Schema.org JSON-LD
    const jsonLd = document.createElement('script');
    jsonLd.type = 'application/ld+json';
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Upscaler Arcano",
      "description": "Ferramenta de IA para melhorar qualidade de imagens até 4K",
      "brand": { "@type": "Brand", "name": "ArcanoApp" },
      "offers": [
        { "@type": "Offer", "name": "Plano Starter", "price": "24.90", "priceCurrency": "BRL" },
        { "@type": "Offer", "name": "Plano Pro", "price": "37.00", "priceCurrency": "BRL" },
        { "@type": "Offer", "name": "Plano Ultimate", "price": "57.00", "priceCurrency": "BRL" },
        { "@type": "Offer", "name": "Plano Vitalício", "price": "99.90", "priceCurrency": "BRL" },
      ],
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": "5", "reviewCount": "3200" }
    });
    document.head.appendChild(jsonLd);
    createdElements.push(jsonLd);

    return () => {
      createdElements.forEach(el => el.remove());
      document.title = "ArcanoApp - Primeira Plataforma de IA para Designers do Brasil";
    };
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

  const { openCheckout, PagarmeCheckoutModal } = usePagarmeCheckout();

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

  const pricingPlans: Array<{
    key: string; name: string; price: string; originalPrice: string; credits: string; creditsCount: string;
    tagline: string; productSlug: string; desktopOrder: string;
    features: Array<{ text: string; included: boolean }>;
    isLifetime?: boolean; bestSeller?: boolean; bestValue?: boolean;
  }> = [
    {
      key: "starter",
      name: "Starter",
      price: "24,90",
      originalPrice: "29,90",
      credits: "25 imagens",
      creditsCount: "1.500 créditos",
      tagline: "Para começar",
      productSlug: "upscaler-arcano-starter",
      desktopOrder: "xl:order-1",
      features: [
        { text: "Atualizações diárias", included: true },
        { text: "Acesso às Ferramentas de IA", included: true },
        { text: "Suporte exclusivo via WhatsApp", included: true },
        { text: "Prompts premium ilimitados", included: true },
      ],
    },
    {
      key: "pro",
      name: "Pro",
      price: "37,00",
      originalPrice: "49,90",
      credits: "70 imagens",
      creditsCount: "4.200 créditos",
      tagline: "3x mais créditos por mais R$12",
      productSlug: "upscaler-arcano-pro",
      bestSeller: true,
      desktopOrder: "xl:order-2",
      features: [
        { text: "Atualizações diárias", included: true },
        { text: "Acesso às Ferramentas de IA", included: true },
        { text: "Suporte exclusivo via WhatsApp", included: true },
        { text: "Prompts premium ilimitados", included: true },
      ],
    },
    {
      key: "ultimate",
      name: "Ultimate",
      price: "79,90",
      originalPrice: "109,90",
      credits: "233 imagens",
      creditsCount: "14.000 créditos",
      tagline: "Ideal para designers e criadores ativos",
      productSlug: "upscaler-arcano-ultimate",
      bestValue: true,
      desktopOrder: "xl:order-3",
      features: [
        { text: "Atualizações diárias", included: true },
        { text: "Acesso às Ferramentas de IA", included: true },
        { text: "Suporte exclusivo via WhatsApp", included: true },
        { text: "Prompts premium ilimitados", included: true },
      ],
    },
    {
      key: "vitalicio",
      name: "Vitalício",
      price: "99,90",
      originalPrice: "149,90",
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
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] pt-12 sm:pt-14">

      <LazyFakePurchaseNotifications />
      {!hasAccess && <StickyFooterBar />}

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
                    <img src="/images/social-proof-1.webp" alt="" width="24" height="24" loading="lazy" decoding="async" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                    <img src="/images/social-proof-2.webp" alt="" width="24" height="24" loading="lazy" decoding="async" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                    <img src="/images/social-proof-3.webp" alt="" width="24" height="24" loading="lazy" decoding="async" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
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

          {/* FUNCIONA COM QUALQUER IMAGEM */}
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
          <div id="planos">
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

            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-8">
              Comece agora mesmo a entregar imagens que <span className="text-fuchsia-400">impressionam</span>
            </h2>



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
                      <span className="text-white/40 text-sm line-through">R$ {plan.originalPrice}</span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="text-fuchsia-400 text-base lg:text-lg">R$</span>
                        <span className="text-4xl lg:text-5xl font-bold text-white">{plan.price}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => openCheckout(plan.productSlug)}
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

                    {plan.isLifetime && (
                      <div className="mt-4 pt-4 border-t border-fuchsia-500/20">
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="text-sm">🎁</span>
                          <span className="text-xs lg:text-sm font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                            BÔNUS EXCLUSIVO
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-xs lg:text-sm bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl px-3 py-2.5 border border-amber-500/20">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-amber-300 font-semibold">10.000 créditos</span>
                            <span className="text-white/60"> para usar no </span>
                            <span className="text-fuchsia-400 font-semibold">NanoBanana</span>
                            <span className="text-white/60"> e </span>
                            <span className="text-fuchsia-400 font-semibold">Veo 3</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Stats - abaixo dos cards em todos os dispositivos */}
            <div className="max-w-5xl mx-auto mt-6 px-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-0">
                <div className="flex items-center gap-3 sm:flex-1 min-w-0">
                  <div className="flex -space-x-2 shrink-0">
                    {["/images/social-proof-1.webp", "/images/social-proof-2.webp", "/images/social-proof-3.webp"].map((src, i) => (
                      <img key={i} src={src} alt="" width="32" height="32" loading="lazy" decoding="async" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#0d0b1a] object-cover" />
                    ))}
                  </div>
                  <span className="text-white/80 text-xs sm:text-sm font-medium leading-tight">
                    Junte-se a mais de 3.000 criadores em todo o mundo.
                  </span>
                </div>
                <div className="flex items-center gap-6 sm:gap-8 shrink-0">
                  <div className="flex flex-col items-center gap-0.5">
                    <ImageIcon className="w-5 h-5 text-gray-400 mb-1" />
                    <div className="flex items-center gap-1">
                      <span className="text-white font-bold text-base">5.184</span>
                      <span className="text-gray-400 text-lg font-bold">+</span>
                    </div>
                    <span className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Upscalers de Imagens</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <User className="w-5 h-5 text-gray-400 mb-1" />
                    <div className="flex items-center gap-1">
                      <span className="text-white font-bold text-base">3.248</span>
                      <span className="text-gray-400 text-lg font-bold">+</span>
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
          </div>

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
          <LazySection rootMargin="1200px">
          {/* Fullscreen scroll-driven gallery - all devices */}
          <div>
            <h2 className="text-center text-3xl md:text-5xl font-black py-12 bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 to-purple-600 uppercase tracking-tight">
              Melhorado com o Upscaler Arcano
            </h2>
            <Suspense fallback={<div className="h-screen bg-white/5 animate-pulse" />}>
              {isMobile ? (
                <MobileBeforeAfterGallery items={galleryItemsMobile} />
              ) : (
                <ScrollDrivenGallery items={galleryItemsDesktop} />
              )}
            </Suspense>
          </div>
          </LazySection>

          <div className="flex justify-center px-4 md:px-6 pt-6 pb-14 md:pb-12">
            <Button
              onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full max-w-[90%] md:max-w-md h-auto px-5 md:px-8 py-4 md:py-6 text-sm sm:text-base md:text-lg leading-snug text-center whitespace-normal break-words font-bold rounded-2xl md:rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white shadow-2xl shadow-fuchsia-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-fuchsia-500/40 active:scale-95"
            >
              🚀 Quero melhorar minhas imagens agora
            </Button>
          </div>

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


      {/* Modal Checkout Customer */}
      <PagarmeCheckoutModal />

      {/* Modal Fullscreen */}
      {modalImages && (
        <Suspense fallback={null}>
          <FullscreenModal
            isOpen={modalOpen}
            onClose={closeModal}
            beforeImage={modalImages.before}
            afterImage={modalImages.after}
          />
        </Suspense>
      )}
    </div>
  );
};

export default PlanosUpscalerArcano;

