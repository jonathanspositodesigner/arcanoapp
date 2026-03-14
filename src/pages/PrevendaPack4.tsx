import { useEffect, useState, lazy, Suspense } from "react";
import { HeroSectionPack4 } from "@/components/prevenda-pack4/HeroSectionPack4";
import { FeaturesSectionPack4 } from "@/components/prevenda-pack4/FeaturesSectionPack4";
import { LazySectionPack4 } from "@/components/prevenda-pack4/LazySectionPack4";

const FlyersGallerySectionPack4 = lazy(() => import("@/components/prevenda-pack4/FlyersGallerySectionPack4").then(m => ({ default: m.FlyersGallerySectionPack4 })));
const MotionsGallerySectionPack4 = lazy(() => import("@/components/prevenda-pack4/MotionsGallerySectionPack4").then(m => ({ default: m.MotionsGallerySectionPack4 })));
const BonusTelaoSectionPack4 = lazy(() => import("@/components/prevenda-pack4/BonusTelaoSectionPack4").then(m => ({ default: m.BonusTelaoSectionPack4 })));
const BonusGridSectionPack4 = lazy(() => import("@/components/prevenda-pack4/BonusGridSectionPack4").then(m => ({ default: m.BonusGridSectionPack4 })));
const TestimonialsSectionPack4 = lazy(() => import("@/components/prevenda-pack4/TestimonialsSectionPack4").then(m => ({ default: m.TestimonialsSectionPack4 })));
const PricingCardsSectionPack4 = lazy(() => import("@/components/prevenda-pack4/PricingCardsSectionPack4").then(m => ({ default: m.PricingCardsSectionPack4 })));
const AboutSectionPack4 = lazy(() => import("@/components/prevenda-pack4/AboutSectionPack4").then(m => ({ default: m.AboutSectionPack4 })));
const FAQSectionPack4 = lazy(() => import("@/components/prevenda-pack4/FAQSectionPack4").then(m => ({ default: m.FAQSectionPack4 })));
const WhatsAppSupportSectionPack4 = lazy(() => import("@/components/prevenda-pack4/WhatsAppSupportSectionPack4").then(m => ({ default: m.WhatsAppSupportSectionPack4 })));
const GuaranteeSectionPack4 = lazy(() => import("@/components/prevenda-pack4/GuaranteeSectionPack4").then(m => ({ default: m.GuaranteeSectionPack4 })));
const FooterSectionPack4 = lazy(() => import("@/components/prevenda-pack4/FooterSectionPack4").then(m => ({ default: m.FooterSectionPack4 })));

const SectionSkeleton = () => (
  <div className="min-h-[300px] bg-black animate-pulse" />
);

const ChevronDownIcon = () => (
  <svg 
    className="w-8 h-8 text-[#EF672C] drop-shadow-lg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const PrevendaPack4 = () => {
  const [overlayOpacity, setOverlayOpacity] = useState(1);

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

  useEffect(() => {
    if (window.fbq) {
      window.fbq("track", "ViewContent", {
        content_name: "Prevenda Pack 4",
        content_category: "Digital Product",
        content_type: "product",
        value: 79.9,
        currency: "BRL"
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <div 
        className="fixed bottom-0 left-0 right-0 h-80 z-50 pointer-events-none md:hidden transition-opacity duration-300" 
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 10%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.05) 85%, rgba(0,0,0,0) 100%)',
          opacity: overlayOpacity
        }}
        aria-hidden="true"
      />
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
      
      <div 
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] md:hidden transition-opacity duration-300"
        style={{ opacity: overlayOpacity }}
      >
        <div className="animate-bounce">
          <ChevronDownIcon />
        </div>
      </div>
      
      <HeroSectionPack4 />
      <FeaturesSectionPack4 />
      
      <div className="hidden md:flex justify-center pb-4 bg-black">
        <div className="animate-bounce">
          <ChevronDownIcon />
        </div>
      </div>
      
      <LazySectionPack4>
        <Suspense fallback={<SectionSkeleton />}>
          <FlyersGallerySectionPack4 />
        </Suspense>
      </LazySectionPack4>
      
      <LazySectionPack4>
        <Suspense fallback={<SectionSkeleton />}>
          <MotionsGallerySectionPack4 />
        </Suspense>
      </LazySectionPack4>

      <LazySectionPack4>
        <Suspense fallback={<SectionSkeleton />}>
          <BonusTelaoSectionPack4 />
        </Suspense>
      </LazySectionPack4>
      
      <LazySectionPack4>
        <Suspense fallback={<SectionSkeleton />}>
          <BonusGridSectionPack4 />
        </Suspense>
      </LazySectionPack4>
      
      <LazySectionPack4>
        <Suspense fallback={<SectionSkeleton />}>
          <TestimonialsSectionPack4 />
        </Suspense>
      </LazySectionPack4>
      
      <LazySectionPack4>
        <Suspense fallback={<SectionSkeleton />}>
          <PricingCardsSectionPack4 />
        </Suspense>
      </LazySectionPack4>

      <LazySectionPack4>
        <Suspense fallback={<SectionSkeleton />}>
          <AboutSectionPack4 />
        </Suspense>
      </LazySectionPack4>
      
      <LazySectionPack4>
        <Suspense fallback={<SectionSkeleton />}>
          <FAQSectionPack4 />
        </Suspense>
      </LazySectionPack4>
      
      <LazySectionPack4>
        <Suspense fallback={<SectionSkeleton />}>
          <WhatsAppSupportSectionPack4 />
        </Suspense>
      </LazySectionPack4>
      
      <LazySectionPack4>
        <Suspense fallback={<SectionSkeleton />}>
          <FooterSectionPack4 />
        </Suspense>
      </LazySectionPack4>
    </div>
  );
};

export default PrevendaPack4;
