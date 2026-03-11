import { Sparkles } from "lucide-react";

export const HeroSectionPack4 = () => {
  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative flex items-center justify-center h-screen max-h-[100dvh] px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0604]" />
      
      {/* Large warm glow behind the image */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-[#EF672C]/8 rounded-full blur-[150px] pointer-events-none" aria-hidden="true" />
      
      {/* Content - two columns on desktop, stacked on mobile */}
      <div className="relative z-10 max-w-6xl w-full mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-10">
        
        {/* Left: Text */}
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
          {/* Logo */}
          <img
            src="https://voxvisual.com.br/wp-content/uploads/2024/11/LOGO-CLLR-1.png"
            alt="Artes Arcanas"
            className="h-8 md:h-12 object-contain mb-4"
            width={140}
            height={48}
          />
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-[#EF672C]/15 border border-[#EF672C]/40 rounded-full px-3 py-1 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#EF672C]" />
            <span className="text-[#EF672C] font-semibold text-[11px] md:text-xs tracking-wider">Novo Lançamento</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1] mb-3">
            <span className="text-white">Pack Arcano</span>
            <br />
            <span className="text-[#EF672C] drop-shadow-[0_0_40px_rgba(239,103,44,0.35)]">Vol. 4</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm md:text-lg text-gray-400 mb-5 max-w-sm">
            Artes inéditas editáveis no <span className="text-white font-semibold">Photoshop</span> e <span className="text-white font-semibold">Canva</span>
          </p>

          {/* CTA */}
          <button
            onClick={scrollToPricing}
            className="group relative px-7 py-3 bg-gradient-to-r from-[#EF672C] to-[#d4541a] text-white font-bold text-sm md:text-base rounded-xl shadow-lg shadow-[#EF672C]/25 hover:shadow-[#EF672C]/50 transition-all duration-300 hover:scale-[1.03]"
          >
            Quero garantir o meu
          </button>
          
          {/* Social proof mini */}
          <div className="flex items-center gap-2 mt-4">
            <img
              src="https://voxvisual.com.br/wp-content/uploads/2024/12/AssetAlunosIC.webp"
              alt="Membros"
              className="w-10 h-10 object-contain"
            />
            <span className="text-gray-500 text-xs">
              <span className="text-white font-semibold">+2.200</span> membros ativos
            </span>
          </div>
        </div>

        {/* Right: Hero image */}
        <div className="flex-1 flex justify-center items-center max-w-[55%] md:max-w-[50%]">
          <img
            src="/images/prevenda/hero-pack4.webp"
            alt="Pack Arcano Vol.4"
            className="w-full h-auto object-contain drop-shadow-[0_10px_50px_rgba(239,103,44,0.12)]"
            width={600}
            height={600}
            fetchPriority="high"
          />
        </div>
      </div>
    </section>
  );
};
