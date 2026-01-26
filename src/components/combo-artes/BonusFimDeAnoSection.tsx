import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Gift } from "lucide-react";
import { useCallback } from "react";

const artesReveillon = [
  "https://voxvisual.com.br/wp-content/uploads/2025/11/REVEILLON-DOS-SONHOS-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/NATAL-PREMIUM-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/FELIZ-ANO-NOVO-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/REVEILLON-VIP-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/NATAL-STORIES-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/REVEILLON-PREMIUM-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/VIRADA-DE-ANO-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/NATAL-VIP-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/REVEILLON-PARTY-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/FIM-DE-ANO-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/NATAL-PARTY-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/REVEILLON-STORIES-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/NATAL-ESPECIAL-ST.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/ANO-NOVO-ST.webp",
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
          <div className="inline-flex items-center gap-3 mb-6">
            <Gift className="w-10 h-10 text-[#EF672C]" />
            <span className="bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white font-bold text-lg px-6 py-2 rounded-full shadow-lg">
              Especial de Fim de ano!
            </span>
            <Gift className="w-10 h-10 text-[#EF672C]" />
          </div>
          
          <h2 className="text-2xl md:text-4xl font-black text-white mb-4">
            Adquirindo essa semana você leva também nosso Pack
          </h2>
          <h3 className="text-3xl md:text-5xl font-black">
            <span className="bg-gradient-to-r from-[#EF672C] via-[#f89f5b] to-[#EF672C] bg-clip-text text-transparent">
              BÔNUS ESPECIAL DE FIM DE ANO
            </span>
          </h3>
          <p className="text-gray-300 mt-4 text-lg">
            +30 Artes de Reveillon e Natal prontas para você usar!
          </p>
        </div>
        
        {/* Carousel */}
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-4">
              {artesReveillon.map((arte, index) => (
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
