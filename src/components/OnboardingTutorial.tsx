import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ChevronRight, Copy, Smartphone, Zap, Download, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: "top" | "bottom" | "left" | "right";
  icon: React.ReactNode;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "copy-prompt",
    title: "Copie o Prompt",
    description: "Clique no botão para copiar o prompt e usar na sua ferramenta de IA!",
    targetSelector: "[data-tutorial-modal='copy-prompt']",
    position: "top",
    icon: <Copy className="h-6 w-6" />,
  },
  {
    id: "generate-image",
    title: "Gere sua Imagem",
    description: "Clique aqui para acessar as ferramentas de geração de imagem!",
    targetSelector: "[data-tutorial='mobile-menu']",
    position: "top",
    icon: <Smartphone className="h-6 w-6" />,
  },
  {
    id: "ai-tools",
    title: "Ferramentas de IA",
    description: "Use ChatGPT, Nano Banana, Whisk, Flux 2 ou VEO 3 para gerar suas imagens!",
    targetSelector: "[data-tutorial='ai-tools']",
    position: "right",
    icon: <Zap className="h-6 w-6" />,
  },
];

interface RealPromptItem {
  id: string;
  title: string;
  prompt: string;
  image_url: string;
}

interface OnboardingTutorialProps {
  onComplete: () => void;
}

const isVideoUrl = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

const OnboardingTutorial = ({ onComplete }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [showExampleModal, setShowExampleModal] = useState(true);
  const [realItem, setRealItem] = useState<RealPromptItem | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // If not mobile, complete tutorial immediately
  useEffect(() => {
    if (!isMobile && isVisible) {
      handleComplete();
    }
  }, [isMobile]);

  // Fetch real item from database
  useEffect(() => {
    const fetchRealItem = async () => {
      const { data, error } = await supabase
        .from('admin_prompts')
        .select('id, title, prompt, image_url')
        .ilike('title', '%stranger things%')
        .limit(1)
        .single();
      
      if (data && !error) {
        setRealItem(data);
      }
    };
    fetchRealItem();
  }, []);

  const step = tutorialSteps[currentStep];
  const isModalStep = step.id === "copy-prompt";

  const updateTargetPosition = useCallback(() => {
    if (isModalStep) return; // Don't need position for modal step
    
    setTimeout(() => {
      const target = document.querySelector(step.targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      }
    }, 150);
  }, [step, isModalStep]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition);

    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
    };
  }, [currentStep, updateTargetPosition]);

  useEffect(() => {
    setShowExampleModal(isModalStep);
  }, [isModalStep]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setShowExampleModal(false);
    localStorage.setItem("biblioteca-tutorial-completed", "true");
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleCopyPrompt = () => {
    if (realItem) {
      navigator.clipboard.writeText(realItem.prompt);
      toast.success(`Prompt "${realItem.title}" copiado!`);
    }
    // Advance to next step
    handleNext();
  };

  if (!isVisible || !isMobile) return null;

  const getTooltipPosition = () => {
    if (isModalStep) {
      // Position at bottom of screen for modal step
      return {
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        top: "auto",
      };
    }

    if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const padding = 16;
    const tooltipWidth = Math.min(280, window.innerWidth - 32);

    switch (step.position) {
      case "top":
        return {
          bottom: `${window.innerHeight - targetRect.top + padding}px`,
          left: "50%",
          transform: "translateX(-50%)",
          top: "auto",
        };
      case "bottom":
        return {
          top: `${targetRect.bottom + padding}px`,
          left: "50%",
          transform: "translateX(-50%)",
        };
      default:
        return { 
          bottom: "16px",
          left: "50%", 
          transform: "translateX(-50%)",
          top: "auto",
        };
    }
  };

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black/80 z-[9990]" />

      {/* Example Modal with real item */}
      {showExampleModal && realItem && (
        <div className="fixed inset-0 flex items-start justify-center z-[9995] p-4 pt-8 overflow-y-auto">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Media */}
            <div className="relative aspect-square bg-secondary">
              {isVideoUrl(realItem.image_url) ? (
                <video 
                  src={realItem.image_url} 
                  className="w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              ) : (
                <img 
                  src={realItem.image_url} 
                  alt={realItem.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-3">
              <h3 className="font-bold text-base text-foreground">{realItem.title}</h3>
              <div className="bg-secondary p-2.5 rounded-lg max-h-20 overflow-y-auto">
                <p className="text-xs text-muted-foreground">{realItem.prompt}</p>
              </div>
              
              {/* Button with highlight */}
              <Button 
                className="w-full bg-gradient-primary hover:opacity-90 text-white ring-4 ring-white ring-offset-2 ring-offset-card animate-pulse"
                onClick={handleCopyPrompt}
                data-tutorial-modal="copy-prompt"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Prompt
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Spotlight for non-modal steps */}
      {!isModalStep && targetRect && (
        <div 
          className="fixed rounded-lg z-[9991] ring-4 ring-white animate-pulse"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.80)",
            backgroundColor: "transparent",
          }}
        />
      )}

      {/* Skip button */}
      <Button
        onClick={handleSkip}
        variant="ghost"
        size="sm"
        className="fixed top-3 right-3 text-white hover:bg-white/20 z-[10000]"
      >
        <X className="h-4 w-4 mr-1" />
        Pular
      </Button>

      {/* Tutorial tooltip */}
      <div
        className="fixed bg-card rounded-xl shadow-2xl p-4 w-[calc(100%-32px)] max-w-[280px] transition-all duration-300 animate-scale-in z-[10000] border border-border"
        style={getTooltipPosition()}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-primary"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            {currentStep + 1}/{tutorialSteps.length}
          </span>
        </div>

        {/* Icon */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-primary text-white mb-3">
          {step.icon}
        </div>

        {/* Content */}
        <h3 className="text-base font-bold text-foreground mb-1">{step.title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

        {/* Navigation - only show for non-modal steps */}
        {!isModalStep && (
          <Button
            onClick={handleNext}
            className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold"
            size="sm"
          >
            {currentStep < tutorialSteps.length - 1 ? (
              <>
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              "Concluir"
            )}
          </Button>
        )}
      </div>
    </>
  );
};

export default OnboardingTutorial;
