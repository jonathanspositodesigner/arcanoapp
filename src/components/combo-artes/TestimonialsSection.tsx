import { useState } from "react";
import { Play, X, MessageCircle } from "lucide-react";

const testimonialImages = [
  "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/05.png",
  "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/04.png",
  "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/03.png",
  "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/02.png",
];

const testimonialVideos = [
  "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/SaveClip.App_AQP5UVtBlyMeswLfSVPOozACWuCtnhDrAdHRpsM_QlfvSvoroJXcIVsMRYxIEBo0nFRL84NP_jKnpkyAHAPPG0KXPxuZobbTzdMV9-M.mp4",
  "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/SaveClip.App_AQPV9pEIxd8EPw7z8nZ_YP-X2sfVhBeiCg07QnyDHGuVMFnypPNuM3riW1oUTb9-8vZY3111Uh4tVwTbQLlGxfGa3gXgU9WBv-EoXlE.mp4",
  "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/SaveClip.App_AQPSmbsR6KU5QIbeRaD5hXenKSRGOTx3olPZzdc46RwIc5k7F0owqBS-y2ebd4QfoDSM671XMJuGfvfwlpQLAComce3tnjFEDc6eo94.mp4",
  "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/SaveClip.App_AQN7xK3y7dNJukKGI1HXahobf1kVvJcAIjv9EQgk9gSjeArQzstachx7J3WHHTYiutgzQ8GXR7ZUzE2-IrMrcwOGEl-VWgYYDVBPqe0.mp4",
];

export const TestimonialsSection = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-[#0a0505] to-black">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#EF672C]/20 text-[#EF672C] text-sm font-medium px-4 py-2 rounded-full border border-[#EF672C]/30 mb-4">
            <MessageCircle className="w-4 h-4" />
            Depoimentos
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-white mb-4">
            O que nossos clientes dizem
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Veja os resultados reais de quem já está usando o Pack Arcano
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Print testimonials */}
          {testimonialImages.map((image, index) => (
            <div
              key={`image-${index}`}
              className="relative rounded-xl overflow-hidden cursor-pointer group bg-gray-900"
              onClick={() => setSelectedImage(image)}
            >
              <img
                src={image}
                alt={`Depoimento ${index + 1}`}
                className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            </div>
          ))}
        </div>

        {/* Video testimonials */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {testimonialVideos.map((video, index) => (
            <div
              key={`video-${index}`}
              className="relative rounded-xl overflow-hidden cursor-pointer group bg-gray-900"
              onClick={() => setSelectedVideo(video)}
            >
              <video
                src={video}
                className="w-full h-auto"
                preload="metadata"
                muted
                playsInline
              />
              
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-[#EF672C] flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 text-white fill-white ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Depoimento ampliado"
              className="max-w-full max-h-[90vh] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Video Modal */}
        {selectedVideo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setSelectedVideo(null)}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
              onClick={() => setSelectedVideo(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <video
              src={selectedVideo}
              className="max-w-full max-h-[90vh] rounded-xl"
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </section>
  );
};
