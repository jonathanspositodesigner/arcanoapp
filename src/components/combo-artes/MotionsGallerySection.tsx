import { useState } from "react";
import { Play, X } from "lucide-react";
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

// URLs exatas extraídas do HTML original do WordPress
const motions = [
  {
    thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/AGENDA-HERIQUE-E-JULIANO.webp",
    video: "https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-AGENDA-HERIQUE-E-JULIANO-1.mp4",
    title: "Agenda Henrique e Juliano",
  },
  {
    thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/HALLOWGRILL.webp",
    video: "https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-Flyer-HallowGrill-Stories-Social-Media.mp4",
    title: "HallowGrill",
  },
  {
    thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/ATRACAO-CONFIRMADA-MC-PEDRINHO.webp",
    video: "https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-ATRACAO-CONFIRMADA-MC-PEDRINHO-1.mp4",
    title: "Atração Confirmada MC Pedrinho",
  },
  {
    thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/BOTECO-SERTANEJO-1.webp",
    video: "https://voxvisual.com.br/wp-content/uploads/2025/11/BOTECO-SERTANEJO1.mp4",
    title: "Sertanejo Stories",
  },
  {
    thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/PIZEIRO-DO-JPZ.webp",
    video: "https://voxvisual.com.br/wp-content/uploads/2025/11/PIZEIRO-DO-JPZ_31.mp4",
    title: "Forró Eletrônica",
  },
  {
    thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/EVENTO-MC-KITINHO.webp",
    video: "https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-EVENTO-MC-KITINHO-1.mp4",
    title: "Funk Baile",
  },
  {
    thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/AFTER-DOS-GIGANTES.webp",
    video: "https://voxvisual.com.br/wp-content/uploads/2025/11/AFTER-DOS-GIGANTES-.mp4",
    title: "Reveillon Stories",
  },
  {
    thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/ARRAIA-DA-CAPITA-1.webp",
    video: "https://voxvisual.com.br/wp-content/uploads/2025/11/ATRAC-MOTION1.mp4",
    title: "São João",
  },
  {
    thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/HALLOWGRILL.webp",
    video: "https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-Flyer-HallowGrill-Stories-Social-Media.mp4",
    title: "Halloween",
  },
  {
    thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/AGENDA-MC-MIRELA1.webp",
    video: "https://voxvisual.com.br/wp-content/uploads/2025/11/AGENDA-MC-MIRELA_1.mp4",
    title: "Country",
  },
];

export const MotionsGallerySection = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  return (
    <section className="py-16 px-4 bg-black">
      <div className="max-w-6xl mx-auto">
        {/* Intro Section */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Você vai ter acesso também a{" "}
            <span className="text-[#EF672C]">uma plataforma completa!</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg max-w-3xl mx-auto">
            Esses são alguns dos motions que você vai ter acesso dentro da nossa plataforma!
          </p>
        </div>

        {/* Badge */}
        <div className="flex justify-center mb-10">
          <span className="bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white font-bold text-sm md:text-base px-6 py-2.5 rounded-full shadow-lg">
            Motions Flyers
          </span>
        </div>
        
        {/* Grid of motions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
          {motions.map((motion, index) => (
            <div
              key={index}
              className="relative cursor-pointer group"
              onClick={() => setSelectedVideo(motion.video)}
            >
              <img
                src={motion.thumbnail}
                alt={motion.title}
                className="w-full h-auto rounded-xl shadow-lg"
                loading="lazy"
              />
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center">
                <div className="bg-[#EF672C] p-4 rounded-full">
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* CTA Section */}
        <div className="text-center mt-12">
          <button
            onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
            className="bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white font-bold text-lg md:text-xl px-10 py-4 rounded-xl shadow-lg shadow-orange-500/30 hover:scale-105 transition-transform duration-300 mb-6"
          >
            QUERO ESSAS ARTES AGORA!
          </button>
          
          {/* Compra segura badges */}
          <div className="flex flex-wrap justify-center items-center gap-4 mt-6">
            <img
              src="https://voxvisual.com.br/wp-content/uploads/2025/11/greenn-compra-segura.png"
              alt="Greenn Compra Segura"
              className="h-10 md:h-12 object-contain"
            />
            <img
              src="https://voxvisual.com.br/wp-content/uploads/2025/11/compra-Segura-vetor-branco1-1.png"
              alt="Compra Segura"
              className="h-8 md:h-10 object-contain"
            />
          </div>
        </div>
      </div>
      
      {/* Video Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="w-[280px] md:w-[320px] bg-transparent border-none p-0 shadow-none [&>button:last-child]:hidden">
          <VisuallyHidden>
            <DialogTitle>Vídeo do Motion</DialogTitle>
          </VisuallyHidden>
          {selectedVideo && (
            <div className="relative">
              {/* Botão de fechar */}
              <button
                onClick={() => setSelectedVideo(null)}
                className="absolute -right-3 -top-3 z-50 bg-gradient-to-r from-[#EF672C] to-[#f65928] hover:from-[#f65928] hover:to-[#EF672C] p-2.5 rounded-full transition-all shadow-lg shadow-black/50"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <div className="rounded-2xl overflow-hidden border-2 border-[#EF672C]/60 shadow-2xl shadow-orange-500/30">
                <div className="w-full aspect-[9/16] bg-black">
                  <video
                    src={selectedVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};
