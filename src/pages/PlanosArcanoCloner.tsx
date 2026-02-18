import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, ArrowRight, Shield, Clock, Star, Zap, Upload, Image, Sparkles, Camera, MousePointerClick, BookOpen, Gift, Play, Maximize, ChevronDown, Video, DollarSign, Car, Shirt, Bot, CameraOff, Briefcase, Music, User, Rocket, Share2 } from "lucide-react";
import { AnimatedSection, AnimatedElement, StaggeredAnimation, FadeIn } from "@/hooks/useScrollAnimation";
import { appendUtmToUrl } from "@/lib/utmUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeroBeforeAfterSlider } from "@/components/upscaler";
import logoHorizontal from "@/assets/logo_horizontal.png";
import ExpandingGallery from "@/components/combo-artes/ExpandingGallery";
import HeroCarouselBackground from "@/components/combo-artes/HeroCarouselBackground";
import ClonerTrialSection from "@/components/arcano-cloner/trial/ClonerTrialSection";
import ClonerDemoAnimation from "@/components/arcano-cloner/ClonerDemoAnimation";

const UPSCALER_BEFORE_IMAGE_DESKTOP = "/images/upscaler-hero-antes.webp";
const UPSCALER_AFTER_IMAGE_DESKTOP = "/images/upscaler-hero-depois.webp";
const UPSCALER_BEFORE_IMAGE_MOBILE = "/images/upscaler-hero-antes-mobile.webp";
const UPSCALER_AFTER_IMAGE_MOBILE = "/images/upscaler-hero-depois-mobile.webp";

