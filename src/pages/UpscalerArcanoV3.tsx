import { useEffect, useRef, useState, useCallback, memo } from "react";
import { usePagarmeCheckout } from "@/hooks/usePagarmeCheckout";
import { useGeoRedirect } from "@/hooks/useGeoRedirect";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Rocket, Flame, Crown, Infinity } from "lucide-react";
import "@/styles/upscaler-v3.css";
import { V3TurboCountdown, V3BatchGrid, V3SocialPopup, V3StickyBar, V3GalleryBeforeAfter, V3RealResultCard, V3LazySection, V3PromoCountdownPT, V3SocialProofStrip } from "@/components/upscaler-v3/V3IsolatedComponents";

// Image imports for before/after and gallery
import upscalerFotoAntes from "@/assets/upscaler-foto-antes.webp";
import upscalerFotoDepois from "@/assets/upscaler-foto-depois.webp";
import upscalerSeloAntes from "@/assets/upscaler-selo-antes.webp";
import upscalerSeloDepois from "@/assets/upscaler-selo-depois.webp";
import render3dAntes from "@/assets/render3d-antes.webp";
import render3dDepois from "@/assets/render3d-depois.webp";
import upscalerLogoAntes from "@/assets/upscaler-logo-antes.webp";
import upscalerLogoDepois from "@/assets/upscaler-logo-depois.webp";
import upscalerProdutoAntes from "@/assets/upscaler-produto-antes.webp";
import upscalerProdutoDepois from "@/assets/upscaler-produto-depois.webp";
import upscalerAntigaAntes from "@/assets/upscaler-antiga-antes-v2.webp";
import upscalerAntigaDepois from "@/assets/upscaler-antiga-depois-v2.webp";
import upscalerFoodAntes from "@/assets/upscaler-food-antes.webp";
import upscalerFoodDepois from "@/assets/upscaler-food-depois.webp";
import upscalerHeroAntes from "@/assets/upscaler-hero-antes.webp";
import upscalerHeroDepois from "@/assets/upscaler-hero-depois.webp";
import heroMobileAntes from "@/assets/hero-mobile-antes.webp";
import heroMobileDepois from "@/assets/hero-mobile-depois.webp";

// Gallery images for hero carousel
import galleryBefore2 from "@/assets/upscaler/2a.webp";
import galleryAfter2 from "@/assets/upscaler/2d.webp";
import galleryBefore3 from "@/assets/upscaler/3a.webp";
import galleryAfter3 from "@/assets/upscaler/3d.webp";
import turboBgImage from "@/assets/upscaler-v3-turbo-bg.webp";

// Gallery and RealResult sliders now come from V3IsolatedComponents (DOM-only, no global listeners)

// ── Static data hoisted outside component ──
const heroSlidesDesktop = [
  { before: upscalerHeroAntes, after: upscalerHeroDepois },
];
const heroSlidesMobile = [
  { before: heroMobileAntes, after: heroMobileDepois },
];

const SOCIAL_PEOPLE = [
  { name: "Mariana S.", initial: "M", city: "São Paulo, SP" },
  { name: "Carlos R.", initial: "C", city: "Belo Horizonte, MG" },
  { name: "Rafael T.", initial: "R", city: "Rio de Janeiro, RJ" },
  { name: "Ana Luiza F.", initial: "A", city: "Curitiba, PR" },
  { name: "Wellington P.", initial: "W", city: "Recife, PE" },
  { name: "Juliana M.", initial: "J", city: "Porto Alegre, RS" },
  { name: "Rodrigo L.", initial: "R", city: "Florianópolis, SC" },
  { name: "Clara V.", initial: "C", city: "Brasília, DF" },
  { name: "Fernando A.", initial: "F", city: "Salvador, BA" },
  { name: "Patrícia N.", initial: "P", city: "Fortaleza, CE" },
];
const SOCIAL_TIMES = ["há poucos segundos", "há 1 minuto", "há 2 minutos", "há 3 minutos", "há 5 minutos"];

