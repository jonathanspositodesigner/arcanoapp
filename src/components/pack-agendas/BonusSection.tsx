import { Gift } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const bonuses = [
  {
    image: "https://voxvisual.com.br/wp-content/uploads/2025/02/PACK-EXTRA-MOTION-CANVA-min.png",
    title: "Pack 190 Flyers Animados",
    description: "Flyers animados editáveis no Canva para redes sociais",
    value: "R$ 47"
  },
  {
    image: "https://voxvisual.com.br/wp-content/uploads/2025/02/PACK-EXTRA-MOTION-after-min.png",
    title: "Pack 19 Flyers After Effects",
    description: "Templates profissionais para After Effects",
    value: "R$ 37"
  },
  {
    image: "https://voxvisual.com.br/wp-content/uploads/2025/02/16-GB-ELEMENTOS-PNG.png",
    title: "Pack 16GB Elementos PNG",
    description: "Milhares de elementos gráficos em alta resolução",
    value: "R$ 27"
  },
  {
    image: "https://voxvisual.com.br/wp-content/uploads/2025/02/fontes-para-eventos.png",
    title: "Pack +2200 Fontes",
    description: "Fontes premium para design profissional",
    value: "R$ 17"
  },
  {
    image: "https://voxvisual.com.br/wp-content/uploads/2025/01/TEXTURAS-ENCANTADAS.png",
    title: "Pack +500 Texturas",
    description: "Texturas de alta qualidade para seus projetos",
    value: "R$ 17"
  }
];

export const BonusSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const totalValue = bonuses.reduce((acc, bonus) => {
    return acc + parseInt(bonus.value.replace("R$ ", ""));
  }, 0);

  return (
    <section className="py-20 bg-gradient-to-b from-zinc-950 to-black">
      <div className="container mx-auto px-4">
        <div 
          ref={ref}
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full px-4 py-2 mb-6">
            <Gift className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300 font-medium">Bônus Exclusivos</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Leve também esses{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Bônus Incríveis
            </span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Exclusivos para o Pacote Completo - Valor total de R$ {totalValue}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {bonuses.map((bonus, index) => (
            <div
              key={index}
              className={`group relative p-6 bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-amber-500/50 transition-all duration-500 overflow-hidden ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Glow effect */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden group-hover:scale-110 transition-transform">
                    <img 
                      src={bonus.image} 
                      alt={bonus.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="bg-amber-500/20 text-amber-400 text-sm font-bold px-3 py-1 rounded-full">
                    {bonus.value}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-2">{bonus.title}</h3>
                <p className="text-zinc-400 text-sm">{bonus.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div 
          className={`text-center mt-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "500ms" }}
        >
          <p className="text-zinc-400">
            Tudo isso incluso no{" "}
            <span className="text-amber-400 font-semibold">Pacote Completo</span>{" "}
            por apenas R$ 37
          </p>
        </div>
      </div>
    </section>
  );
};
