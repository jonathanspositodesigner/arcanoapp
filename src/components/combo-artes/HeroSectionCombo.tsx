import { RefreshCw, Palette } from "lucide-react";

export const HeroSectionCombo = () => {
  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center py-12 px-4 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a0a] via-[#0d0d0d] to-black" />
      
      {/* Glow effect */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#EF672C]/15 rounded-full blur-[120px]" />
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
        {/* Logo - smaller */}
        <img
          src="https://voxvisual.com.br/wp-content/uploads/2024/11/LOGO-CLLR-1.png"
          alt="Biblioteca de Artes Arcanas"
          className="mb-6 h-14 md:h-20 object-contain"
        />
        
        {/* Members badge - ABOVE the title */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#3d1515]/80 to-[#2a0f0f]/80 backdrop-blur-sm border border-[#EF672C]/30 rounded-full px-4 py-1.5 mb-6">
          <img
            src="https://voxvisual.com.br/wp-content/uploads/2024/12/AssetAlunosIC.webp"
            alt="Membros"
            className="w-16 h-16 object-contain -my-1"
          />
          <span className="text-white/90 font-medium text-base md:text-lg">
            Já são mais de <span className="text-[#EF672C] font-bold">+2.200</span> membros ativos!
          </span>
        </div>
        
        {/* Main title */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight">
          Leve 3 Packs de Artes{" "}
          <span className="text-[#EF672C]">pelo Preço de 1</span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-lg md:text-xl text-gray-300 mb-6 max-w-2xl">
          + de 200 Artes Editáveis PSD e CANVA!{" "}
          <span className="text-[#EF672C] font-semibold">Promoção por tempo limitado!</span>
        </p>
        
        {/* Feature badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-2 bg-gradient-to-r from-[#EF672C]/20 to-[#EF672C]/10 border border-[#EF672C]/50 rounded-full px-4 py-2">
            <RefreshCw className="w-4 h-4 text-[#EF672C]" />
            <span className="text-white font-semibold text-sm md:text-base">ATUALIZAÇÕES SEMANAIS</span>
          </div>
          <div className="flex items-center gap-2 bg-gradient-to-r from-[#EF672C]/20 to-[#EF672C]/10 border border-[#EF672C]/50 rounded-full px-4 py-2">
            <Palette className="w-4 h-4 text-[#EF672C]" />
            <span className="text-white font-semibold text-sm md:text-base">EDITÁVEL NO CANVA E PHOTOSHOP</span>
          </div>
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