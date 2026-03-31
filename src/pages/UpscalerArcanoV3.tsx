import { useEffect, useRef, useState, useCallback } from "react";

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
import upscalerAntigaAntes from "@/assets/upscaler-antiga-antes.webp";
import upscalerAntigaDepois from "@/assets/upscaler-antiga-depois.jpg";
import upscalerFoodAntes from "@/assets/upscaler-food-antes.webp";
import upscalerFoodDepois from "@/assets/upscaler-food-depois.webp";
import upscalerHeroAntes from "@/assets/upscaler-hero-antes.webp";
import upscalerHeroDepois from "@/assets/upscaler-hero-depois.webp";

// Gallery images for hero carousel
import galleryBefore2 from "@/assets/upscaler/2a.webp";
import galleryAfter2 from "@/assets/upscaler/2d.webp";
import galleryBefore3 from "@/assets/upscaler/3a.webp";
import galleryAfter3 from "@/assets/upscaler/3d.webp";
import turboBgImage from "@/assets/upscaler-v3-turbo-bg.webp";

// Gallery before/after mini slider component
const GalleryBeforeAfter = ({ item }: { item: { before: string; after: string; label: string; desc: string; badge?: string } }) => {
  const [pct, setPct] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback((clientX: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPct(Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 5), 95));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) update(e.clientX); };
    const onTouchMove = (e: TouchEvent) => { if (dragging.current) update(e.touches[0].clientX); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); window.removeEventListener("touchmove", onTouchMove); window.removeEventListener("touchend", onUp); };
  }, [update]);

  return (
    <div className="v3-gallery-item v3-reveal">
      <div
        ref={ref}
        style={{ width: "100%", height: "100%", position: "relative", cursor: "ew-resize", userSelect: "none" }}
        onMouseDown={(e) => { dragging.current = true; update(e.clientX); }}
        onTouchStart={(e) => { dragging.current = true; update(e.touches[0].clientX); }}
      >
        {/* Before (full) */}
        <img src={item.before} alt={`${item.label} antes`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
        {/* After (clipped) */}
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
          <img src={item.after} alt={`${item.label} depois`} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
        </div>
        {/* Handle */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${pct}%`, transform: "translateX(-50%)", width: 2, background: "rgba(255,255,255,0.7)", zIndex: 5 }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 24, height: 24, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", fontSize: 10, color: "#000", fontWeight: 700 }}>⟺</div>
        </div>
        {/* Labels */}
        <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.8)", fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 100, zIndex: 6 }}>ANTES</div>
        <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)", fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 100, zIndex: 6 }}>DEPOIS</div>
      </div>
      {item.badge && <div className="v3-gallery-badge">{item.badge}</div>}
      <div className="v3-gallery-label">
        <strong>{item.label}</strong>
        <span>{item.desc}</span>
      </div>
    </div>
  );
};

// Hero carousel slides
const heroSlides = [
  { before: upscalerHeroAntes, after: upscalerHeroDepois },
  { before: galleryBefore2, after: galleryAfter2 },
  { before: galleryBefore3, after: galleryAfter3 },
];

const UpscalerArcanoV3 = () => {
  const [sliderPct, setSliderPct] = useState(50);
  const [autoActive, setAutoActive] = useState(true);
  const [turboCount, setTurboCount] = useState(60);
  const [batchLoaded, setBatchLoaded] = useState<boolean[]>(new Array(10).fill(false));
  const [stickyVisible, setStickyVisible] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const autoRef = useRef(true);
  const autoPctRef = useRef(50);
  const autoDirRef = useRef(-1);

  const goToSlide = useCallback((dir: 1 | -1) => {
    setCurrentSlide(prev => (prev + dir + heroSlides.length) % heroSlides.length);
    setSliderPct(50);
    autoPctRef.current = 50;
    autoRef.current = true;
    setAutoActive(true);
  }, []);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("v3-visible");
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".v3-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Counter animation
  useEffect(() => {
    const counterObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
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
    document.querySelectorAll("[data-target]").forEach((el) => counterObs.observe(el));
    return () => counterObs.disconnect();
  }, []);

  // Staggered delays
  useEffect(() => {
    document.querySelectorAll(".v3-pain-card").forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = i * 0.08 + "s";
    });
    document.querySelectorAll(".v3-step").forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = i * 0.15 + "s";
    });
    document.querySelectorAll(".v3-gallery-item").forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = i * 0.08 + "s";
    });
    document.querySelectorAll(".v3-audience-card").forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = i * 0.08 + "s";
    });
    document.querySelectorAll(".v3-testimonial").forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = i * 0.1 + "s";
    });
    document.querySelectorAll(".v3-plan").forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = i * 0.1 + "s";
    });
  }, []);

  // Sticky CTA
  useEffect(() => {
    const handleScroll = () => setStickyVisible(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Turbo countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTurboCount((c) => (c <= 0 ? 60 : c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Batch animation
  useEffect(() => {
    let idx = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const loadNext = () => {
      if (idx < 10) {
        setBatchLoaded((prev) => {
          const next = [...prev];
          next[idx] = true;
          return next;
        });
        idx++;
        timeout = setTimeout(loadNext, 300);
      } else {
        timeout = setTimeout(() => {
          setBatchLoaded(new Array(10).fill(false));
          idx = 0;
          timeout = setTimeout(loadNext, 800);
        }, 2000);
      }
    };
    timeout = setTimeout(loadNext, 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Auto-slide
  useEffect(() => {
    autoRef.current = true;
    let raf: number;
    const autoSlide = () => {
      if (!autoRef.current) return;
      autoPctRef.current += autoDirRef.current * 0.4;
      if (autoPctRef.current <= 15) autoDirRef.current = 1;
      if (autoPctRef.current >= 85) autoDirRef.current = -1;
      setSliderPct(autoPctRef.current);
      raf = requestAnimationFrame(autoSlide);
    };
    const t = setTimeout(() => {
      raf = requestAnimationFrame(autoSlide);
    }, 1500);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, []);

  const updateSlider = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 5), 95);
    setSliderPct(pct);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) updateSlider(e.clientX);
    };
    const onUp = () => { draggingRef.current = false; };
    const onTouchMove = (e: TouchEvent) => {
      if (draggingRef.current) updateSlider(e.touches[0].clientX);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [updateSlider]);

  const stopAuto = () => {
    autoRef.current = false;
    setAutoActive(false);
  };

  const scrollToPrice = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("v3-pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  const batchEmojis = ["🏔️", "🎸", "👗", "🍕", "🏠", "💍", "🚗", "🌺", "📱", "🎨"];

  const galleryItems = [
    { before: upscalerFotoAntes, after: upscalerFotoDepois, label: "Fotos de Ensaio", desc: "Recupere grain, ruído e baixa luz", badge: "Popular" },
    { before: render3dAntes, after: render3dDepois, label: "Renders 3D", desc: "Upscale sem perder geometria" },
    { before: upscalerProdutoAntes, after: upscalerProdutoDepois, label: "Fotos de Produto", desc: "Catálogos e e-commerce em 4K" },
    { before: upscalerLogoAntes, after: upscalerLogoDepois, label: "Logos e Artes", desc: "Vetores e brandmarks ampliados" },
    { before: upscalerAntigaAntes, after: upscalerAntigaDepois, label: "Fotos Antigas", desc: "Memórias restauradas com IA" },
    { before: upscalerFoodAntes, after: upscalerFoodDepois, label: "Fotos de Alimento", desc: "Corrija artefatos, amplie, refine", badge: "V3" },
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        .v3-page {
          --bg: #06060F;
          --surface: #0D0D1C;
          --surface2: #13132A;
          --cyan: #00D4FF;
          --cyan-dim: rgba(0,212,255,0.12);
          --cyan-glow: rgba(0,212,255,0.35);
          --gold: #F5C842;
          --gold-dim: rgba(245,200,66,0.15);
          --white: #FFFFFF;
          --muted: #7070A0;
          --muted2: #A0A0C0;
          --red: #FF4060;
          --green: #00E5A0;
          --card-border: rgba(255,255,255,0.06);
          background: var(--bg);
          color: var(--white);
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
          min-height: 100vh;
          position: relative;
        }
        .v3-page * { box-sizing: border-box; }
        .v3-page h1, .v3-page h2, .v3-page h3, .v3-page h4 { font-family: 'Plus Jakarta Sans', sans-serif; }

        .v3-page::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 9999;
          opacity: 0.4;
        }

        /* TOPBAR */
        .v3-topbar {
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 1000;
          background: rgba(13,13,28,0.85); backdrop-filter: blur(20px);
          border: 1px solid var(--card-border); border-radius: 100px;
          padding: 12px 24px; display: flex; align-items: center; gap: 32px;
        }
        .v3-topbar-logo {
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 15px; letter-spacing: -0.5px;
          background: linear-gradient(135deg, var(--cyan), var(--white));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .v3-topbar-badge {
          background: var(--gold-dim); border: 1px solid rgba(245,200,66,0.3);
          color: var(--gold); font-size: 11px; font-weight: 500; padding: 3px 10px;
          border-radius: 100px; letter-spacing: 0.5px;
        }
        .v3-topbar-cta {
          background: var(--cyan); color: #000; font-family: 'Syne', sans-serif;
          font-weight: 700; font-size: 13px; padding: 8px 20px; border-radius: 100px;
          text-decoration: none; cursor: pointer; border: none;
        }
        .v3-topbar-cta:hover { background: #fff; transform: scale(1.03); }

        /* SOCIAL POPUP */
        .v3-social-popup {
          position: fixed; bottom: 24px; left: 24px; z-index: 999;
          background: var(--surface2); border: 1px solid var(--card-border);
          border-radius: 16px; padding: 14px 18px; display: flex; align-items: center; gap: 12px;
          font-size: 13px; opacity: 0; transform: translateY(20px);
          animation: v3PopupIn 0.5s ease 3s forwards; max-width: 280px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        @keyframes v3PopupIn { to { opacity: 1; transform: translateY(0); } }
        .v3-popup-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, var(--cyan), #7B2FFF);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 14px; flex-shrink: 0;
        }
        .v3-popup-dot {
          width: 8px; height: 8px; border-radius: 50%; background: var(--green);
          flex-shrink: 0; animation: v3Pulse 2s infinite;
        }
        @keyframes v3Pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.3)} }

        /* STICKY CTA */
        .v3-sticky-cta {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 998;
          background: rgba(6,6,15,0.95); backdrop-filter: blur(20px);
          border-top: 1px solid var(--card-border); padding: 14px 24px;
          display: flex; align-items: center; justify-content: space-between;
          transform: translateY(100%); transition: transform 0.4s ease;
        }
        .v3-sticky-cta.visible { transform: translateY(0); }
        .v3-sticky-btn {
          background: linear-gradient(135deg, var(--cyan), #0099CC);
          color: #000; font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 14px; padding: 12px 28px; border-radius: 100px;
          text-decoration: none; white-space: nowrap; cursor: pointer; border: none;
        }

        /* HERO */
        .v3-hero {
          min-height: 100vh; display: flex; flex-direction: column; align-items: center;
          justify-content: center; text-align: center; padding: 100px 24px 60px; position: relative; overflow: hidden;
        }
        .v3-hero::after {
          content: ''; position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
          width: 800px; height: 800px;
          background: radial-gradient(ellipse, rgba(0,212,255,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .v3-hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--gold-dim); border: 1px solid rgba(245,200,66,0.25);
          color: var(--gold); font-size: 12px; font-weight: 500; padding: 6px 16px;
          border-radius: 100px; margin-bottom: 28px; letter-spacing: 0.8px;
          text-transform: uppercase; animation: v3FadeDown 0.6s ease both;
        }
        @keyframes v3Blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .v3-hero h1 {
          font-size: clamp(42px, 7vw, 88px); font-weight: 800; line-height: 1.05;
          letter-spacing: -2px; margin-bottom: 20px; animation: v3FadeDown 0.7s ease 0.1s both;
        }
        .v3-hero h1 em {
          font-style: normal;
          background: linear-gradient(135deg, var(--cyan) 0%, #7B2FFF 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .v3-hero-sub {
          font-size: clamp(16px, 2vw, 20px); color: var(--muted2); max-width: 560px;
          line-height: 1.6; margin-bottom: 40px; animation: v3FadeDown 0.7s ease 0.2s both;
        }
        @keyframes v3FadeDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes v3FadeUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }

        .v3-stats-row {
          display: flex; gap: 48px; align-items: center; margin-bottom: 60px;
          animation: v3FadeDown 0.7s ease 0.4s both;
        }
        .v3-stat-num {
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; font-weight: 800; color: var(--white); text-align: center;
        }
        .v3-stat-num span { color: var(--cyan); }
        .v3-stat-label { font-size: 12px; color: var(--muted); margin-top: 2px; text-align: center; }
        .v3-stat-divider { width: 1px; height: 40px; background: var(--card-border); }

        .v3-cta-group {
          display: flex; flex-direction: column; align-items: center; gap: 14px;
          margin-bottom: 60px; animation: v3FadeDown 0.7s ease 0.3s both;
        }

        .v3-btn-primary {
          background: linear-gradient(135deg, var(--cyan), #0099CC); color: #000;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 17px;
          padding: 18px 48px; border-radius: 100px; text-decoration: none;
          display: inline-flex; align-items: center; gap: 10px;
          box-shadow: 0 0 40px rgba(0,212,255,0.3); cursor: pointer; border: none;
          transition: all 0.25s;
        }
        .v3-btn-primary:hover { transform: scale(1.04); box-shadow: 0 0 60px rgba(0,212,255,0.5); }

        .v3-hero-micro {
          font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 6px;
        }
        .v3-hero-micro .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }

        /* SLIDER */
        .v3-slider-wrapper {
          width: 100%; max-width: 900px; animation: v3FadeUp 0.8s ease 0.5s both; position: relative;
        }
        .v3-slider-label {
          font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;
          color: var(--muted); margin-bottom: 16px; display: flex; justify-content: space-between;
        }
        .v3-before-after {
          position: relative; border-radius: 20px; overflow: hidden;
          border: 1px solid var(--card-border); box-shadow: 0 40px 120px rgba(0,0,0,0.7);
          height: 420px; user-select: none; cursor: ew-resize;
        }
        .v3-ba-layer { position: absolute; inset: 0; }
        .v3-ba-layer img { width: 100%; height: 100%; object-fit: cover; }
        .v3-drag-handle {
          position: absolute; top: 0; bottom: 0; width: 2px; background: var(--white);
          z-index: 10; cursor: ew-resize; transform: translateX(-50%);
        }
        .v3-drag-circle {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 44px; height: 44px; border-radius: 50%; background: var(--white);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5); color: #000; font-size: 16px; font-weight: 700;
        }
        .v3-drag-hint {
          position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
          background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
          border: 1px solid var(--card-border); color: var(--muted2);
          font-size: 12px; padding: 6px 14px; border-radius: 100px; white-space: nowrap;
          animation: v3HintFade 2s ease 2s forwards; opacity: 1;
        }
        @keyframes v3HintFade { to { opacity: 0; } }

        /* CAROUSEL ARROWS */
        .v3-carousel-arrow {
          position: absolute; top: 50%; transform: translateY(-50%); z-index: 20;
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.15); color: #fff;
          font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease; line-height: 1;
        }
        .v3-carousel-arrow:hover { background: rgba(0,212,255,0.3); border-color: var(--cyan); }
        .v3-carousel-arrow-left { left: -20px; }
        .v3-carousel-arrow-right { right: -20px; }
        @media (max-width: 768px) {
          .v3-carousel-arrow-left { left: 8px; }
          .v3-carousel-arrow-right { right: 8px; }
          .v3-carousel-arrow { width: 36px; height: 36px; font-size: 20px; }
        }

        /* PAIN STRIP */
        .v3-pain-strip {
          background: var(--surface); border-top: 1px solid var(--card-border);
          border-bottom: 1px solid var(--card-border); padding: 64px 24px; overflow: hidden;
        }
        .v3-pain-title {
          text-align: center; font-size: 13px; font-weight: 500; color: var(--muted);
          text-transform: uppercase; letter-spacing: 2px; margin-bottom: 48px;
        }
        .v3-pain-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 16px; max-width: 1100px; margin: 0 auto;
        }
        .v3-pain-card {
          background: var(--surface2); border: 1px solid var(--card-border); border-radius: 16px;
          padding: 24px; display: flex; align-items: flex-start; gap: 14px;
          opacity: 0; transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease, border-color 0.3s;
        }
        .v3-pain-card.v3-visible { opacity: 1; transform: translateY(0); }
        .v3-pain-card:hover { border-color: rgba(255,64,96,0.3); transform: translateY(-3px) !important; }

        /* SECTION SHARED */
        .v3-section-tag {
          font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;
          color: var(--cyan); margin-bottom: 16px;
        }
        .v3-section-title {
          font-size: clamp(32px, 4vw, 52px); font-weight: 800; letter-spacing: -1.5px;
          line-height: 1.1; margin-bottom: 60px; color: var(--white);
        }
        .v3-section-title span { color: var(--muted2); }

        /* STEPS */
        .v3-steps {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; position: relative;
        }
        .v3-steps::before {
          content: ''; position: absolute; top: 60px;
          left: calc(16.66% + 24px); right: calc(16.66% + 24px);
          height: 1px; background: linear-gradient(90deg, var(--cyan-dim), var(--cyan), var(--cyan-dim));
        }
        .v3-step {
          text-align: center; opacity: 0; transform: translateY(24px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .v3-step.v3-visible { opacity: 1; transform: translateY(0); }
        .v3-step-num {
          width: 60px; height: 60px; border-radius: 50%; background: var(--surface2);
          border: 1px solid var(--cyan); display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 22px; font-weight: 800;
          color: var(--cyan); position: relative; z-index: 1; box-shadow: 0 0 30px var(--cyan-glow);
        }
        .v3-step-icon-area {
          width: 100%; height: 160px; border-radius: 16px; background: var(--surface2);
          border: 1px solid var(--card-border); display: flex; align-items: center;
          justify-content: center; font-size: 56px; margin-bottom: 20px; overflow: hidden;
        }
        .v3-step-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 8px; }
        .v3-step-desc { font-size: 14px; color: var(--muted2); line-height: 1.6; }

        /* Upload anim */
        .v3-upload-anim { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; padding: 20px; }
        .v3-upload-box {
          border: 2px dashed rgba(0,212,255,0.4); border-radius: 12px; padding: 20px 32px;
          color: var(--cyan); font-size: 13px; font-weight: 500; animation: v3UploadPulse 2s ease infinite;
        }
        @keyframes v3UploadPulse { 0%,100%{border-color:rgba(0,212,255,0.2)} 50%{border-color:rgba(0,212,255,0.6)} }
        .v3-upload-files { display: flex; gap: 6px; margin-top: 6px; }
        .v3-upload-file {
          background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2);
          border-radius: 8px; padding: 4px 10px; font-size: 11px; color: var(--muted2);
        }

        /* Process anim */
        .v3-process-anim { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%; padding: 20px; }
        .v3-process-ring {
          width: 60px; height: 60px; border-radius: 50%; border: 3px solid var(--surface);
          border-top-color: var(--cyan); animation: v3Spin 1s linear infinite;
        }
        @keyframes v3Spin { to { transform: rotate(360deg); } }
        .v3-process-bar-wrap { width: 80%; height: 6px; background: var(--surface); border-radius: 100px; overflow: hidden; }
        .v3-process-bar {
          height: 100%; background: linear-gradient(90deg, var(--cyan), #7B2FFF);
          border-radius: 100px; animation: v3LoadBar 2s ease infinite;
        }
        @keyframes v3LoadBar { 0%{width:0%} 60%{width:90%} 100%{width:100%} }
        .v3-process-label { font-size: 11px; color: var(--cyan); font-weight: 500; letter-spacing: 1px; }

        /* Download anim */
        .v3-download-anim { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 20px; }
        .v3-download-check {
          width: 52px; height: 52px; border-radius: 50%; background: rgba(0,229,160,0.15);
          border: 2px solid var(--green); display: flex; align-items: center; justify-content: center;
          font-size: 22px; color: var(--green); animation: v3CheckPop 0.5s ease 0.5s both;
        }
        @keyframes v3CheckPop { from{transform:scale(0)} to{transform:scale(1)} }
        .v3-download-label { font-size: 12px; color: var(--green); font-weight: 600; }
        .v3-download-quality { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; }
        .v3-download-quality span { color: var(--cyan); }

        /* FEATURES */
        .v3-features {
          padding: 100px 24px; background: var(--surface);
          border-top: 1px solid var(--card-border); border-bottom: 1px solid var(--card-border);
        }
        .v3-features-inner { max-width: 1100px; margin: 0 auto; }
        .v3-features-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 48px; flex-wrap: wrap; gap: 20px;
        }
        .v3-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--gold-dim); border: 1px solid rgba(245,200,66,0.25);
          color: var(--gold); font-size: 12px; font-weight: 700; padding: 5px 14px;
          border-radius: 100px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;
        }
        .v3-feature-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .v3-feature-card {
          border-radius: 24px; border: 1px solid var(--card-border); overflow: hidden;
          opacity: 0; transform: translateY(30px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .v3-feature-card.v3-visible { opacity: 1; transform: translateY(0); }
        .v3-feature-card:hover { border-color: rgba(0,212,255,0.2); }
        .v3-feature-card.turbo { background: linear-gradient(145deg, #0A0A1E, #050510); position: relative; }
        .v3-feature-card.batch { background: linear-gradient(145deg, #0D0A20, #080515); }
        .v3-feature-visual {
          height: 300px; position: relative; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
        }
        .v3-feature-card.turbo .v3-feature-visual {
          background: radial-gradient(ellipse at 50% 60%, rgba(0,212,255,0.12) 0%, transparent 70%);
        }
        .v3-feature-card.batch .v3-feature-visual {
          background: radial-gradient(ellipse at 50% 60%, rgba(123,47,255,0.15) 0%, transparent 70%);
        }

        /* Turbo */
        .v3-turbo-ring {
          width: 160px; height: 160px; border-radius: 50%; border: 4px solid var(--surface2);
          position: relative; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;
        }
        .v3-turbo-ring svg { position: absolute; inset: -4px; width: calc(100% + 8px); height: calc(100% + 8px); transform: rotate(-90deg); }
        .v3-turbo-ring circle {
          fill: none; stroke: var(--cyan); stroke-width: 4; stroke-linecap: round;
          stroke-dasharray: 502; stroke-dashoffset: 502; animation: v3RingFill 3s ease-in-out infinite;
          filter: drop-shadow(0 0 8px var(--cyan));
        }
        @keyframes v3RingFill { 0%{stroke-dashoffset:502} 70%{stroke-dashoffset:50} 100%{stroke-dashoffset:50} }
        .v3-turbo-count {
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 52px; font-weight: 800;
          color: var(--cyan); text-shadow: 0 0 40px var(--cyan-glow); line-height: 1;
        }
        .v3-turbo-unit { font-size: 16px; color: var(--muted2); margin-top: 4px; }
        .v3-turbo-speed {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.2);
          color: var(--cyan); font-size: 13px; font-weight: 600; padding: 6px 16px; border-radius: 100px;
        }

        /* Batch */
        .v3-batch-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding: 10px; }
        .v3-batch-img {
          aspect-ratio: 1; border-radius: 8px; background: var(--surface2);
          border: 1px solid var(--card-border); display: flex; align-items: center;
          justify-content: center; font-size: 18px; position: relative; overflow: hidden;
          opacity: 0.3; transition: opacity 0.3s, border-color 0.3s;
        }
        .v3-batch-img.loaded { opacity: 1; border-color: rgba(123,47,255,0.4); }
        .v3-batch-img.loaded::after {
          content: '✓'; position: absolute; top: 2px; right: 4px;
          font-size: 8px; color: var(--green); font-weight: 700;
        }
        .v3-batch-count {
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 42px; font-weight: 800;
          color: #7B2FFF; text-shadow: 0 0 40px rgba(123,47,255,0.5); text-align: center;
        }
        .v3-batch-count span { color: var(--white); }

        .v3-feature-content { padding: 28px 32px; }
        .v3-feature-label {
          font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          color: var(--cyan); margin-bottom: 10px;
        }
        .v3-feature-title {
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 26px; font-weight: 800;
          margin-bottom: 10px; letter-spacing: -0.5px;
        }
        .v3-feature-desc { font-size: 15px; color: var(--muted2); line-height: 1.6; margin-bottom: 20px; }
        .v3-feature-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .v3-pill {
          background: rgba(255,255,255,0.05); border: 1px solid var(--card-border);
          color: var(--muted2); font-size: 12px; padding: 5px 12px; border-radius: 100px;
        }

        /* GALLERY */
        .v3-gallery { padding: 100px 24px; max-width: 1100px; margin: 0 auto; }
        .v3-gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .v3-gallery-item {
          border-radius: 20px; overflow: hidden; border: 1px solid var(--card-border);
          background: var(--surface2); aspect-ratio: 4/3; position: relative; cursor: pointer;
          opacity: 0; transform: scale(0.95);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .v3-gallery-item.v3-visible { opacity: 1; transform: scale(1); }
        .v3-gallery-item:hover { border-color: rgba(0,212,255,0.3); transform: scale(1.02) !important; }
        .v3-gallery-bg {
          width: 100%; height: 100%; position: relative; overflow: hidden;
        }
        .v3-gallery-bg img { width: 100%; height: 100%; object-fit: cover; }
        .v3-gallery-bg::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(6,6,15,0.9) 0%, transparent 60%);
          z-index: 1;
        }
        .v3-gallery-label { position: absolute; bottom: 16px; left: 16px; right: 16px; z-index: 2; }
        .v3-gallery-label strong { display: block; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        .v3-gallery-label span { font-size: 12px; color: var(--muted2); }
        .v3-gallery-badge {
          position: absolute; top: 14px; right: 14px; z-index: 2;
          background: rgba(0,229,160,0.15); border: 1px solid rgba(0,229,160,0.3);
          color: var(--green); font-size: 10px; font-weight: 700; padding: 3px 10px;
          border-radius: 100px; letter-spacing: 1px; text-transform: uppercase;
        }

        /* AUDIENCE */
        .v3-audience {
          padding: 100px 24px; background: var(--surface);
          border-top: 1px solid var(--card-border); border-bottom: 1px solid var(--card-border);
        }
        .v3-audience-inner { max-width: 1100px; margin: 0 auto; }
        .v3-audience-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .v3-audience-card {
          background: var(--bg); border: 1px solid var(--card-border); border-radius: 20px;
          padding: 28px; opacity: 0; transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease, border-color 0.3s, background 0.3s;
        }
        .v3-audience-card.v3-visible { opacity: 1; transform: translateY(0); }
        .v3-audience-card:hover { border-color: rgba(0,212,255,0.2); background: var(--surface2); transform: translateY(-4px) !important; }
        .v3-audience-emoji { font-size: 36px; margin-bottom: 16px; display: block; }
        .v3-audience-role { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 8px; }
        .v3-audience-desc { font-size: 14px; color: var(--muted2); line-height: 1.6; }

        /* PROOF */
        .v3-proof { padding: 100px 24px; max-width: 1100px; margin: 0 auto; }
        .v3-proof-numbers {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px;
          background: var(--card-border); border-radius: 20px; overflow: hidden;
          margin-bottom: 60px; border: 1px solid var(--card-border);
        }
        .v3-proof-num-card { background: var(--surface2); padding: 40px; text-align: center; }
        .v3-proof-number {
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 48px; font-weight: 800; line-height: 1; margin-bottom: 8px;
        }
        .v3-proof-number.cyan { color: var(--cyan); text-shadow: 0 0 40px var(--cyan-glow); }
        .v3-proof-number.gold { color: var(--gold); text-shadow: 0 0 40px rgba(245,200,66,0.3); }
        .v3-proof-number.green { color: var(--green); text-shadow: 0 0 40px rgba(0,229,160,0.3); }
        .v3-proof-num-label { font-size: 14px; color: var(--muted2); }
        .v3-testimonials { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .v3-testimonial {
          background: var(--surface2); border: 1px solid var(--card-border); border-radius: 20px;
          padding: 28px; opacity: 0; transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .v3-testimonial.v3-visible { opacity: 1; transform: translateY(0); }
        .v3-stars { color: var(--gold); font-size: 14px; margin-bottom: 14px; letter-spacing: 2px; }
        .v3-testimonial-text { font-size: 15px; color: var(--muted2); line-height: 1.7; margin-bottom: 20px; font-style: italic; }
        .v3-author { display: flex; align-items: center; gap: 12px; }
        .v3-author-avatar {
          width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center;
          justify-content: center; font-weight: 700; font-size: 16px; flex-shrink: 0;
        }
        .v3-author-name { font-weight: 600; font-size: 14px; }
        .v3-author-role { font-size: 12px; color: var(--muted); }

        /* PRICING */
        .v3-pricing {
          padding: 100px 24px; background: var(--surface);
          border-top: 1px solid var(--card-border);
        }
        .v3-pricing-inner { max-width: 1100px; margin: 0 auto; }
        .v3-pricing-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; align-items: start; }
        .v3-plan {
          background: var(--bg); border: 1px solid var(--card-border); border-radius: 24px;
          padding: 28px; opacity: 0; transform: translateY(24px);
          transition: opacity 0.5s ease, transform 0.5s ease, border-color 0.3s;
        }
        .v3-plan.v3-visible { opacity: 1; transform: translateY(0); }
        .v3-plan:hover { border-color: rgba(0,212,255,0.15); }
        .v3-plan.featured {
          background: linear-gradient(145deg, #0A1A2E, #050F1A); border-color: var(--cyan);
          transform: translateY(-12px); box-shadow: 0 0 60px rgba(0,212,255,0.15), 0 40px 80px rgba(0,0,0,0.5);
        }
        .v3-plan.featured.v3-visible { transform: translateY(-12px); }
        .v3-plan.featured:hover { transform: translateY(-16px) !important; }
        .v3-plan-popular {
          background: linear-gradient(135deg, var(--cyan), #0099CC); color: #000;
          font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
          padding: 4px 12px; border-radius: 100px; display: inline-block; margin-bottom: 16px;
        }
        .v3-plan-name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; margin-bottom: 6px; }
        .v3-plan-tagline { font-size: 13px; color: var(--muted); margin-bottom: 24px; }
        .v3-plan-price { margin-bottom: 24px; }
        .v3-plan-price .amount { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 42px; font-weight: 800; line-height: 1; }
        .v3-plan-price .currency { font-size: 20px; font-weight: 600; vertical-align: top; margin-top: 8px; display: inline-block; color: var(--muted2); }
        .v3-plan-price .period { font-size: 13px; color: var(--muted); display: block; margin-top: 4px; }
        .v3-plan-cta {
          display: block; text-align: center; font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 15px; padding: 14px; border-radius: 14px; text-decoration: none;
          margin-bottom: 24px; transition: all 0.2s; cursor: pointer;
        }
        .v3-plan-cta.outline { border: 1px solid var(--card-border); color: var(--white); background: transparent; }
        .v3-plan-cta.outline:hover { border-color: var(--cyan); color: var(--cyan); }
        .v3-plan-cta.filled {
          background: linear-gradient(135deg, var(--cyan), #0099CC); color: #000; border: none;
          box-shadow: 0 0 30px rgba(0,212,255,0.3);
        }
        .v3-plan-cta.filled:hover { transform: scale(1.03); box-shadow: 0 0 50px rgba(0,212,255,0.5); }
        .v3-plan-divider { height: 1px; background: var(--card-border); margin-bottom: 20px; }
        .v3-plan-feature { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--muted2); margin-bottom: 10px; }
        .v3-plan-feature .check { color: var(--green); flex-shrink: 0; }
        .v3-plan-feature .special { color: var(--cyan); }

        /* GUARANTEE */
        .v3-guarantee-strip { padding: 48px 24px; max-width: 1100px; margin: 0 auto; }
        .v3-guarantee-card {
          background: var(--surface2); border: 1px solid var(--card-border); border-radius: 24px;
          padding: 40px 48px; display: flex; align-items: center; gap: 32px;
        }
        .v3-guarantee-icon { font-size: 56px; flex-shrink: 0; }
        .v3-guarantee-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 22px; font-weight: 800; margin-bottom: 8px; }
        .v3-guarantee-text { font-size: 15px; color: var(--muted2); line-height: 1.6; max-width: 560px; }

        /* FAQ */
        .v3-faq {
          padding: 100px 24px; background: var(--surface);
          border-top: 1px solid var(--card-border);
        }
        .v3-faq-inner { max-width: 720px; margin: 0 auto; }
        .v3-faq-item { border-bottom: 1px solid var(--card-border); padding: 24px 0; cursor: pointer; }
        .v3-faq-question {
          display: flex; justify-content: space-between; align-items: center;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 17px; font-weight: 700;
          color: var(--white); gap: 20px;
        }
        .v3-faq-icon {
          width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--card-border);
          display: flex; align-items: center; justify-content: center; font-size: 16px;
          color: var(--cyan); flex-shrink: 0; transition: transform 0.3s;
        }
        .v3-faq-item.open .v3-faq-icon { transform: rotate(45deg); }
        .v3-faq-answer {
          font-size: 15px; color: var(--muted2); line-height: 1.7;
          max-height: 0; overflow: hidden; transition: max-height 0.4s ease, padding 0.3s;
        }
        .v3-faq-item.open .v3-faq-answer { max-height: 300px; padding-top: 14px; }

        /* FINAL CTA */
        .v3-final-cta {
          padding: 120px 24px; text-align: center; position: relative; overflow: hidden;
        }
        .v3-final-cta::before {
          content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 600px; height: 600px;
          background: radial-gradient(ellipse, rgba(0,212,255,0.08) 0%, transparent 70%);
        }
        .v3-final-cta h2 {
          font-size: clamp(36px, 5vw, 64px); font-weight: 800; letter-spacing: -2px;
          line-height: 1.1; margin-bottom: 16px; position: relative;
        }
        .v3-final-cta h2 em { font-style: normal; color: var(--cyan); }
        .v3-final-cta p { font-size: 18px; color: var(--muted2); margin-bottom: 48px; position: relative; }
        .v3-final-trust {
          display: flex; justify-content: center; align-items: center; gap: 32px;
          margin-top: 40px; flex-wrap: wrap;
        }
        .v3-trust-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); }

        .v3-footer {
          border-top: 1px solid var(--card-border); padding: 32px 24px;
          text-align: center; color: var(--muted); font-size: 13px;
        }

        /* DEPO GRID */
        .v3-depo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 1100px; margin: 0 auto; }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .v3-feature-cards, .v3-audience-grid, .v3-testimonials, .v3-pricing-grid { grid-template-columns: 1fr 1fr; }
          .v3-pain-grid { grid-template-columns: repeat(2, 1fr); }
          .v3-depo-grid { grid-template-columns: repeat(2, 1fr); }
          .v3-steps { grid-template-columns: 1fr; }
          .v3-steps::before { display: none; }
          .v3-gallery-grid { grid-template-columns: repeat(2, 1fr); }
          .v3-proof-numbers { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .v3-feature-cards, .v3-audience-grid, .v3-testimonials, .v3-pricing-grid, .v3-gallery-grid { grid-template-columns: 1fr; }
          .v3-pain-grid { grid-template-columns: 1fr; }
          .v3-topbar { gap: 14px; padding: 10px 16px; }
          .v3-stats-row { gap: 24px; }
          .v3-plan.featured { transform: none; }
          .v3-plan.featured.v3-visible { transform: none; }
          .v3-guarantee-card { flex-direction: column; text-align: center; padding: 28px; }
        }
      `}</style>

      <div className="v3-page">
        {/* TOPBAR */}
        <nav className="v3-topbar">
          <div className="v3-topbar-logo">⬆ Upscaler Arcano</div>
          <div className="v3-topbar-badge">✦ V3 NOVO</div>
          <button className="v3-topbar-cta" onClick={scrollToPrice}>Ver Planos</button>
        </nav>

        {/* SOCIAL POPUP */}
        <div className="v3-social-popup">
          <div className="v3-popup-avatar">M</div>
          <div>
            <strong style={{ color: "var(--white)", display: "block", fontSize: 13 }}>Mariana S. acabou de comprar</strong>
            <span style={{ color: "var(--muted2)", fontSize: 12 }}>há 3 minutos · São Paulo, SP</span>
          </div>
          <div className="v3-popup-dot" />
        </div>

        {/* STICKY CTA */}
        <div className={`v3-sticky-cta ${stickyVisible ? "visible" : ""}`}>
          <div style={{ fontSize: 14, color: "var(--muted2)" }}>
            <strong style={{ color: "var(--white)", fontFamily: "'Syne', sans-serif" }}>Upscaler Arcano V3</strong> — R$ 24,90 pra começar
          </div>
          <button className="v3-sticky-btn" onClick={scrollToPrice}>Garantir Acesso →</button>
        </div>

        {/* HERO */}
        <section className="v3-hero">
          <div className="v3-hero-badge">
            <span style={{ animation: "v3Blink 1.5s infinite" }}>●</span> &nbsp;Versão 3 disponível agora
          </div>
          <h1>Foto ruim é<br /><em>problema do passado.</em></h1>
          <p className="v3-hero-sub">
            O Upscaler Arcano transforma qualquer imagem em qualidade 4K com IA.<br />
            Rápido. Simples. Resultado profissional em 60 segundos.
          </p>

          <div className="v3-stats-row">
            <div>
              <div className="v3-stat-num">+3.2<span>mil</span></div>
              <div className="v3-stat-label">Profissionais ativos</div>
            </div>
            <div className="v3-stat-divider" />
            <div>
              <div className="v3-stat-num">+14<span>mil</span></div>
              <div className="v3-stat-label">Imagens melhoradas</div>
            </div>
            <div className="v3-stat-divider" />
            <div>
              <div className="v3-stat-num">60<span>s</span></div>
              <div className="v3-stat-label">Modo Turbo V3</div>
            </div>
          </div>

          <div className="v3-cta-group">
            <button className="v3-btn-primary" onClick={scrollToPrice}>
              Quero qualidade 4K agora <span>→</span>
            </button>
            <div className="v3-hero-micro">
              <span className="dot" />
              Acesso imediato · Sem mensalidade · Paga uma vez
            </div>
          </div>

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
                {/* Before layer - full */}
                <div className="v3-ba-layer">
                  <img src={heroSlides[currentSlide].before} alt="Antes - baixa qualidade" />
                </div>
                {/* After layer - clipped */}
                <div className="v3-ba-layer" style={{ clipPath: `inset(0 ${100 - sliderPct}% 0 0)` }}>
                  <img src={heroSlides[currentSlide].after} alt="Depois - qualidade 4K" />
                </div>
                {/* Handle */}
                <div className="v3-drag-handle" style={{ left: `${sliderPct}%` }}>
                  <div className="v3-drag-circle">⟺</div>
                </div>
                <div className="v3-drag-hint">⟺ Arraste para comparar</div>
              </div>
              {/* Carousel arrows */}
              <button
                onClick={() => goToSlide(-1)}
                className="v3-carousel-arrow v3-carousel-arrow-left"
                aria-label="Anterior"
              >‹</button>
              <button
                onClick={() => goToSlide(1)}
                className="v3-carousel-arrow v3-carousel-arrow-right"
                aria-label="Próximo"
              >›</button>
            </div>
            {/* Carousel dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentSlide(i); setSliderPct(50); autoPctRef.current = 50; }}
                  style={{
                    width: i === currentSlide ? 24 : 8,
                    height: 8,
                    borderRadius: 100,
                    border: "none",
                    background: i === currentSlide ? "var(--cyan)" : "rgba(255,255,255,0.2)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* PAIN STRIP */}
        <section className="v3-pain-strip">
          <div className="v3-pain-title">Situações que você provavelmente já viveu</div>
          <div className="v3-pain-grid">
            {painCards.map((card, i) => (
              <div key={i} className="v3-pain-card v3-reveal">
                <div style={{ fontSize: 28, flexShrink: 0 }}>{card.icon}</div>
                <div style={{ fontSize: 14, color: "var(--muted2)", lineHeight: 1.5 }}>
                  <strong style={{ color: "var(--white)", display: "block", marginBottom: 4, fontSize: 15 }}>{card.title}</strong>
                  {card.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
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

        {/* V3 FEATURES */}
        <section className="v3-features">
          <div className="v3-features-inner">
            <div className="v3-features-header">
              <div>
                <div className="v3-badge">✦ &nbsp;Exclusivo V3</div>
                <div className="v3-section-title" style={{ marginBottom: 0 }}>Dois novos recursos<br /><span>recém adicionados</span></div>
              </div>
              <p style={{ maxWidth: 280, color: "var(--muted2)", fontSize: 15, lineHeight: 1.6 }}>
                A versão 3 chegou com duas inovações que mudam completamente o seu fluxo de trabalho.
              </p>
            </div>

            <div className="v3-feature-cards">
              {/* TURBO */}
              <div className="v3-feature-card turbo v3-reveal">
                <div className="v3-feature-visual" style={{ position: "relative" }}>
                  <img 
                    src={turboBgImage} 
                    alt="" 
                    style={{ 
                      position: "absolute", inset: 0, width: "100%", height: "100%", 
                      objectFit: "cover", opacity: 0.2, zIndex: 0, pointerEvents: "none" 
                    }} 
                  />
                  <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                    <div className="v3-turbo-ring">
                      <svg viewBox="0 0 168 168"><circle cx="84" cy="84" r="78" /></svg>
                      <div>
                        <div className="v3-turbo-count">{turboCount}</div>
                        <div className="v3-turbo-unit">segundos</div>
                      </div>
                    </div>
                    <div className="v3-turbo-speed">⚡ 10x mais rápido</div>
                  </div>
                </div>
                <div className="v3-feature-content">
                  <div className="v3-feature-label">⚡ Modo Turbo</div>
                  <div className="v3-feature-title">Resultado em menos de 1 minuto</div>
                  <div className="v3-feature-desc">Enquanto o cliente ainda está no WhatsApp, a imagem já está pronta. Mesmo motor de IA. Mesma qualidade 4K. Só que agora em tempo recorde.</div>
                  <div className="v3-feature-pills">
                    <span className="v3-pill">Velocidade 10x</span>
                    <span className="v3-pill">4K preservado</span>
                    <span className="v3-pill">Entregas urgentes</span>
                  </div>
                </div>
              </div>

              {/* BATCH */}
              <div className="v3-feature-card batch v3-reveal">
                <div className="v3-feature-visual" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "100%", padding: 24 }}>
                    <div className="v3-batch-grid">
                      {batchEmojis.map((emoji, i) => (
                        <div key={i} className={`v3-batch-img ${batchLoaded[i] ? "loaded" : ""}`}>{emoji}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="v3-feature-content">
                  <div className="v3-feature-label" style={{ color: "#9B6FFF" }}>🗂 Upscale em Lote</div>
                  <div className="v3-feature-title">Até 10 imagens simultâneas</div>
                  <div className="v3-feature-desc">Chega de processar uma por uma. Selecione tudo de uma vez, clique uma vez, e deixa a IA trabalhar enquanto você descansa.</div>
                  <div className="v3-feature-pills">
                    <span className="v3-pill">10 imagens juntas</span>
                    <span className="v3-pill">Processamento paralelo</span>
                    <span className="v3-pill">Download em lote</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* GALLERY */}
        <section className="v3-gallery">
          <div className="v3-section-tag">Funciona com tudo</div>
          <div className="v3-section-title" style={{ marginBottom: 40 }}>Melhora imagens<br /><span>de todo tipo</span></div>
          <div className="v3-gallery-grid">
            {galleryItems.map((item, i) => (
              <GalleryBeforeAfter key={i} item={item} />
            ))}
          </div>
        </section>

        {/* AUDIENCE */}
        <section className="v3-audience">
          <div className="v3-audience-inner">
            <div className="v3-section-tag">Para quem é</div>
            <div className="v3-section-title" style={{ marginBottom: 48 }}>Se você faz dinheiro com imagens,<br /><span>o Upscaler Arcano é pra você!</span></div>
            <div className="v3-audience-grid">
              {audienceCards.map((card, i) => (
                <div key={i} className="v3-audience-card v3-reveal">
                  <span className="v3-audience-emoji">{card.emoji}</span>
                  <div className="v3-audience-role">{card.role}</div>
                  <div className="v3-audience-desc">{card.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="v3-proof">
          <div className="v3-section-tag">Resultados reais</div>
          <div className="v3-section-title" style={{ marginBottom: 48 }}>Números que<br /><span>falam por si.</span></div>

          <div className="v3-proof-numbers">
            <div className="v3-proof-num-card">
              <div className="v3-proof-number cyan" data-target="3200">0</div>
              <div className="v3-proof-num-label">Profissionais que já usam o Arcano</div>
            </div>
            <div className="v3-proof-num-card">
              <div className="v3-proof-number gold" data-target="14000">0</div>
              <div className="v3-proof-num-label">Imagens melhoradas com sucesso</div>
            </div>
            <div className="v3-proof-num-card">
              <div className="v3-proof-number green" data-target="100">0</div>
              <div className="v3-proof-num-label">% de satisfação dos clientes</div>
            </div>
          </div>

          <div className="v3-depo-grid">
            {[
              "/images/depo-v3-1.webp",
              "/images/depo-v3-7.webp",
              "/images/depo-v3-3.webp",
              "/images/depo-v3-4.webp",
              "/images/depo-v3-5.webp",
              "/images/depo-v3-2.webp",
              "/images/depo-v3-6.webp",
              "/images/depo-v3-8.webp",
            ].map((src, i) => (
              <div key={i} className="v3-reveal" style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--card-border)" }}>
                <img src={src} alt={`Depoimento real ${i + 1}`} loading="lazy" style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
            ))}
          </div>
        </section>

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
                <div className="v3-plan-name">Starter</div>
                <div className="v3-plan-tagline">Para experimentar</div>
                <div className="v3-plan-price">
                  <span className="currency">R$</span>
                  <span className="amount">24</span>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800 }}>,90</span>
                  <span className="period">acesso vitalício</span>
                </div>
                <a href="#" className="v3-plan-cta outline">Começar →</a>
                <div className="v3-plan-divider" />
                <div className="v3-plan-feature"><span className="check">✓</span> 25 imagens</div>
                <div className="v3-plan-feature"><span className="check">✓</span> 1.500 créditos</div>
                <div className="v3-plan-feature"><span className="check">✓</span> <span className="special">Modo Turbo V3</span></div>
                <div className="v3-plan-feature"><span className="check">✓</span> Upscale em Lote V3</div>
                <div className="v3-plan-feature"><span className="check">✓</span> Suporte via WhatsApp</div>
              </div>

              {/* PRO */}
              <div className="v3-plan v3-reveal">
                <div className="v3-plan-name">Pro</div>
                <div className="v3-plan-tagline">3x mais por R$12 a mais</div>
                <div className="v3-plan-price">
                  <span className="currency">R$</span>
                  <span className="amount">37</span>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800 }}>,00</span>
                  <span className="period">acesso vitalício</span>
                </div>
                <a href="#" className="v3-plan-cta outline">Começar →</a>
                <div className="v3-plan-divider" />
                <div className="v3-plan-feature"><span className="check">✓</span> 70 imagens</div>
                <div className="v3-plan-feature"><span className="check">✓</span> 4.200 créditos</div>
                <div className="v3-plan-feature"><span className="check">✓</span> <span className="special">Modo Turbo V3</span></div>
                <div className="v3-plan-feature"><span className="check">✓</span> Upscale em Lote V3</div>
                <div className="v3-plan-feature"><span className="check">✓</span> NanoBanana Pro</div>
                <div className="v3-plan-feature"><span className="check">✓</span> Veo 3 (geração de vídeo)</div>
              </div>

              {/* ULTIMATE */}
              <div className="v3-plan featured v3-reveal">
                <div className="v3-plan-popular">⚡ Mais vendido</div>
                <div className="v3-plan-name">Ultimate</div>
                <div className="v3-plan-tagline">Ideal para criadores ativos</div>
                <div className="v3-plan-price">
                  <span className="currency">R$</span>
                  <span className="amount">79</span>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800 }}>,90</span>
                  <span className="period">acesso vitalício</span>
                </div>
                <a href="#" className="v3-plan-cta filled">Garantir Acesso →</a>
                <div className="v3-plan-divider" />
                <div className="v3-plan-feature"><span className="check">✓</span> 233 imagens</div>
                <div className="v3-plan-feature"><span className="check">✓</span> 14.000 créditos</div>
                <div className="v3-plan-feature"><span className="check">✓</span> <span className="special">Modo Turbo V3</span></div>
                <div className="v3-plan-feature"><span className="check">✓</span> Upscale em Lote V3</div>
                <div className="v3-plan-feature"><span className="check">✓</span> NanoBanana Pro</div>
                <div className="v3-plan-feature"><span className="check">✓</span> Veo 3 (geração de vídeo)</div>
                <div className="v3-plan-feature"><span className="check">✓</span> Suporte prioritário</div>
              </div>

              {/* VITALÍCIO */}
              <div className="v3-plan v3-reveal">
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(245,200,66,0.1)", border: "1px solid rgba(245,200,66,0.2)",
                  color: "var(--gold)", fontSize: 11, fontWeight: 700, padding: "4px 12px",
                  borderRadius: 100, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 12
                }}>♾ Vitalício</div>
                <div className="v3-plan-name">Ilimitado</div>
                <div className="v3-plan-tagline">Acesso permanente a tudo</div>
                <div className="v3-plan-price">
                  <span className="currency">R$</span>
                  <span className="amount">99</span>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800 }}>,90</span>
                  <span className="period">paga uma vez · usa para sempre</span>
                </div>
                <a href="#" className="v3-plan-cta outline">Garantir →</a>
                <div className="v3-plan-divider" />
                <div className="v3-plan-feature"><span className="check">✓</span> <strong style={{ color: "var(--white)" }}>Acesso vitalício completo</strong></div>
                <div className="v3-plan-feature"><span className="check">✓</span> Todas as ferramentas</div>
                <div className="v3-plan-feature"><span className="check">✓</span> <span className="special">Modo Turbo V3</span></div>
                <div className="v3-plan-feature"><span className="check">✓</span> Upscale em Lote V3</div>
                <div className="v3-plan-feature"><span className="check">✓</span> NanoBanana Pro + Veo 3</div>
                <div className="v3-plan-feature"><span className="check">✓</span> Todas as atualizações futuras</div>
              </div>
            </div>

            {/* TRUST ROW */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 32, marginTop: 40, flexWrap: "wrap" as const }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)" }}>
                <span style={{ color: "var(--green)" }}>🔒</span> Pagamento SSL seguro
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)" }}>
                <span style={{ color: "var(--green)" }}>⚡</span> Acesso imediato
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)" }}>
                <span style={{ color: "var(--green)" }}>💬</span> Suporte 24/7
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)" }}>
                <span style={{ color: "var(--green)" }}>🏦</span> Mercado Pago
              </div>
            </div>
          </div>
        </section>

        {/* GUARANTEE */}
        <section className="v3-guarantee-strip">
          <div className="v3-guarantee-card">
            <div className="v3-guarantee-icon">🛡️</div>
            <div>
              <div className="v3-guarantee-title">Garantia de 7 dias</div>
              <div className="v3-guarantee-text">Se não gostar do resultado, devolvemos 100% do seu dinheiro. Sem perguntas, sem burocracia. É confiança total no que entregamos.</div>
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
    </>
  );
};

export default UpscalerArcanoV3;
