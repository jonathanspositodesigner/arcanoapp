const galleryImages = [
  "/images/pack4/baile-tiktok.webp",
  "/images/pack4/after-domingo.webp",
  "/images/pack4/after-love.webp",
  "/images/pack4/agenda-mensal.webp",
  "/images/pack4/agenda-rodriguinho.webp",
  "/images/pack4/baile-mandela.webp",
  "/images/pack4/baile-preto.webp",
  "/images/pack4/baile-serrao.webp",
  "/images/pack4/baile-funk.webp",
  "/images/pack4/baile-on-fire.webp",
  "/images/pack4/bailinho-quarta.webp",
  "/images/pack4/biritas-funk.webp",
  "/images/pack4/bye-bye-ferias.webp",
  "/images/pack4/clima-srtnjo.webp",
  "/images/pack4/close-friends.webp",
  "/images/pack4/contrate-don-juan.webp",
  "/images/pack4/eletro-after-astral.webp",
  "/images/pack4/eletrofunk.webp",
  "/images/pack4/ensaio-verao.webp",
  "/images/pack4/esquenta-bahianeira.webp",
];

export const FlyersGallerySection = () => {
  return (
    <section className="py-5 px-4 bg-gradient-to-b from-black to-[#0a0505]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold mb-4 text-white">
            Veja todas as artes que você terá acesso
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {galleryImages.map((image, idx) => (
            <img
              key={idx}
              src={image}
              alt={`Arte ${idx + 1}`}
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
