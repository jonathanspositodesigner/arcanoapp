import { useTranslation } from "react-i18next";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { HeroBeforeAfterSlider } from "../HeroBeforeAfterSlider";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { User } from "lucide-react";

// Desktop high-res images imported here - will only be in this lazy-loaded chunk
import upscalerUser1Antes from "@/assets/upscaler-user1-antes.jpg";
import upscalerUser1Depois from "@/assets/upscaler-user1-depois.jpg";
import upscalerUser2Antes from "@/assets/upscaler-user2-antes.jpg";
import upscalerUser2Depois from "@/assets/upscaler-user2-depois.jpg";
import upscalerUser3Antes from "@/assets/upscaler-user3-antes.jpg";
import upscalerUser3Depois from "@/assets/upscaler-user3-depois.jpg";
import upscalerUser5Antes from "@/assets/upscaler-user5-antes.webp";
import upscalerUser5Depois from "@/assets/upscaler-user5-depois.webp";
import upscalerUser6Antes from "@/assets/upscaler-user6-antes.webp";
import upscalerUser6Depois from "@/assets/upscaler-user6-depois.webp";

interface SocialProofSectionPTProps {
  onZoomClick: (before: string, after: string) => void;
  isMobile?: boolean;
}

export const SocialProofSectionPT = ({ onZoomClick, isMobile = false }: SocialProofSectionPTProps) => {
  const { t } = useTranslation();

  const userResults = [
    {
      before: "/images/mauricio-antes.webp",
      after: "/images/mauricio-depois.webp",
      name: "Maurício",
      handle: "@ventus.studio",
      testimonial: "Como fotógrafo já perdi inumeras fotos por saírem desfocadas na hora da correria dos ensaios, e essa ferramenta literalmente me salvou! Ela recupera os detalhes do rosto precisão e não deixa com aspecto de borracha como as outras ferramentas que ja usei, o resultado fica como se eu tivesse acertado o clique de primeira! O Upscaler tá servindo muito aqui na agência, uso diariamente, recomendo!"
    },
    {
      before: isMobile ? "/images/upscaler-user2-antes-mobile.webp" : upscalerUser2Antes,
      after: isMobile ? "/images/upscaler-user2-depois-mobile.webp" : upscalerUser2Depois,
      name: "Ana Beatriz",
      handle: "@anab.designstudio",
      testimonial: "Eu usava outro upscaler que demorava horas e o resultado era meia boca. Com o Upscaler Arcano em menos de 1 minuto minhas fotos ficam perfeitas. Meus clientes notaram a diferença na hora!"
    },
    {
      before: isMobile ? "/images/upscaler-user6-antes-mobile.webp" : upscalerUser6Antes,
      after: isMobile ? "/images/upscaler-user6-depois-mobile.webp" : upscalerUser6Depois,
      name: "Mariana Costa",
      handle: "@mari.visualarts",
      testimonial: "Restaurei fotos antigas da minha família que estavam super pixeladas. O resultado ficou lindo, parecia foto nova. Chorei de emoção quando vi o antes e depois."
    },
    {
      before: isMobile ? "/images/upscaler-user1-antes-mobile.webp" : upscalerUser1Antes,
      after: isMobile ? "/images/upscaler-user1-depois-mobile.webp" : upscalerUser1Depois,
      name: "Wellington",
      handle: "@wrproducoes",
      testimonial: "Muito top o Upscaler do Jonathan, o melhor do mercado sem dúvidas! Tá salvando aqui nos trampos kkkkk já foi a fase de sofrer com foto ruim de cliente hoje jogo no upscaler e entrego as artes com muito mais qualidade!",
      avatar: "/images/wellington-wrproducoes.png"
    },
    {
      before: isMobile ? "/images/upscaler-user5-antes-mobile.webp" : upscalerUser5Antes,
      after: isMobile ? "/images/upscaler-user5-depois-mobile.webp" : upscalerUser5Depois,
      name: "Lucas Ferreira",
      handle: "@lucasf.creative",
      testimonial: "Comecei a usar pra melhorar renders 3D e logos. O resultado é impressionante, parece que a imagem foi feita do zero em alta resolução. Recomendo demais pra qualquer designer."
    }
  ];

  const TestimonialCard = ({ result, index }: { result: typeof userResults[0]; index: number }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-fuchsia-500/30 transition-all duration-300">
      <div className="flex flex-col md:flex-row">
        {/* Slider antes/depois - sem borda/container próprio */}
        <div className="p-3 md:p-6 md:w-1/2 md:flex-shrink-0">
          <HeroBeforeAfterSlider
            beforeImage={result.before}
            afterImage={result.after}
            locale="pt"
          />
        </div>
        
        {/* Nome, @ e Depoimento */}
        <div className="px-5 py-4 md:p-6 md:pt-8 flex flex-col justify-center md:justify-start md:w-1/2">
          <div className="flex items-center gap-3 mb-4">
            {result.avatar ? (
              <img src={result.avatar} alt={result.name} className="w-10 h-10 rounded-full border border-white/10 object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-fuchsia-400" />
              </div>
            )}
            <div>
              <p className="font-space-grotesk font-semibold text-white text-sm">{result.name}</p>
              <p className="text-fuchsia-400/70 text-xs">{result.handle}</p>
            </div>
          </div>
          <p className="font-space-grotesk text-white/80 text-sm md:text-base leading-relaxed">
            {result.testimonial}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <AnimatedSection className="px-4 py-20 bg-black/30">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection as="div" delay={100}>
          <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-2 tracking-tight leading-tight px-2">
            {t('tools:upscaler.socialProof.title')} <span className="text-fuchsia-400">{t('tools:upscaler.socialProof.result')}</span>
            <span className="block sm:inline"> {t('tools:upscaler.socialProof.subtitle')}</span>
          </h2>
          <p className="text-white/60 text-center text-sm md:text-base mb-8 md:mb-12 px-4 font-space-grotesk">
            {t('tools:upscaler.socialProof.description')}
          </p>
        </AnimatedSection>
        
        {/* Versão MOBILE - Carrossel */}
        <div className="md:hidden px-2">
          <Carousel opts={{ watchDrag: false }} className="w-full max-w-sm mx-auto">
            <CarouselContent>
              {userResults.map((result, index) => (
                <CarouselItem key={index}>
                  <TestimonialCard result={result} index={index} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-2 h-10 w-10 bg-fuchsia-500 hover:bg-fuchsia-600 border-none text-white shadow-lg shadow-fuchsia-500/30" />
            <CarouselNext className="-right-2 h-10 w-10 bg-fuchsia-500 hover:bg-fuchsia-600 border-none text-white shadow-lg shadow-fuchsia-500/30" />
          </Carousel>
        </div>

        {/* Versão DESKTOP - Stack vertical */}
        <StaggeredAnimation className="hidden md:flex flex-col gap-8" staggerDelay={150}>
          {userResults.map((result, index) => (
            <TestimonialCard key={index} result={result} index={index} />
          ))}
        </StaggeredAnimation>
      </div>
    </AnimatedSection>
  );
};

export default SocialProofSectionPT;
