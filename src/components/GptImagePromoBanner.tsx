import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROMO_START_KEY = "gpt_image_promo_start";
const PROMO_DISMISSED_KEY = "gpt_image_promo_dismissed";
const PROMO_DURATION_DAYS = 7;

const getPromoStart = (): number => {
  const stored = localStorage.getItem(PROMO_START_KEY);
  if (stored) return parseInt(stored, 10);
  const now = Date.now();
  localStorage.setItem(PROMO_START_KEY, String(now));
  return now;
};

const GptImagePromoBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem(PROMO_DISMISSED_KEY) === "true") return;

    const start = getPromoStart();
    const end = start + PROMO_DURATION_DAYS * 24 * 60 * 60 * 1000;

    const tick = () => {
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setIsVisible(false);
        return;
      }
      setIsVisible(true);
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="relative overflow-hidden" style={{ background: "linear-gradient(90deg, #ff0059 0%, #cc0047 50%, #99003a 100%)" }}>
      {/* Shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-[shimmer_3s_ease-in-out_infinite] -translate-x-full" />

      <div className="container mx-auto px-4 py-2.5 sm:py-2">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 relative pr-8 sm:pr-0">
          {/* Icon + Title */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
            <span className="text-white text-xs sm:text-sm font-bold uppercase tracking-wide">
              Oferta Especial
            </span>
          </div>

          {/* Description */}
          <p className="text-white/90 text-[11px] sm:text-sm font-medium text-center leading-tight">
            <span className="font-bold text-yellow-200">GPT Image Ilimitado</span> por 7 dias!
          </p>

          {/* Countdown */}
          <div className="flex items-center gap-1">
            {[
              { val: timeLeft.days, label: "d" },
              { val: timeLeft.hours, label: "h" },
              { val: timeLeft.minutes, label: "m" },
              { val: timeLeft.seconds, label: "s" },
            ].map((unit, i) => (
              <div key={i} className="flex items-center">
                <span className="bg-black/30 text-white font-mono text-xs sm:text-sm font-bold px-1.5 py-0.5 rounded">
                  {pad(unit.val)}
                </span>
                <span className="text-white/70 text-[10px] ml-0.5 mr-1">{unit.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button
            size="sm"
            onClick={() => navigate("/planos-2")}
            className="bg-white text-[#ff0059] hover:bg-white/90 text-xs font-bold h-7 px-3 shrink-0"
          >
            Saiba Mais
          </Button>
        </div>

        {/* Close */}
        <button
          onClick={() => {
            setIsVisible(false);
            localStorage.setItem(PROMO_DISMISSED_KEY, "true");
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
};

export default GptImagePromoBanner;