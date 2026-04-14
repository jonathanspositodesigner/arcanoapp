import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Sparkles, Clock, MousePointerClick } from "lucide-react";
import { AnimatedSection, AnimatedElement, FadeIn } from "@/hooks/useScrollAnimation";
import HeroCarouselBackground from "@/components/combo-artes/HeroCarouselBackground";
import { LazySection } from "@/components/combo-artes/LazySection";
import LandingTrialSignupSection from "@/components/arcano-cloner/LandingTrialSignupSection";
import ArcanoClonerAuthModal from "@/components/arcano-cloner/ArcanoClonerAuthModal";
import clonerResult1 from "@/assets/cloner-result-1.webp";
import clonerResult2 from "@/assets/cloner-result-2.webp";
import clonerResult3 from "@/assets/cloner-result-3.webp";
import clonerResult4 from "@/assets/cloner-result-4.webp";
import logoHorizontal from "@/assets/logo_horizontal.png";

const CountUp = ({ target, duration = 2000 }: { target: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasAnimated.current) {
        hasAnimated.current = true;
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <div ref={ref} className="flex items-baseline justify-center gap-1">
      <span className="font-space-grotesk font-bold text-6xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
        {count}
      </span>
      <span className="text-muted-foreground text-3xl md:text-4xl font-bold">+</span>
    </div>
  );
};

