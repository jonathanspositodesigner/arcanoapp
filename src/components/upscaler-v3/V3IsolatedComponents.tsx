/**
 * Isolated components for Upscaler V3 pages.
 * Each component manages its own state/timers to avoid
 * re-rendering the entire page on every tick.
 */
import { memo, useEffect, useRef, useState, useCallback } from "react";

/* ─── Turbo Countdown ─── */
export const V3TurboCountdown = memo(() => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let count = 60;
    const interval = setInterval(() => {
      count = count <= 0 ? 60 : count - 1;
      if (ref.current) ref.current.textContent = String(count);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return <div ref={ref} className="v3-turbo-count">60</div>;
});
V3TurboCountdown.displayName = "V3TurboCountdown";

/* ─── Batch Grid Animation ─── */
const BATCH_EMOJIS = ["🏔️", "🎸", "👗", "🍕", "🏠", "💍", "🚗", "🌺", "📱", "🎨"];

export const V3BatchGrid = memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const cells = containerRef.current.children;
    let idx = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const reset = () => {
      for (let i = 0; i < cells.length; i++) cells[i].classList.remove("loaded");
    };
    const loadNext = () => {
      if (idx < 10) {
        cells[idx]?.classList.add("loaded");
        idx++;
        timeout = setTimeout(loadNext, 300);
      } else {
        timeout = setTimeout(() => {
          reset();
          idx = 0;
          timeout = setTimeout(loadNext, 800);
        }, 2000);
      }
    };
    timeout = setTimeout(loadNext, 2000);
    return () => clearTimeout(timeout);
  }, []);
  return (
    <div ref={containerRef} className="v3-batch-grid">
      {BATCH_EMOJIS.map((emoji, i) => (
        <div key={i} className="v3-batch-img">{emoji}</div>
      ))}
    </div>
  );
});
V3BatchGrid.displayName = "V3BatchGrid";

/* ─── Social Proof Popup ─── */
interface SocialPerson { name: string; initial: string; city: string }
interface V3SocialPopupProps {
  people: SocialPerson[];
  times: string[];
  purchaseText: string;
}

export const V3SocialPopup = memo(({ people, times, purchaseText }: V3SocialPopupProps) => {
  const [data, setData] = useState<{ name: string; initial: string; time: string; city: string } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let idx = Math.floor(Math.random() * people.length);
    let intervalId: ReturnType<typeof setTimeout>;
    const show = () => {
      const person = people[idx % people.length];
      setData({ ...person, time: times[Math.floor(Math.random() * times.length)] });
      setVisible(true);
      idx++;
      setTimeout(() => setVisible(false), 4000);
      const nextDelay = 6000 + Math.random() * 12000;
      intervalId = setTimeout(show, nextDelay);
    };
    const initialDelay = setTimeout(() => show(), 3000 + Math.random() * 4000);
    return () => { clearTimeout(initialDelay); clearTimeout(intervalId); };
  }, [people, times]);

  if (!data) return null;

  return (
    <div className={`v3-social-popup ${visible ? 'v3-notif-visible' : 'v3-notif-hidden'}`}>
      <div className="v3-popup-avatar">{data.initial}</div>
      <div>
        <strong style={{ color: "#fff", display: "block", fontSize: 13 }}>{data.name} {purchaseText}</strong>
        <span style={{ color: "var(--muted2)", fontSize: 12 }}>{data.time} · {data.city}</span>
      </div>
      <div className="v3-popup-dot" />
    </div>
  );
});
V3SocialPopup.displayName = "V3SocialPopup";

/* ─── Sticky CTA Bar ─── */
interface V3StickyBarProps {
  scrollToPrice: () => void;
  label: string;
  desktopSuffix?: string;
  mobileButtonText: string;
  desktopButtonText: string;
}

export const V3StickyBar = memo(({ scrollToPrice, label, desktopSuffix, mobileButtonText, desktopButtonText }: V3StickyBarProps) => {
  const [visible, setVisible] = useState(false);
  const isMobileRef = useRef(typeof window !== 'undefined' && window.innerWidth <= 600);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`v3-sticky-cta ${visible ? "visible" : ""}`}>
      <div style={{ fontSize: 14, color: "var(--muted2)" }}>
        <strong style={{ color: "var(--white)", fontFamily: "'Syne', sans-serif" }}>{label}</strong>
        {!isMobileRef.current && desktopSuffix && <> — {desktopSuffix}</>}
      </div>
      <button className="v3-sticky-btn" onClick={scrollToPrice}>
        {isMobileRef.current ? mobileButtonText : desktopButtonText}
      </button>
    </div>
  );
});
V3StickyBar.displayName = "V3StickyBar";

