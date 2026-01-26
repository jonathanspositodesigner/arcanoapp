const bonuses = [
  {
    number: "BÔNUS 1",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BONUS-1-1.webp",
    title: "+190 Flyers Animados",
    description: "Editáveis no Canva",
  },
  {
    number: "BÔNUS 2",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BONUS-2-1.webp",
    title: "+19 Flyers Animados",
    description: "Editáveis no After Effects",
  },
  {
    number: "BÔNUS 3",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BONUS-3-1.webp",
    title: "Grids Secretos",
    description: "Para Canva e Photoshop Profissionais",
  },
  {
    number: "BÔNUS 4",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BONUS-4-1.webp",
    title: "Mini-Curso",
    description: "Tratamento de Foto pelo Celular",
  },
  {
    number: "BÔNUS 5",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BONUS-5-1.webp",
    title: "33 Tipos de Letras 3D",
    description: "Em PNG sem fundo",
  },
  {
    number: "BÔNUS 6",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BONUS-6-1.webp",
    title: "+500 Texturas",
    description: "E Overlays",
  },
  {
    number: "BÔNUS 7",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BONUS-7-1.webp",
    title: "16GB Elementos PNG",
    description: "Folhas, Metais, Papel...",
  },
  {
    number: "BÔNUS 8",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BONUS-8-1.webp",
    title: "+2200 Fontes",
    description: "Para Eventos",
  },
  {
    number: "BÔNUS 9",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BONUS-9.webp",
    title: "Documentos Essenciais",
    description: "Para Designers",
  },
];

export const BonusGridSection = () => {
  return (
    <section className="py-16 px-4 bg-black">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-5xl font-bold text-white mb-4">
            E não é só isso...
          </h2>
          <p className="text-base md:text-lg text-zinc-400">
            Você também vai receber{" "}
            <span className="text-[#EF672C] font-bold">9 BÔNUS GRÁTIS</span>{" "}
            para turbinar suas artes!
          </p>
        </div>
        
        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {bonuses.map((bonus, index) => (
            <div
              key={index}
              className="text-center"
            >
              {/* Badge */}
              <span className="inline-block bg-black/80 border-2 border-[#EF672C] text-[#EF672C] font-bold text-sm md:text-base px-4 py-1.5 rounded-full mb-4">
                {bonus.number}
              </span>
              
              {/* Image */}
              <div className="bg-white/5 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300">
                <img 
                  src={bonus.image} 
                  alt={bonus.title}
                  className="w-full h-auto max-w-[200px] mx-auto object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
