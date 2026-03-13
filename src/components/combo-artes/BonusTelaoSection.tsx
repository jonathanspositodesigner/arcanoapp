import { Gift } from "lucide-react";

const telaoVideos = [
  { video: "https://baa.voxvisual.com.br/videos/DJ_GUUGA.mp4", title: "DJ Guuga" },
  { video: "https://baa.voxvisual.com.br/videos/MAIARA_E_MARAISA.mp4", title: "Maiara e Maraisa" },
  { video: "https://baa.voxvisual.com.br/videos/REVOADA_DO_PARANGO.mp4", title: "Revoada do Parango" },
  { video: "https://baa.voxvisual.com.br/videos/TOCA_DO_VALE.mp4", title: "Toca do Vale" },
  { video: "https://baa.voxvisual.com.br/videos/DJ_ALOK.mp4", title: "DJ Alok" },
  { video: "https://baa.voxvisual.com.br/videos/GICA.mp4", title: "Gica" },
];

export const BonusTelaoSection = () => {
  return (
    <section className="py-16 md:py-28 px-4 bg-gradient-to-br from-[#EF672C] via-[#d4451a] to-[#8B0000] relative isolate overflow-hidden">
      {/* Decorative glow effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center animate-pulse bg-black">
              <Gift className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-white font-bold text-sm md:text-lg px-5 md:px-6 py-2 md:py-2.5 rounded-full shadow-xl whitespace-nowrap bg-black">
              🎁 Bônus Somente Hoje
            </span>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center animate-pulse bg-black">
              <Gift className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>

          {/* Title */}
          <p className="text-white/90 text-sm md:text-lg mb-1 md:mb-2 px-2 drop-shadow-md">
            Adquirindo hoje você leva também
          </p>
          <h2 className="text-2xl md:text-4xl font-black text-black mb-3 md:mb-4 px-2 drop-shadow-lg leading-tight">
            Um Pack de Movies para Telão de Palco
          </h2>
          <p className="text-white/90 text-sm md:text-lg px-4 drop-shadow-md">
            +20 movies para telão de palco editáveis no Canva
          </p>
        </div>

        {/* 3x2 Grid of videos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 px-2 md:px-8">
          {telaoVideos.map((item, index) => (
            <div
              key={index}
              className="relative rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300 aspect-video"
            >
              <video
                src={item.video}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                onLoadedData={(e) => {
                  const video = e.currentTarget;
                  video.muted = true;
                  video.play().catch(() => {});
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
