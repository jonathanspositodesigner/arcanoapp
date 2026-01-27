import { RefreshCw, Palette } from "lucide-react";

export const HeroSectionCombo = () => {
  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative flex flex-col items-center justify-center py-8 md:py-12 px-4 overflow-hidden">
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
        <div className="flex items-center gap-2 bg-gradient-to-r from-[#3d1515]/80 to-[#2a0f0f]/80 backdrop-blur-sm border border-[#EF672C]/30 rounded-full px-3 py-1 mb-5">
          <img
            src="https://voxvisual.com.br/wp-content/uploads/2024/12/AssetAlunosIC.webp"
            alt="Membros"
            className="w-12 h-12 object-contain -my-1"
          />
          <span className="text-white/90 font-medium text-xs md:text-sm">
            Já são mais de <span className="text-[#EF672C] font-bold">+2.200</span> membros ativos!
          </span>
        </div>
        
        {/* Main title */}
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-black mb-0 leading-tight">
          <span className="text-[#EF672C]">Chega de perder tempo</span>{" "}
          <span className="text-white">criando tudo do zero!</span>
        </h1>
        
        {/* Membros image below title - LCP image */}
        {/* eslint-disable-next-line react/no-unknown-property */}
        <img
          src="/images/combo/area-de-membros-hero.webp"
          alt="Área de Membros"
          className="-mt-6 md:-mt-14 -mb-1 max-w-3xl w-full object-contain"
          {...{ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>}
        />
        
        {/* Subtitle */}
        <p className="text-lg md:text-3xl text-gray-300 mb-6 text-center">Conheça nossa plataforma com<br /><span className="text-[#EF672C] font-bold">+ de 380 Artes Editáveis PSD e CANVA!</span></p>
        
        {/* Feature badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <div className="flex items-center gap-1 bg-gradient-to-r from-[#EF672C]/20 to-[#EF672C]/10 border border-[#EF672C]/50 rounded-full px-2.5 py-1">
            <RefreshCw className="w-3 h-3 text-[#EF672C]" />
            <span className="text-white font-medium text-[10px] md:text-xs">ATUALIZAÇÕES SEMANAIS</span>
          </div>
          <div className="flex items-center gap-1 bg-gradient-to-r from-[#EF672C]/20 to-[#EF672C]/10 border border-[#EF672C]/50 rounded-full px-2.5 py-1">
            <Palette className="w-3 h-3 text-[#EF672C]" />
            <span className="text-white font-medium text-[10px] md:text-xs">EDITÁVEL NO CANVA E PHOTOSHOP</span>
          </div>
        </div>
        
      </div>
    </section>
  );
};