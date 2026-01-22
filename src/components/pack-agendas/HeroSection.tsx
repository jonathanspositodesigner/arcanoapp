import { Button } from "@/components/ui/button";
import { Sparkles, ArrowDown } from "lucide-react";

interface HeroSectionProps {
  onCtaClick: () => void;
}

export const HeroSection = ({ onCtaClick }: HeroSectionProps) => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-black via-zinc-900 to-black">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,119,198,0.1),transparent_50%)]" />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300 font-medium">Pack Exclusivo 2024</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Pack{" "}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                +60 Artes de Agendas
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-400 mb-8 max-w-xl mx-auto lg:mx-0">
              Artes profissionais 100% editáveis no Canva e Photoshop para você lucrar com agendas personalizadas
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <Button 
                size="lg" 
                onClick={onCtaClick}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg shadow-purple-500/25 transition-all hover:scale-105"
              >
                Quero o Pack Completo
                <ArrowDown className="w-5 h-5 ml-2" />
              </Button>
            </div>
            
            {/* Price highlight */}
            <div className="flex items-center gap-4 justify-center lg:justify-start">
              <div className="text-zinc-500 line-through text-xl">R$ 197</div>
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-2xl">
                R$ 37
              </div>
              <div className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium">
                -81% OFF
              </div>
            </div>
          </div>
          
          {/* Right content - Placeholder for mockup image */}
          <div className="flex-1 relative">
            <div className="relative w-full max-w-lg mx-auto">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 blur-3xl rounded-full" />
              
              {/* Placeholder for pack image */}
              <div className="relative bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl border border-zinc-700/50 p-8 aspect-square flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-zinc-400 text-sm">Imagem do Pack</p>
                  <p className="text-zinc-500 text-xs mt-1">Faça upload via Lovable</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ArrowDown className="w-6 h-6 text-zinc-500" />
      </div>
    </section>
  );
};