const galleryItems = [
  { before: upscalerFoodAntes, after: upscalerFoodDepois, label: "Fotos de Alimento", desc: "Corrija artefatos, amplie, refine" },
  { before: upscalerFotoAntes, after: upscalerFotoDepois, label: "Fotos de Ensaio", desc: "Recupere grain, ruído e baixa luz" },
  { before: upscalerProdutoAntes, after: upscalerProdutoDepois, label: "Fotos de Produto", desc: "Catálogos e e-commerce em 4K" },
  { before: render3dAntes, after: render3dDepois, label: "Renders 3D", desc: "Upscale sem perder geometria" },
  { before: upscalerAntigaAntes, after: upscalerAntigaDepois, label: "Fotos Antigas", desc: "Memórias restauradas com IA" },
  { before: upscalerLogoAntes, after: upscalerLogoDepois, label: "Logos e Artes", desc: "Vetores e brandmarks ampliados" },
];

const painCards = [
  { icon: "📱", title: "Foto de celular pixelada", desc: "Tirou a foto perfeita mas saiu granulada e sem resolução" },
  { icon: "😤", title: "Cliente mandou foto horrível", desc: "Baixa qualidade, você não pode usar e o prazo tá apertado" },
  { icon: "📷", title: "Ensaio que ficou granulado", desc: "Luz baixa arruinou sua melhor sessão fotográfica" },
  { icon: "🤖", title: "Imagem de IA que não prestou", desc: "Gerou com IA mas saiu com artefatos e baixa definição" },
  { icon: "💸", title: "Perdeu contrato por imagem ruim", desc: "Cliente foi embora porque você não tinha fotos profissionais" },
  { icon: "🖨️", title: "Artes que ficam ruins na impressão", desc: "Looks bom na tela, pixelado no impresso. Constrangimento total" },
];

const audienceCards = [
  { emoji: "📸", role: "Fotógrafos", desc: "Entregue fotos impecáveis mesmo quando as condições de iluminação não cooperaram." },
  { emoji: "🎨", role: "Designers Gráficos", desc: "Receba foto ruim do cliente. Entregue design que impressiona. O Arcano cobre o gap." },
  { emoji: "📲", role: "Social Media", desc: "Conteúdo visual de alta qualidade que para o scroll e gera engajamento real." },
  { emoji: "🎸", role: "Músicos e Artistas", desc: "Fotos profissionais para contratantes, releases e capa de EP. Sem pagar fotógrafo." },
  { emoji: "💻", role: "Infoprodutores", desc: "Landing pages e campanhas com imagens de alto impacto que convertem mais." },
  { emoji: "✦", role: "Qualquer pessoa", desc: "Foto ruim de viagem, memória familiar, imagem importante. O Arcano resolve." },
];

const testimonials = [
  { text: '"Cliente mandou foto horrível às 18h com entrega pra 21h. Em 3 minutos o Arcano resolveu o que eu levaria 2 horas tentando no Photoshop."', name: "Carlos M.", role: "Designer Gráfico · São Paulo", avatar: "C", gradient: "linear-gradient(135deg,#00D4FF,#7B2FFF)" },
  { text: '"Sou fotógrafo e uso o lote do V3 toda vez. Processo o ensaio inteiro enquanto edito o segundo set. Economizo literalmente horas por semana."', name: "Rafael T.", role: "Fotógrafo · Belo Horizonte", avatar: "R", gradient: "linear-gradient(135deg,#F5C842,#FF6B35)" },
  { text: '"Minhas imagens de campanha de lançamento ficaram profissionais de verdade. As vendas subiram 40% depois que comecei a usar nas landing pages."', name: "Ana Luiza F.", role: "Infoprodutora · Curitiba", avatar: "A", gradient: "linear-gradient(135deg,#00E5A0,#0099CC)" },
];

const faqs = [
  { q: "Preciso pagar mensalidade?", a: "Não. O Upscaler Arcano funciona com acesso vitalício — você paga uma vez e usa para sempre. Sem cobranças recorrentes, sem surpresas." },
  { q: "Funciona com qualquer tipo de imagem?", a: "Sim. Fotos de ensaio, logos, renders 3D, fotos antigas, imagens geradas por IA, alimentos, produtos — o Arcano processa qualquer tipo de imagem." },
  { q: "Quanto tempo leva para processar?", a: "Com o Modo Turbo do V3, menos de 60 segundos por imagem. No lote, você processa até 10 imagens em paralelo ao mesmo tempo." },
  { q: "Os créditos expiram?", a: "Não. Os créditos que você compra ficam na sua conta para sempre. Use no seu próprio ritmo, sem pressão de data de validade." },
  { q: "O que é o Modo Turbo? É igual ao resultado normal?", a: "O Modo Turbo é exclusivo do V3 e entrega o mesmo motor de IA, mesma qualidade 4K, mas em menos de 1 minuto — até 10x mais rápido que o processamento padrão." },
  { q: "Precisa instalar algum programa?", a: "Não. O Upscaler Arcano é 100% online. Acesse direto pelo navegador, sem instalar nada, em qualquer computador." },
];

