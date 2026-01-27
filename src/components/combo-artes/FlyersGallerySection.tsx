import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect } from "react";
// URLs corretas extraídas do site https://voxvisual.com.br/combo3em1/
const categories = [{
  title: "Artes de pagode",
  images: [
    "/images/combo/pagode-festeja-tropical.webp",
    "/images/combo/pagode-mixturadinho.webp",
    "/images/combo/pagode-bye-bye-ferias.webp",
    "/images/combo/pagode-jonas-esticado.webp",
    "/images/combo/pagode-tardezinha-havaiana.webp",
    "/images/combo/pagode-pagodinho-sunset.webp",
    "/images/combo/pagode-so-as-antigas.webp",
    "/images/combo/pagode-sabado-com-pagode.webp",
    "/images/combo/pagode-revoada-do-chefe.webp",
    "/images/combo/pagode-end-of-summer.webp"
  ]
}, {
  title: "Artes de forró",
  images: ["https://voxvisual.com.br/wp-content/uploads/2025/11/MIXTURADINHO-ST.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EVENTO-FORRO-DO-VILA-STORY-SOCIAL-MEDIA-1.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/VIBE-FORROZEIRA-ST.jpg", "https://voxvisual.com.br/wp-content/uploads/2025/11/FORRO-DE-SAO-JOAO.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/FENOMENO-DO-PISEIRO-768x1365.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/RESENHA-DO-SAMBA1.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/BALADINHA-DE-SABADO-STORY-SOCIAL-MEDIA.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EVENTO-BAILE-DA-FAVORITA-STORIES.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/Flyer-Furacao-Hit-Stories-Social-Media1.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/ARROCHA-DA-PATROA-ST-768x1365.webp"]
}, {
  title: "Artes de sertanejo",
  images: ["https://voxvisual.com.br/wp-content/uploads/2025/11/DIA-DOS-PAIS-CABARET.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/BALADA-PRIME.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/ROTA-SERTANEJA-ST.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/BALADA-PRIME1.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/BOTECO-NOSSA-VIBE.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/SUNSET-FESTIVAL.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/BOTECO-SERTANEJO.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/NOITE-SEM-FIM.webp"]
}, {
  title: "Artes de funk",
  images: ["https://voxvisual.com.br/wp-content/uploads/2025/11/FUNK-PARTY-ST.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/NOITE-IN-VEGAS-ST.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/B-DAY-DO-TUBARAO.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/FLUXO-BAILE-FUNK.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/BAILE-DO-SINAL.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/B-DAY-MC-WM.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EVENTO-BAILE-DO-MALVADAO-STORIES.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EVENTO-GIRO-LOUCO-STORIES.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/FLYER-EMBRAZA-STORY-SOCIAL-MEDIA.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/MADE-IN-FUNK.webp"]
}, {
  title: "Artes de cavalgada",
  images: ["https://voxvisual.com.br/wp-content/uploads/2025/11/12a-CAVALGADA-DOS-AMIGOS.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/AGENDA-SEMANAL-TOCA-DO-VALE.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/CAVALGADA-DOS-GIGANTES-scaled-1-768x1365.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/CAVALGADA-FEST-2025.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/PROXIMOS-SHOWS-BIU-DO-PISEIRO.jpg", "https://voxvisual.com.br/wp-content/uploads/2025/11/CAVALGADA.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/RODEIO-E-VAQUEJADA.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/CONTRATE-JOAO-GOMES.webp"]
}, {
  title: "Categorias variadas",
  images: ["https://voxvisual.com.br/wp-content/uploads/2025/11/ARRAIA-DE-SAO-JOAO.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/DIA-DAS-MAES.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/DIA-DOS-NAMORADOS.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/ELETRO-HOUSE.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/ENCONTRO-DE-PAREDOES.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/HALLOWEEN-PARTY-ST.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/HALLOWEEN-SURREAL-ST.webp", "https://voxvisual.com.br/wp-content/uploads/2025/11/PLAY-NAS-FERIAS.webp"]
}];
const CategoryCarousel = ({
  title,
  images
}: {
  title: string;
  images: string[];
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    slidesToScroll: 1
  });
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Auto-scroll a cada 2 segundos
  useEffect(() => {
    if (!emblaApi) return;
    
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [emblaApi]);
  return <div className="mb-8">
      <div className="group relative bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl p-4 md:p-8 border border-zinc-800 hover:border-[#EF672C]/50 transition-all duration-300">
        <div className="flex justify-center mb-5">
          <span className="bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white font-semibold text-sm md:text-base px-5 py-2 rounded-full shadow-md">
            {title}
          </span>
        </div>

        {/* Mobile: bigger image, arrows overlay (semi-transparent). Desktop: arrows outside. */}
        <div className="relative md:flex md:items-center md:gap-4">
          {/* Desktop left */}
          <button onClick={scrollPrev} className="hidden md:inline-flex flex-shrink-0 bg-zinc-800 hover:bg-[#EF672C] text-white p-2.5 md:p-3 rounded-full transition-colors" aria-label="Anterior">
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Viewport with edge fade effect on desktop */}
          <div className="relative overflow-hidden md:flex-1">
            {/* Left fade overlay - desktop only */}
            <div className="hidden md:block absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-zinc-900 to-transparent z-10 pointer-events-none" />
            
            <div ref={emblaRef}>
              <div className="flex md:-ml-4">
                {images.map((image, index) => <div key={index} className="flex-none shrink-0 basis-full md:basis-auto md:w-[280px] flex justify-center px-0 md:pl-4">
                    <img src={image} alt={`${title} ${index + 1}`} className="w-full max-w-[360px] md:w-full md:max-w-none h-auto object-contain rounded-xl shadow-lg hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </div>)}
              </div>
            </div>
            
            {/* Right fade overlay - desktop only */}
            <div className="hidden md:block absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-zinc-900 to-transparent z-10 pointer-events-none" />
          </div>

          {/* Desktop right */}
          <button onClick={scrollNext} className="hidden md:inline-flex flex-shrink-0 bg-zinc-800 hover:bg-[#EF672C] text-white p-2.5 md:p-3 rounded-full transition-colors" aria-label="Próximo">
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Mobile overlay buttons */}
          <button onClick={scrollPrev} className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 bg-black/45 hover:bg-black/65 text-white p-2 rounded-full border border-white/10 transition-colors z-10 backdrop-blur-sm" aria-label="Anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={scrollNext} className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 bg-black/45 hover:bg-black/65 text-white p-2 rounded-full border border-white/10 transition-colors z-10 backdrop-blur-sm" aria-label="Próximo">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>;
};
export const FlyersGallerySection = () => {
  return <section className="py-5 px-4 bg-gradient-to-b from-black to-[#0a0505]">
      <div className="max-w-7xl mx-auto">
        {/* Section title */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold mb-4 text-white">
            Veja todas as artes que você terá acesso
          </h2>
        </div>
        
        
        {/* Category carousels */}
        {categories.map((category, index) => <CategoryCarousel key={index} title={category.title} images={category.images} />)}
        
        {/* E muito mais... */}
        
      </div>
    </section>;
};