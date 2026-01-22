import { useState } from "react";
import { Sparkles } from "lucide-react";

interface HeroPlaceholderProps {
  onReveal: () => void;
  buttonText: string;
  locale?: "pt" | "es";
  isMobile?: boolean;
}

export const HeroPlaceholder = ({ onReveal, buttonText, locale = "pt", isMobile = true }: HeroPlaceholderProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleReveal = () => {
    if (isLoading) return;
    setIsLoading(true);

    // Preload mobile-optimized images when user clicks (600x900 ~70KB each)
    const antesPath = isMobile 
      ? "/images/upscaler-hero-antes-mobile.webp"
      : "/images/upscaler-hero-antes.webp";
    const depoisPath = isMobile
      ? "/images/upscaler-hero-depois-mobile.webp"
      : "/images/upscaler-hero-depois.webp";

    const imgBefore = new Image();
    const imgAfter = new Image();
    imgBefore.src = antesPath;
    imgAfter.src = depoisPath;

    // Wait for both images to load, then reveal
    Promise.all([
      new Promise<void>((res) => { imgBefore.onload = () => res(); imgBefore.onerror = () => res(); }),
      new Promise<void>((res) => { imgAfter.onload = () => res(); imgAfter.onerror = () => res(); })
    ]).then(() => {
      onReveal();
    });
  };

  return (
    <div 
      className="relative w-full aspect-[2/3] rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl shadow-fuchsia-500/10 cursor-pointer"
      onClick={handleReveal}
    >
      {/* Imagem de preview como background */}
      <img 
        src="/images/upscaler-hero-preview.webp"
        alt={locale === "es" ? "Vista previa del resultado del Upscaler" : "Preview do resultado do Upscaler"}
        className="w-full h-full object-cover"
        loading="eager"
        fetchPriority="high"
      />
      
      {/* Botão pulsante centralizado na frente da imagem */}
      <div className="absolute inset-0 flex items-center justify-center">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleReveal();
          }}
          disabled={isLoading}
          className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-semibold rounded-full shadow-xl shadow-fuchsia-500/30 transition-transform ${
            isLoading ? 'opacity-80' : 'animate-pulse hover:animate-none hover:scale-105'
          }`}
        >
          {isLoading ? (
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          {isLoading ? (locale === "es" ? "Cargando..." : "Carregando...") : buttonText}
        </button>
      </div>
    </div>
  );
};