const TesteCloner = () => {
  const [showModal, setShowModal] = useState(false);

  const handleAuthSuccess = () => {
    setShowModal(false);
    window.location.href = "https://arcanoapp.voxvisual.com.br/ferramentas-ia-aplicativo";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] font-space-grotesk">

      {/* ==================== HERO ==================== */}
      <section className="relative h-screen w-full overflow-hidden">
        <HeroCarouselBackground />

        <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
          <div className="w-[400px] h-[500px] md:w-[600px] md:h-[700px] bg-slate-600/50 blur-[150px] md:blur-[200px] rounded-full" />
        </div>

        <div className="absolute inset-0 z-[10] flex items-center justify-center pointer-events-none">
          <img 
            src="/images/arcano-cloner-hero.webp?v=4" 
            alt="Arcano Cloner" 
            fetchPriority="high"
            decoding="sync"
            loading="eager"
            className="w-[415px] md:w-[450px] lg:w-[520px] h-auto object-contain drop-shadow-2xl -translate-y-[10%] md:-translate-y-[5%]"
          />
        </div>

        <div className="absolute inset-0 z-[15] pointer-events-none bg-gradient-to-t from-[#0f0a15] via-[#0f0a15]/50 to-transparent" style={{ top: '50%' }} />

        <div className="relative z-[20] flex flex-col items-center justify-end text-center h-screen px-4 md:px-6 pb-28 md:pb-16 pt-12">
          <div className="mt-auto flex flex-col items-center">
            <FadeIn duration={600}>
              <div className="inline-flex items-center gap-2.5 bg-white/[0.07] border border-border rounded-full px-4 py-2 mb-5 md:mb-6">
                <div className="flex -space-x-2">
                  <img src="/images/social-proof-1.webp" alt="" width="24" height="24" decoding="async" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                  <img src="/images/social-proof-2.webp" alt="" width="24" height="24" decoding="async" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                  <img src="/images/social-proof-3.webp" alt="" width="24" height="24" decoding="async" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                </div>
                <span className="relative flex h-2.5 w-2.5 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.4)]"></span>
                </span>
                <span className="text-foreground text-xs font-medium">+3.200 usuários ativos</span>
              </div>
            </FadeIn>

            <h1 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white mb-3 md:mb-4 leading-[1.2]">
              Crie ensaios fotográficos{" "}
              <br className="hidden md:block" />
              profissionais com IA{" "}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-400">
                sem prompt, sem complicação
              </span>
            </h1>

            <FadeIn duration={700}>
              <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8 max-w-lg leading-relaxed mx-auto">
                Basta subir sua foto e escolher a referência.{" "}
                <span className="text-muted-foreground font-semibold">Resultado pronto em segundos.</span>
              </p>
            </FadeIn>

            <FadeIn duration={700}>
              <button
                onClick={() => setShowModal(true)}
                className="mb-6 px-8 py-3 rounded-xl bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 text-white font-bold text-sm md:text-base transition-all pointer-events-auto"
              >
                🚀 Iniciar Teste Grátis
              </button>
            </FadeIn>

            <FadeIn duration={700}>
              <div className="flex flex-wrap justify-center items-center gap-3 md:gap-0 md:divide-x md:divide-white/10">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs px-3 py-1">
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Sem prompt</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs px-3 py-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Pronto em segundos</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs px-3 py-1">
                  <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Fácil de usar</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ==================== TUDO FEITO COM UM CLIQUE ==================== */}
      <LazySection rootMargin="100px">
        <AnimatedSection className="px-4 py-16 md:py-20 bg-black/30">
          <div className="max-w-7xl mx-auto text-center">
            <AnimatedSection as="div" delay={100}>
              <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white mb-3">
                Tudo feito com um clique,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-400">sem prompt!</span>
              </h2>
              <p className="text-muted-foreground text-sm mb-10">
                Resultados reais de clientes usando o Arcano Cloner
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mx-auto">
              <AnimatedElement delay={100}>
                <img src={clonerResult1} alt="Resultado Arcano Cloner" className="w-full rounded-xl" loading="lazy" />
              </AnimatedElement>
              <AnimatedElement delay={200}>
                <img src={clonerResult2} alt="Resultado Arcano Cloner" className="w-full rounded-xl" loading="lazy" />
              </AnimatedElement>
              <AnimatedElement delay={300}>
                <img src={clonerResult3} alt="Resultado Arcano Cloner" className="w-full rounded-xl" loading="lazy" />
              </AnimatedElement>
              <AnimatedElement delay={400}>
                <img src={clonerResult4} alt="Resultado Arcano Cloner" className="w-full rounded-xl" loading="lazy" />
              </AnimatedElement>
            </div>
          </div>
        </AnimatedSection>
      </LazySection>

      {/* ==================== BIBLIOTECA COMPLETA ==================== */}
      <LazySection>
        <AnimatedSection className="px-3 md:px-4 py-16 md:py-20" animation="fade">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white mb-2">
              Uma biblioteca completa de referências <span className="text-muted-foreground">para você gerar com um clique</span>
            </h2>

            <div className="flex flex-col items-center mt-8 mb-2">
              <CountUp target={789} duration={2000} />
              <p className="text-muted-foreground text-xs md:text-sm tracking-[0.2em] uppercase mt-1">Modelos Disponíveis</p>
            </div>

            <div className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full border border-border bg-accent">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-muted-foreground text-xs uppercase tracking-wider">Atualizado todos os dias</span>
            </div>
          </div>

          {/* Carrossel 1 - direita */}
          <div className="relative overflow-hidden mb-4">
            <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-[#0a0510] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-[#0a0510] to-transparent z-10 pointer-events-none" />
            <div className="flex gap-4 marquee-refs-track">
              {[...Array(2)].flatMap((_, setIndex) =>
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <img
                    key={`r1-${setIndex}-${num}`}
                    src={`/images/results/result-${num}.webp`}
                    alt={`Resultado ${num}`}
                    className="w-[255px] md:w-[234px] shrink-0 aspect-[3/4] rounded-2xl border border-border object-cover"
                    loading="lazy"
                  />
                ))
              )}
            </div>
          </div>

          {/* Carrossel 2 - esquerda */}
          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-[#0a0510] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-[#0a0510] to-transparent z-10 pointer-events-none" />
            <div className="flex gap-4 marquee-refs-track-reverse">
              {[...Array(2)].flatMap((_, setIndex) =>
                [6, 7, 8, 9, 10, 1, 2, 3, 4, 5].map((num) => (
                  <img
                    key={`r2-${setIndex}-${num}`}
                    src={`/images/results/result-${num}.webp`}
                    alt={`Resultado ${num}`}
                    className="w-[255px] md:w-[234px] shrink-0 aspect-[3/4] rounded-2xl border border-border object-cover"
                    loading="lazy"
                  />
                ))
              )}
            </div>
          </div>
        </AnimatedSection>
      </LazySection>

      {/* ==================== TESTE GRÁTIS ==================== */}
      <LazySection>
        <LandingTrialSignupSection />
      </LazySection>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-4">
          <img src={logoHorizontal} alt="ArcanoApp" className="h-7 w-auto opacity-70" />
          <p className="text-white/40 text-xs">© 2026 Arcano App. Todos os direitos reservados.</p>
        </div>
      </footer>

      <ArcanoClonerAuthModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default TesteCloner;
