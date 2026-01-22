import { useEffect } from "react";
import { appendUtmToUrl } from "@/lib/utmUtils";
import {
  HeroSection,
  BenefitsSection,
  PricingSection,
  BonusSection,
  FAQSection,
  GuaranteeSection,
  TestimonialsSection,
  WhatsAppCTA
} from "@/components/pack-agendas";

// Extend Window interface for Meta Pixel
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

// Greenn checkout URLs
const CHECKOUT_URLS = {
  basic: "https://payfast.greenn.com.br/redirect/177567",
  complete: "https://payfast.greenn.com.br/redirect/177574"
};

// Meta Pixel ID (same as other pages)
const META_PIXEL_ID = "1051791498880287";

const PackAgendas = () => {
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
        content_name: "Pack Agendas",
        content_category: "Digital Product",
        content_type: "product",
        value: 37,
        currency: "BRL"
      });
    }
  }, []);

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  const handlePurchase = (planType: "basic" | "complete") => {
    const baseUrl = CHECKOUT_URLS[planType];
    const checkoutUrl = appendUtmToUrl(baseUrl);
    
    // Track InitiateCheckout
    if (window.fbq) {
      window.fbq("track", "InitiateCheckout", {
        content_name: planType === "complete" ? "Pack Agendas Completo" : "Pack Agendas Básico",
        content_category: "Digital Product",
        content_type: "product",
        value: planType === "complete" ? 37 : 27,
        currency: "BRL",
        num_items: 1
      });
    }

    console.log("[PackAgendas] Opening checkout:", checkoutUrl);
    window.open(checkoutUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-black">
      <HeroSection onCtaClick={scrollToPricing} />
      <BenefitsSection />
      <WhatsAppCTA />
      <BonusSection />
      <PricingSection onPurchase={handlePurchase} />
      <TestimonialsSection />
      <GuaranteeSection />
      <FAQSection />
      
      {/* Floating CTA for mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent md:hidden z-50">
        <button
          onClick={scrollToPricing}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/25"
        >
          Ver Planos - A partir de R$ 27
        </button>
      </div>
    </div>
  );
};

export default PackAgendas;
