import { useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { HeroSectionCombo, FeaturesSection, FlyersGallerySection, BonusFimDeAnoSection, MotionsGallerySection, Selos3DSection, BonusGridSection, GuaranteeSectionCombo, PricingCardsSection, FAQSectionCombo, WhatsAppSupportSection, FooterSection } from "@/components/combo-artes";

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
  return <div className="min-h-screen bg-black">
      <HeroSectionCombo />
      
      {/* Animated scroll indicator */}
      <div className="flex justify-center pb-4 bg-black">
        <div className="animate-bounce">
          <ChevronDown className="w-8 h-8 text-[#EF672C]" />
        </div>
      </div>
      
      <FeaturesSection />
      <FlyersGallerySection />
      <BonusFimDeAnoSection />
      <MotionsGallerySection />
      
      <BonusGridSection />
      <GuaranteeSectionCombo />
      <PricingCardsSection />
      <FAQSectionCombo />
      <WhatsAppSupportSection />
      <FooterSection />
    </div>;
};
export default ComboArtesArcanas;