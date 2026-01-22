import { Sparkles } from "lucide-react";

interface HeroPlaceholderProps {
  onReveal: () => void;
  buttonText: string;
  locale?: "pt" | "es";
}

export const HeroPlaceholder = ({ onReveal, buttonText, locale = "pt" }: HeroPlaceholderProps) => {
  const beforeLabel = locale === "es" ? "ANTES" : "ANTES";
  const afterLabel = locale === "es" ? "DESPUÉS" : "DEPOIS";

  return (
    <div 
      className="relative w-full aspect-[2/3] rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl shadow-fuchsia-500/10 cursor-pointer"
      onClick={onReveal}
    >
      {/* Blur placeholder background - CSS only */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-fuchsia-800/40 to-purple-900/60" />
      
      {/* Shimmer animation overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      
      {/* Simulated blur spots */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-fuchsia-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-pink-500/15 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
      </div>
      
      {/* Slider line simulation */}
      <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/30 -translate-x-1/2" />
      
      {/* Before/After badges */}
      <div className="absolute top-4 left-4 bg-black/50 text-white/60 text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
        {beforeLabel}
      </div>
      <div className="absolute top-4 right-4 bg-fuchsia-500/50 text-white/60 text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
        {afterLabel}
      </div>
      
      {/* Pulsing CTA button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <button 
          onClick={onReveal}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-semibold rounded-full shadow-xl shadow-fuchsia-500/30 animate-pulse hover:animate-none hover:scale-105 transition-transform"
        >
          <Sparkles className="h-5 w-5" />
          {buttonText}
        </button>
      </div>
    </div>
  );
};
