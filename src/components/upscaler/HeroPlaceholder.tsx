import { Sparkles } from "lucide-react";

interface HeroPlaceholderProps {
  onReveal: () => void;
  buttonText: string;
  locale?: "pt" | "es";
}

export const HeroPlaceholder = ({ onReveal, buttonText, locale = "pt" }: HeroPlaceholderProps) => {
  return (
    <div 
      className="relative w-full aspect-[3/4] md:aspect-[2/3] rounded-3xl overflow-hidden border-2 border-border shadow-2xl shadow-primary/5 cursor-pointer"
      onClick={onReveal}
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
            onReveal();
          }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-500 text-white font-semibold rounded-full shadow-xl shadow-primary/10 transition-transform animate-pulse hover:animate-none hover:scale-105"
        >
          <Sparkles className="h-5 w-5" />
          {buttonText}
        </button>
      </div>
    </div>
  );
};