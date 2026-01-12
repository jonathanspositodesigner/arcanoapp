import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ArcaneAIStudioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPremium: boolean;
  planType: string | null;
  isLoggedIn: boolean;
}

const ArcaneAIStudioModal = ({ open, onOpenChange }: ArcaneAIStudioModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden bg-transparent border-0 shadow-2xl">
        {/* Close button */}
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-50 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Video Banner Container */}
        <div className="relative w-full rounded-2xl overflow-hidden">
          {/* Video Background - Replace with actual video when ready */}
          <div className="relative w-full aspect-[16/6] sm:aspect-[16/5] bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
            {/* Placeholder for video - will be replaced with actual video */}
            <video 
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay 
              loop 
              muted 
              playsInline
              poster=""
            >
              {/* Add your video source here */}
              {/* <source src="/videos/ferramentas-ia-preview.mp4" type="video/mp4" /> */}
            </video>
            
            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
            
            {/* Content Overlay */}
            <div className="absolute inset-0 flex items-center">
              <div className="p-6 sm:p-10 lg:p-14 max-w-xl">
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 leading-tight">
                  Ferramentas de IA
                </h2>
                <p className="text-sm sm:text-base lg:text-lg text-white/80 mb-6 sm:mb-8 leading-relaxed">
                  Potencialize suas criações com nossas ferramentas exclusivas de IA. 
                  Upscaler, Forja de Selos 3D, Mudar Pose e muito mais disponíveis para você.
                </p>
                <Button 
                  onClick={() => {
                    navigate("/ferramentas-ia?from=prompts");
                    onOpenChange(false);
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm px-6 py-5 sm:px-8 sm:py-6 text-sm sm:text-base font-semibold rounded-lg transition-all hover:scale-105"
                >
                  <Zap className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Acessar Ferramentas
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ArcaneAIStudioModal;
