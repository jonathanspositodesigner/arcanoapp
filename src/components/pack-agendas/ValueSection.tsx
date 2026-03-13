import { useState } from "react";

const GALLERY_IMAGES = [
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-MC-VITIN-LC.webp", title: "AGENDA MC VITIN LC" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-MC-KEVINHO.webp", title: "AGENDA MC KEVINHO" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-SIMONE-MENDES.webp", title: "AGENDA SIMONE MENDES" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/05/CONTRATE-O-POLEMICO.webp", title: "CONTRATE O POLEMICO" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-MARI-FERNANDEZ.webp", title: "AGENDA MARI FERNANDEZ" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/07/AGENDA-DE-AGOSTO-MC-RICK.webp", title: "AGENDA DE AGOSTO MC RICK" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/05/AGENDA-DE-SHOWS-PARA-ARTISTAS-4-STORY.jpg", title: "AGENDA DE SHOWS PARA ARTISTAS" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-FELIPE-AMORIM-2.webp", title: "AGENDA FELIPE AMORIM 2" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-DJ-GUUGA.webp", title: "AGENDA DJ GUUGA" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-MC-MIRELLA.webp", title: "AGENDA MC MIRELLA" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-MC-DAVI.webp", title: "AGENDA MC DAVI" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-MC-DANIEL.webp", title: "AGENDA MC DANIEL" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/05/PROXIMOS-SHOWS-BIU-DO-PISEIRO.jpg", title: "PRÓXIMOS SHOWS BIU DO PISEIRO" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-JONAS-ESTICADO.webp", title: "AGENDA JONAS ESTICADO" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/DYNHO-ALVES.webp", title: "DYNHO ALVES" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-GUSTTAVO-LIMA.webp", title: "AGENDA GUSTTAVO LIMA" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-FELIPE-AMORIM.webp", title: "AGENDA FELIPE AMORIM" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-DJ-NATHI.webp", title: "AGENDA DJ NATHI" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/05/CONTRATE-JOAO-GOMES.webp", title: "CONTRATE JOÃO GOMES" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-MC-RYAN-SP.webp", title: "AGENDA MC RYAN SP" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/05/CONTRATE-MATUE.webp", title: "CONTRATE MATUE" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-XUXU.webp", title: "AGENDA XUXU" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-NAIARA-AZEVEDO.webp", title: "AGENDA NAIARA AZEVEDO" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-GALICIA.webp", title: "AGENDA GALICIA" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/05/CONTRATE-WIU.webp", title: "CONTRATE WIU" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/05/AGENDA-ZE-VAQUEIRO.webp", title: "AGENDA ZÉ VAQUEIRO" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-OH-POLEMICO.webp", title: "AGENDA OH POLEMICO" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-LEO-SANTANA.webp", title: "AGENDA LEO SANTANA" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-GABZIN.webp", title: "AGENDA GABZIN" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-POLLY.webp", title: "AGENDA POLLY" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-XANGAI.webp", title: "AGENDA XANGAI" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-MC-DON-JUAN.webp", title: "AGENDA MC DON JUAN" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/05/CONTRATE-BYANCA.webp", title: "CONTRATE BYANCA" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-JOAO-GOMES.webp", title: "AGENDA JOÃO GOMES" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-ALDAIR-PLAYBOY.webp", title: "AGENDA ALDAIR PLAYBOY" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/05/AGENDA-SEMANAL-ZE-VAQUEIRO.webp", title: "AGENDA SEMANAL ZÉ VAQUEIRO" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-MC-CABELINHO.webp", title: "AGENDA MC CABELINHO" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-SEMANAL-GALICIA.webp", title: "AGENDA SEMANAL GALICIA" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/05/CONTRATE-VEIGH.webp", title: "CONTRATE VEIGH" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/AGENDA-GUSTTAVO-LIMA-2.webp", title: "AGENDA GUSTTAVO LIMA 2" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/05/AGENDA-DE-ARRAIA-MICHELE-ANDRADE.jpg", title: "AGENDA DE ARRAIÁ MICHELE ANDRADE" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/05/CONTRATE-AGORA-DJ-GUUGA.webp", title: "CONTRATE AGORA DJ GUUGA" },
];

const ValueSection = () => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <section
        className="w-full py-20 md:py-32 px-4"
        style={{ backgroundColor: "#1A59E5" }}
      >
        <div className="max-w-4xl mx-auto text-center flex flex-col gap-2 mb-10 md:mb-16">
          <h2
            className="uppercase leading-none"
            style={{
              fontFamily: "'Staatliches', cursive",
              fontSize: "clamp(40px, 6vw, 64px)",
              color: "#FFFFFF",
            }}
          >
            qual o valor de um job seu?
          </h2>
          <p
            className="uppercase"
            style={{
              fontFamily: "'Staatliches', cursive",
              fontSize: "clamp(20px, 3vw, 32px)",
              color: "#FFDF00",
              letterSpacing: "0.05em",
            }}
          >
            investir em ferramentas é investir em si mesmo.
          </p>
        </div>

        <div
          className="max-w-7xl mx-auto grid gap-[10px] agendas-gallery-grid"
          style={{
            gridTemplateColumns: "repeat(5, 1fr)",
          }}
        >
          {GALLERY_IMAGES.map((img, i) => (
            <button
              key={i}
              onClick={() => setLightboxIndex(i)}
              className="relative overflow-hidden rounded-sm cursor-pointer group border-0 p-0 bg-transparent"
              style={{ aspectRatio: "9/16" }}
            >
              <img
                src={img.src}
                alt={img.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
            </button>
          ))}
        </div>
      </section>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white text-4xl font-light hover:opacity-70 z-10 bg-transparent border-0 cursor-pointer"
            style={{ fontFamily: "sans-serif" }}
          >
            ✕
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length);
            }}
            className="absolute left-4 text-white text-4xl font-light hover:opacity-70 z-10 bg-transparent border-0 cursor-pointer"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex + 1) % GALLERY_IMAGES.length);
            }}
            className="absolute right-16 text-white text-4xl font-light hover:opacity-70 z-10 bg-transparent border-0 cursor-pointer"
          >
            ›
          </button>
          <img
            src={GALLERY_IMAGES[lightboxIndex].src}
            alt={GALLERY_IMAGES[lightboxIndex].title}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .agendas-gallery-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
      `}</style>
    </>
  );
};

export default ValueSection;