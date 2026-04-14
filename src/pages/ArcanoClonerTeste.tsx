import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, ArrowRight, Shield, Clock, Zap, Sparkles, MousePointerClick, Upload, Image, Play, Maximize, BookOpen, Gift, DollarSign, Car, Shirt, Bot, CameraOff, Briefcase, Music, User, Rocket, Share2, Star } from "lucide-react";
import { AnimatedSection, AnimatedElement, StaggeredAnimation, FadeIn } from "@/hooks/useScrollAnimation";

import { useIsMobile } from "@/hooks/use-mobile";
import logoHorizontal from "@/assets/logo_horizontal.png";
import HeroCarouselBackground from "@/components/combo-artes/HeroCarouselBackground";
import { LazySection } from "@/components/combo-artes/LazySection";
import LandingTrialSignupSection from "@/components/arcano-cloner/LandingTrialSignupSection";
import FeedbackCarousel from "@/components/arcano-cloner/FeedbackCarousel";
import LandingPricingSection from "@/components/arcano-cloner/LandingPricingSection";
import clonerResult1 from "@/assets/cloner-result-1.webp";
import clonerResult2 from "@/assets/cloner-result-2.webp";
import clonerResult3 from "@/assets/cloner-result-3.webp";
import clonerResult4 from "@/assets/cloner-result-4.webp";

// Lazy-loaded heavy components (below the fold)
const ExpandingGallery = lazy(() => import("@/components/combo-artes/ExpandingGallery"));
const ClonerDemoAnimation = lazy(() => import("@/components/arcano-cloner/ClonerDemoAnimation"));

const HeroBeforeAfterSlider = lazy(() => import("@/components/upscaler").then(m => ({ default: m.HeroBeforeAfterSlider })));

const UPSCALER_BEFORE_IMAGE_DESKTOP = "/images/upscaler-hero-antes.webp";
const UPSCALER_AFTER_IMAGE_DESKTOP = "/images/upscaler-hero-depois.webp";
const UPSCALER_BEFORE_IMAGE_MOBILE = "/images/upscaler-hero-antes-mobile.webp";
const UPSCALER_AFTER_IMAGE_MOBILE = "/images/upscaler-hero-depois-mobile.webp";

const CHECKOUT_URL = "https://payfast.greenn.com.br/869x6nw/offer/8DN4Jd";

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

