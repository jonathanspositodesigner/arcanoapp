import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, ArrowRight, Shield, Clock, Star, Zap, Upload, Image, Sparkles, Camera, MousePointerClick, BookOpen, Gift, Play, Maximize, ChevronDown, Video } from "lucide-react";
import { AnimatedSection, AnimatedElement, StaggeredAnimation, FadeIn } from "@/hooks/useScrollAnimation";
import { appendUtmToUrl } from "@/lib/utmUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeroBeforeAfterSlider } from "@/components/upscaler";
import logoHorizontal from "@/assets/logo_horizontal.png";

const UPSCALER_BEFORE_IMAGE_DESKTOP = "/images/upscaler-hero-antes.webp";
const UPSCALER_AFTER_IMAGE_DESKTOP = "/images/upscaler-hero-depois.webp";
const UPSCALER_BEFORE_IMAGE_MOBILE = "/images/upscaler-hero-antes-mobile.webp";
const UPSCALER_AFTER_IMAGE_MOBILE = "/images/upscaler-hero-depois-mobile.webp";

const CHECKOUT_URL = "https://example.com/checkout-placeholder";

const PlanosArcanoCloner = () => {
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
        value: 47.00,
        currency: 'BRL'
      });
    }
  }, []);

  const scrollToPricing = () => {
    document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePurchase = () => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'InitiateCheckout', {
        content_name: 'Arcano Cloner',
        value: 47.00,
        currency: 'BRL'
      });
    }
    window.open(appendUtmToUrl(CHECKOUT_URL), "_blank");
  };

  const galleryItems = [
    { label: "Ensaio Corporativo" },
    { label: "Fashion" },
    { label: "Lifestyle" },
    { label: "Casual" },
    { label: "Artístico" },
    { label: "Profissional" },
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
    { question: "Quantas fotos posso gerar?", answer: "Com o plano de R$ 47,00 você recebe 4.500 créditos, o que equivale a aproximadamente 56 fotos geradas." },
    { question: "Como funciona a biblioteca de referências?", answer: "Você terá acesso a mais de 300 fotos de referência profissionais organizadas por categoria (corporativo, fashion, lifestyle, etc). Basta escolher uma referência e gerar." },
    { question: "O que é o Upscaler bônus?", answer: "É uma ferramenta gratuita inclusa que melhora a qualidade e resolução das suas imagens geradas, tornando-as ainda mais profissionais." },
    { question: "Tem garantia?", answer: "Sim! Oferecemos garantia incondicional de 7 dias. Se não gostar, devolvemos 100% do seu dinheiro, sem perguntas." },
  ];

  const painPoints = [
    { emoji: "💸", text: "Pagar R$300 a R$1.000 por sessão de fotos" },
    { emoji: "🚗", text: "Se deslocar até um estúdio fotográfico" },
    { emoji: "👔", text: "Comprar roupas novas para cada ensaio" },
    { emoji: "🤖", text: "Escrever prompts complexos para gerar imagens" },
    { emoji: "📸", text: "Depender de fotógrafo e equipamento caro" },
  ];

  const includedItems = [
    "56 fotos (4.500 créditos)",
    "Biblioteca com +300 referências profissionais",
    "Curso de apresentação da ferramenta",
    "Upscaler gratuito para melhorar imagens",
    "Acesso a todas as ferramentas de IA",
    "Suporte exclusivo via WhatsApp",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] font-space-grotesk">

      {/* ==================== HERO ==================== */}
      <section className="px-4 md:px-6 pt-12 md:pt-20 pb-10 md:pb-16 w-full">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">

          {/* Background grid placeholder */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 p-4 blur-sm">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-xl bg-gradient-to-br from-fuchsia-600/30 to-purple-800/30" />
              ))}
            </div>
          </div>

          {/* Social proof badge */}
          <FadeIn delay={100} duration={600}>
            <div className="relative inline-flex items-center gap-2.5 bg-white/[0.07] border border-white/10 rounded-full px-4 py-2 mb-5 md:mb-6">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 border-2 border-[#0f0a15]" />
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 border-2 border-[#0f0a15]" />
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 border-2 border-[#0f0a15]" />
              </div>
              <span className="text-white/80 text-xs font-medium">+5.000 pessoas já estão usando</span>
            </div>
          </FadeIn>

          {/* Headline */}
          <h1 className="relative font-space-grotesk font-bold text-2xl md:text-4xl lg:text-5xl text-white mb-3 md:mb-4 leading-[1.2]">
            Crie ensaios fotográficos{" "}
            <br className="hidden md:block" />
            profissionais com IA{" "}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">
              sem prompt, sem complicação
            </span>
          </h1>

          {/* Subtitle */}
          <FadeIn delay={300} duration={700}>
            <p className="relative text-sm md:text-base text-white/60 mb-6 md:mb-8 max-w-lg leading-relaxed mx-auto">
              Basta subir sua foto e escolher a referência.{" "}
              <span className="text-fuchsia-400 font-semibold">Resultado pronto em segundos.</span>
            </p>
          </FadeIn>

          {/* CTA removed - price shown only in pricing section */}

          {/* Trust badges */}
          <FadeIn delay={600} duration={700}>
            <div className="relative flex flex-wrap justify-center items-center gap-3 mt-6 md:gap-0 md:divide-x md:divide-white/10">
              <div className="flex items-center gap-1.5 text-white/60 text-xs px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
                <span>Sem prompt</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/60 text-xs px-3 py-1">
                <Clock className="h-3.5 w-3.5 text-fuchsia-400" />
                <span>Pronto em segundos</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/60 text-xs px-3 py-1">
                <MousePointerClick className="h-3.5 w-3.5 text-fuchsia-400" />
                <span>Fácil de usar</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ==================== PAIN POINTS ==================== */}
      <AnimatedSection className="px-3 md:px-4 py-16 md:py-20 bg-black/30">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection as="div" className="text-center" delay={100}>
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-8 md:mb-12">
              Chega de...
            </h2>
          </AnimatedSection>

          <StaggeredAnimation className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" staggerDelay={100}>
            {painPoints.map((pain, index) => (
              <div key={index} className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 text-center hover:border-red-500/30 transition-all duration-300 flex flex-col items-center justify-center min-h-[140px]">
                <div className="text-4xl md:text-5xl mb-4">{pain.emoji}</div>
                <p className="text-white/80 text-base md:text-lg">{pain.text}</p>
              </div>
            ))}
          </StaggeredAnimation>

          <AnimatedSection as="div" delay={400}>
            <div className="mt-10 md:mt-12 bg-gradient-to-r from-fuchsia-500/10 to-purple-600/10 border border-fuchsia-500/30 rounded-3xl p-8 text-center">
              <Sparkles className="h-8 w-8 text-fuchsia-400 mx-auto mb-4" />
              <p className="text-xl md:text-2xl text-white font-semibold">
                Com o <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">Arcano Cloner</span> você resolve tudo isso
              </p>
              <p className="text-white/60 mt-2">Sem estúdio. Sem fotógrafo. Sem prompt. Sem complicação.</p>
            </div>
          </AnimatedSection>
        </div>
      </AnimatedSection>

      {/* ==================== GALLERY ==================== */}
      <AnimatedSection className="px-4 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection as="div" delay={100}>
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-3">
              Veja o que o Arcano Cloner é{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">capaz de fazer</span>
            </h2>
            <p className="text-white/50 text-center text-sm mb-10">Todas as imagens abaixo foram geradas com a ferramenta</p>
          </AnimatedSection>

          <StaggeredAnimation className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6" staggerDelay={100}>
            {galleryItems.map((item, index) => (
              <div key={index} className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-fuchsia-600/20 via-purple-700/20 to-indigo-800/20 border border-white/10 hover:border-fuchsia-500/40 transition-all duration-300">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image className="h-12 w-12 text-white/20" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <span className="text-white text-sm font-medium">{item.label}</span>
                </div>
              </div>
            ))}
          </StaggeredAnimation>
        </div>
      </AnimatedSection>

      {/* ==================== HOW IT WORKS ==================== */}
      <AnimatedSection className="px-4 py-16 md:py-20 bg-black/30">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection as="div" delay={100}>
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-3">
              Simples assim.{" "}
              <span className="text-fuchsia-400">Sem prompt. Sem complicação.</span>
            </h2>
            <p className="text-white/50 text-center text-sm mb-12">4 passos e seu ensaio está pronto</p>
          </AnimatedSection>

          <StaggeredAnimation className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" staggerDelay={150}>
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="text-center flex flex-col items-center relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg mb-4 shadow-lg shadow-fuchsia-500/30">
                    {index + 1}
                  </div>
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/30 flex items-center justify-center mb-5">
                    <IconComponent className="h-10 w-10 text-fuchsia-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-white/60 text-sm max-w-[200px]">{step.description}</p>
                </div>
              );
            })}
          </StaggeredAnimation>
        </div>
      </AnimatedSection>

      {/* ==================== ENGINE / NANOBANANA PRO ==================== */}
      <AnimatedSection className="px-4 py-16 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full px-5 py-2 mb-6">
            <Zap className="h-4 w-4 text-fuchsia-400" />
            <span className="text-fuchsia-300 text-sm font-semibold">Powered by NanoBanana Pro</span>
          </div>
          <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl text-white mb-4">
            O motor de geração de imagens{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">mais avançado do mercado</span>
          </h2>
          <p className="text-white/60 max-w-xl mx-auto">
            Tecnologia de ponta que garante resultados fotorrealistas em poucos segundos. Qualidade profissional sem precisar de nenhum conhecimento técnico.
          </p>
        </div>
      </AnimatedSection>

      {/* ==================== BONUS HEADER ==================== */}
      <AnimatedSection className="px-4 pt-16 md:pt-20 pb-6 bg-black/30">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection as="div" delay={100}>
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-3">
              E tem <span className="text-fuchsia-400">bônus</span> 🎁
            </h2>
            <p className="text-white/50 text-center text-sm mb-2">Ao adquirir o Arcano Cloner, você leva de bônus:</p>
          </AnimatedSection>
        </div>
      </AnimatedSection>

      {/* ==================== BONUS 1: +300 REFERÊNCIAS ==================== */}
      <AnimatedSection className="px-4 py-10 md:py-14 bg-black/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full px-4 py-1.5 mb-4">
              <BookOpen className="h-4 w-4 text-fuchsia-400" />
              <span className="text-fuchsia-300 text-sm font-semibold">BÔNUS 01</span>
            </div>
            <h3 className="font-space-grotesk font-bold text-xl md:text-2xl text-white mb-2">
              +300 Referências <span className="text-fuchsia-400">Profissionais</span>
            </h3>
            <p className="text-white/50 text-sm max-w-lg mx-auto">Biblioteca completa com fotos de referência prontas para usar na geração de imagens</p>
          </div>

          {/* Infinite marquee carousel */}
          <div className="relative overflow-hidden">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-[#0a0510] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-[#0a0510] to-transparent z-10 pointer-events-none" />

            <div className="flex gap-4 animate-marquee-scroll">
              {/* Duplicate items for infinite scroll */}
              {[...Array(2)].map((_, setIndex) => (
                <div key={setIndex} className="flex gap-4 shrink-0">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={`${setIndex}-${i}`}
                      className="w-[140px] md:w-[180px] shrink-0 aspect-[3/4] rounded-2xl bg-gradient-to-br from-fuchsia-600/20 via-purple-700/15 to-indigo-800/20 border border-purple-500/20 overflow-hidden flex items-center justify-center"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Camera className="h-8 w-8 text-white/15" />
                        <span className="text-white/20 text-xs">Ref {i + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ==================== BONUS 2: CURSO ==================== */}
      <AnimatedSection className="px-4 py-10 md:py-14 bg-black/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full px-4 py-1.5 mb-4">
              <Play className="h-4 w-4 text-fuchsia-400" />
              <span className="text-fuchsia-300 text-sm font-semibold">BÔNUS 02</span>
            </div>
            <h3 className="font-space-grotesk font-bold text-xl md:text-2xl text-white mb-2">
              Curso de <span className="text-fuchsia-400">Apresentação</span>
            </h3>
            <p className="text-white/50 text-sm max-w-lg mx-auto">Vídeos explicativos para você dominar a ferramenta em minutos</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Lesson cards */}
            <div className="space-y-4">
              {[
                {
                  badge: "Aula 01",
                  title: "Introdução ao Arcano Cloner",
                  topics: ["Como acessar a ferramenta", "Visão geral do painel", "Primeiros passos"]
                },
                {
                  badge: "Aula 02",
                  title: "Gerando sua primeira foto",
                  topics: ["Enviando sua foto", "Escolhendo referência", "Ajustando configurações"]
                },
                {
                  badge: "Aula 03",
                  title: "Dicas para melhores resultados",
                  topics: ["Fotos ideais para envio", "Usando o Upscaler", "Truques avançados"]
                }
              ].map((lesson, index) => (
                <div key={index} className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 hover:border-fuchsia-500/30 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/30 flex items-center justify-center shrink-0">
                      <Video className="h-5 w-5 text-fuchsia-400" />
                    </div>
                    <div className="flex-1">
                      <span className="inline-block text-xs font-semibold text-fuchsia-400 bg-fuchsia-500/10 px-2.5 py-0.5 rounded-full mb-2">{lesson.badge}</span>
                      <h4 className="text-white font-semibold text-base mb-2">{lesson.title}</h4>
                      <ul className="space-y-1">
                        {lesson.topics.map((topic, ti) => (
                          <li key={ti} className="flex items-center gap-2 text-white/50 text-sm">
                            <div className="w-1 h-1 rounded-full bg-fuchsia-400 shrink-0" />
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Course preview placeholder */}
            <div className="aspect-[4/3] lg:aspect-auto rounded-2xl bg-gradient-to-br from-fuchsia-600/15 via-purple-700/10 to-indigo-800/15 border border-purple-500/30 overflow-hidden flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center">
                  <Play className="h-8 w-8 text-fuchsia-400 ml-1" />
                </div>
                <span className="text-white/30 text-sm">Preview do Curso</span>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ==================== BONUS 3: UPSCALER GRATUITO ==================== */}
      <AnimatedSection className="px-4 py-10 md:py-14 pb-16 md:pb-20 bg-black/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full px-4 py-1.5 mb-4">
              <Gift className="h-4 w-4 text-fuchsia-400" />
              <span className="text-fuchsia-300 text-sm font-semibold">BÔNUS 03</span>
            </div>
            <h3 className="font-space-grotesk font-bold text-xl md:text-2xl text-white mb-2">
              Upscaler gratuito para <span className="text-fuchsia-400">suas imagens</span>
            </h3>
            <p className="text-white/50 text-sm max-w-lg mx-auto">Melhore a qualidade de qualquer imagem com nosso upscaler de IA incluso</p>
          </div>

          <HeroBeforeAfterSlider
            beforeImage={isMobile ? UPSCALER_BEFORE_IMAGE_MOBILE : UPSCALER_BEFORE_IMAGE_DESKTOP}
            afterImage={isMobile ? UPSCALER_AFTER_IMAGE_MOBILE : UPSCALER_AFTER_IMAGE_DESKTOP}
            locale="pt"
          />
        </div>
      </AnimatedSection>

      {/* ==================== PRICING ==================== */}
      <div id="pricing-section">
        <AnimatedSection className="px-3 md:px-4 py-16 md:py-20 bg-black/30" animation="scale">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-2">
                Tudo isso por <span className="text-fuchsia-400">apenas</span>
              </h2>
              <p className="text-white/60 text-sm">Pagamento único — sem mensalidade</p>
            </div>

            {/* Countdown */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <span className="text-purple-300 text-sm">Essa oferta expira em</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-red-500" />
                <div className="flex items-center gap-0.5">
                  <div className="bg-red-950/80 border border-red-500/30 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                    <span className="text-red-400 font-mono font-bold text-xs">{countdown.hours}</span>
                  </div>
                  <span className="text-red-400 font-bold text-xs">:</span>
                  <div className="bg-red-950/80 border border-red-500/30 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                    <span className="text-red-400 font-mono font-bold text-xs">{countdown.minutes}</span>
                  </div>
                  <span className="text-red-400 font-bold text-xs">:</span>
                  <div className="bg-red-950/80 border border-red-500/30 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                    <span className="text-red-400 font-mono font-bold text-xs">{countdown.seconds}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Single pricing card */}
            <Card className="relative p-8 flex flex-col rounded-xl bg-[#1A0A2E] border-2 border-fuchsia-500/50 shadow-lg shadow-fuchsia-500/20">
              {/* Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white px-4 py-1 text-sm font-bold rounded-full">
                  OFERTA ESPECIAL
                </Badge>
              </div>

              <div className="text-center mb-6 mt-2">
                <h3 className="text-xl font-bold text-white">Arcano Cloner</h3>
                <p className="text-sm text-purple-400 mt-0.5">Gere ensaios fotográficos com IA</p>
              </div>

              <div className="text-center mb-6">
                <div className="text-purple-400 text-sm line-through mb-1">R$ 97,00</div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-purple-400 text-lg">R$</span>
                  <span className="text-5xl font-bold text-white">47,00</span>
                </div>
                <p className="text-purple-400 text-base mt-1">Pagamento único</p>
              </div>

              <Button
                onClick={handlePurchase}
                className="w-full mb-6 text-lg h-14 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white font-bold rounded-full shadow-xl shadow-fuchsia-500/30 transition-all duration-300 hover:scale-[1.02]"
              >
                COMPRAR AGORA
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>

              <div className="flex flex-col items-center mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium text-white bg-gradient-to-r from-fuchsia-600 to-purple-600">
                  <Sparkles className="w-4 h-4" />
                  56 fotos incluídas
                </span>
                <span className="text-sm text-purple-400 mt-1">4.500 créditos</span>
              </div>

              <ul className="space-y-3">
                {includedItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-base">
                    <Check className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                    <span className="text-purple-200">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Trust badges */}
            <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
              <span className="flex items-center gap-1.5 bg-white/5 text-white/70 text-xs px-3 py-1.5 rounded-full border border-white/10">
                <Shield className="h-3 w-3 text-green-400" />
                Pagamento seguro
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 text-white/70 text-xs px-3 py-1.5 rounded-full border border-white/10">
                <Zap className="h-3 w-3 text-yellow-400" />
                Acesso imediato
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 text-white/70 text-xs px-3 py-1.5 rounded-full border border-white/10">
                <Shield className="h-3 w-3 text-fuchsia-400" />
                7 dias de garantia
              </span>
            </div>
          </div>
        </AnimatedSection>
      </div>

      {/* ==================== GUARANTEE ==================== */}
      <AnimatedSection className="px-4 py-16 md:py-20">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/30 rounded-3xl p-8 md:p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl text-white mb-4">
              Garantia incondicional de{" "}
              <span className="text-green-400">7 dias</span>
            </h2>
            <p className="text-white/60 max-w-md mx-auto">
              Se dentro de 7 dias você não gostar do Arcano Cloner por qualquer motivo, basta nos enviar uma mensagem e devolveremos 100% do seu dinheiro. Sem perguntas, sem burocracia.
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* ==================== FREE TRIAL (Visual Mockup) ==================== */}
      <AnimatedSection className="px-4 py-16 md:py-20 bg-black/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl text-white mb-3">
            Quer <span className="text-fuchsia-400">testar antes</span> de comprar?
          </h2>
          <p className="text-white/50 text-sm mb-8">Faça um teste gratuito do Arcano Cloner e veja o resultado por conta própria</p>

          {/* Blurred mockup */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 aspect-video max-w-lg mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/20 to-purple-800/20 flex items-center justify-center blur-sm">
              <div className="grid grid-cols-2 gap-3 p-8 w-full">
                <div className="aspect-[3/4] rounded-xl bg-white/10" />
                <div className="aspect-[3/4] rounded-xl bg-white/10" />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Button
                onClick={scrollToPricing}
                className="bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white font-bold rounded-full px-8 py-6 text-lg shadow-xl shadow-fuchsia-500/30"
              >
                Fazer Teste Grátis
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
          <p className="text-white/30 text-xs mt-3">* Verificação por email necessária</p>
        </div>
      </AnimatedSection>

      {/* ==================== FAQ ==================== */}
      <AnimatedSection className="px-4 py-16 md:py-20">
        <div className="max-w-2xl mx-auto">
          <AnimatedSection as="div" delay={100}>
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-12">
              Perguntas{" "}
              <span className="text-fuchsia-400">frequentes</span>
            </h2>
          </AnimatedSection>

          <AnimatedSection as="div" delay={200}>
            <Accordion type="single" collapsible className="space-y-4">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-white/5 border border-white/10 rounded-2xl px-6 data-[state=open]:border-fuchsia-500/30"
                >
                  <AccordionTrigger className="text-white text-left text-lg font-medium py-5 hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70 pb-5">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </AnimatedSection>
        </div>
      </AnimatedSection>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-white/10 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-4">
          <img src={logoHorizontal} alt="ArcanoApp" className="h-7 w-auto opacity-70" />
          <p className="text-white/40 text-xs">© 2026 Arcano App. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default PlanosArcanoCloner;
