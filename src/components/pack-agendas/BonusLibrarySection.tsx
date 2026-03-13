import { appendUtmToUrl } from "@/lib/utmUtils";

const bonusCards = [
  {
    number: 1,
    title: "PACK EXTRA - FLYERS ANIMADOS PARA CANVA",
    description: "+ De 190 flyers animados para eventos editáveis no Canva atualizado 2025",
    oldPrice: "R$99,90",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/02/PACK-EXTRA-MOTION-CANVA-min.png",
  },
  {
    number: 2,
    title: "PACK EXTRA - FLYERS ANIMADOS AFTER EFFECTS",
    description: "19 flyers animados qualidade premium para eventos editáveis no After Effects atualizado 2025",
    oldPrice: "R$99,90",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/02/PACK-EXTRA-MOTION-after-min.png",
  },
  {
    number: 3,
    title: "16GB DE ELEMENTOS PNG",
    description: "Pack com 16GB de elementos png que eu fui juntando ao longo dos meus 10 anos de carreira como Designer para Eventos!",
    oldPrice: "R$49,90",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/02/16-GB-ELEMENTOS-PNG.png",
  },
  {
    number: 4,
    title: "+2200 FONTES PARA EVENTOS",
    description: "Fontes selecionadas para o nicho de eventos com variedade de temas e estilos para você incrementar nas suas criações!",
    oldPrice: "R$49,90",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/02/fontes-para-eventos.png",
  },
];

const BonusLibrarySection = () => {
  return (
    <>
      <div className="w-full h-1" style={{ backgroundColor: "#FFDF00" }} />
      <section className="py-16 md:py-24 px-4" style={{ backgroundColor: "#1A59E5" }}>
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-3xl md:text-5xl text-center uppercase mb-12 md:mb-16 leading-tight"
            style={{ fontFamily: "Staatliches, sans-serif", color: "#FFFFFF" }}
          >
            ADQUIRA HOJE AINDA E RECEBA MAIS DE{" "}
            <span style={{ color: "#FFDF00" }}>R$300 EM BÔNUS</span> DA NOSSA BIBLIOTECA SECRETA
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {bonusCards.map((bonus) => (
              <div
                key={bonus.number}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "#304D94", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <div className="w-full" style={{ aspectRatio: "18/14" }}>
                  <img
                    src={bonus.image}
                    alt={bonus.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <span
                    className="text-sm uppercase tracking-wider mb-2"
                    style={{ fontFamily: "Poppins, sans-serif", color: "#FFDF00", fontWeight: 600 }}
                  >
                    bônus {bonus.number}
                  </span>
                  <h3
                    className="text-xl md:text-2xl uppercase mb-3"
                    style={{ fontFamily: "Staatliches, sans-serif", color: "#FFFFFF" }}
                  >
                    {bonus.title}
                  </h3>
                  <p
                    className="text-sm mb-4 flex-1"
                    style={{ fontFamily: "Poppins, sans-serif", color: "rgba(255,255,255,0.7)" }}
                  >
                    {bonus.description}
                  </p>
                  <p
                    className="text-base mb-4"
                    style={{ fontFamily: "Poppins, sans-serif", color: "rgba(255,255,255,0.5)" }}
                  >
                    DE <span className="line-through">{bonus.oldPrice}</span>
                  </p>
                  <div
                    className="w-full py-3 rounded-xl text-center font-bold text-sm uppercase tracking-wide block"
                    style={{
                      fontFamily: "Staatliches, sans-serif",
                      backgroundColor: "#FFDF00",
                      color: "#000",
                      letterSpacing: "0.05em",
                    }}
                  >
                    GRÁTIS NO PACOTE COMPLETO
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default BonusLibrarySection;