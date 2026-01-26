import { Users, Sparkles, Star, Zap } from "lucide-react";

export const HeroSectionCombo = () => {
  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center py-12 px-4 overflow-hidden">
      {/* Background gradient with glow effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a0a] via-[#0d0d0d] to-black" />
      
      {/* Animated glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#EF672C]/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#EF672C]/15 rounded-full blur-[120px] animate-pulse delay-700" />
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Logo with glow */}
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-[#EF672C]/30 blur-2xl rounded-full scale-150" />
          <img
            src="https://voxvisual.com.br/wp-content/uploads/2024/11/LOGO-CLLR-1.png"
            alt="Biblioteca de Artes Arcanas"
            className="relative mx-auto h-24 md:h-32 object-contain drop-shadow-2xl"
          />
        </div>
        
        {/* Promo badge */}
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#EF672C]/20 to-[#f65928]/20 border border-[#EF672C]/50 rounded-full px-4 py-1.5 mb-6 animate-pulse">
          <Zap className="w-4 h-4 text-[#EF672C]" />
          <span className="text-[#EF672C] font-bold text-sm uppercase tracking-wide">Oferta Exclusiva</span>
          <Zap className="w-4 h-4 text-[#EF672C]" />
        </div>
        
        {/* Main title with gradient */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-4 leading-tight">
          <span className="text-white drop-shadow-lg">Leve 3 Packs de Artes</span>
          <br />
          <span className="bg-gradient-to-r from-[#EF672C] via-[#ff8f5a] to-[#EF672C] bg-clip-text text-transparent animate-gradient">
            pelo Preço de 1
          </span>
        </h1>
        
        {/* Subtitle with icons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
            <Sparkles className="w-5 h-5 text-[#EF672C]" />
            <span className="text-gray-200 font-medium">+ de 200 Artes Editáveis</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
            <Star className="w-5 h-5 text-[#EF672C] fill-[#EF672C]" />
            <span className="text-gray-200 font-medium">PSD e CANVA</span>
          </div>
        </div>
        
        {/* Limited time banner */}
        <p className="text-lg md:text-xl mb-8">
          <span className="bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white font-bold px-4 py-1.5 rounded-full shadow-lg shadow-orange-500/30">
            🔥 Promoção por tempo limitado!
          </span>
        </p>
        
        {/* CTA Button */}
        <button
          onClick={scrollToPricing}
          className="group relative bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white font-black text-lg md:text-2xl px-12 py-5 rounded-2xl shadow-2xl shadow-orange-500/40 hover:shadow-orange-500/60 hover:scale-105 transition-all duration-300 mb-6"
        >
          <span className="relative z-10 flex items-center gap-3">
            QUERO APROVEITAR A OFERTA!
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-[#ff8f5a] to-[#EF672C] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>
        
        {/* Members badge - Now below button */}
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3">
          <img
            src="https://voxvisual.com.br/wp-content/uploads/2024/12/AssetAlunosIC.webp"
            alt="Membros"
            className="w-10 h-10 object-contain"
          />
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#EF672C]" />
            <span className="text-white font-bold text-lg">
              +2200 <span className="text-gray-300 font-medium">Membros ativos!</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
