import { useState } from "react";

const categories = [
  {
    label: "Artes de funk",
    images: [
      "/images/pack4/baile-funk.webp",
      "/images/pack4/baile-mandela.webp",
      "/images/pack4/baile-on-fire.webp",
      "/images/pack4/baile-preto.webp",
      "/images/pack4/baile-serrao.webp",
      "/images/pack4/baile-tiktok.webp",
      "/images/pack4/i-love-baile-funk.webp",
      "/images/pack4/noite-do-fluxo.webp",
    ],
  },
  {
    label: "Artes de forró/piseiro",
    images: [
      "/images/pack4/forro-piseiro.webp",
      "/images/pack4/forrozinho-delas.webp",
      "/images/pack4/esquenta-bahianeira.webp",
      "/images/pack4/nuh-vokere.webp",
      "/images/pack4/pagofunk.webp",
      "/images/pack4/trotao-universitario.webp",
      "/images/pack4/revoada-selva.webp",
      "/images/pack4/fogo-parquinho.webp",
    ],
  },
  {
    label: "Artes de sertanejo",
    images: [
      "/images/pack4/clima-srtnjo.webp",
      "/images/pack4/contrate-don-juan.webp",
      "/images/pack4/pagodinho-sunset.webp",
      "/images/pack4/sunset-domingo.webp",
      "/images/pack4/live-sunset.webp",
      "/images/pack4/noite-caliente.webp",
      "/images/pack4/life-party-fest.webp",
      "/images/pack4/exclusive-night.webp",
    ],
  },
  {
    label: "Festas e baladas",
    images: [
      "/images/pack4/after-domingo.webp",
      "/images/pack4/after-love.webp",
      "/images/pack4/bailinho-quarta.webp",
      "/images/pack4/biritas-funk.webp",
      "/images/pack4/close-friends.webp",
      "/images/pack4/eletro-after-astral.webp",
      "/images/pack4/eletrofunk.webp",
      "/images/pack4/festa-do-branco.webp",
    ],
  },
  {
    label: "Categorias variadas",
    images: [
      "/images/pack4/agenda-mensal.webp",
      "/images/pack4/agenda-rodriguinho.webp",
      "/images/pack4/bye-bye-ferias.webp",
      "/images/pack4/ensaio-verao.webp",
      "/images/pack4/feriadinho-domingo.webp",
      "/images/pack4/mexicomigo.webp",
      "/images/pack4/pre-venda-dynho.webp",
      "/images/pack4/sexta-universitaria.webp",
    ],
  },
];

export const FlyersGallerySectionPack4 = () => {
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
