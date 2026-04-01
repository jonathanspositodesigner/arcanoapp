/**
 * Isolated components for Upscaler V3 pages.
 * Each component manages its own state/timers to avoid
 * re-rendering the entire page on every tick.
 */
import { memo, useEffect, useRef, useState } from "react";

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
  purchaseText: string; // e.g. "acabou de comprar" or "acaba de comprar"
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 600);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`v3-sticky-cta ${visible ? "visible" : ""}`}>
      <div style={{ fontSize: 14, color: "var(--muted2)" }}>
        <strong style={{ color: "var(--white)", fontFamily: "'Syne', sans-serif" }}>{label}</strong>
        {!isMobile && desktopSuffix && <> — {desktopSuffix}</>}
      </div>
      <button className="v3-sticky-btn" onClick={scrollToPrice}>
        {isMobile ? mobileButtonText : desktopButtonText}
      </button>
    </div>
  );
});
V3StickyBar.displayName = "V3StickyBar";
