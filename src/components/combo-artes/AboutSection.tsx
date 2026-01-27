import { User } from "lucide-react";

export const AboutSection = () => {
  return (
    <section className="py-16 px-4 bg-black">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Left side - Content */}
          <div className="flex-1 order-2 md:order-1 px-2 md:px-0">
            {/* Sobre badge */}
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 bg-white/10 text-white text-sm font-medium px-4 py-2 rounded-full border border-white/20">
                <User className="w-4 h-4" />
                Sobre
              </span>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl md:text-4xl font-black text-white mb-6">
              Quem está por trás do Pack Arcano?
            </h2>
            
            {/* Name */}
            <h3 className="text-lg font-bold text-white mb-4">
              Jonathan Spósito
            </h3>
            
            {/* Bio paragraphs */}
            <p className="text-gray-300 mb-4 leading-relaxed">
              Sou um norte mineiro, Designer Gráfico e Motion Designer especializado em{" "}
              <span className="font-bold text-white">Identidades Visuais e Marketing para Eventos.</span>
            </p>
            
            <p className="text-gray-300 mb-4 leading-relaxed">
              Atuo no mercado desde 2014 atendendo produtores de eventos de diversos países e{" "}
              <span className="font-bold text-[#EF672C]">já faturei + de R$192mil com o mercado de eventos.</span>
            </p>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              Minha missão é ajudar designers e produtores de eventos a alavancarem suas vendas e entregar conteúdo de qualidade, elevando o nível, agregando valor e proporcionando uma melhor experiência visual ao mercado!
            </p>
            
            {/* Social icons */}
            <div className="flex items-center gap-4">
              <a 
                href="https://www.instagram.com/jonathandesigner/?utm_source=organic&utm_campaign=&utm_medium=&utm_content=&utm_term=" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              
              <a 
                href="https://lp.voxvisual.com.br/comboarcano/?utm_source=organic&utm_campaign=&utm_medium=&utm_content=&utm_term=" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              
              <a 
                href="https://api.whatsapp.com/send/?phone=%2B5533988819891&text=%E2%81%AC%E2%81%AD%E2%81%AC%E2%81%AD%E2%81%A3%E2%80%AC%E2%81%A4%E2%80%AA%E2%81%A9%E2%80%8B%E2%80%8D%E2%81%A1%E2%81%A9%E2%81%A8%E2%81%A3%E2%81%AA%E2%81%A6%E2%81%AA%E2%80%8D%E2%81%A1%E2%81%A0%E2%81%A4%E2%81%A0%E2%81%AA%E2%81%A9%E2%81%A9%E2%81%A9%E2%81%A6%E2%81%AC%E2%81%AD%E2%81%AC%E2%81%AD&type=phone_number&app_absent=0" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>
          
          {/* Right side - Photo */}
          <div className="flex-1 order-1 md:order-2 relative">
            <div className="relative">
              {/* Mobile badges - positioned at bottom of photo */}
              <div className="md:hidden absolute bottom-3 left-3 flex gap-2 z-10">
                <span className="bg-black/70 border border-orange-500 text-orange-500 text-[10px] font-bold px-2 py-1 rounded-full">
                  EXPERT EM EVENTOS
                </span>
                <span className="bg-black/70 border border-orange-500 text-orange-500 text-[10px] font-bold px-2 py-1 rounded-full">
                  +11 ANOS DE EXPERIÊNCIA
                </span>
              </div>
              
              {/* Desktop badges - positioned at bottom-center over the photo */}
              <div className="hidden md:flex absolute bottom-4 left-1/2 -translate-x-1/2 gap-3 z-10 whitespace-nowrap">
                <span className="bg-transparent border-2 border-[#EF672C] text-[#EF672C] text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap">
                  EXPERT EM EVENTOS
                </span>
                <span className="bg-transparent border-2 border-[#EF672C] text-[#EF672C] text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap">
                  +11 ANOS DE EXPERIÊNCIA
                </span>
              </div>
              
              <img 
                src="https://lp.voxvisual.com.br/wp-content/uploads/2025/09/freepik__jonathandesigner-realistic-man-with-rounded-face-l__21720.webp" 
                alt="Jonathan Spósito - Designer e Motion Designer" 
                className="w-full max-w-md mx-auto rounded-2xl"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
