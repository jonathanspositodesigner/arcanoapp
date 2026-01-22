import { useTranslation } from "react-i18next";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { LazyBeforeAfterSlider } from "../LazyBeforeAfterSlider";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";

// Images imported here - will only be in this lazy-loaded chunk
import upscalerUser1Antes from "@/assets/upscaler-user1-antes.jpg";
import upscalerUser1Depois from "@/assets/upscaler-user1-depois.jpg";
import upscalerUser2Antes from "@/assets/upscaler-user2-antes.jpg";
import upscalerUser2Depois from "@/assets/upscaler-user2-depois.jpg";
import upscalerUser3Antes from "@/assets/upscaler-user3-antes.jpg";
import upscalerUser3Depois from "@/assets/upscaler-user3-depois.jpg";
import upscalerUser4Antes from "@/assets/upscaler-user4-antes.webp";
import upscalerUser4Depois from "@/assets/upscaler-user4-depois.webp";
import upscalerUser5Antes from "@/assets/upscaler-user5-antes.webp";
import upscalerUser5Depois from "@/assets/upscaler-user5-depois.webp";
import upscalerUser6Antes from "@/assets/upscaler-user6-antes.webp";
import upscalerUser6Depois from "@/assets/upscaler-user6-depois.webp";

interface SocialProofSectionPTProps {
  onZoomClick: (before: string, after: string) => void;
}

export const SocialProofSectionPT = ({ onZoomClick }: SocialProofSectionPTProps) => {
  const { t } = useTranslation();

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

  return (
    <AnimatedSection className="px-4 py-20 bg-black/30">
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
                  <LazyBeforeAfterSlider
                    beforeImage={result.before}
                    afterImage={result.after}
                    label={result.label}
                    aspectRatio="2/3"
                    locale="pt"
                    onZoomClick={() => onZoomClick(result.before, result.after)}
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
            <LazyBeforeAfterSlider
              key={index}
              beforeImage={result.before}
              afterImage={result.after}
              label={result.label}
              aspectRatio="2/3"
              locale="pt"
              onZoomClick={() => onZoomClick(result.before, result.after)}
            />
          ))}
        </StaggeredAnimation>
      </div>
    </AnimatedSection>
  );
};

export default SocialProofSectionPT;
