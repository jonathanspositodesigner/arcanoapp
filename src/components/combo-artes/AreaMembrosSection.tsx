import { proxiedMediaUrl } from "@/lib/mediaProxy";

// URLs exatas da seção Área de Membros extraídas do WordPress
export const areaMembrosImages = [
  "https://voxvisual.com.br/wp-content/uploads/2025/11/simbolo-gold-2.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/area-de-membros.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/COMUNIDADE.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/tablet-and-laptop.webp",
  "https://voxvisual.com.br/wp-content/uploads/2025/11/suport-1.png",
];

const benefits = [
  {
    icon: areaMembrosImages[2],
    title: "+1700 Membros Ativos na Comunidade",
  },
  {
    icon: areaMembrosImages[3],
    title: "Edite tudo canva ou photoshop",
  },
  {
    icon: areaMembrosImages[4],
    title: "suporte técnico exclusivo e dedicado",
  },
];

export const AreaMembrosSection = () => {
  return (
    <section className="relative py-16 px-4 bg-black">
      <div className="max-w-6xl mx-auto">
        {/* Gold symbol */}
        <div className="flex justify-center mb-8">
          <img
            src={proxiedMediaUrl(areaMembrosImages[0])}
            alt="Símbolo Gold"
            className="w-24 h-24 md:w-32 md:h-32 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        
        {/* Title */}
        <h2 className="text-2xl md:text-4xl font-black text-center text-white mb-4">
          SEJA BEM VINDO À{" "}
          <span className="text-[#EF672C]">BIBLIOTECA DE ARTES ARCANAS!</span>
        </h2>
        
        {/* Description */}
        <p className="text-gray-400 text-center max-w-3xl mx-auto mb-10 text-base md:text-lg">
          Uma plataforma completa com tudo que você precisa para criar artes profissionais para eventos, festas e shows!
        </p>
        
        {/* Members area screenshot */}
        <div className="mb-12">
          <img
            src={proxiedMediaUrl(areaMembrosImages[1])}
            alt="Área de Membros"
            className="w-full max-w-4xl mx-auto rounded-2xl shadow-2xl shadow-orange-500/10"
            referrerPolicy="no-referrer"
          />
        </div>
        
        {/* Benefits cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6 text-center hover:border-[#EF672C]/50 transition-colors duration-300"
            >
              <img
                src={proxiedMediaUrl(benefit.icon)}
                alt={benefit.title}
                className="w-16 h-16 mx-auto mb-4 object-contain"
                referrerPolicy="no-referrer"
              />
              <h3 className="text-white font-semibold text-lg">{benefit.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