const CHECKOUT_URL = "https://payfast.greenn.com.br/y3u2u3d";

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
        value: 39.90,
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
        value: 39.90,
        currency: 'BRL'
      });
    }
    window.open(appendUtmToUrl(CHECKOUT_URL), "_blank");
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
    { question: "Quantas fotos posso gerar?", answer: "Com o plano de R$ 39,90 você recebe 4.200 créditos, o que equivale a aproximadamente 70 fotos geradas." },
    { question: "Como funciona a biblioteca de referências?", answer: "Você terá acesso a mais de 300 fotos de referência profissionais organizadas por categoria (corporativo, fashion, lifestyle, etc). Basta escolher uma referência e gerar." },
    { question: "O que é o Upscaler bônus?", answer: "É uma ferramenta gratuita inclusa que melhora a qualidade e resolução das suas imagens geradas, tornando-as ainda mais profissionais." },
    { question: "Tem garantia?", answer: "Sim! Oferecemos garantia incondicional de 7 dias. Se não gostar, devolvemos 100% do seu dinheiro, sem perguntas." },
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
          <div className="w-[400px] h-[500px] md:w-[600px] md:h-[700px] bg-fuchsia-600/50 blur-[150px] md:blur-[200px] rounded-full" />
        </div>

        {/* Layer 3: Hero PNG image - LARGE, centered */}
        <div className="absolute inset-0 z-[10] flex items-center justify-center pointer-events-none">
          <img 
            src="/images/arcano-cloner-hero.webp?v=4" 
            alt="Arcano Cloner" 
            className="w-[415px] md:w-[450px] lg:w-[520px] h-auto object-contain drop-shadow-2xl -translate-y-[10%] md:-translate-y-[5%]"
          />
        </div>

        {/* Layer 4: Bottom gradient overlay (above photo, below text) */}
        <div className="absolute inset-0 z-[15] pointer-events-none bg-gradient-to-t from-[#0f0a15] via-[#0f0a15]/50 to-transparent" style={{ top: '50%' }} />

        {/* Layer 5: Text content - overlaps bottom of photo */}
        <div className="relative z-[20] flex flex-col items-center justify-end text-center h-screen px-4 md:px-6 pb-28 md:pb-16 pt-12">

          <div className="mt-auto flex flex-col items-center">
            {/* Social proof badge */}
            <FadeIn delay={100} duration={600}>
              <div className="inline-flex items-center gap-2.5 bg-white/[0.07] border border-white/10 rounded-full px-4 py-2 mb-5 md:mb-6">
                <div className="flex -space-x-2">
                  <img src="/images/social-proof-1.png" alt="" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                  <img src="/images/social-proof-2.png" alt="" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                  <img src="/images/social-proof-3.png" alt="" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                </div>
                <span className="text-white/80 text-xs font-medium">+5.000 pessoas já estão usando</span>
              </div>
            </FadeIn>

            {/* Headline */}
            <h1 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white mb-3 md:mb-4 leading-[1.2]">
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
              <p className="text-sm md:text-base text-white/60 mb-6 md:mb-8 max-w-lg leading-relaxed mx-auto">
                Basta subir sua foto e escolher a referência.{" "}
                <span className="text-fuchsia-400 font-semibold">Resultado pronto em segundos.</span>
              </p>
            </FadeIn>

            {/* Trust badges */}
            <FadeIn delay={600} duration={700}>
              <div className="flex flex-wrap justify-center items-center gap-3 md:gap-0 md:divide-x md:divide-white/10">
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

          <StaggeredAnimation className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-fr" staggerDelay={100}>
            {painPoints.map((pain, index) => {
              const IconComp = pain.icon;
              return (
                <div key={index} className={`bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 text-center hover:border-purple-500/30 transition-all duration-300 flex flex-col items-center justify-center h-full${index === 0 ? ' hidden sm:flex' : ''}`}>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 shrink-0">
                    <IconComp className="h-6 w-6 text-purple-400" />
                  </div>
                  <p className="text-white/80 text-base md:text-lg">{pain.text}</p>
                </div>
              );
            })}
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

          <ExpandingGallery items={galleryItems} />

          <div className="mt-10 flex flex-nowrap justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full px-3 py-1.5 shrink-0">
              <Zap className="h-3 w-3 text-fuchsia-400 shrink-0" />
              <span className="text-fuchsia-300 text-[11px] font-medium whitespace-nowrap">Motor de IA</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full px-3 py-1.5 shrink-0">
              <MousePointerClick className="h-3 w-3 text-fuchsia-400 shrink-0" />
              <span className="text-fuchsia-300 text-[11px] font-medium whitespace-nowrap">Sem Prompt</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full px-3 py-1.5 shrink-0">
              <Clock className="h-3 w-3 text-fuchsia-400 shrink-0" />
              <span className="text-fuchsia-300 text-[11px] font-medium whitespace-nowrap">Em Segundos</span>
            </div>
          </div>
          <p className="text-white/50 text-center text-sm mt-4 max-w-xl mx-auto">
            Tecnologia de ponta que garante resultados fotorrealistas em poucos segundos. Qualidade profissional sem precisar de nenhum conhecimento técnico.
          </p>
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

          <ClonerDemoAnimation />
        </div>
      </AnimatedSection>

      {/* ==================== PARA QUEM É ==================== */}
      <AnimatedSection className="px-4 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection as="div" delay={100}>
            <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-3">
              Quem já está{" "}
              <span className="text-fuchsia-400">lucrando e se destacando</span>{" "}
              com o Arcano Cloner
            </h2>
            <p className="text-white/50 text-center text-sm mb-12">
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
                <div key={index} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center h-full">
                  <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center mb-4">
                    <IconComp className="w-7 h-7 text-fuchsia-400" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{item.text}</p>
                </div>
              );
            })}
          </StaggeredAnimation>
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
          <style>{`
            @keyframes marquee-refs {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .marquee-refs-track {
              animation: marquee-refs 6s linear infinite;
              will-change: transform;
            }
            @media (min-width: 768px) {
              .marquee-refs-track {
                animation-duration: 30s;
              }
            }
          `}</style>
          <div className="relative overflow-hidden">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-[#0a0510] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-[#0a0510] to-transparent z-10 pointer-events-none" />

            <div className="marquee-refs-track flex gap-4" style={{ animationDuration: '15s' }}>
              {/* Flat list: 8 originals + 8 duplicates — translateX(-50%) aligns perfectly */}
              {[...Array.from({ length: 8 }, (_, i) => i), ...Array.from({ length: 8 }, (_, i) => i)].map((i, idx) => (
                <div
                  key={idx}
                  className="w-[196px] md:w-[180px] shrink-0 aspect-[3/4] rounded-2xl border border-purple-500/20 overflow-hidden"
                >
                  <img
                    src={`/images/refs/ref-${i + 1}.jpg`}
                    alt={`Referência profissional ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ==================== BONUS 2: UPSCALER GRATUITO ==================== */}
      <AnimatedSection className="px-4 py-10 md:py-14 pb-16 md:pb-20 bg-black/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full px-4 py-1.5 mb-4">
              <Gift className="h-4 w-4 text-fuchsia-400" />
              <span className="text-fuchsia-300 text-sm font-semibold">BÔNUS 02</span>
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
                  <span className="text-5xl font-bold text-white">39,90</span>
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
                  ~70 fotos incluídas
                </span>
                <span className="text-sm text-purple-400 mt-1">4.200 créditos</span>
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

      {/* ==================== FREE TRIAL (Functional) ==================== */}
      <AnimatedSection className="!p-0">
        <ClonerTrialSection />
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
