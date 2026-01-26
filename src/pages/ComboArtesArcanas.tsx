import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  HeroSectionCombo,
  heroImages,
  AreaMembrosSection,
  areaMembrosImages,
  FlyersGallerySection,
  flyerCategories,
  BonusFimDeAnoSection,
  artesReveillon,
  MotionsGallerySection,
  motions,
  securityBadges,
  Selos3DSection,
  selos,
  BonusGridSection,
  GuaranteeSectionCombo,
  guaranteeImages,
  PricingCardsSection,
  FAQSectionCombo,
  WhatsAppSupportSection,
  FooterSection,
  FloatingCTAMobile,
  MediaAuditPanel,
} from "@/components/combo-artes";
import { proxiedMediaUrl } from "@/lib/mediaProxy";

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
  const [searchParams] = useSearchParams();
  const isAuditMode = searchParams.get("audit") === "1";

  // Build complete list of all media URLs for the auditor
  const allMediaItems = useMemo(() => {
    const items: Array<{ url: string; section: string; type: "image" | "video" }> = [];

    // Hero images
    heroImages.forEach((url) => {
      items.push({ url: proxiedMediaUrl(url), section: "Hero", type: "image" });
    });

    // Area Membros images
    areaMembrosImages.forEach((url) => {
      items.push({ url: proxiedMediaUrl(url), section: "Área Membros", type: "image" });
    });

    // Flyers - all categories
    flyerCategories.forEach((cat) => {
      cat.images.forEach((url) => {
        items.push({ url: proxiedMediaUrl(url), section: `Flyers - ${cat.title}`, type: "image" });
      });
    });

    // Bonus Fim de Ano
    artesReveillon.forEach((url) => {
      items.push({ url: proxiedMediaUrl(url), section: "Bônus Fim de Ano", type: "image" });
    });

    // Selos 3D
    selos.forEach((url) => {
      items.push({ url: proxiedMediaUrl(url), section: "Selos 3D", type: "image" });
    });

    // Motions - thumbnails and videos
    motions.forEach((motion) => {
      items.push({ url: proxiedMediaUrl(motion.thumbnail), section: "Motions (thumb)", type: "image" });
      items.push({ url: proxiedMediaUrl(motion.video), section: "Motions (video)", type: "video" });
    });

    // Security badges
    securityBadges.forEach((url) => {
      items.push({ url: proxiedMediaUrl(url), section: "Compra Segura", type: "image" });
    });

    // Guarantee images
    guaranteeImages.forEach((url) => {
      items.push({ url: proxiedMediaUrl(url), section: "Garantia", type: "image" });
    });

    return items;
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
        currency: "BRL",
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <HeroSectionCombo />
      <AreaMembrosSection />
      <FlyersGallerySection />
      <BonusFimDeAnoSection />
      <MotionsGallerySection />
      <Selos3DSection />
      <BonusGridSection />
      <GuaranteeSectionCombo />
      <PricingCardsSection />
      <FAQSectionCombo />
      <WhatsAppSupportSection />
      <FooterSection />
      <FloatingCTAMobile />
      
      {/* Media Audit Panel - only shows when ?audit=1 */}
      {isAuditMode && <MediaAuditPanel mediaItems={allMediaItems} />}
    </div>
  );
};

export default ComboArtesArcanas;
