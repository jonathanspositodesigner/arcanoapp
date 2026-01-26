import { useState } from "react";
import { Play, X } from "lucide-react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";

const motions = [
  {
    thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/AGENDA-HERIQUE-E-JULIANO.webp",
    video: "https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-AGENDA-HENRIQUE-E-JULIANO.mp4",
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
    thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-SERTANEJO-STORIES.webp",
    video: "https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-SERTANEJO-STORIES.mp4",
    title: "Sertanejo Stories",
  },
];

export const MotionsGallerySection = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  return (
    <section className="py-16 px-4 bg-black">
      <div className="max-w-6xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-10">
          <span className="bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white font-bold text-lg px-8 py-3 rounded-full shadow-lg">
            MOTIONS EDITÁVEIS
          </span>
        </div>
        
        {/* Grid of motions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
            QUERO ESSAS ARTES E MOTIONS
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
        <DialogContent className="max-w-4xl bg-black border-gray-800 p-0">
          <DialogClose className="absolute right-4 top-4 z-50 bg-black/70 hover:bg-[#EF672C] p-2 rounded-full transition-colors">
            <X className="w-6 h-6 text-white" />
          </DialogClose>
          {selectedVideo && (
            <video
              src={selectedVideo}
              controls
              autoPlay
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};
