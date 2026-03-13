import { useState } from "react";

const categories = [
  {
    label: "Artes de pagode",
    images: [
      "/images/combo/pagode-festeja-tropical.webp",
      "/images/combo/pagode-mixturadinho.webp",
      "/images/combo/pagode-bye-bye-ferias.webp",
      "/images/combo/pagode-jonas-esticado.webp",
      "/images/combo/pagode-tardezinha-havaiana.webp",
      "/images/combo/pagode-pagodinho-sunset.webp",
      "/images/combo/pagode-so-as-antigas.webp",
      "/images/combo/pagode-sabado-com-pagode.webp",
    ],
  },
  {
    label: "Artes de forró",
    images: [
      "/images/combo/forro-arrocha-patroa.webp",
      "/images/combo/forro-baile-favorita.webp",
      "/images/combo/forro-baladinha-sabado.webp",
      "/images/combo/forro-do-vila.webp",
      "/images/combo/forro-fenomeno-piseiro.webp",
      "/images/combo/forro-furacao-hit.webp",
      "/images/combo/forro-resenha-samba.webp",
      "/images/combo/forro-sao-joao.webp",
      "/images/combo/forro-vibe-forrozeira.webp",
    ],
  },
  {
    label: "Artes de sertanejo",
    images: [
      "/images/combo/sertanejo-balada-prime.webp",
      "/images/combo/sertanejo-balada-prime1.webp",
      "/images/combo/sertanejo-boteco-nossa-vibe.webp",
      "/images/combo/sertanejo-boteco-sertanejo.webp",
      "/images/combo/sertanejo-dia-pais-cabaret.webp",
      "/images/combo/sertanejo-noite-sem-fim.webp",
      "/images/combo/sertanejo-rota-sertaneja.webp",
      "/images/combo/sertanejo-sunset-festival.webp",
    ],
  },
  {
    label: "Artes de funk",
    images: [
      "/images/combo/funk-baile-malvadao.webp",
      "/images/combo/funk-baile-sinal.webp",
      "/images/combo/funk-bday-mc-wm.webp",
      "/images/combo/funk-bday-tubarao.webp",
      "/images/combo/funk-embraza.webp",
      "/images/combo/funk-fluxo-baile.webp",
      "/images/combo/funk-giro-louco.webp",
      "/images/combo/funk-made-in-funk.webp",
    ],
  },
  {
    label: "Artes de cavalgada",
    images: [
      "/images/combo/cavalgada-12a-amigos.webp",
      "/images/combo/cavalgada-agenda-toca-vale.webp",
      "/images/combo/cavalgada-contrate-joao-gomes.webp",
      "/images/combo/cavalgada-dos-gigantes.webp",
      "/images/combo/cavalgada-evento.webp",
      "/images/combo/cavalgada-fest-2025.webp",
      "/images/combo/cavalgada-rodeio-vaquejada.webp",
      "/images/combo/cavalgada-shows-biu-piseiro.webp",
    ],
  },
  {
    label: "Categorias variadas",
    images: [
      "/images/combo/variadas-arraia-sao-joao.webp",
      "/images/combo/variadas-dia-das-maes.webp",
      "/images/combo/variadas-dia-dos-namorados.webp",
      "/images/combo/variadas-eletro-house.webp",
      "/images/combo/variadas-encontro-paredoes.webp",
      "/images/combo/variadas-halloween-party.webp",
      "/images/combo/variadas-halloween-surreal.webp",
      "/images/combo/variadas-play-nas-ferias.webp",
    ],
  },
];

export const FlyersGallerySection = () => {
  const [activeCategory, setActiveCategory] = useState(0);

  const currentImages = categories[activeCategory].images;

  return (
    <section className="py-5 px-4 bg-gradient-to-b from-black to-[#0a0505]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold mb-6 text-white">
            Veja todas as artes que você terá acesso
          </h2>

          {/* Category tabs */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            {categories.map((cat, index) => (
              <button
                key={index}
                onClick={() => setActiveCategory(index)}
                className={`px-3 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-300 border ${
                  activeCategory === index
                    ? "bg-[#EF672C] text-white border-[#EF672C] shadow-lg shadow-orange-500/30"
                    : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Images grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {currentImages.map((image, idx) => (
            <img
              key={`${activeCategory}-${idx}`}
              src={image}
              alt={`${categories[activeCategory].label} ${idx + 1}`}
              className="w-full h-auto rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>
      </div>
    </section>
  );
};
