import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback } from "react";

const categories = [
  {
    title: "ARTES DE PAGODE",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FESTEJA-TROPICAL-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/MIXTURADINHO-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/BYE-BYE-FERIAS.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/HOJE-JONAS-ESTICADO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/HOJE-PE-COM-PE.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/HOJE-VITINHO-IMPERADOR.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/OPEN-BAR-TURMA-DO-PAGODE.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/PAGODE-DOS-MONARCAS.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/REVEILLON-DO-SAMBA.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/SAMBA-PREMIUM.webp",
    ],
  },
  {
    title: "ARTES DE FORRÓ",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2025/11/ARRAIA-DA-VAQUEJADA.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/ARRAIA-DO-VAQUEIRO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/BORA-PRO-FORRO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/ELBA-RAMALHO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FORRO-DO-BUENO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FORRO-VIP.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/HOJE-ZE-VAQUEIRO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/JONAS-ESTICADO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/SAO-JOAO-DA-CIDADE.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/XAND-AVIAO.webp",
    ],
  },
  {
    title: "ARTES DE SERTANEJO",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2025/11/BALADA-COUNTRY.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/BUTECO-DO-GUSTAVO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/HENRIQUE-E-JULIANO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/HOJE-BRUNO-E-MARRONE.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/HOJE-ZEZE-E-LUCIANO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/JORGE-E-MATEUS.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/RODEIO-COUNTRY.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/SERTANEJO-PREMIUM.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/SIMONE-E-SIMARIA.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/WESLEY-SAFADAO.webp",
    ],
  },
  {
    title: "ARTES DE FUNK",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EVENTO-BAILE-DA-FAVORITA-STORIES.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/B-DAY-DO-TUBARAO-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FUNK-PARTY-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/BAILE-DO-PISTINHA-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FUNK-PREMIUM-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/BAILE-FUNK-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FUNK-RAVE-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FUNK-VIP-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/MC-POZE-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FUNK-EXPLOSION-ST.webp",
    ],
  },
  {
    title: "ARTES DE CAVALGADA",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2025/11/12a-CAVALGADA-DOS-AMIGOS.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/RODEIO-E-VAQUEJADA.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/CAVALGADA-BENEFICENTE.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/RODEIO-COUNTRY-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/CAVALGADA-DO-PEAO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FESTA-DO-PEAO-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/VAQUEJADA-PREMIUM-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/CAVALGADA-COUNTRY-ST.webp",
    ],
  },
  {
    title: "CATEGORIAS VARIADAS",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2025/11/DIA-DOS-NAMORADOS-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/HALLOWEEN-PARTY-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/BLACK-FRIDAY-STORIES.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/DIA-DAS-MAES-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/DIA-DOS-PAIS-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/PASCOA-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/CARNAVAL-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/DIA-DAS-CRIANCAS-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FESTA-JUNINA-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/ANIVERSARIO-ST.webp",
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
                  src={image}
                  alt={`${title} ${index + 1}`}
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
        {categories.map((category, index) => (
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