const realResults = [
  {
    before: "/images/mauricio-antes.webp",
    after: "/images/mauricio-depois.webp",
    name: "Maurício",
    handle: "@ventus.studio",
    text: "Como fotógrafo já perdi inúmeras fotos por saírem desfocadas na hora da correria dos ensaios, e essa ferramenta literalmente me salvou!",
    avatar: "/images/mauricio-avatar.png"
  },
  {
    before: "/images/mariana-antes.webp",
    after: "/images/mariana-depois.webp",
    name: "Mariana Costa",
    handle: "@mari.visualarts",
    text: "Restaurei fotos antigas da minha família que estavam super pixeladas. O resultado ficou lindo, parecia foto nova.",
    avatar: "/images/mariana-avatar.png"
  },
  {
    before: "/images/rodrigo-antes.webp",
    after: "/images/rodrigo-depois.webp",
    name: "Rodrigo Mélius",
    handle: "@melius.arquitetura",
    text: "Nenhuma outra ferramenta que testei conseguiu reproduzir meus projetos com a fidelidade que essa ferramenta faz!",
    avatar: "/images/rodrigo-avatar.png"
  }
];

const depoImages = [
  "/images/depo-v3-1.webp",
  "/images/depo-v3-7.webp",
  "/images/depo-v3-3.webp",
  "/images/depo-v3-4.webp",
  "/images/depo-v3-5.webp",
  "/images/depo-v3-2.webp",
  "/images/depo-v3-6.webp",
  "/images/depo-v3-8.webp",
];

