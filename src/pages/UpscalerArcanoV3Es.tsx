import { useEffect, useRef, useState, useCallback, memo } from "react";
import { useCheckout } from "@/hooks/useCheckout";
import { ShieldCheck, Infinity, Rocket, Flame, Crown } from "lucide-react";
import "@/styles/upscaler-v3.css";
import { V3TurboCountdown, V3BatchGrid, V3SocialPopup, V3StickyBar, V3PromoCountdown, V3GalleryBeforeAfter, V3RealResultCard, V3LazySection } from "@/components/upscaler-v3/V3IsolatedComponents";

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
  { before: galleryBefore2, after: galleryAfter2 },
  { before: galleryBefore3, after: galleryAfter3 },
];
const heroSlidesMobile = [
  { before: heroMobileAntes, after: heroMobileDepois },
  { before: galleryBefore2, after: galleryAfter2 },
  { before: galleryBefore3, after: galleryAfter3 },
];

const SOCIAL_PEOPLE_ES = [
  { name: "Valentina R.", initial: "V", city: "Buenos Aires, Argentina" },
  { name: "Santiago M.", initial: "S", city: "Ciudad de México, México" },
  { name: "Camila L.", initial: "C", city: "Bogotá, Colombia" },
  { name: "Mateo G.", initial: "M", city: "Lima, Perú" },
  { name: "Isabella P.", initial: "I", city: "Santiago, Chile" },
  { name: "Sebastián A.", initial: "S", city: "Medellín, Colombia" },
  { name: "Luciana F.", initial: "L", city: "Montevideo, Uruguay" },
  { name: "Andrés V.", initial: "A", city: "Quito, Ecuador" },
  { name: "Daniela C.", initial: "D", city: "Guadalajara, México" },
  { name: "Nicolás T.", initial: "N", city: "Córdoba, Argentina" },
];
const SOCIAL_TIMES_ES = ["hace unos segundos", "hace 1 minuto", "hace 2 minutos", "hace 3 minutos", "hace 5 minutos"];

const galleryItems = [
  { before: upscalerFoodAntes, after: upscalerFoodDepois, label: "Fotos de Comida", desc: "Corregí artefactos, ampliá, refiná" },
  { before: upscalerFotoAntes, after: upscalerFotoDepois, label: "Fotos de Sesión", desc: "Recuperá grano, ruido y baja luz" },
  { before: upscalerProdutoAntes, after: upscalerProdutoDepois, label: "Fotos de Producto", desc: "Catálogos y e-commerce en 4K" },
  { before: render3dAntes, after: render3dDepois, label: "Renders 3D", desc: "Upscale sin perder geometría" },
  { before: upscalerAntigaAntes, after: upscalerAntigaDepois, label: "Fotos Antiguas", desc: "Recuerdos restaurados con IA" },
  { before: upscalerLogoAntes, after: upscalerLogoDepois, label: "Logos y Artes", desc: "Vectores y marcas ampliados" },
];

const painCards = [
  { icon: "📱", title: "Foto del celular pixelada", desc: "Sacaste la foto perfecta pero salió granulada y sin resolución" },
  { icon: "😤", title: "El cliente mandó una foto horrible", desc: "Baja calidad, no la podés usar y la fecha de entrega ya está encima" },
  { icon: "📷", title: "Sesión que salió granulada", desc: "La poca luz arruinó tu mejor sesión fotográfica" },
  { icon: "🤖", title: "Imagen de IA que no sirvió", desc: "La generaste con IA pero salió con artefactos y baja definición" },
  { icon: "💸", title: "Perdiste un trabajo por una imagen mala", desc: "El cliente se fue porque no tenías fotos profesionales" },
  { icon: "🖨️", title: "Artes que se ven mal impresas", desc: "Se ve bien en la pantalla, pixelado en la impresión. Vergüenza total" },
];

