import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Video } from "lucide-react";

const STORAGE_KEY = "movieled_announcement_seen";
const VIDEO_URL = "https://jooojbaljrshgpaxdlou.supabase.co/storage/v1/object/public/prompts-cloudinary/admin_prompts/12573b5e-6813-4ef0-ab3e-fcd734dc1add-1766250040709.mp4";

// ⚠️ Mude para false quando quiser ativar a lógica definitiva (mostrar só 1x)
const ALWAYS_SHOW = true;

const MovieLedAnnouncementModal = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ALWAYS_SHOW) {
      setOpen(true);
      return;
    }
    const alreadySeen = localStorage.getItem(STORAGE_KEY);
    if (!alreadySeen) {
      setOpen(true);
    }
  }, []);

  const markAsSeen = () => {
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleTestNow = () => {
    markAsSeen();
    setOpen(false);
    navigate("/movieled-maker");
  };

  const handleDismiss = () => {
    markAsSeen();
    setOpen(false);
  };

  // Force autoplay on video load
  const handleVideoReady = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.playsInline = true;
      video.play().catch(() => {});
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleDismiss(); }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm sm:max-w-lg p-0 bg-[#0D0221] border-purple-500/30 rounded-2xl overflow-hidden gap-0 max-h-[88vh]">
        {/* Video */}
        <div className="relative w-full overflow-hidden bg-black rounded-t-2xl flex items-center justify-center px-3 pt-3">
          <video
            ref={videoRef}
            src={VIDEO_URL}
            autoPlay
            muted
            loop
            playsInline
            onLoadedData={handleVideoReady}
            onCanPlay={handleVideoReady}
            className="block w-auto max-w-full h-auto max-h-[36vh] sm:max-h-[52vh] rounded-xl object-contain"
          />
          {/* Gradient overlay bottom */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0D0221] to-transparent pointer-events-none" />
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-3 space-y-3 sm:space-y-4 text-center">
          {/* Badge */}
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-xs font-semibold">
              <Sparkles className="h-3 w-3" />
              NOVIDADE
            </span>
          </div>

          {/* Title */}
          <h2 className="text-lg sm:text-2xl font-bold text-white">
            MovieLed Maker
          </h2>

          {/* Description */}
          <p className="text-sm sm:text-base text-purple-200/80 leading-relaxed max-w-md mx-auto">
            Transforme imagens em vídeos incríveis para telões de LED com inteligência artificial.
            Escolha um modelo, insira seu texto e gere vídeos prontos em minutos!
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1 sm:pt-2">
            <Button
              onClick={handleTestNow}
              className="w-full sm:flex-1 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white font-semibold py-5 rounded-xl"
            >
              <Video className="h-4 w-4 mr-2" />
              Testar Agora
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="w-full sm:flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-white py-5 rounded-xl"
            >
              Entendi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MovieLedAnnouncementModal;
