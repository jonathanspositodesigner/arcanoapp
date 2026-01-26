import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback } from "react";
import { proxiedMediaUrl } from "@/lib/mediaProxy";

// URLs exatas extraídas do HTML original do WordPress
export const flyerCategories = [
  {
    title: "ARTES DE PAGODE",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-Pagode-dos-Monarcas-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-MIXTURADINHO-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-SAMBA-PREMIUM-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-VITINHO-IMPERADOR-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-FESTEJA-TROPICAL-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-TURMA-DO-PAGODE-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-PE-COM-PE-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-BYE-BYE-FERIAS-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-JONAS-ESTICADO-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-REVEILLON-DO-SAMBA-STORIES-768x1365.webp",
    ],
  },
  {
    title: "ARTES DE FORRÓ",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-ARRAIA-DA-VAQUEJADA-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-ARRAIA-DO-VAQUEIRO-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-BORA-PRO-FORRO-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-ELBA-RAMALHO-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-FORRO-DO-BUENO-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-FORRO-VIP-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-ZE-VAQUEIRO-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-JONAS-ESTICADO-FORRO-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-SAO-JOAO-DA-CIDADE-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-XAND-AVIAO-STORIES-768x1365.webp",
    ],
  },
  {
    title: "ARTES DE SERTANEJO",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-BALADA-COUNTRY-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-BUTECO-DO-GUSTAVO-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-HENRIQUE-E-JULIANO-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-BRUNO-E-MARRONE-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-ZEZE-E-LUCIANO-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-JORGE-E-MATEUS-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-RODEIO-COUNTRY-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-SERTANEJO-PREMIUM-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-SIMONE-E-SIMARIA-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-WESLEY-SAFADAO-STORIES-768x1365.webp",
    ],
  },
  {
    title: "ARTES DE FUNK",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-BAILE-DA-FAVORITA-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-B-DAY-DO-TUBARAO-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-FUNK-PARTY-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-BAILE-DO-PISTINHA-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-FUNK-PREMIUM-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-BAILE-FUNK-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-FUNK-RAVE-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-FUNK-VIP-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-MC-POZE-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-FUNK-EXPLOSION-STORIES-768x1365.webp",
    ],
  },
  {
    title: "ARTES DE CAVALGADA",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-12a-CAVALGADA-DOS-AMIGOS-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-RODEIO-E-VAQUEJADA-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-CAVALGADA-BENEFICENTE-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-RODEIO-COUNTRY-ST-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-CAVALGADA-DO-PEAO-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-FESTA-DO-PEAO-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-VAQUEJADA-PREMIUM-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-CAVALGADA-COUNTRY-STORIES-768x1365.webp",
    ],
  },
  {
    title: "CATEGORIAS VARIADAS",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-DIA-DOS-NAMORADOS-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-HALLOWEEN-PARTY-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-BLACK-FRIDAY-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-DIA-DAS-MAES-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-DIA-DOS-PAIS-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-PASCOA-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-CARNAVAL-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-DIA-DAS-CRIANCAS-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-FESTA-JUNINA-STORIES-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2024/11/FLYER-EVENTO-ANIVERSARIO-STORIES-768x1365.webp",
    ],
  },
];

const CategoryCarousel = ({ title, images }: { title: string; images: string[] }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div className="mb-12">
      <h3 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
        {title}
      </h3>
      
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4">
            {images.map((image, index) => (
              <div
                key={index}
                className="flex-none w-[280px] md:w-[320px]"
              >
                <img
                  src={proxiedMediaUrl(image)}
                  alt={`${title} ${index + 1}`}
                  className="w-full h-auto rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  referrerPolicy="no-referrer"
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
  );
};

export const FlyersGallerySection = () => {
  return (
    <section className="py-16 px-4 bg-gradient-to-b from-black to-[#0a0505]">
      <div className="max-w-7xl mx-auto">
        {/* Section title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-[#EF672C] via-[#f89f5b] to-[#EF672C] bg-clip-text text-transparent">
              VEJA TUDO QUE VOCÊ VAI RECEBER
            </span>
          </h2>
        </div>
        
        {/* Badge */}
        <div className="flex justify-center mb-10">
          <span className="bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white font-bold text-lg px-8 py-3 rounded-full shadow-lg">
            FLYERS EDITÁVEIS
          </span>
        </div>
        
        {/* Category carousels */}
        {flyerCategories.map((category, index) => (
          <CategoryCarousel
            key={index}
            title={category.title}
            images={category.images}
          />
        ))}
      </div>
    </section>
  );
};
