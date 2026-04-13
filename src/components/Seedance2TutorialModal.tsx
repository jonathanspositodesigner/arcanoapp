import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface Seedance2TutorialModalProps {
  open: boolean;
  onClose: () => void;
}

const YOUTUBE_ID = "ntiWCgikQo0";

const Seedance2TutorialModal = ({ open, onClose }: Seedance2TutorialModalProps) => {
  const [playing, setPlaying] = useState(false);

  const handleClose = () => {
    setPlaying(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 bg-[#0d0d1a] border-white/10 overflow-hidden max-w-[calc(100%-2rem)] rounded-2xl">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Tutorial — Seedance 2.0</h2>
          <p className="text-sm text-white/60 mb-4">Aprenda a usar a ferramenta assistindo o vídeo abaixo:</p>
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
            {playing ? (
              <iframe
                src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`}
                title="Tutorial Seedance 2.0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <button
                onClick={() => setPlaying(true)}
                className="absolute inset-0 w-full h-full group cursor-pointer"
              >
                <img
                  src={`https://img.youtube.com/vi/${YOUTUBE_ID}/maxresdefault.jpg`}
                  alt="Tutorial thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 group-hover:bg-white group-hover:scale-110 transition-all flex items-center justify-center shadow-2xl">
                    <Play className="h-7 w-7 sm:h-9 sm:w-9 text-black ml-1" fill="black" />
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
        <div className="p-4 sm:px-6 sm:pb-6 pt-0">
          <Button onClick={handleClose} className="w-full bg-gradient-primary text-white font-semibold py-3">
            Continuar para a ferramenta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Seedance2TutorialModal;
