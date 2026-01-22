import { Sparkles } from "lucide-react";

interface HeroPlaceholderProps {
  onReveal: () => void;
  buttonText: string;
  locale?: "pt" | "es";
}

export const HeroPlaceholder = ({ onReveal, buttonText, locale = "pt" }: HeroPlaceholderProps) => {
  return (
    <div 
      className="relative w-full flex flex-col items-center gap-4 cursor-pointer"
      onClick={onReveal}
    >
      {/* Botão pulsante no topo */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onReveal();
        }}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-semibold rounded-full shadow-xl shadow-fuchsia-500/30 animate-pulse hover:animate-none hover:scale-105 transition-transform z-10"
      >
        <Sparkles className="h-5 w-5" />
        {buttonText}
      </button>
      
      {/* Imagem de preview real abaixo do botão */}
      <div className="w-full aspect-[2/3] rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl shadow-fuchsia-500/10">
        <img 
          src="/images/upscaler-hero-preview.webp"
          alt={locale === "es" ? "Vista previa del resultado del Upscaler" : "Preview do resultado do Upscaler"}
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
      </div>
    </div>
  );
};
