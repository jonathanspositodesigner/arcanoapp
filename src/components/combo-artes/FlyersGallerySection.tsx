import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback } from "react";

// URLs corretas extraídas do site https://voxvisual.com.br/combo3em1/
const categories = [
  {
    title: "ARTES DE PAGODE",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FESTEJA-TROPICAL-ST-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/MIXTURADINHO-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/BYE-BYE-FERIAS-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/HOJE-JONAS-ESTICADO-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/TARDEZINHA-HAVAIANA-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/PAGODINHO-SUNSET.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/PAGODE-SO-AS-ANTIGAS.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/SABADO-COM-PAGODE-STORIES-SOCIAL-MEDIA.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/REVOADA-DO-CHEFE.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/END-OF-SUUMER.webp",
    ],
  },
  {
    title: "ARTES DE FORRÓ",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2025/11/MIXTURADINHO-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EVENTO-FORRO-DO-VILA-STORY-SOCIAL-MEDIA-1.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/VIBE-FORROZEIRA-ST.jpg",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FORRO-DE-SAO-JOAO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FENOMENO-DO-PISEIRO-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/RESENHA-DO-SAMBA1.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/BALADINHA-DE-SABADO-STORY-SOCIAL-MEDIA.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EVENTO-BAILE-DA-FAVORITA-STORIES.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/Flyer-Furacao-Hit-Stories-Social-Media1.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/ARROCHA-DA-PATROA-ST-768x1365.webp",
    ],
  },
  {
    title: "ARTES DE SERTANEJO",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2025/11/DIA-DOS-PAIS-CABARET.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/BALADA-PRIME.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/ROTA-SERTANEJA-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/BALADA-PRIME1.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/BOTECO-NOSSA-VIBE.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/SUNSET-FESTIVAL.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/BOTECO-SERTANEJO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/NOITE-SEM-FIM.webp",
    ],
  },
  {
    title: "ARTES DE FUNK",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FUNK-PARTY-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/NOITE-IN-VEGAS-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/B-DAY-DO-TUBARAO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FLUXO-BAILE-FUNK.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/BAILE-DO-SINAL.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/B-DAY-MC-WM.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EVENTO-BAILE-DO-MALVADAO-STORIES.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EVENTO-GIRO-LOUCO-STORIES.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EMBRAZA-STORY-SOCIAL-MEDIA.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/MADE-IN-FUNK.webp",
    ],
  },
  {
    title: "ARTES DE CAVALGADA",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2025/11/12a-CAVALGADA-DOS-AMIGOS.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/AGENDA-SEMANAL-TOCA-DO-VALE.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/CAVALGADA-DOS-GIGANTES-scaled-1-768x1365.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/CAVALGADA-FEST-2025.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/PROXIMOS-SHOWS-BIU-DO-PISEIRO.jpg",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/CAVALGADA.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/RODEIO-E-VAQUEJADA.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/CONTRATE-JOAO-GOMES.webp",
    ],
  },
  {
    title: "CATEGORIAS VARIADAS",
    images: [
      "https://voxvisual.com.br/wp-content/uploads/2025/11/ARRAIA-DE-SAO-JOAO.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/DIA-DAS-MAES.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/DIA-DOS-NAMORADOS.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/ELETRO-HOUSE.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/ENCONTRO-DE-PAREDOES.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/HALLOWEEN-PARTY-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/HALLOWEEN-SURREAL-ST.webp",
      "https://voxvisual.com.br/wp-content/uploads/2025/11/PLAY-NAS-FERIAS.webp",
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
          <h2 className="text-xl md:text-3xl font-bold mb-4">
            <span className="bg-gradient-to-r from-[#EF672C] via-[#f89f5b] to-[#EF672C] bg-clip-text text-transparent">
              Veja tudo que você vai receber
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
