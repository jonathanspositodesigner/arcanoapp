import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Gift } from "lucide-react";
import { useCallback } from "react";

// URLs das artes de Carnaval
const artesCarnaval = [
  "https://voxvisual.com.br/wp-content/uploads/2026/01/AQUECIMENTO-DE-CARNAVAL-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2026/01/WE-LOVE-PAGODAO-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/01/Bloquinho-do-Leo.jpg",
  "https://voxvisual.com.br/wp-content/uploads/2025/01/BLOCO-LOUCO.jpg",
  "https://voxvisual.com.br/wp-content/uploads/2025/01/BLOCO-DO-KEVINHO.jpg",
  "https://voxvisual.com.br/wp-content/uploads/2025/01/BAILE-DA-SANTINHA.jpg",
  "https://voxvisual.com.br/wp-content/uploads/2025/01/AGENDA-DE-CARNAVAL-2.jpg",
];

export const BonusFimDeAnoSection = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className="py-16 md:py-28 px-4 bg-gradient-to-br from-[#EF672C] via-[#d4451a] to-[#8B0000] relative isolate overflow-hidden">
      {/* Decorative glow effects - z-0 para ficar ATRÁS do conteúdo */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-3xl" />
      </div>

      {/* Conteúdo principal - z-10 para ficar NA FRENTE dos glows */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          {/* Badge with icons */}
          <div className="inline-flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <div 
              className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center animate-pulse"
              style={{ backgroundColor: '#000000' }}
            >
              <Gift className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span 
              className="text-white font-bold text-sm md:text-lg px-5 md:px-6 py-2 md:py-2.5 rounded-full shadow-xl whitespace-nowrap"
              style={{ backgroundColor: '#000000' }}
            >
              🎭 Bônus de Carnaval
            </span>
            <div 
              className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center animate-pulse"
              style={{ backgroundColor: '#000000' }}
            >
              <Gift className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
          
          {/* Main title */}
          <h2 className="text-xl md:text-4xl font-bold mb-4 px-2">
            <span className="text-white drop-shadow-lg">Adquirindo hoje você leva</span>
            <br />
            <span className="text-white drop-shadow-lg">também </span>
            <span className="font-black" style={{ color: '#000000' }}>nosso Pack</span>
            <br className="md:hidden" />
            <span className="font-black" style={{ color: '#000000' }}> Especial de Carnaval</span>
          </h2>
          <p className="text-white/90 text-base md:text-lg px-4 drop-shadow-md">
            +35 artes de Carnaval para você faturar mais no início do ano
          </p>
        </div>
        
        {/* Mobile: image full, arrows overlay. Desktop: arrows outside. */}
        <div className="relative md:flex md:items-center md:gap-4 px-6 md:px-0">
          {/* Desktop left */}
          <button
            onClick={scrollPrev}
            className="hidden md:inline-flex flex-shrink-0 hover:bg-yellow-300 hover:text-black text-white p-2.5 md:p-3 rounded-full transition-colors"
            style={{ backgroundColor: '#000000' }}
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Viewport */}
          <div className="overflow-hidden md:flex-1" ref={emblaRef}>
            <div className="flex md:-ml-4">
              {artesCarnaval.map((arte, index) => (
                <div
                  key={index}
                  className="flex-none shrink-0 basis-full md:basis-auto md:w-[280px] flex justify-center px-0 md:pl-4"
                >
                  <img
                    src={arte}
                    alt={`Arte Carnaval ${index + 1}`}
                    className="w-full max-w-[280px] md:w-full md:max-w-none h-auto object-contain rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Desktop right */}
          <button
            onClick={scrollNext}
            className="hidden md:inline-flex flex-shrink-0 hover:bg-yellow-300 hover:text-black text-white p-2.5 md:p-3 rounded-full transition-colors"
            style={{ backgroundColor: '#000000' }}
            aria-label="Próximo"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Mobile overlay buttons */}
          <button
            onClick={scrollPrev}
            className="md:hidden absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 rounded-full border border-white/10 transition-colors z-10"
            style={{ backgroundColor: '#000000' }}
            aria-label="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={scrollNext}
            className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 rounded-full border border-white/10 transition-colors z-10"
            style={{ backgroundColor: '#000000' }}
            aria-label="Próximo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
