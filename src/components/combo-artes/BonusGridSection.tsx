const bonuses = [
  {
    number: "BÔNUS 1",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BOX-NOVO-SET-2025-PACK-CANVA1.webp",
    title: "+190 Flyers Animados",
    description: "Editáveis no Canva",
  },
  {
    number: "BÔNUS 2",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BOX-NOVO-SET-2025-PACK-after.webp",
    title: "+19 Flyers Animados",
    description: "Editáveis no After Effects",
  },
  {
    number: "BÔNUS 3",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BOX-NOVO-SET-2025-grids.webp",
    title: "Grids Secretos",
    description: "Para Canva e Photoshop Profissionais",
  },
  {
    number: "BÔNUS 4",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BOX-NOVO-SET-2025-mini-curso.webp",
    title: "Mini-Curso",
    description: "Tratamento de Foto pelo Celular",
  },
  {
    number: "BÔNUS 5",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BOX-NOVO-SET-2025-letras-3d.webp",
    title: "33 Tipos de Letras 3D",
    description: "Em PNG sem fundo",
  },
  {
    number: "BÔNUS 6",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BOX-NOVO-SET-2025-texturas.webp",
    title: "+500 Texturas",
    description: "E Overlays",
  },
  {
    number: "BÔNUS 7",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BOX-NOVO-SET-2025-elementos-png.webp",
    title: "16GB Elementos PNG",
    description: "Folhas, Metais, Papel...",
  },
  {
    number: "BÔNUS 8",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BOX-NOVO-SET-2025-fontes.webp",
    title: "+2200 Fontes",
    description: "Para Eventos",
  },
  {
    number: "BÔNUS 9",
    image: "https://voxvisual.com.br/wp-content/uploads/2025/11/BOX-NOVO-SET-2025-documentos-essenciais.webp",
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
              className="group bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-800 hover:border-[#EF672C]/50 transition-all duration-300 overflow-hidden"
            >
              {/* Badge */}
              <div className="pt-5 text-center">
                <span className="inline-block bg-[#EF672C]/10 border border-[#EF672C] text-[#EF672C] font-bold text-xs md:text-sm px-4 py-1.5 rounded-full">
                  {bonus.number}
                </span>
              </div>
              
              {/* Image */}
              <div className="p-4 flex justify-center">
                <img 
                  src={bonus.image} 
                  alt={bonus.title}
                  className="w-full h-auto max-w-[180px] object-contain group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              
              {/* Content */}
              <div className="px-5 pb-5 text-center">
                <h3 className="text-white font-bold text-base md:text-lg mb-2">
                  {bonus.title}
                </h3>
                <p className="text-zinc-400 text-sm">
                  {bonus.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
