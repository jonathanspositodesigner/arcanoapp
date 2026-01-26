import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Sparkles, Wand2, Download } from "lucide-react";
import { useCallback } from "react";

const selos = [
  "https://voxvisual.com.br/wp-content/uploads/2025/11/selo-3d-1.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/selo-3d-2.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/selo-3d-3.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/selo-3d-4.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/selo-3d-5.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/selo-3d-6.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/selo-3d-7.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/selo-3d-8.webp",
];

const resources = [
  {
    icon: Sparkles,
    title: "40+ Selos 3D",
    description: "Selos prontos para usar em suas artes",
  },
  {
    icon: Wand2,
    title: "Ferramenta IA",
    description: "Gere selos 3D personalizados com IA",
  },
  {
    icon: Download,
    title: "Download Direto",
    description: "Baixe em alta resolução PNG",
  },
];

export const Selos3DSection = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-[#0a0505] to-black">
      <div className="max-w-6xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-10">
          <span className="bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white font-bold text-lg px-8 py-3 rounded-full shadow-lg">
            PACK DE SELOS 3D
          </span>
        </div>
        
        {/* Carousel */}
        <div className="relative mb-12">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {selos.map((selo, index) => (
                <div
                  key={index}
                  className="flex-none w-[200px] md:w-[250px]"
                >
                  <img
                    src={selo}
                    alt={`Selo 3D ${index + 1}`}
                    className="w-full h-auto rounded-xl shadow-lg hover:scale-110 transition-transform duration-300"
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
        
        {/* Resources cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {resources.map((resource, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6 text-center hover:border-[#EF672C]/50 transition-colors duration-300"
            >
              <resource.icon className="w-12 h-12 mx-auto mb-4 text-[#EF672C]" />
              <h3 className="text-white font-bold text-xl mb-2">{resource.title}</h3>
              <p className="text-gray-400">{resource.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
