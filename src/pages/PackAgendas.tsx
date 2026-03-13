import { useEffect, useState } from "react";
import TopBanner from "@/components/pack-agendas/TopBanner";
import HeroSectionAgendas from "@/components/pack-agendas/HeroSectionAgendas";
import ValueSection from "@/components/pack-agendas/ValueSection";
import EdicaoFacilSection from "@/components/pack-agendas/EdicaoFacilSection";
import BonusExclusivoSection from "@/components/pack-agendas/BonusExclusivoSection";
import PricingSection from "@/components/pack-agendas/PricingSection";
import BonusLibrarySection from "@/components/pack-agendas/BonusLibrarySection";
import GuaranteeSection from "@/components/pack-agendas/GuaranteeSection";
import TestimonialsAgendas from "@/components/pack-agendas/TestimonialsAgendas";
import FloatingCTAAgendas from "@/components/pack-agendas/FloatingCTAAgendas";
import AboutSectionAgendas from "@/components/pack-agendas/AboutSectionAgendas";
import FAQSectionAgendas from "@/components/pack-agendas/FAQSectionAgendas";

const SplashScreen = ({ isVisible }: { isVisible: boolean }) => (
  <div
    className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500 ${
      isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
    }`}
    style={{ backgroundColor: "#002D3C" }}
  >
    <img
      src="/images/logo-splash.png"
      alt="Loading"
      className="w-24 h-auto animate-pulse"
    />
  </div>
);

const PackAgendas = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen pb-28 md:pb-0" style={{ backgroundColor: "#EAEAEA" }}>
      <SplashScreen isVisible={showSplash} />
      <TopBanner />
      <HeroSectionAgendas />
      <ValueSection />
      <div className="w-full h-1" style={{ backgroundColor: "#FFDF00" }} />
      <EdicaoFacilSection />
      <div className="w-full h-1" style={{ backgroundColor: "#FFDF00" }} />
      <BonusExclusivoSection />
      <BonusLibrarySection />
      <div className="w-full h-1" style={{ backgroundColor: "#FFDF00" }} />
      <PricingSection />
      <div className="w-full h-1" style={{ backgroundColor: "#FFDF00" }} />
      <TestimonialsAgendas />
      <div className="w-full h-1" style={{ backgroundColor: "#FFDF00" }} />
      <GuaranteeSection />
      <div className="w-full h-1" style={{ backgroundColor: "#FFDF00" }} />
      <AboutSectionAgendas />
      <div className="w-full h-1" style={{ backgroundColor: "#FFDF00" }} />
      <FAQSectionAgendas />
      <FloatingCTAAgendas />
    </div>
  );
};

export default PackAgendas;
