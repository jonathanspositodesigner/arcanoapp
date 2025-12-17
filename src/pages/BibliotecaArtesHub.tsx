import { useNavigate } from "react-router-dom";
import { Music } from "lucide-react";
import baaLogo from "@/assets/BAA.png";

// Custom Disco Ball Icon
const DiscoBallIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* String */}
    <line x1="32" y1="2" x2="32" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    {/* Ball */}
    <circle cx="32" cy="36" r="22" fill="url(#discoBallGradient)" stroke="currentColor" strokeWidth="1.5"/>
    {/* Reflection squares */}
    <rect x="24" y="26" width="6" height="5" rx="1" fill="white" fillOpacity="0.9"/>
    <rect x="34" y="26" width="6" height="5" rx="1" fill="white" fillOpacity="0.7"/>
    <rect x="19" y="34" width="6" height="5" rx="1" fill="white" fillOpacity="0.6"/>
    <rect x="29" y="34" width="6" height="5" rx="1" fill="white" fillOpacity="0.8"/>
    <rect x="39" y="34" width="6" height="5" rx="1" fill="white" fillOpacity="0.5"/>
    <rect x="24" y="42" width="6" height="5" rx="1" fill="white" fillOpacity="0.7"/>
    <rect x="34" y="42" width="6" height="5" rx="1" fill="white" fillOpacity="0.6"/>
    {/* Light rays */}
    <line x1="10" y1="20" x2="16" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    <line x1="54" y1="20" x2="48" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    <line x1="8" y1="40" x2="14" y2="38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    <line x1="56" y1="40" x2="50" y2="38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    <defs>
      <linearGradient id="discoBallGradient" x1="10" y1="14" x2="54" y2="58" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E5E5E5"/>
        <stop offset="0.5" stopColor="#A0A0A0"/>
        <stop offset="1" stopColor="#707070"/>
      </linearGradient>
    </defs>
  </svg>
);

const BibliotecaArtesHub = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1a2e] to-[#16213e] flex flex-col items-center justify-center px-4 py-8">
      {/* Logo BAA */}
      <img 
        src={baaLogo} 
        alt="Biblioteca de Artes Arcanas" 
        className="h-20 sm:h-24 mb-6 drop-shadow-2xl"
      />
      
      {/* Título */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 text-center">
        Biblioteca de Artes Arcanas
      </h1>
      <p className="text-muted-foreground text-center mb-8 sm:mb-12 max-w-md">
        Escolha sua biblioteca de artes editáveis
      </p>

      {/* Cards de Seleção */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 w-full max-w-3xl">
        {/* Card - Eventos & Festas */}
        <div 
          onClick={() => navigate("/biblioteca-artes")}
          className="group cursor-pointer relative overflow-hidden rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gradient-to-br from-amber-950/40 to-yellow-900/20 border-2 border-amber-500/30 hover:border-amber-400/70"
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Icon */}
          <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 mb-4 sm:mb-6 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/30 group-hover:shadow-amber-400/50 transition-all">
            <DiscoBallIcon className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
          </div>
          
          {/* Title */}
          <h2 className="relative z-10 text-xl sm:text-2xl font-bold text-amber-100 mb-2">
            Eventos & Festas
          </h2>
          
          {/* Description */}
          <p className="relative z-10 text-sm sm:text-base text-amber-200/70 mb-4">
            Artes editáveis para festas, baladas, eventos e comemorações
          </p>
          
          {/* Button */}
          <button className="relative z-10 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-medium hover:from-amber-400 hover:to-yellow-500 transition-all shadow-md hover:shadow-lg">
            Acessar
          </button>
        </div>

        {/* Card - Músicos & Artistas */}
        <div 
          onClick={() => navigate("/biblioteca-artes-musicos")}
          className="group cursor-pointer relative overflow-hidden rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gradient-to-br from-violet-950/40 to-purple-900/20 border-2 border-violet-500/30 hover:border-violet-400/70"
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Icon */}
          <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 mb-4 sm:mb-6 flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 group-hover:shadow-violet-400/50 transition-all">
            <Music className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
          
          {/* Title */}
          <h2 className="relative z-10 text-xl sm:text-2xl font-bold text-violet-100 mb-2">
            Músicos & Artistas
          </h2>
          
          {/* Description */}
          <p className="relative z-10 text-sm sm:text-base text-violet-200/70 mb-4">
            Artes editáveis para músicos, bandas, DJs e artistas independentes
          </p>
          
          {/* Button */}
          <button className="relative z-10 px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium hover:from-violet-400 hover:to-purple-500 transition-all shadow-md hover:shadow-lg">
            Acessar
          </button>
        </div>
      </div>

      {/* Link para voltar */}
      <button 
        onClick={() => navigate("/")}
        className="mt-8 text-sm text-muted-foreground hover:text-white transition-colors underline"
      >
        Voltar para Home
      </button>
    </div>
  );
};

export default BibliotecaArtesHub;