const ArcanoClonerTeste = () => {
  const isMobile = useIsMobile();

  // Countdown timer - 1 hour with localStorage persistence
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('planos-arcanocloner-countdown');
    if (saved) {
      const remaining = parseInt(saved, 10) - Date.now();
      if (remaining > 0) return remaining;
    }
    const initial = 60 * 60 * 1000;
    localStorage.setItem('planos-arcanocloner-countdown', String(Date.now() + initial));
    return initial;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          const newTime = 60 * 60 * 1000;
          localStorage.setItem('planos-arcanocloner-countdown', String(Date.now() + newTime));
          return newTime;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0')
    };
  };

  const countdown = formatCountdown(timeLeft);

  // Meta Pixel tracking
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'ViewContent', {
        content_name: 'Arcano Cloner Landing Page',
        content_category: 'AI Tool',
        value: 39.90,
        currency: 'BRL'
      });
    }
  }, []);

  const scrollToPricing = () => {
    document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
  };


  const galleryItems = [
    { imageUrl: "/images/gallery/gallery-1.webp" },
    { imageUrl: "/images/gallery/gallery-2.webp" },
    { imageUrl: "/images/gallery/gallery-3.webp" },
    { imageUrl: "/images/gallery/gallery-4.webp" },
    { imageUrl: "/images/gallery/gallery-5.webp" },
    { imageUrl: "/images/gallery/gallery-6.webp" },
  ];

  const steps = [
    { icon: Upload, title: "Suba uma foto do seu rosto", description: "Envie uma selfie ou foto frontal nítida" },
    { icon: Image, title: "Escolha uma foto de referência", description: "Selecione o estilo desejado da biblioteca ou envie a sua" },
    { icon: Maximize, title: "Selecione o tamanho", description: "Escolha a resolução ideal para sua necessidade" },
    { icon: Play, title: "Clique em Gerar e pronto!", description: "Resultado profissional pronto em segundos" },
  ];

  const faqItems = [
    { question: "O que é o Arcano Cloner?", answer: "O Arcano Cloner é uma ferramenta de inteligência artificial que gera ensaios fotográficos profissionais a partir da sua foto e uma referência. Não é necessário escrever prompts — basta enviar as imagens e clicar em gerar." },
    { question: "Preciso saber usar prompt?", answer: "Não! Essa é a grande vantagem do Arcano Cloner. Diferente de outras ferramentas de IA, você não precisa escrever nenhum prompt. Basta subir sua foto e escolher a referência." },
    { question: "Quanto tempo leva para gerar uma foto?", answer: "O resultado fica pronto em poucos segundos. O Arcano Cloner utiliza o motor NanoBanana Pro, o mais avançado do mercado, garantindo velocidade e qualidade." },
    { question: "Como funciona a biblioteca de referências?", answer: "Você terá acesso a mais de 700 fotos de referência profissionais organizadas por categoria (corporativo, fashion, lifestyle, etc). Basta escolher uma referência e gerar." },
  ];

  const painPoints = [
    { icon: BookOpen, text: "Perder dinheiro com várias plataformas e fazer cursos complexos para gerar uma foto profissional" },
    { icon: Bot, text: "Escrever prompts complexos para gerar imagens" },
    { icon: DollarSign, text: "Pagar R$300 a R$1.000 por sessão de fotos" },
    { icon: Car, text: "Se deslocar até um estúdio fotográfico" },
    { icon: Shirt, text: "Comprar roupas novas para cada ensaio" },
    { icon: CameraOff, text: "Depender de fotógrafo e equipamento caro" },
  ];

  const includedItems = [
    "~70 fotos (4.200 créditos)",
    "Biblioteca com +300 referências profissionais",
    "Upscaler gratuito para melhorar imagens",
    "Acesso a todas as ferramentas de IA",
    "Suporte exclusivo via WhatsApp",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] font-space-grotesk">

      {/* ==================== HERO ==================== */}
      <section className="relative h-screen w-full overflow-hidden">
        
        {/* Layer 1: Carousel background (absolute) */}
        <HeroCarouselBackground />

        {/* Layer 2: Purple glow behind person */}
        <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
          <div className="w-[400px] h-[500px] md:w-[600px] md:h-[700px] bg-slate-600/50 blur-[150px] md:blur-[200px] rounded-full" />
        </div>

        {/* Layer 3: Hero PNG image - LARGE, centered */}
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

        {/* Layer 4: Bottom gradient overlay (above photo, below text) */}
        <div className="absolute inset-0 z-[15] pointer-events-none bg-gradient-to-t from-[#0f0a15] via-[#0f0a15]/50 to-transparent" style={{ top: '50%' }} />

        {/* Layer 5: Text content - overlaps bottom of photo */}
        <div className="relative z-[20] flex flex-col items-center justify-end text-center h-screen px-4 md:px-6 pb-28 md:pb-16 pt-12">

          <div className="mt-auto flex flex-col items-center">
            {/* Social proof badge */}
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

            {/* Headline */}
            <h1 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-foreground mb-3 md:mb-4 leading-[1.2]">
              Crie ensaios fotográficos{" "}
              <br className="hidden md:block" />
              profissionais com IA{" "}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-400">
                sem prompt, sem complicação
              </span>
            </h1>

            {/* Subtitle */}
            <FadeIn duration={700}>
              <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8 max-w-lg leading-relaxed mx-auto">
                Basta subir sua foto e escolher a referência.{" "}
                <span className="text-muted-foreground font-semibold">Resultado pronto em segundos.</span>
              </p>
            </FadeIn>

            {/* Trust badges */}
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

      {/* ==================== PAIN POINTS (OCULTO)
      <LazySection>
      <AnimatedSection className="px-3 md:px-4 pt-4 pb-10 md:py-20 bg-black/30">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection as="div" className="text-center" delay={100}>
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-foreground text-center mb-2 md:mb-12">
              Chega de...
            </h2>
          </AnimatedSection>
          <StaggeredAnimation className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 auto-rows-fr" staggerDelay={100}>
            {painPoints.map((pain, index) => {
              const IconComp = pain.icon;
              return (
                <div key={index} className="bg-accent border border-border rounded-3xl p-6 md:p-8 text-center hover:border-border transition-all duration-300 flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 rounded-2xl bg-accent0/10 border border-border flex items-center justify-center mb-4 shrink-0">
                    <IconComp className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-foreground text-base md:text-lg">{pain.text}</p>
                </div>
              );
            })}
          </StaggeredAnimation>
          <AnimatedSection as="div" delay={400}>
            <div className="mt-10 md:mt-12 bg-gradient-to-r from-slate-500/10 to-slate-500/10 border border-border rounded-3xl p-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl md:text-2xl text-foreground font-semibold">
                Com o Arcano Cloner você resolve tudo isso
              </p>
              <p className="text-muted-foreground mt-2">Sem estúdio. Sem fotógrafo. Sem prompt. Sem complicação.</p>
            </div>
          </AnimatedSection>
        </div>
      </AnimatedSection>
      </LazySection>
      ==================== */}

      {/* ==================== GALLERY ==================== */}
      <LazySection rootMargin="100px">
      <AnimatedSection className="px-4 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection as="div" delay={100}>
              <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-foreground text-center mb-3">
                Gere suas fotos{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-400">sem gastar com ensaios</span>
             </h2>
            <p className="text-muted-foreground text-center text-sm mb-10">Todas as imagens abaixo foram feitas com o Arcano Cloner</p>
          </AnimatedSection>

          <Suspense fallback={<div className="min-h-[300px]" />}>
            <ExpandingGallery items={galleryItems} />
          </Suspense>

          <div className="mt-10 flex flex-nowrap justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 bg-accent0/10 border border-border rounded-full px-3 py-1.5 shrink-0">
              <Zap className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-[11px] font-medium whitespace-nowrap">Motor de IA</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-accent0/10 border border-border rounded-full px-3 py-1.5 shrink-0">
              <MousePointerClick className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-[11px] font-medium whitespace-nowrap">Sem Prompt</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-accent0/10 border border-border rounded-full px-3 py-1.5 shrink-0">
              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-[11px] font-medium whitespace-nowrap">Em Segundos</span>
            </div>
          </div>
          <p className="text-muted-foreground text-center text-sm mt-4 max-w-xl mx-auto">
            Tecnologia de ponta que garante resultados fotorrealistas em poucos segundos. Qualidade profissional sem precisar de nenhum conhecimento técnico.
          </p>
        </div>
      </AnimatedSection>
      </LazySection>

      {/* ==================== COMPARATIVO ==================== */}
      <LazySection>
        <AnimatedSection className="px-4 py-16 md:py-20">
          <div className="max-w-3xl mx-auto">
            <AnimatedSection as="div" delay={100}>
              <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-foreground text-center mb-3">
                O Arcano Cloner entrega tudo que você precisa{" "}
                <span className="text-muted-foreground">na palma da mão.</span>
              </h2>
              <p className="text-muted-foreground text-center text-sm mb-10 max-w-xl mx-auto">
                Chega de ferramentas complexas que não entregam o que prometem e não funcionam no seu celular.
              </p>
            </AnimatedSection>

            <div className="border border-border rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-3 border-b border-border bg-white/[0.02]">
                <div className="px-4 py-4 text-muted-foreground text-xs uppercase tracking-wider font-semibold">Recursos</div>
                <div className="px-4 py-4 text-white/40 text-xs uppercase tracking-wider text-center font-semibold">Outras IAs</div>
                <div className="px-4 py-4 text-muted-foreground text-xs uppercase tracking-wider text-center font-semibold">Arcano Cloner</div>
              </div>

              {[
                {
                  feature: "Modelos e Comandos",
                  other: "Você precisa criar prompts complexos do zero",
                  cloner: "Modelos e Prompts Prontos para Uso (1 Clique)",
                },
                {
                  feature: "Experiência no Celular",
                  other: "Interface pesada, trava ou exige PC",
                  cloner: "100% Otimizado, Rápido e Leve no Celular",
                },
                {
                  feature: "Preço de Entrada",
                  other: "R$ 100 a R$ 150+ /mês",
                  cloner: "A partir de R$ 24,90 (Único)",
                },
                {
                  feature: "Qualidade da Imagem",
                  other: "Cara de 'Robô' e erros visuais",
                  cloner: "Fotorrealismo Extremo (Nano Banana Pro)",
                },
                {
                  feature: "Facilidade de Uso",
                  other: "Precisa usar códigos e Discord",
                  cloner: "App Simples e Direto ao Ponto",
                },
                {
                  feature: "Comunidade no WhatsApp",
                  other: "Sem suporte ou networking",
                  cloner: "Grupo VIP e Suporte Ativo",
                },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-3 border-b border-white/5 last:border-b-0">
                  <div className="px-4 py-5 text-foreground font-semibold text-sm flex items-center">{row.feature}</div>
                  <div className="px-4 py-5 flex flex-col items-center justify-center text-center gap-1">
                    <span className="text-red-400 text-lg">✕</span>
                    <span className="text-white/40 text-xs leading-tight">{row.other}</span>
                  </div>
                  <div className="px-4 py-5 flex flex-col items-center justify-center text-center gap-1">
                    <span className="text-emerald-400 text-lg">✓</span>
                    <span className="text-emerald-300 text-xs font-semibold leading-tight">{row.cloner}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </LazySection>


      <LazySection rootMargin="100px">
      <AnimatedSection className="px-4 py-16 md:py-20 bg-black/30">
        <div className="max-w-7xl mx-auto text-center">
          <AnimatedSection as="div" delay={100}>
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-foreground mb-3">
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

      {/* ==================== HOW IT WORKS ==================== */}
      <LazySection>
      <AnimatedSection className="px-4 py-16 md:py-20 bg-black/30">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection as="div" delay={100}>
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-foreground text-center mb-3">
              Simples assim.{" "}
              <span className="text-muted-foreground">Sem prompt. Sem complicação.</span>
            </h2>
            <p className="text-muted-foreground text-center text-sm mb-12">4 passos e seu ensaio está pronto</p>
          </AnimatedSection>

          <Suspense fallback={<div className="min-h-[400px]" />}>
            <ClonerDemoAnimation />
          </Suspense>
        </div>
      </AnimatedSection>
      </LazySection>



      {/* ==================== BONUS (OCULTO)
      <LazySection>
      <AnimatedSection className="px-4 pt-16 md:pt-20 pb-6 bg-black/30">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection as="div" delay={100}>
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-foreground text-center mb-3">
              E tem <span className="text-muted-foreground">bônus</span> 🎁
            </h2>
            <p className="text-muted-foreground text-center text-sm mb-2">Ao adquirir o Arcano Cloner, você leva de bônus:</p>
          </AnimatedSection>
        </div>
      </AnimatedSection>
      <AnimatedSection className="px-4 py-10 md:py-14 bg-black/30">
        ... bonus 1 e 2 ...
      </AnimatedSection>
      </LazySection>
      ==================== */}

      {/* ==================== PARA QUEM É (OCULTO) ====================
      <LazySection>
      <AnimatedSection className="px-4 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection as="div" delay={100}>
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-foreground text-center mb-3">
              Quem já está{" "}
              <span className="text-muted-foreground">lucrando e se destacando</span>{" "}
              com o Arcano Cloner
            </h2>
            <p className="text-muted-foreground text-center text-sm mb-12">
              Se você se encaixa em pelo menos um desses perfis, o Arcano Cloner foi feito pra você
            </p>
          </AnimatedSection>

          <StaggeredAnimation className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-fr" staggerDelay={100}>
            {[
              { icon: DollarSign, title: "Empreendedores Digitais", text: "Quer faturar vendendo ensaios fotográficos profissionais sem precisar de câmera ou estúdio" },
              { icon: Briefcase, title: "Profissionais e Executivos", text: "Quer se posicionar de forma profissional nas redes sociais com fotos que transmitem autoridade e credibilidade" },
              { icon: Music, title: "Músicos e Artistas", text: "Crie presskits, capas de álbum e materiais visuais incríveis sem depender de fotógrafo" },
              { icon: Rocket, title: "Infoprodutores", text: "Precisa de imagens profissionais para anúncios, páginas de venda e conteúdo digital" },
              { icon: Share2, title: "Social Media e Criadores", text: "Produza conteúdo visual de alto nível para seus clientes ou para suas próprias redes" },
              { icon: User, title: "Usuários Comuns", text: "Quer fotos incríveis para redes sociais, perfis de namoro ou uso pessoal com qualidade de estúdio" },
            ].map((item, index) => {
              const IconComp = item.icon;
              return (
                <div key={index} className="bg-accent border border-border rounded-3xl p-6 flex flex-col items-center text-center h-full">
                  <div className="w-14 h-14 rounded-2xl bg-accent0/10 flex items-center justify-center mb-4">
                    <IconComp className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-foreground font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.text}</p>
                </div>
              );
            })}
          </StaggeredAnimation>
        </div>
      </AnimatedSection>
      </LazySection>
      */}

      {/* ==================== PRICING (OCULTO) ====================
      <LazySection>
      <div id="pricing-section">
        <AnimatedSection className="px-3 md:px-4 py-16 md:py-20 bg-black/30" animation="scale">
          ... pricing + guarantee hidden ...
        </AnimatedSection>
      </div>
      </LazySection>
      ==================== */}

      {/* ==================== RESULTADOS DE USUÁRIOS ==================== */}
      <LazySection>
        <AnimatedSection className="px-3 md:px-4 py-16 md:py-20" animation="fade">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-foreground mb-2">
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

      {/* ==================== PREÇOS ==================== */}
      <LazySection>
        <LandingPricingSection />
      </LazySection>

      {/* ==================== FEEDBACKS ==================== */}
      <LazySection>
        <FeedbackCarousel />
      </LazySection>


      {/* ==================== FAQ ==================== */}
      <LazySection>
      <AnimatedSection className="px-4 py-16 md:py-20">
        <div className="max-w-2xl mx-auto">
          <AnimatedSection as="div" delay={100}>
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-foreground text-center mb-12">
              Perguntas{" "}
              <span className="text-muted-foreground">frequentes</span>
            </h2>
          </AnimatedSection>

          <AnimatedSection as="div" delay={200}>
            <Accordion type="single" collapsible className="space-y-4">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-accent border border-border rounded-2xl px-6 data-[state=open]:border-border"
                >
                  <AccordionTrigger className="text-foreground text-left text-lg font-medium py-5 hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </AnimatedSection>
        </div>
      </AnimatedSection>
      </LazySection>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-4">
          <img src={logoHorizontal} alt="ArcanoApp" className="h-7 w-auto opacity-70" />
          <p className="text-white/40 text-xs">© 2026 Arcano App. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default ArcanoClonerTeste;