const UpscalerArcanoV3 = () => {
  // Auto-redirect non-Brazilian visitors to ES version
  useGeoRedirect("/upscalerarcanov3-es");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 600;
  });
  const heroSlides = isMobile ? heroSlidesMobile : heroSlidesDesktop;
  const { openCheckout, PagarmeCheckoutModal } = usePagarmeCheckout({ source_page: "upscalerarcanov3" });
  const [platformStats, setPlatformStats] = useState<{ users: number; images: number }>({ users: 7000, images: 16000 });

  // Fetch real platform stats once
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.rpc("get_platform_stats");
        if (data && typeof data === "object") {
          const d = data as any;
          setPlatformStats({
            users: Number(d.total_users) || 7000,
            images: Number(d.total_images) || 16000,
          });
        }
      } catch (e) { /* keep fallback */ }
    })();
  }, []);
  
  // Hero slider refs for direct DOM manipulation (no state rerenders)
  const sliderRef = useRef<HTMLDivElement>(null);
  const afterLayerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const autoRef = useRef(true);
  const autoPctRef = useRef(50);
  const autoDirRef = useRef(-1);

  // Direct DOM update for slider position - NO setState
  const setSliderDOM = useCallback((pct: number) => {
    if (afterLayerRef.current) afterLayerRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    if (handleRef.current) handleRef.current.style.left = `${pct}%`;
  }, []);

  const goToSlide = useCallback((dir: 1 | -1) => {
    setCurrentSlide(prev => (prev + dir + heroSlides.length) % heroSlides.length);
    autoPctRef.current = 50;
    setSliderDOM(50);
    autoRef.current = true;
  }, [setSliderDOM]);

  // Scroll reveal observer — watches for dynamically added .v3-reveal elements (V3LazySection)
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("v3-visible"); }); },
      { threshold: 0.15 }
    );
    const observeAll = () => {
      document.querySelectorAll(".v3-reveal:not(.v3-visible)").forEach((el) => io.observe(el));
    };
    observeAll();
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);

  // Counter animation — re-observes when lazy sections load
  useEffect(() => {
    const observed = new WeakSet<Element>();
    const counterObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !observed.has(e.target)) {
            observed.add(e.target);
            const el = e.target as HTMLElement;
            const target = parseInt(el.dataset.target || "0");
            const suffix = target === 100 ? "%" : "+";
            let current = 0;
            const step = target / 60;
            const timer = setInterval(() => {
              current = Math.min(current + step, target);
              el.textContent = Math.floor(current).toLocaleString("pt-BR") + suffix;
              if (current >= target) clearInterval(timer);
            }, 25);
            counterObs.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
    const observeCounters = () => {
      document.querySelectorAll("[data-target]").forEach((el) => {
        if (!observed.has(el)) counterObs.observe(el);
      });
    };
    observeCounters();
    const mo = new MutationObserver(() => observeCounters());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { counterObs.disconnect(); mo.disconnect(); };
  }, []);

  // Staggered delays — re-applies when lazy sections load
  useEffect(() => {
    const applyDelays = () => {
      document.querySelectorAll(".v3-pain-card").forEach((el, i) => { (el as HTMLElement).style.transitionDelay = i * 0.08 + "s"; });
      document.querySelectorAll(".v3-step").forEach((el, i) => { (el as HTMLElement).style.transitionDelay = i * 0.15 + "s"; });
      document.querySelectorAll(".v3-gallery-item").forEach((el, i) => { (el as HTMLElement).style.transitionDelay = i * 0.08 + "s"; });
      document.querySelectorAll(".v3-audience-card").forEach((el, i) => { (el as HTMLElement).style.transitionDelay = i * 0.08 + "s"; });
      document.querySelectorAll(".v3-testimonial").forEach((el, i) => { (el as HTMLElement).style.transitionDelay = i * 0.1 + "s"; });
      document.querySelectorAll(".v3-plan").forEach((el, i) => { (el as HTMLElement).style.transitionDelay = i * 0.1 + "s"; });
    };
    applyDelays();
    const mo = new MutationObserver(() => applyDelays());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  // Auto-slide using direct DOM - NO setState
  // Mobile: one-shot intro animation 100% -> 50% (1.5s) when slider enters viewport.
  // Desktop: continuous gentle oscillation.
  useEffect(() => {
    const isSmall = window.innerWidth <= 600;

    if (isSmall) {
      // Mobile intro animation
      autoPctRef.current = 100;
      setSliderDOM(100);
      const el = sliderRef.current;
      if (!el) return;
      let started = false;
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          const start = performance.now();
          const from = 100, to = 50, dur = 1500;
          const tick = (now: number) => {
            if (!autoRef.current) return;
            const t = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const pct = from + (to - from) * eased;
            autoPctRef.current = pct;
            setSliderDOM(pct);
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          obs.disconnect();
        }
      }, { threshold: 0.4 });
      obs.observe(el);
      return () => obs.disconnect();
    }

    // Desktop continuous slide
    autoRef.current = true;
    let raf: number;
    const autoSlide = () => {
      if (!autoRef.current) return;
      autoPctRef.current += autoDirRef.current * 0.4;
      if (autoPctRef.current <= 15) autoDirRef.current = 1;
      if (autoPctRef.current >= 85) autoDirRef.current = -1;
      setSliderDOM(autoPctRef.current);
      raf = requestAnimationFrame(autoSlide);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(autoSlide); }, 1500);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [setSliderDOM]);

  const updateSlider = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 5), 95);
    autoPctRef.current = pct;
    setSliderDOM(pct);
  }, [setSliderDOM]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (draggingRef.current) updateSlider(e.clientX); };
    const onUp = () => { draggingRef.current = false; };
    const onTouchMove = (e: TouchEvent) => { if (draggingRef.current) updateSlider(e.touches[0].clientX); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); window.removeEventListener("touchmove", onTouchMove); window.removeEventListener("touchend", onUp); };
  }, [updateSlider]);

  const stopAuto = () => { autoRef.current = false; };

  const scrollToPrice = useCallback(() => {
    const el = document.getElementById("v3-pricing");
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 20;
      // Instant scroll on mobile for perceived speed
      window.scrollTo({ top: y, behavior: window.innerWidth <= 600 ? "auto" : "smooth" });
    }
  }, []);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 600);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <>
      <div className="v3-page">
        {/* SOCIAL POPUP - isolated component */}

        {/* HERO */}
        <section className="v3-hero">
          <div className="v3-hero-badge">
            <span style={{ animation: "v3Blink 1.5s infinite" }}>●</span> &nbsp;Versão 3 disponível agora
          </div>
          <h1 className="v3-hero-title-sm">
            <span className="v3-hero-title-desktop">Saia de um resultado amador para<br /><em>profissional com apenas um clique.</em></span>
            <span className="v3-hero-title-mobile">De amador a <em>profissional com um clique</em></span>
          </h1>
          {/* BEFORE/AFTER SLIDER CAROUSEL */}
          <div className="v3-slider-wrapper">
            <div className="v3-slider-label">
              <span style={{ color: "var(--red)" }}>← Antes: baixa qualidade</span>
              <span style={{ color: "var(--cyan)" }}>Depois: 4K nítido →</span>
            </div>
            <div style={{ position: "relative" }}>
              <div
                className="v3-before-after"
                ref={sliderRef}
                onMouseDown={(e) => { draggingRef.current = true; stopAuto(); updateSlider(e.clientX); }}
                onTouchStart={(e) => { draggingRef.current = true; stopAuto(); updateSlider(e.touches[0].clientX); }}
              >
                <div className="v3-ba-layer">
                  <img src={heroSlides[currentSlide].before} alt="Antes - baixa qualidade" width={720} height={401} loading="eager" decoding="async" fetchPriority="high" />
                </div>
                <div className="v3-ba-layer" ref={afterLayerRef} style={{ clipPath: "inset(0 50% 0 0)" }}>
                  <img src={heroSlides[currentSlide].after} alt="Depois - qualidade 4K" width={720} height={400} loading="eager" decoding="async" fetchPriority="high" />
                </div>
                <div className="v3-drag-handle" ref={handleRef} style={{ left: "50%" }}>
                  <div className="v3-drag-circle">⟺</div>
                </div>
                <div className="v3-drag-hint">⟺ Arraste para comparar</div>
              </div>
              <button onClick={() => goToSlide(-1)} className="v3-carousel-arrow v3-carousel-arrow-left" aria-label="Anterior">‹</button>
              <button onClick={() => goToSlide(1)} className="v3-carousel-arrow v3-carousel-arrow-right" aria-label="Próximo">›</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentSlide(i); autoPctRef.current = 50; setSliderDOM(50); }}
                  style={{
                    width: i === currentSlide ? 24 : 8, height: 8, borderRadius: 100, border: "none",
                    background: i === currentSlide ? "var(--cyan)" : "rgba(255,255,255,0.2)",
                    cursor: "pointer", transition: "all 0.3s ease",
                  }}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Real-time social proof strip */}
          <V3SocialProofStrip />

          <p className="v3-hero-sub" style={{ textAlign: "center", marginTop: 24 }}>Simples, Rápido e Fácil de usar com o resultado impecável.</p>



          <div className="v3-hero-cta-desktop" style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
            <button className="v3-btn-primary" onClick={scrollToPrice} style={{ display: "inline-flex" }}>
              Quero o Upscaler Arcano V3 <span>→</span>
            </button>
          </div>
        </section>

        {/* JÁ PASSOU POR ISSO? */}
        <section className="v3-audience">
          <div className="v3-audience-inner">
            <div className="v3-section-tag">pra quem é?</div>
            <div className="v3-section-title" style={{ marginBottom: 48 }}>Se você já passou por isso,<br /><span>o Upscaler Arcano é pra você!</span></div>
            <div className="v3-audience-grid">
              {[
                { emoji: "📱", desc: <>Tirou foto com o celular e <strong>ficou ruim</strong>?</> },
                { emoji: "😤", desc: <>Recebeu foto do cliente em <strong>baixa qualidade</strong>?</> },
                { emoji: "📷", desc: <>Fez uma sessão perfeita mas a foto ficou <strong>granulada e em baixa qualidade</strong>?</> },
                { emoji: "🤖", desc: <>Gerou imagem com IA mas <strong>não ficou boa</strong>?</> },
                { emoji: "🎸", desc: <>Deixou de fechar um contrato grande porque <strong>não tinha fotos profissionais</strong>?</> },
              ].map((card, i) => (
                <div key={i} className="v3-audience-card v3-reveal">
                  <span className="v3-audience-emoji">{card.emoji}</span>
                  <div className="v3-audience-desc">{card.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <V3LazySection minHeight={600}>
        <section style={{ padding: "100px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div className="v3-section-tag">Como funciona</div>
            <div className="v3-section-title">3 passos.<br /><span>Resultado profissional.</span></div>
            <div className="v3-steps">
              <div className="v3-step v3-reveal">
                <div className="v3-step-num">1</div>
                <div className="v3-step-icon-area">
                  <div className="v3-upload-anim">
                    <div className="v3-upload-box">📤 &nbsp;Solte sua imagem aqui</div>
                    <div className="v3-upload-files">
                      <div className="v3-upload-file">foto.jpg</div>
                      <div className="v3-upload-file">logo.png</div>
                      <div className="v3-upload-file">render.png</div>
                    </div>
                  </div>
                </div>
                <div className="v3-step-title">Faça upload</div>
                <div className="v3-step-desc">Qualquer formato. Qualquer resolução. Até 10 imagens de uma vez no V3.</div>
              </div>
              <div className="v3-step v3-reveal">
                <div className="v3-step-num">2</div>
                <div className="v3-step-icon-area">
                  <div className="v3-process-anim">
                    <div className="v3-process-ring" />
                    <div className="v3-process-bar-wrap"><div className="v3-process-bar" /></div>
                    <div className="v3-process-label">IA PROCESSANDO...</div>
                  </div>
                </div>
                <div className="v3-step-title">A IA trabalha</div>
                <div className="v3-step-desc">Motor exclusivo de IA analisa, amplia e refina cada detalhe da imagem.</div>
              </div>
              <div className="v3-step v3-reveal">
                <div className="v3-step-num">3</div>
                <div className="v3-step-icon-area">
                  <div className="v3-download-anim">
                    <div className="v3-download-check">✓</div>
                    <div className="v3-download-label">PRONTO EM 60s</div>
                    <div className="v3-download-quality">Qualidade <span>4K</span></div>
                  </div>
                </div>
                <div className="v3-step-title">Baixe em 4K</div>
                <div className="v3-step-desc">Sua imagem transformada. Individual ou em lote. Download imediato.</div>
              </div>
            </div>
          </div>
        </section>
        </V3LazySection>

        {/* GALLERY */}
        <V3LazySection minHeight={800}>
        <section className="v3-gallery">
          <div className="v3-section-tag">Funciona com tudo</div>
          <div className="v3-section-title" style={{ marginBottom: 40 }}>Melhora imagens<br /><span>de todo tipo</span></div>
          <div className="v3-gallery-grid">
            {galleryItems.map((item, i) => (
              <V3GalleryBeforeAfter key={i} item={item} />
            ))}
          </div>
        </section>
        </V3LazySection>

        {/* SOCIAL PROOF */}
        <V3LazySection minHeight={500}>
        <section className="v3-proof">
          <div className="v3-section-tag">Resultados reais</div>
          <div className="v3-section-title" style={{ marginBottom: 48 }}>Números que<br /><span>falam por si.</span></div>

          <div className="v3-proof-numbers">
            <div className="v3-proof-num-card">
              <div className="v3-proof-number cyan" data-target={platformStats.users}>0</div>
              <div className="v3-proof-num-label">Criadores brasileiros ja usam</div>
            </div>
            <div className="v3-proof-num-card">
              <div className="v3-proof-number gold" data-target={platformStats.images}>0</div>
              <div className="v3-proof-num-label">Imagens melhoradas com sucesso</div>
            </div>
            <div className="v3-proof-num-card">
              <div className="v3-proof-number green" data-target="100">0</div>
              <div className="v3-proof-num-label">% de satisfação dos clientes</div>
            </div>
          </div>

          <div className="v3-depo-grid">
            {depoImages.map((src, i) => (
              <div key={i} className="v3-reveal" style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--card-border)" }}>
                <img src={src} alt={`Depoimento real ${i + 1}`} loading="lazy" style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
            ))}
          </div>
        </section>
        </V3LazySection>

        {/* RESULTADOS REAIS */}
        <V3LazySection minHeight={600}>
        <section className="v3-real-results">
          <div className="v3-real-results-inner">
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <div className="v3-section-tag" style={{ display: "inline-block" }}>Resultados Reais</div>
              <div className="v3-section-title" style={{ marginTop: 12 }}>Veja o que nossos usuários<br /><span>estão alcançando.</span></div>
              <p style={{ fontSize: 16, color: "var(--muted2)", marginTop: 12, maxWidth: 600, margin: "12px auto 0" }}>
                Antes e depois reais enviados por profissionais que usam o Upscaler Arcano no dia a dia.
              </p>
            </div>

            <div className="v3-real-grid">
              {realResults.map((item, i) => (
                <V3RealResultCard key={i} item={item} />
              ))}
            </div>
          </div>
        </section>
        </V3LazySection>

        {/* PRICING */}
        <section className="v3-pricing" id="v3-pricing">
          <div className="v3-pricing-inner">
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <div className="v3-section-tag" style={{ display: "inline-block" }}>Planos e Preços</div>
              <div className="v3-section-title" style={{ marginTop: 12 }}>Comece agora.<br /><span>Acesso imediato.</span></div>
            </div>

            <div className="v3-pricing-grid">
              {/* STARTER */}
              <div className="v3-plan v3-reveal">
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <Rocket size={32} style={{ color: "rgba(255,255,255,0.5)" }} />
                </div>
                <div className="v3-plan-name">Starter</div>
                <div className="v3-plan-tagline">Para experimentar</div>
                <div className="v3-plan-price">
                  <span className="currency">R$</span>
                  <span className="amount">24</span>
                  <span className="cents">,90</span>
                  <span className="period">R$ 0,99 por imagem</span>
                </div>
                <button className="v3-plan-cta outline" onClick={() => openCheckout("upscaler-arcano-starter")}>Começar →</button>
                <div className="v3-plan-divider" />
                <div className="v3-plan-feature"><span className="check">✓</span> 25 imagens</div>
                <div className="v3-plan-feature"><span className="check">✓</span> 1.500 créditos</div>
                <div className="v3-plan-feature"><span className="check">✓</span> <span className="special">Modo Turbo V3</span></div>
                <div className="v3-plan-feature"><span className="check">✓</span> <span className="special">Upscale em Lote V3</span></div>
                <div className="v3-plan-feature"><span className="check">✓</span> Suporte via WhatsApp</div>
              </div>

              {/* PRO */}
              <div className="v3-plan v3-reveal">
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <Flame size={32} style={{ color: "#d946ef" }} />
                </div>
                <div className="v3-plan-name">Pro</div>
                <div className="v3-plan-tagline">3x mais por R$12 a mais</div>
                <div className="v3-plan-price">
                  <span className="currency">R$</span>
                  <span className="amount">37</span>
                  <span className="cents">,00</span>
                  <span className="period">R$ 0,53 por imagem</span>
                </div>
                <button className="v3-plan-cta outline" onClick={() => openCheckout("upscaler-arcano-pro")}>Começar →</button>
                <div className="v3-plan-divider" />
                <div className="v3-plan-feature"><span className="check">✓</span> 70 imagens</div>
                <div className="v3-plan-feature"><span className="check">✓</span> 4.200 créditos</div>
                <div className="v3-plan-feature"><span className="check">✓</span> <span className="special">Modo Turbo V3</span></div>
                <div className="v3-plan-feature"><span className="check">✓</span> <span className="special">Upscale em Lote V3</span></div>
              </div>

              {/* ULTIMATE */}
              <div className="v3-plan featured v3-reveal">
                <div className="v3-plan-popular">⚡ Mais vendido</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <Crown size={32} style={{ color: "#84cc16" }} />
                </div>
                <div className="v3-plan-name">Ultimate</div>
                <div className="v3-plan-tagline">Ideal para criadores ativos</div>
                <div className="v3-plan-price">
                  <span className="currency">R$</span>
                  <span className="amount">79</span>
                  <span className="cents">,90</span>
                  <span className="period">R$ 0,34 por imagem</span>
                </div>
                <button className="v3-plan-cta filled" onClick={() => openCheckout("upscaler-arcano-ultimate")}>Garantir Acesso →</button>
                <div className="v3-plan-divider" />
                <div className="v3-plan-feature"><span className="check">✓</span> 233 imagens</div>
                <div className="v3-plan-feature"><span className="check">✓</span> 14.000 créditos</div>
                <div className="v3-plan-feature"><span className="check">✓</span> <span className="special">Modo Turbo V3</span></div>
                <div className="v3-plan-feature"><span className="check">✓</span> <span className="special">Upscale em Lote V3</span></div>
                <div className="v3-plan-feature"><span className="check">✓</span> Suporte prioritário</div>
              </div>

              {/* VITALÍCIO */}
              <div className="v3-plan v3-plan-lifetime v3-reveal">
                <div className="v3-plan-popular v3-plan-popular-gold">♾ Vitalício</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <Infinity size={32} style={{ color: "#f5c842" }} />
                </div>
                <div className="v3-plan-name">Ilimitado</div>
                <div className="v3-plan-tagline">Acesso permanente a tudo</div>
                <div className="v3-promo-discount-badge v3-promo-discount-badge-gold">-50% OFF · Promo</div>
                <div className="v3-plan-price">
                  <div className="v3-price-old">De <s>R$ 199,90</s> por</div>
                  <span className="currency">R$</span>
                  <span className="amount">99</span>
                  <span className="cents">,90</span>
                  <span className="period">paga uma vez · usa para sempre</span>
                </div>
                <div className="v3-promo-timer-wrap">
                  <div className="v3-promo-timer-label">⏰ Oferta termina em</div>
                  <V3PromoCountdownPT />
                </div>
                <button className="v3-plan-cta filled v3-plan-cta-gold" onClick={() => openCheckout("upscaler-arcano-v3")}>Garantir Vitalício →</button>
                <div className="v3-plan-divider" />
                <div className="v3-plan-feature"><span className="check">✓</span> <strong style={{ color: "var(--white)" }}>Acesso vitalício completo</strong></div>
                <div className="v3-plan-feature"><span className="check">✓</span> Todas as ferramentas</div>
                <div className="v3-plan-feature"><span className="check">✓</span> <span className="special">Modo Turbo V3</span></div>
                <div className="v3-plan-feature"><span className="check">✓</span> <span className="special">Upscale em Lote V3</span></div>
                
                <div className="v3-plan-feature"><span className="check">✓</span> Todas as atualizações futuras</div>
              </div>
            </div>

            {/* TRUST ROW */}
            <div className="v3-trust-badges-row">
              <div className="v3-trust-badge v3-trust-anim" style={{ animationDelay: "0.1s" }}>
                <span className="v3-trust-badge-icon">⚡</span>
                <span>Acesso imediato</span>
              </div>
              <div className="v3-trust-badge v3-trust-anim" style={{ animationDelay: "0.25s" }}>
                <span className="v3-trust-badge-icon">💬</span>
                <span>Suporte 24/7</span>
              </div>
              <div className="v3-trust-badge v3-trust-anim" style={{ animationDelay: "0.4s" }}>
                <span className="v3-trust-badge-icon">🔒</span>
                <span>Pagamento seguro · Mercado Pago</span>
              </div>
            </div>
          </div>
        </section>

        {/* GUARANTEE */}
        <section className="v3-guarantee-strip">
          <div className="v3-guarantee-card">
            <div className="v3-guarantee-icon-wrap">
              <ShieldCheck size={32} strokeWidth={1.8} />
            </div>
            <div>
              <div className="v3-guarantee-title">Garantia de 7 dias</div>
              <div className="v3-guarantee-text">Se não gostar do resultado, devolvemos 100% do seu dinheiro. Sem perguntas, sem burocracia. É confiança total no que entregamos.</div>
              <span className="v3-guarantee-badge">✓ RISCO ZERO</span>
            </div>
          </div>
        </section>


        {/* FAQ */}
        <section className="v3-faq">
          <div className="v3-faq-inner">
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <div className="v3-section-tag" style={{ display: "inline-block" }}>Perguntas frequentes</div>
              <div className="v3-section-title" style={{ marginTop: 12 }}>Tudo que você<br /><span>precisa saber.</span></div>
            </div>
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`v3-faq-item ${openFaq === i ? "open" : ""}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="v3-faq-question">
                  {faq.q}
                  <div className="v3-faq-icon">+</div>
                </div>
                <div className="v3-faq-answer">{faq.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="v3-final-cta">
          <h2>Sua próxima imagem<br />merece ser <em>perfeita.</em></h2>
          <p>+3.200 profissionais já sabem disso. Agora é a sua vez.</p>
          <button className="v3-btn-primary" onClick={scrollToPrice} style={{ display: "inline-flex" }}>
            Quero o Upscaler Arcano V3 <span>→</span>
          </button>
          <div className="v3-final-trust">
            <div className="v3-trust-item"><span style={{ color: "var(--green)", fontSize: 16 }}>✓</span> Acesso imediato</div>
            <div className="v3-trust-item"><span style={{ color: "var(--green)", fontSize: 16 }}>✓</span> Sem mensalidade</div>
            <div className="v3-trust-item"><span style={{ color: "var(--green)", fontSize: 16 }}>✓</span> Resultado em 60s</div>
            <div className="v3-trust-item"><span style={{ color: "var(--green)", fontSize: 16 }}>✓</span> Paga uma vez</div>
          </div>
        </section>

        <footer className="v3-footer">
          <span>© 2026 Upscaler Arcano · Todos os direitos reservados</span>
        </footer>
      </div>
      <V3StickyBar
        scrollToPrice={scrollToPrice}
        label="Acesso liberado"
        mobileButtonText="Acessar o Upscaler →"
        desktopButtonText="Acessar o Upscaler →"
      />
      <PagarmeCheckoutModal />
    </>
  );
};

export default UpscalerArcanoV3;
