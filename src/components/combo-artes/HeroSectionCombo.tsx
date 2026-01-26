import { Users } from "lucide-react";

export const HeroSectionCombo = () => {
  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center py-12 px-4 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a0a] via-[#0d0d0d] to-black" />
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Logo */}
        <img
          src="https://voxvisual.com.br/wp-content/uploads/2024/11/LOGO-CLLR-1.png"
          alt="Biblioteca de Artes Arcanas"
          className="mx-auto mb-8 h-20 md:h-28 object-contain"
        />
        
        {/* Main title */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight">
          Leve 3 Packs de Artes{" "}
          <span className="text-[#EF672C]">pelo Preço de 1</span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-lg md:text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
          + de 200 Artes Editáveis PSD e CANVA!{" "}
          <span className="text-[#EF672C] font-semibold">Promoção por tempo limitado!</span>
        </p>
        
        {/* Members badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2.5 mb-8">
          <img
            src="https://voxvisual.com.br/wp-content/uploads/2024/12/AssetAlunosIC.webp"
            alt="Membros"
            className="w-8 h-8 object-contain"
          />
          <span className="text-white font-medium flex items-center gap-1">
            <Users className="w-4 h-4" />
            +2200 Membros ativos!
          </span>
        </div>
        
        {/* CTA Button */}
        <button
          onClick={scrollToPricing}
          className="bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white font-bold text-lg md:text-xl px-10 py-4 rounded-xl shadow-lg shadow-orange-500/30 hover:scale-105 transition-transform duration-300"
        >
          QUERO APROVEITAR A OFERTA!
        </button>
      </div>
    </section>
  );
};
