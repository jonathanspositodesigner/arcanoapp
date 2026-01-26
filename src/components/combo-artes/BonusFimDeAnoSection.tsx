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
    align: "start",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-[#0a0505] to-black">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          {/* Badge with icons */}
          <div className="inline-flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-[#EF672C]/20 flex items-center justify-center">
              <Gift className="w-6 h-6 text-[#EF672C]" />
            </div>
            <span className="bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white font-bold text-base md:text-lg px-6 py-2.5 rounded-full shadow-lg">
              Bônus de Carnaval
            </span>
            <div className="w-12 h-12 rounded-full bg-[#EF672C]/20 flex items-center justify-center">
              <Gift className="w-6 h-6 text-[#EF672C]" />
            </div>
          </div>
          
          {/* Main title */}
          <h2 className="text-2xl md:text-4xl font-bold mb-4">
            <span className="text-white">Adquirindo hoje você leva também</span>
            <br />
            <span className="text-[#EF672C]">nosso Pack Especial de Carnaval</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg">
            +35 artes de Carnaval para você faturar mais no início do ano
          </p>
        </div>
        
        {/* Carousel */}
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-4">
              {artesCarnaval.map((arte, index) => (
                <div
                  key={index}
                  className="flex-none w-[280px] md:w-[320px]"
                >
                  <img
                    src={arte}
                    alt={`Arte Reveillon ${index + 1}`}
                    className="w-full h-auto rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation buttons */}
          <button
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-[#EF672C] text-white p-2 rounded-full transition-colors z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-[#EF672C] text-white p-2 rounded-full transition-colors z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </section>
  );
};
