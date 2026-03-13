import { useState } from "react";
import { Play, X } from "lucide-react";

const testimonialImages = [
  "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/05.png",
  "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/04.png",
  "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/03.png",
  "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/02.png",
];

const testimonialVideos = [
  {
    video: "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/SaveClip.App_AQP5UVtBlyMeswLfSVPOozACWuCtnhDrAdHRpsM_QlfvSvoroJXcIVsMRYxIEBo0nFRL84NP_jKnpkyAHAPPG0KXPxuZobbTzdMV9-M.mp4",
    poster: "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/05.png",
  },
  {
    video: "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/SaveClip.App_AQPV9pEIxd8EPw7z8nZ_YP-X2sfVhBeiCg07QnyDHGuVMFnypPNuM3riW1oUTb9-8vZY3111Uh4tVwTbQLlGxfGa3gXgU9WBv-EoXlE.mp4",
    poster: "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/04.png",
  },
  {
    video: "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/SaveClip.App_AQPSmbsR6KU5QIbeRaD5hXenKSRGOTx3olPZzdc46RwIc5k7F0owqBS-y2ebd4QfoDSM671XMJuGfvfwlpQLAComce3tnjFEDc6eo94.mp4",
    poster: "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/03.png",
  },
  {
    video: "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/SaveClip.App_AQN7xK3y7dNJukKGI1HXahobf1kVvJcAIjv9EQgk9gSjeArQzstachx7J3WHHTYiutgzQ8GXR7ZUzE2-IrMrcwOGEl-VWgYYDVBPqe0.mp4",
    poster: "https://lp.voxvisual.com.br/wp-content/uploads/2025/09/02.png",
  },
];

const TestimonialsAgendas = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <section className="py-16 md:py-24 px-4" style={{ backgroundColor: "#1A59E5" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-5xl uppercase mb-3"
            style={{ fontFamily: "Staatliches, sans-serif", color: "#FFFFFF" }}
          >
            QUEM ESTA USANDO O PACK JÁ ESTA COLHENDO OS RESULTADOS
          </h2>
          <p
            className="text-lg md:text-xl"
            style={{ fontFamily: "Poppins, sans-serif", color: "#FFDF00" }}
          >
            Chegou a sua vez de ter o reconhecimento que você merece!
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {testimonialImages.map((image, index) => (
            <div
              key={`image-${index}`}
              className="relative rounded-xl overflow-hidden cursor-pointer group"
              onClick={() => setSelectedImage(image)}
            >
              <img
                src={image}
                alt={`Depoimento ${index + 1}`}
                className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {testimonialVideos.map((item, index) => (
            <div
              key={`video-${index}`}
              className="relative rounded-xl overflow-hidden cursor-pointer group aspect-[9/16]"
              onClick={() => setSelectedVideo(item.video)}
            >
              <img
                src={item.poster}
                alt={`Depoimento em vídeo ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: "#FFDF00" }}
                >
                  <Play className="w-6 h-6 text-[#1A59E5] fill-[#1A59E5] ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>

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

export default TestimonialsAgendas;