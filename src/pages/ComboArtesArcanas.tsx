import { useEffect, useState, lazy, Suspense } from "react";
import { ChevronDown } from "lucide-react";
import { HeroSectionCombo, FeaturesSection } from "@/components/combo-artes";
import { LazySection } from "@/components/combo-artes/LazySection";

// Lazy load de seções pesadas abaixo do fold
const FlyersGallerySection = lazy(() => import("@/components/combo-artes/FlyersGallerySection").then(m => ({ default: m.FlyersGallerySection })));
const MotionsGallerySection = lazy(() => import("@/components/combo-artes/MotionsGallerySection").then(m => ({ default: m.MotionsGallerySection })));
const BonusFimDeAnoSection = lazy(() => import("@/components/combo-artes/BonusFimDeAnoSection").then(m => ({ default: m.BonusFimDeAnoSection })));

const BonusGridSection = lazy(() => import("@/components/combo-artes/BonusGridSection").then(m => ({ default: m.BonusGridSection })));
const TestimonialsSection = lazy(() => import("@/components/combo-artes/TestimonialsSection").then(m => ({ default: m.TestimonialsSection })));
const GuaranteeSectionCombo = lazy(() => import("@/components/combo-artes/GuaranteeSectionCombo").then(m => ({ default: m.GuaranteeSectionCombo })));
const AboutSection = lazy(() => import("@/components/combo-artes/AboutSection").then(m => ({ default: m.AboutSection })));
const PricingCardsSection = lazy(() => import("@/components/combo-artes/PricingCardsSection").then(m => ({ default: m.PricingCardsSection })));
const FAQSectionCombo = lazy(() => import("@/components/combo-artes/FAQSectionCombo").then(m => ({ default: m.FAQSectionCombo })));
const WhatsAppSupportSection = lazy(() => import("@/components/combo-artes/WhatsAppSupportSection").then(m => ({ default: m.WhatsAppSupportSection })));
const FooterSection = lazy(() => import("@/components/combo-artes/FooterSection").then(m => ({ default: m.FooterSection })));

// Skeleton de loading minimalista
const SectionSkeleton = () => (
  <div className="min-h-[300px] bg-black animate-pulse" />
);

// Extend Window interface for Meta Pixel
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

// Meta Pixel ID (same as other pages)
const META_PIXEL_ID = "1051791498880287";

const ComboArtesArcanas = () => {
  const [overlayOpacity, setOverlayOpacity] = useState(1);

  // Fade out overlay on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const fadeStart = 100;
      const fadeEnd = 400;
      
      if (scrollY <= fadeStart) {
        setOverlayOpacity(1);
      } else if (scrollY >= fadeEnd) {
        setOverlayOpacity(0);
      } else {
        const opacity = 1 - (scrollY - fadeStart) / (fadeEnd - fadeStart);
        setOverlayOpacity(opacity);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize Meta Pixel
  useEffect(() => {
    if (typeof window !== "undefined" && !window.fbq) {
      const script = document.createElement("script");
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${META_PIXEL_ID}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
    } else if (window.fbq) {
      window.fbq("track", "PageView");
    }
  }, []);

  // Track ViewContent
  useEffect(() => {
    if (window.fbq) {
      window.fbq("track", "ViewContent", {
        content_name: "Combo Artes Arcanas 3 em 1",
        content_category: "Digital Product",
        content_type: "product",
        value: 79.9,
        currency: "BRL"
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Bottom fade overlay - mobile only, fades out on scroll */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-80 z-50 pointer-events-none md:hidden transition-opacity duration-300" 
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 10%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.05) 85%, rgba(0,0,0,0) 100%)',
          opacity: overlayOpacity
        }}
        aria-hidden="true"
      />
      {/* Blur layer with mask - fades blur gradually */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-80 z-[49] pointer-events-none md:hidden transition-opacity duration-300" 
        style={{
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%)',
          opacity: overlayOpacity
        }}
        aria-hidden="true"
      />
      
      {/* Scroll indicator - fixed on mobile, in front of overlay */}
      <div 
        className="fixed bottom-56 left-1/2 -translate-x-1/2 z-[60] md:hidden transition-opacity duration-300"
        style={{ opacity: overlayOpacity }}
      >
        <div className="animate-bounce">
          <ChevronDown className="w-8 h-8 text-[#EF672C] drop-shadow-lg" />
        </div>
      </div>
      
      {/* Above the fold - carrega imediatamente */}
      <HeroSectionCombo />
      
      {/* Features Section - cards de benefícios */}
      <FeaturesSection />
      
      {/* Animated scroll indicator - desktop only */}
      <div className="hidden md:flex justify-center pb-4 bg-black">
        <div className="animate-bounce">
          <ChevronDown className="w-8 h-8 text-[#EF672C]" />
        </div>
      </div>
      
      <LazySection>
        <Suspense fallback={<SectionSkeleton />}>
          <FlyersGallerySection />
        </Suspense>
      </LazySection>
      
      {/* Below the fold - lazy loaded com IntersectionObserver */}
      <LazySection>
        <Suspense fallback={<SectionSkeleton />}>
          <MotionsGallerySection />
        </Suspense>
      </LazySection>
      
      <LazySection>
        <Suspense fallback={<SectionSkeleton />}>
          <BonusFimDeAnoSection />
        </Suspense>
      </LazySection>
      
      
      <LazySection>
        <Suspense fallback={<SectionSkeleton />}>
          <BonusGridSection />
        </Suspense>
      </LazySection>
      
      <LazySection>
        <Suspense fallback={<SectionSkeleton />}>
          <TestimonialsSection />
        </Suspense>
      </LazySection>
      
      <LazySection>
        <Suspense fallback={<SectionSkeleton />}>
          <PricingCardsSection />
        </Suspense>
      </LazySection>
      
      <LazySection>
        <Suspense fallback={<SectionSkeleton />}>
          <GuaranteeSectionCombo />
        </Suspense>
      </LazySection>
      
      <LazySection>
        <Suspense fallback={<SectionSkeleton />}>
          <AboutSection />
        </Suspense>
      </LazySection>
      
      <LazySection>
        <Suspense fallback={<SectionSkeleton />}>
          <FAQSectionCombo />
        </Suspense>
      </LazySection>
      
      <LazySection>
        <Suspense fallback={<SectionSkeleton />}>
          <WhatsAppSupportSection />
        </Suspense>
      </LazySection>
      
      <LazySection>
        <Suspense fallback={<SectionSkeleton />}>
          <FooterSection />
        </Suspense>
      </LazySection>
    </div>
  );
};

export default ComboArtesArcanas;
