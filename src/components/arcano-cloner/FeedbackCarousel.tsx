import { useEffect, useState, useRef, useCallback } from "react";
import { Star } from "lucide-react";
import { AnimatedSection } from "@/hooks/useScrollAnimation";
import { useIsMobile } from "@/hooks/use-mobile";
import feedbackRafael from "@/assets/feedback-rafael.png";
import feedbackPedro from "@/assets/feedback-pedro.png";
import feedbackBeatriz from "@/assets/feedback-beatriz.png";
import feedbackLucas from "@/assets/feedback-lucas.png";
import feedbackThiago from "@/assets/feedback-thiago.png";
import feedbackCamila from "@/assets/feedback-camila.png";
import feedbackJuliana from "@/assets/feedback-juliana.png";

const feedbacks = [
  {
    name: "Lucas Mendes",
    photo: feedbackLucas,
    text: "Usei pra fazer umas fotos pro meu perfil e ficou muito bom. Não esperava esse nível de qualidade sinceramente.",
  },
  {
    name: "Camila Souza",
    photo: feedbackCamila,
    text: "Consegui criar as artes que eu precisava pro meu Instagram em minutos. Valeu muito a pena.",
  },
  {
    name: "Rafael Costa",
    photo: feedbackRafael,
    text: "Testei achando que não ia funcionar direito e me surpreendi. O resultado fica bem natural.",
  },
  {
    name: "Juliana Almeida",
    photo: feedbackJuliana,
    text: "Uso pra gerar fotos pros meus clientes e eles adoram. Economizei muito com ensaio fotográfico.",
  },
  {
    name: "Pedro Oliveira",
    photo: feedbackPedro,
    text: "Ferramenta simples de usar e o resultado sai rápido. Recomendo pra quem trabalha com social media.",
  },
  {
    name: "Mariana Santos",
    photo: "https://randomuser.me/api/portraits/women/31.jpg",
    text: "Fiz umas fotos de teste e minha amiga achou que eu tinha feito ensaio de verdade kk. Muito bom.",
  },
  {
    name: "Thiago Ferreira",
    photo: feedbackThiago,
    text: "Já testei outras ferramentas parecidas mas essa aqui entrega um resultado bem mais realista.",
  },
  {
    name: "Beatriz Lima",
    photo: feedbackBeatriz,
    text: "Uso quase todo dia pro meu trabalho. É prático e rápido, não tenho do que reclamar.",
  },
];

const FeedbackCard = ({ fb }: { fb: typeof feedbacks[0] }) => (
  <div className="min-w-[280px] max-w-[280px] sm:min-w-[260px] sm:max-w-[260px] flex-shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <img
        src={fb.photo}
        alt={fb.name}
        className="w-10 h-10 rounded-full object-cover"
        loading="lazy"
      />
      <div>
        <p className="text-white font-semibold text-sm">{fb.name}</p>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-fuchsia-400 text-fuchsia-400" />
          ))}
        </div>
      </div>
    </div>
    <p className="text-white/70 text-sm leading-relaxed">"{fb.text}"</p>
  </div>
);

const FeedbackCarousel = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileFeedbackCarousel />;
  }

  return <DesktopFeedbackCarousel />;
};

const DesktopFeedbackCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const duplicated = [...feedbacks, ...feedbacks];

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let animationId: number;
    const speed = 0.7;

    const scroll = () => {
      if (!isPaused && container) {
        container.scrollLeft += speed;
        const halfScroll = container.scrollWidth / 2;
        if (container.scrollLeft >= halfScroll) {
          container.scrollLeft = 0;
        }
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused]);

  return (
    <AnimatedSection className="py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-4">
        <AnimatedSection as="div" delay={100}>
          <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-4">
            O que nossos{" "}
            <span className="text-fuchsia-400">usuários</span> dizem
          </h2>
          <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">
            Feedbacks reais de quem já usa a ferramenta no dia a dia
          </p>
        </AnimatedSection>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-hidden px-4 cursor-grab active:cursor-grabbing"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {duplicated.map((fb, index) => (
          <FeedbackCard key={`${fb.name}-${index}`} fb={fb} />
        ))}
      </div>
    </AnimatedSection>
  );
};

const MobileFeedbackCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % feedbacks.length);
    }, 4000);
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoPlay]);

  const goTo = (index: number) => {
    setCurrentIndex(index);
    startAutoPlay();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goTo((currentIndex + 1) % feedbacks.length);
      } else {
        goTo((currentIndex - 1 + feedbacks.length) % feedbacks.length);
      }
    }
  };

  return (
    <AnimatedSection className="py-16">
      <div className="px-4">
        <AnimatedSection as="div" delay={100}>
          <h2 className="font-space-grotesk font-bold text-2xl text-white text-center mb-4">
            O que nossos{" "}
            <span className="text-fuchsia-400">usuários</span> dizem
          </h2>
          <p className="text-white/60 text-center mb-8 text-sm">
            Feedbacks reais de quem já usa a ferramenta no dia a dia
          </p>
        </AnimatedSection>
      </div>

      <div
        className="relative overflow-hidden px-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {feedbacks.map((fb, index) => (
            <div key={`mobile-${fb.name}-${index}`} className="min-w-full px-2">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={fb.photo}
                    alt={fb.name}
                    className="w-11 h-11 rounded-full object-cover"
                    loading="lazy"
                  />
                  <div>
                    <p className="text-white font-semibold text-sm">{fb.name}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-fuchsia-400 text-fuchsia-400" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">"{fb.text}"</p>
              </div>
            </div>
          ))}
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mt-4">
          {feedbacks.map((_, index) => (
            <button
              key={`dot-${index}`}
              onClick={() => goTo(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-fuchsia-400 w-5"
                  : "bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
};

export default FeedbackCarousel;