const audienceCards = [
  { emoji: "📸", role: "Fotógrafos", desc: "Entregá fotos impecables incluso cuando las condiciones de luz no ayudaron." },
  { emoji: "🎨", role: "Diseñadores Gráficos", desc: "Recibí una foto mala del cliente. Entregá un diseño que impresione. Arcano cubre la diferencia." },
  { emoji: "📲", role: "Social Media", desc: "Contenido visual de alta calidad que frena el scroll y genera engagement real." },
  { emoji: "🎸", role: "Músicos y Artistas", desc: "Fotos profesionales para contratantes, releases y portadas. Sin pagar fotógrafo." },
  { emoji: "💻", role: "Infoproductores", desc: "Landing pages y campañas con imágenes de alto impacto que convierten más." },
  { emoji: "✦", role: "Cualquier persona", desc: "Foto mala de viaje, recuerdo familiar, imagen importante. Arcano lo resuelve." },
];

const testimonials = [
  { text: '"Un cliente me mandó una foto horrible a las 6pm con entrega para las 9pm. En 3 minutos Arcano resolvió lo que me llevaría 2 horas en Photoshop."', name: "Carlos M.", role: "Diseñador Gráfico · Buenos Aires", avatar: "C", gradient: "linear-gradient(135deg,#00D4FF,#7B2FFF)" },
  { text: '"Soy fotógrafo y uso el lote del V3 siempre. Proceso la sesión entera mientras edito el segundo set. Ahorro literalmente horas por semana."', name: "Rafael T.", role: "Fotógrafo · Ciudad de México", avatar: "R", gradient: "linear-gradient(135deg,#F5C842,#FF6B35)" },
  { text: '"Mis imágenes de campaña de lanzamiento quedaron profesionales de verdad. Las ventas subieron 40% después de que empecé a usarlas en las landing pages."', name: "Ana Luiza F.", role: "Infoproductora · Bogotá", avatar: "A", gradient: "linear-gradient(135deg,#00E5A0,#0099CC)" },
];

const faqs = [
  { q: "¿Tengo que pagar mensualidad?", a: "No. El Upscaler Arcano funciona con acceso vitalicio — pagás una vez y lo usás para siempre. Sin cobros recurrentes, sin sorpresas." },
  { q: "¿El uso es realmente ilimitado?", a: "Sí, 100%. Con el plan Vitalicio podés mejorar cuantas imágenes quieras, sin límite de uso. No consume créditos ni tiene restricciones de cantidad." },
  { q: "¿Funciona con cualquier tipo de imagen?", a: "Sí. Fotos de sesión, logos, renders 3D, fotos antiguas, imágenes generadas por IA, comida, productos — Arcano procesa cualquier tipo de imagen." },
  { q: "¿Cuánto tiempo tarda en procesar?", a: "Con el Modo Turbo del V3, menos de 60 segundos por imagen. En lote, procesás hasta 10 imágenes en paralelo al mismo tiempo." },
  { q: "¿Qué es el Modo Turbo? ¿Es igual al resultado normal?", a: "El Modo Turbo es exclusivo del V3 y entrega el mismo motor de IA, misma calidad 4K, pero en menos de 1 minuto — hasta 10x más rápido que el procesamiento estándar." },
  { q: "¿Hay que instalar algún programa?", a: "No. El Upscaler Arcano es 100% online. Accedé directo desde el navegador, sin instalar nada, desde cualquier computadora." },
  { q: "¿Consume créditos cada vez que uso?", a: "No. El plan Vitalicio no consume créditos. Una vez que accedés, el uso es completamente ilimitado y sin costo adicional." },
];