/* ─── 30-min Countdown (ES page) ─── */
export const V3PromoCountdown = memo(() => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let count = 30 * 60;
    const interval = setInterval(() => {
      if (count <= 0) { clearInterval(interval); return; }
      count--;
      const m = Math.floor(count / 60);
      const s = count % 60;
      if (ref.current) ref.current.textContent = `00:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div ref={ref} style={{ fontSize: 28, fontWeight: 800, color: "#F5C842", fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: 2, fontVariantNumeric: "tabular-nums" }}>
      00:30:00
    </div>
  );
});
V3PromoCountdown.displayName = "V3PromoCountdown";

/* ─── Gallery Before/After Slider (DOM-only, no React state) ─── */
interface GalleryItemData { before: string; after: string; label: string; desc: string; badge?: string }

export const V3GalleryBeforeAfter = memo(({ item }: { item: GalleryItemData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 5), 95);
    if (afterRef.current) afterRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    if (lineRef.current) lineRef.current.style.left = `${pct}%`;
  }, []);

  // Only add global listeners during drag
  const startDrag = useCallback((clientX: number) => {
    dragging.current = true;
    update(clientX);
    const onMove = (e: MouseEvent) => { if (dragging.current) update(e.clientX); };
    const onTouchMove = (e: TouchEvent) => { if (dragging.current) update(e.touches[0].clientX); };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onUp);
  }, [update]);

  return (
    <div className="v3-gallery-item v3-reveal">
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", position: "relative", cursor: "ew-resize", userSelect: "none" }}
        onMouseDown={(e) => startDrag(e.clientX)}
        onTouchStart={(e) => startDrag(e.touches[0].clientX)}
      >
        <img src={item.before} alt={`${item.label} antes`} width={400} height={667} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" decoding="async" />
        <div ref={afterRef} style={{ position: "absolute", inset: 0, clipPath: "inset(0 50% 0 0)" }}>
          <img src={item.after} alt={`${item.label} depois`} width={400} height={667} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" decoding="async" />
        </div>
        <div ref={lineRef} style={{ position: "absolute", top: 0, bottom: 0, left: "50%", transform: "translateX(-50%)", width: 2, background: "rgba(255,255,255,0.7)", zIndex: 5 }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 24, height: 24, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", fontSize: 10, color: "#000", fontWeight: 700 }}>⟺</div>
        </div>
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
});
V3GalleryBeforeAfter.displayName = "V3GalleryBeforeAfter";

/* ─── Real Result Card with Before/After (DOM-only) ─── */
interface RealResultData { before: string; after: string; name: string; handle: string; text: string; avatar: string }

export const V3RealResultCard = memo(({ item, beforeLabel, afterLabel }: { item: RealResultData; beforeLabel?: string; afterLabel?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 5), 95);
    if (afterRef.current) afterRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    if (lineRef.current) lineRef.current.style.left = `${pct}%`;
  }, []);

  const startDrag = useCallback((clientX: number) => {
    dragging.current = true;
    update(clientX);
    const onMove = (e: MouseEvent) => { if (dragging.current) update(e.clientX); };
    const onTouchMove = (e: TouchEvent) => { if (dragging.current) update(e.touches[0].clientX); };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onUp);
  }, [update]);

  return (
    <div className="v3-real-card v3-reveal">
      <div
        ref={containerRef}
        className="v3-real-card-slider"
        onMouseDown={(e) => startDrag(e.clientX)}
        onTouchStart={(e) => startDrag(e.touches[0].clientX)}
      >
        <img src={item.before} alt={`${item.name} antes`} width={400} height={600} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" decoding="async" />
        <div ref={afterRef} style={{ position: "absolute", inset: 0, clipPath: "inset(0 50% 0 0)" }}>
          <img src={item.after} alt={`${item.name} depois`} width={400} height={600} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" decoding="async" />
        </div>
        <div ref={lineRef} className="v3-real-handle-line" style={{ left: "50%" }}>
          <div className="v3-real-handle-knob">⟺</div>
        </div>
        <div className="v3-real-label" style={{ left: 8 }}>{beforeLabel || "Antes"}</div>
        <div className="v3-real-label" style={{ right: 8 }}>{afterLabel || "Depois"}</div>
      </div>
      <div className="v3-real-card-info">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={item.avatar} alt={item.name} width={40} height={40} className="v3-real-card-avatar" loading="lazy" decoding="async" />
          <div>
            <div className="v3-real-card-name">{item.name}</div>
            <div className="v3-real-card-handle">{item.handle}</div>
          </div>
        </div>
        <p className="v3-real-card-text">"{item.text}"</p>
      </div>
    </div>
  );
});
V3RealResultCard.displayName = "V3RealResultCard";

/* ─── Lazy Section Wrapper ─── */
export const V3LazySection = memo(({ children, minHeight = 400 }: { children: React.ReactNode; minHeight?: number }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { rootMargin: "300px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? children : <div style={{ minHeight, background: "var(--bg)" }} />}
    </div>
  );
});
V3LazySection.displayName = "V3LazySection";
