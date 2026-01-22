import { Button } from "@/components/ui/button";
import { Sparkles, ArrowDown } from "lucide-react";

interface HeroSectionProps {
  onCtaClick: () => void;
}

export const HeroSection = ({ onCtaClick }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(234,88,12,0.1),transparent_50%)]" />
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src="https://voxvisual.com.br/wp-content/uploads/2025/03/LOGO-AGENDAS-H.png"
            alt="Pack Agendas Logo"
            className="h-16 md:h-20 w-auto"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-full px-4 py-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-orange-300 font-medium">Pack Exclusivo 2025</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              +60 Artes de{" "}
              <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                Agendas
              </span>{" "}
              para Festas e Eventos
            </h1>
            
            <p className="text-lg text-zinc-400 max-w-xl">
              Templates profissionais 100% editáveis no Canva e Photoshop. 
              Economize horas de trabalho com designs prontos para usar.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                onClick={onCtaClick}
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-105"
              >
                Quero Meu Pack Agora
              </Button>
            </div>
            
            {/* Price highlight */}
            <div className="flex items-center gap-4 justify-center lg:justify-start">
              <div className="text-zinc-500 line-through text-xl">R$ 197</div>
              <div className="text-4xl font-bold text-white">R$ 37</div>
              <div className="bg-green-500/20 text-green-400 text-sm font-semibold px-3 py-1 rounded-full">
                -81% OFF
              </div>
            </div>
          </div>
          
          {/* Right content - Pack image */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 blur-3xl rounded-full" />
            <div className="relative">
              <img 
                src="https://voxvisual.com.br/wp-content/uploads/2025/03/IMG-INICIO.png"
                alt="Pack +60 Artes de Agendas"
                className="relative w-full h-auto rounded-2xl drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ArrowDown className="w-6 h-6 text-zinc-500" />
        </div>
      </div>
    </section>
  );
};