const realResults = [
  {
    before: "/images/mauricio-antes.webp",
    after: "/images/mauricio-depois.webp",
    name: "Maurício",
    handle: "@ventus.studio",
    text: "Como fotógrafo ya perdí muchas fotos por salir desenfocadas en la correría de las sesiones, ¡y esta herramienta literalmente me salvó!",
    avatar: "/images/mauricio-avatar.png"
  },
  {
    before: "/images/mariana-antes.webp",
    after: "/images/mariana-depois.webp",
    name: "Mariana Costa",
    handle: "@mari.visualarts",
    text: "Restauré fotos antiguas de mi familia que estaban súper pixeladas. El resultado quedó hermoso, parecían fotos nuevas.",
    avatar: "/images/mariana-avatar.png"
  },
  {
    before: "/images/rodrigo-antes.webp",
    after: "/images/rodrigo-depois.webp",
    name: "Rodrigo Mélius",
    handle: "@melius.arquitetura",
    text: "¡Ninguna otra herramienta que probé logró reproducir mis proyectos con la fidelidad que esta herramienta tiene!",
    avatar: "/images/rodrigo-avatar.png"
  }
];

const UpscalerArcanoV3 = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const heroSlides = isMobile ? heroSlidesMobile : heroSlidesDesktop;
  const { executeCheckout, isLoading, PagarmeCheckoutModal } = useCheckout({ source_page: "upscalerarcanov3-es" });

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

  // Auto-slide using direct DOM - DISABLED on mobile
  useEffect(() => {
    if (window.innerWidth <= 600) return;
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
      <main className="v3-page">
        {/* SOCIAL POPUP - isolated component */}
        <V3SocialPopup people={SOCIAL_PEOPLE_ES} times={SOCIAL_TIMES_ES} purchaseText="acaba de comprar" />

        {/* HERO */}
        <section className="v3-hero">
          <div className="v3-hero-badge">
            <span style={{ animation: "v3Blink 1.5s infinite" }}>●</span> &nbsp;Versión 3 disponible ahora
          </div>
          <h1>Foto mala es<br /><em>problema del pasado.</em></h1>
          <p className="v3-hero-sub">
            {isMobile ? (
              <>Rápido. Simple. Resultado profesional en 60 segundos.</>
            ) : (
              <>El Upscaler Arcano transforma cualquier imagen en calidad 4K con IA.<br />
              Rápido. Simple. Resultado profesional en 60 segundos.</>
            )}
          </p>

          <div className="v3-stats-row">
            <div>
              <div className="v3-stat-num">+3.2<span>mil</span></div>
              <div className="v3-stat-label">Profesionales activos</div>
            </div>
            <div className="v3-stat-divider" />
            <div>
              <div className="v3-stat-num">+14<span>mil</span></div>
              <div className="v3-stat-label">Imágenes mejoradas</div>
            </div>
            <div className="v3-stat-divider" />
            <div>
              <div className="v3-stat-num">60<span>s</span></div>
              <div className="v3-stat-label">Modo Turbo V3</div>
            </div>
          </div>

          <div className="v3-hero-micro">
            <span className="dot" />
            Acceso inmediato · Resultado en 60s · Calidad 4K
          </div>

          {/* BEFORE/AFTER SLIDER CAROUSEL */}
          <div className="v3-slider-wrapper">
            <div className="v3-slider-label">
              <span style={{ color: "var(--red)" }}>← Antes: baja calidad</span>
              <span style={{ color: "var(--cyan)" }}>Después: 4K nítido →</span>
            </div>
            <div style={{ position: "relative" }}>
              <div
                className="v3-before-after"
                ref={sliderRef}
                onMouseDown={(e) => { draggingRef.current = true; stopAuto(); updateSlider(e.clientX); }}
                onTouchStart={(e) => { draggingRef.current = true; stopAuto(); updateSlider(e.touches[0].clientX); }}
              >
                <div className="v3-ba-layer">
                  <img src={heroSlides[currentSlide].before} alt="Antes - baja calidad" width={720} height={401} fetchPriority="high" decoding="sync" />
                </div>
                <div className="v3-ba-layer" ref={afterLayerRef} style={{ clipPath: "inset(0 50% 0 0)" }}>
                  <img src={heroSlides[currentSlide].after} alt="Después - calidad 4K" width={900} height={675} fetchPriority="high" decoding="sync" />
                </div>
                <div className="v3-drag-handle" ref={handleRef} style={{ left: "50%" }}>
                  <div className="v3-drag-circle">⟺</div>
                </div>
                <div className="v3-drag-hint">⟺ Arrastrá para comparar</div>
              </div>
              <button onClick={() => goToSlide(-1)} className="v3-carousel-arrow v3-carousel-arrow-left" aria-label="Anterior">‹</button>
              <button onClick={() => goToSlide(1)} className="v3-carousel-arrow v3-carousel-arrow-right" aria-label="Siguiente">›</button>
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
        </section>

        {/* AUDIENCE */}
        <V3LazySection minHeight={400}>
        <section className="v3-audience">
          <div className="v3-audience-inner">
            <div className="v3-section-tag">¿Para quién es?</div>
            <div className="v3-section-title" style={{ marginBottom: 48 }}>Si ganás dinero con imágenes,<br /><span>¡el Upscaler Arcano es para vos!</span></div>
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
        </V3LazySection>

        {/* HOW IT WORKS */}
        <V3LazySection minHeight={600}>
        <section style={{ padding: "100px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div className="v3-section-tag">Cómo funciona</div>
            <div className="v3-section-title">3 pasos.<br /><span>Resultado profesional.</span></div>
            <div className="v3-steps">
              <div className="v3-step v3-reveal">
                <div className="v3-step-num">1</div>
                <div className="v3-step-icon-area">
                  <div className="v3-upload-anim">
                    <div className="v3-upload-box">📤 &nbsp;Soltá tu imagen acá</div>
                    <div className="v3-upload-files">
                      <div className="v3-upload-file">foto.jpg</div>
                      <div className="v3-upload-file">logo.png</div>
                      <div className="v3-upload-file">render.png</div>
                    </div>
                  </div>
                </div>
                <div className="v3-step-title">Subí tu imagen</div>
                <div className="v3-step-desc">Cualquier formato. Cualquier resolución. Hasta 10 imágenes a la vez en V3.</div>
              </div>
              <div className="v3-step v3-reveal">
                <div className="v3-step-num">2</div>
                <div className="v3-step-icon-area">
                  <div className="v3-process-anim">
                    <div className="v3-process-ring" />
                    <div className="v3-process-bar-wrap"><div className="v3-process-bar" /></div>
                    <div className="v3-process-label">IA PROCESANDO...</div>
                  </div>
                </div>
                <div className="v3-step-title">La IA trabaja</div>
                <div className="v3-step-desc">Motor exclusivo de IA analiza, amplía y refina cada detalle de la imagen.</div>
              </div>
              <div className="v3-step v3-reveal">
                <div className="v3-step-num">3</div>
                <div className="v3-step-icon-area">
                  <div className="v3-download-anim">
                    <div className="v3-download-check">✓</div>
                    <div className="v3-download-label">LISTO EN 60s</div>
                    <div className="v3-download-quality">Calidad <span>4K</span></div>
                  </div>
                </div>
                <div className="v3-step-title">Descargá en 4K</div>
                <div className="v3-step-desc">Tu imagen transformada. Individual o en lote. Descarga inmediata.</div>
              </div>
            </div>
          </div>
        </section>
        </V3LazySection>

        {/* GALLERY */}
        <V3LazySection minHeight={800}>
        <section className="v3-gallery">
          <div className="v3-section-tag">Funciona con todo</div>
          <div className="v3-section-title" style={{ marginBottom: 40 }}>Mejora imágenes<br /><span>de todo tipo</span></div>
          <div className="v3-gallery-grid">
            {galleryItems.map((item, i) => (
              <V3GalleryBeforeAfter key={i} item={item} />
            ))}
          </div>
        </section>
        </V3LazySection>

        {/* V3 FEATURES */}
        <V3LazySection minHeight={600}>
        <section className="v3-features">
          <div className="v3-features-inner">
            <div className="v3-features-header">
              <div>
                <div className="v3-badge">✦ &nbsp;Exclusivo V3</div>
                <div className="v3-section-title" style={{ marginBottom: 0 }}>Dos nuevas funciones<br /><span>recién agregadas</span></div>
              </div>
              <p style={{ maxWidth: 280, color: "var(--muted2)", fontSize: 15, lineHeight: 1.6 }}>
                La versión 3 llegó con dos innovaciones que cambian completamente tu flujo de trabajo.
              </p>
            </div>

            <div className="v3-feature-cards">
              {/* TURBO */}
              <div className="v3-feature-card turbo v3-reveal">
                <div className="v3-feature-visual" style={{ position: "relative" }}>
                  <img src={turboBgImage} alt="" width={600} height={300} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.2, zIndex: 0, pointerEvents: "none" }} loading="lazy" decoding="async" />
                  <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                    <div className="v3-turbo-ring">
                      <svg viewBox="0 0 168 168"><circle cx="84" cy="84" r="78" /></svg>
                      <div>
                        <V3TurboCountdown />
                        <div className="v3-turbo-unit">segundos</div>
                      </div>
                    </div>
                    <div className="v3-turbo-speed">⚡ 10x más rápido</div>
                  </div>
                </div>
                <div className="v3-feature-content">
                  <div className="v3-feature-label">⚡ Modo Turbo</div>
                  <div className="v3-feature-title">Resultado en menos de 1 minuto</div>
                  <div className="v3-feature-desc">Mientras el cliente todavía está en WhatsApp, la imagen ya está lista. Mismo motor de IA. Misma calidad 4K. Solo que ahora en tiempo récord.</div>
                  <div className="v3-feature-pills">
                    <span className="v3-pill">Velocidad 10x</span>
                    <span className="v3-pill">4K preservado</span>
                    <span className="v3-pill">Entregas urgentes</span>
                  </div>
                </div>
              </div>

              {/* BATCH */}
              <div className="v3-feature-card batch v3-reveal">
                <div className="v3-feature-visual" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "100%", padding: 24 }}>
                    <V3BatchGrid />
                  </div>
                </div>
                <div className="v3-feature-content">
                  <div className="v3-feature-label" style={{ color: "#9B6FFF" }}>🗂 Upscale en Lote</div>
                  <div className="v3-feature-title">Hasta 10 imágenes simultáneas</div>
                  <div className="v3-feature-desc">Basta de procesar una por una. Seleccioná todo de una vez, hacé clic una vez, y dejá que la IA trabaje mientras descansás.</div>
                  <div className="v3-feature-pills">
                    <span className="v3-pill">10 imágenes juntas</span>
                    <span className="v3-pill">Procesamiento paralelo</span>
                    <span className="v3-pill">Descarga en lote</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        </V3LazySection>

        {/* SOCIAL PROOF */}
        <V3LazySection minHeight={500}>
        <section className="v3-proof">
          <div className="v3-section-tag">Resultados reales</div>
          <div className="v3-section-title" style={{ marginBottom: 48 }}>Números que<br /><span>hablan por sí solos.</span></div>

          <div className="v3-proof-numbers">
            <div className="v3-proof-num-card">
              <div className="v3-proof-number cyan" data-target="3200">0</div>
              <div className="v3-proof-num-label">Profesionales que ya usan Arcano</div>
            </div>
            <div className="v3-proof-num-card">
              <div className="v3-proof-number gold" data-target="14000">0</div>
              <div className="v3-proof-num-label">Imágenes mejoradas con éxito</div>
            </div>
            <div className="v3-proof-num-card">
              <div className="v3-proof-number green" data-target="100">0</div>
              <div className="v3-proof-num-label">% de satisfacción de los clientes</div>
            </div>
          </div>
        </section>
        </V3LazySection>

        {/* RESULTADOS REAIS DE USUÁRIOS */}
        <V3LazySection minHeight={600}>
        <section className="v3-real-results">
          <div className="v3-real-results-inner">
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <div className="v3-section-tag" style={{ display: "inline-block" }}>Resultados Reales</div>
              <div className="v3-section-title" style={{ marginTop: 12 }}>Mirá lo que nuestros usuarios<br /><span>están logrando.</span></div>
              <p style={{ fontSize: 16, color: "var(--muted2)", marginTop: 12, maxWidth: 600, margin: "12px auto 0" }}>
                Antes y después reales enviados por profesionales que usan el Upscaler Arcano todos los días.
              </p>
            </div>

            <div className="v3-real-grid">
              {realResults.map((item, i) => (
                <V3RealResultCard key={i} item={item} beforeLabel="ANTES" afterLabel="DESPUÉS" />
              ))}
            </div>
          </div>
        </section>
        </V3LazySection>

        {/* PRICING */}
        <section className="v3-pricing" id="v3-pricing">
          <div className="v3-pricing-inner">
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div className="v3-section-tag" style={{ display: "inline-block" }}>Oferta por tiempo limitado</div>
              <div className="v3-section-title" style={{ marginTop: 12 }}>Empezá ahora.<br /><span>Acceso inmediato.</span></div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 12, marginTop: 20,
                background: "rgba(245,200,66,0.1)", border: "1px solid rgba(245,200,66,0.3)",
                borderRadius: 12, padding: "12px 24px",
              }}>
                <span style={{ fontSize: 18 }}>🔥</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 13, color: "var(--muted2)", fontWeight: 500 }}>Esta promo se termina en:</div>
                  <V3PromoCountdown />
                </div>
              </div>
            </div>

            {/* Desktop: two columns side by side */}
            <div className="v3-pricing-guarantee-row">
              {/* LEFT: Price card */}
              <div className="v3-pricing-card-col">
                <div className="v3-plan v3-plan-lifetime v3-reveal" style={{ textAlign: "center", height: "100%", display: "flex", flexDirection: "column" }}>
                  <div className="v3-plan-popular v3-plan-popular-gold">♾ Vitalicio</div>
                  
                  {/* Price hero block */}
                  <div style={{ 
                    background: "linear-gradient(135deg, rgba(245,200,66,0.08), rgba(245,200,66,0.02))",
                    border: "1px solid rgba(245,200,66,0.15)",
                    borderRadius: 16, padding: "28px 20px 20px", margin: "8px 0 20px", textAlign: "center"
                  }}>
                    <div style={{ fontSize: 13, color: "var(--muted)", textDecoration: "line-through", fontWeight: 500, marginBottom: 8 }}>$49,90 USD</div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: "#f5c842" }}>$</span>
                      <span style={{ fontSize: 56, fontWeight: 800, color: "var(--white)", lineHeight: 1, letterSpacing: "-2px" }}>19</span>
                      <span style={{ fontSize: 24, fontWeight: 700, color: "#f5c842" }}>,90</span>
                      <span style={{ fontSize: 14, color: "var(--muted2)", fontWeight: 600, marginLeft: 6, alignSelf: "center" }}>USD</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 8, fontWeight: 500 }}>Pagás una vez · usás para siempre</div>
                  </div>

                  <button className="v3-plan-cta filled v3-plan-cta-gold" onClick={() => executeCheckout("upscaler-arcano-v3-es")} disabled={isLoading}>{isLoading ? 'Procesando...' : 'Obtener Vitalicio →'}</button>
                  <div className="v3-plan-divider" />
                  <div style={{ flex: 1 }}>
                    <div className="v3-plan-feature"><span className="check">✓</span> <strong style={{ color: "var(--white)" }}>Uso ilimitado · sin créditos</strong></div>
                    <div className="v3-plan-feature"><span className="check">✓</span> <span className="special">Modo Turbo V3</span></div>
                    <div className="v3-plan-feature"><span className="check">✓</span> <span className="special">Upscale en Lote V3</span></div>
                    <div className="v3-plan-feature"><span className="check">✓</span> Todas las actualizaciones futuras</div>
                    <div className="v3-plan-feature"><span className="check">✓</span> Soporte prioritario vía WhatsApp</div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Guarantee card (desktop only) */}
              <div className="v3-guarantee-card-col v3-pricing-guarantee-desktop">
                <div style={{
                  height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 20, padding: "40px 32px", textAlign: "center",
                }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))",
                    border: "1px solid rgba(34,197,94,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28,
                  }}>
                    <ShieldCheck size={40} strokeWidth={1.8} style={{ color: "#22c55e" }} />
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: "var(--white)", marginBottom: 16 }}>Garantía de 7 días</div>
                  <div style={{ fontSize: 15, color: "var(--muted2)", lineHeight: 1.8, marginBottom: 24, maxWidth: 300 }}>
                    Si no te gusta el resultado, te devolvemos el 100% de tu dinero. Sin preguntas, sin burocracia. Es confianza total en lo que entregamos.
                  </div>
                  <span style={{
                    display: "inline-block", padding: "10px 24px", borderRadius: 10,
                    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
                    color: "#22c55e", fontSize: 14, fontWeight: 700, letterSpacing: 0.5,
                  }}>✓ RIESGO CERO</span>
                </div>
              </div>
            </div>

            {/* Mobile: guarantee below (hidden on desktop via CSS) */}
            <div className="v3-pricing-guarantee-mobile">
              <div className="v3-guarantee-card" style={{ textAlign: "center" }}>
                <div className="v3-guarantee-icon-wrap" style={{ margin: "0 auto 12px" }}>
                  <ShieldCheck size={32} strokeWidth={1.8} />
                </div>
                <div className="v3-guarantee-title">Garantía de 7 días</div>
                <div className="v3-guarantee-text">Si no te gusta el resultado, te devolvemos el 100% de tu dinero. Sin preguntas, sin burocracia.</div>
                <span className="v3-guarantee-badge">✓ RIESGO CERO</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <V3LazySection minHeight={400}>
        <section className="v3-faq">
          <div className="v3-faq-inner">
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <div className="v3-section-tag" style={{ display: "inline-block" }}>Preguntas frecuentes</div>
              <div className="v3-section-title" style={{ marginTop: 12 }}>Todo lo que<br /><span>necesitás saber.</span></div>
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
        </V3LazySection>

        {/* FINAL CTA */}
        <V3LazySection minHeight={300}>
        <section className="v3-final-cta">
          <h2>Tu próxima imagen<br />merece ser <em>perfecta.</em></h2>
          <p>+3.200 profesionales ya lo saben. Ahora es tu turno.</p>
          <button className="v3-btn-primary" onClick={scrollToPrice} style={{ display: "inline-flex" }}>
            Quiero el Upscaler Arcano V3 <span>→</span>
          </button>
          <div className="v3-final-trust">
            <div className="v3-trust-item"><span style={{ color: "var(--green)", fontSize: 16 }}>✓</span> Acceso inmediato</div>
            <div className="v3-trust-item"><span style={{ color: "var(--green)", fontSize: 16 }}>✓</span> Sin mensualidad</div>
            <div className="v3-trust-item"><span style={{ color: "var(--green)", fontSize: 16 }}>✓</span> Resultado en 60s</div>
            <div className="v3-trust-item"><span style={{ color: "var(--green)", fontSize: 16 }}>✓</span> Pagás una vez</div>
          </div>
        </section>
        </V3LazySection>

        <footer className="v3-footer">
          <span>© 2026 Upscaler Arcano · Todos los derechos reservados</span>
        </footer>
      </main>
      <PagarmeCheckoutModal />
    </>
  );
};

export default UpscalerArcanoV3;
