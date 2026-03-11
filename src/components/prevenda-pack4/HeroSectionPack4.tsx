import { Sparkles } from "lucide-react";

export const HeroSectionPack4 = () => {
  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative flex flex-col items-center justify-center pt-10 pb-8 md:pt-14 md:pb-12 px-4 overflow-hidden min-h-[90vh] md:min-h-[85vh]">
      {/* Background - dark with warm glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a00] via-[#0d0906] to-black" />
      
      {/* Warm orange glow */}
      <div 
        className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#EF672C]/12 rounded-full blur-[140px] pointer-events-none" 
        aria-hidden="true"
      />
      
      {/* Subtle golden particles effect */}
      <div 
        className="absolute top-[20%] right-[20%] w-[200px] h-[200px] bg-[#d4a052]/8 rounded-full blur-[80px] pointer-events-none" 
        aria-hidden="true"
      />
      <div 
        className="absolute bottom-[30%] left-[15%] w-[150px] h-[150px] bg-[#EF672C]/6 rounded-full blur-[60px] pointer-events-none" 
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
        {/* Logo */}
        <img
          src="https://voxvisual.com.br/wp-content/uploads/2024/11/LOGO-CLLR-1.png"
          alt="Biblioteca de Artes Arcanas"
          className="mb-6 h-12 md:h-16 object-contain"
          width={180}
          height={64}
        />

        {/* Badge - NOVO LANÇAMENTO */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-[#EF672C] to-[#d4541a] rounded-full px-5 py-1.5 mb-5 shadow-lg shadow-[#EF672C]/20 animate-pulse">
          <Sparkles className="w-4 h-4 text-white" />
          <span className="text-white font-black text-xs md:text-sm tracking-[0.2em] uppercase">Novo Lançamento</span>
          <Sparkles className="w-4 h-4 text-white" />
        </div>

        {/* Main title */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-3 leading-[0.95] tracking-tight">
          <span className="text-[#EF672C] drop-shadow-[0_0_30px_rgba(239,103,44,0.3)]">PACK ARCANO</span>
          <br />
          <span className="text-white">VOL.4</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base md:text-xl text-gray-300 mb-6 max-w-lg">
          Artes Inéditas Editáveis <span className="text-[#EF672C] font-bold">PSD e CANVA</span>
        </p>

        {/* Hero Image - the two phones mockup */}
        <div className="relative w-full max-w-2xl mx-auto mb-6">
          <img
            src="/images/prevenda/hero-pack4.webp"
            alt="Pack Arcano Vol.4 - Artes para flyers e eventos"
            className="w-full h-auto object-contain drop-shadow-[0_20px_60px_rgba(239,103,44,0.15)]"
            width={800}
            height={800}
            fetchPriority="high"
          />
        </div>

        {/* CTA Button */}
        <button
          onClick={scrollToPricing}
          className="group relative px-8 py-3.5 bg-gradient-to-r from-[#EF672C] to-[#d4541a] text-white font-black text-base md:text-lg rounded-full shadow-xl shadow-[#EF672C]/30 hover:shadow-[#EF672C]/50 transition-all duration-300 hover:scale-105 uppercase tracking-wider"
        >
          <span className="relative z-10">Quero Garantir o Meu</span>
          <div className="absolute inset-0 bg-gradient-to-r from-[#ff7b3a] to-[#EF672C] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
      
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" aria-hidden="true" />
    </section>
  );
};
