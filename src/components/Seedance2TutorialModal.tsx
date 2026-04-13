import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Seedance2TutorialModalProps {
  open: boolean;
  onClose: () => void;
}

const Seedance2TutorialModal = ({ open, onClose }: Seedance2TutorialModalProps) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 bg-[#0d0d1a] border-white/10 overflow-hidden">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Tutorial — Seedance 2.0</h2>
          <p className="text-sm text-white/60 mb-4">Aprenda a usar a ferramenta assistindo o vídeo abaixo:</p>
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              src="https://www.youtube.com/embed/ntiWCgikQo0"
              title="Tutorial Seedance 2.0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
        <div className="p-4 sm:px-6 sm:pb-6 pt-0">
          <Button onClick={onClose} className="w-full bg-gradient-primary text-white font-semibold py-3">
            Continuar para a ferramenta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Seedance2TutorialModal;
