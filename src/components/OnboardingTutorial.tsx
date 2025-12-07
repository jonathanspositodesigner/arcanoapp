import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Copy, Smartphone, Zap } from "lucide-react";
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
    description: "Clique no botão para copiar o prompt!",
    targetSelector: "[data-tutorial-modal='copy-prompt']",
    position: "top",
    icon: <Copy className="h-5 w-5" />,
  },
  {
    id: "generate-image",
    title: "Gere sua Imagem",
    description: "Clique aqui para acessar as ferramentas de IA!",
    targetSelector: "[data-tutorial='mobile-menu']",
    position: "top",
    icon: <Smartphone className="h-5 w-5" />,
  },
  {
    id: "ai-tools",
    title: "Ferramentas de IA",
    description: "Use ChatGPT, Nano Banana, Whisk ou Flux 2 para gerar!",
    targetSelector: "[data-tutorial='ai-tools']",
    position: "right",
    icon: <Zap className="h-5 w-5" />,
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
    if (isModalStep) return;
    
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
    handleNext();
  };

  if (!isVisible || !isMobile) return null;

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black/85 z-[9990]" />

      {/* Skip button */}
      <Button
        onClick={handleSkip}
        variant="ghost"
        size="sm"
        className="fixed top-2 right-2 text-white hover:bg-white/20 z-[10000] text-xs px-2 py-1"
      >
        <X className="h-3 w-3 mr-1" />
        Pular
      </Button>

      {/* Modal step - full screen layout */}
      {showExampleModal && realItem && (
        <div className="fixed inset-0 z-[9995] flex flex-col p-4 pt-12 pb-4 safe-area-inset-bottom">
          {/* Card container - with fixed max height */}
          <div className="bg-card rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {/* Media - fixed height */}
            <div className="relative h-48 flex-shrink-0 bg-secondary">
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
            
            {/* Content - fixed height, always visible */}
            <div className="p-4 space-y-3 flex-shrink-0">
              <h3 className="font-bold text-base text-foreground">{realItem.title}</h3>
              <div className="bg-secondary p-3 rounded-lg">
                <p className="text-xs text-muted-foreground line-clamp-2">{realItem.prompt}</p>
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

          {/* Tooltip - fixed at bottom */}
          <div className="bg-card rounded-xl shadow-2xl p-4 mt-auto border border-border">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-primary text-white flex-shrink-0">
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex gap-1">
                    {tutorialSteps.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 w-2 rounded-full ${
                          index === currentStep
                            ? "bg-primary"
                            : index < currentStep
                            ? "bg-primary/50"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {currentStep + 1}/{tutorialSteps.length}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Non-modal steps */}
      {!isModalStep && targetRect && (
        <>
          {/* Spotlight */}
          <div 
            className="fixed rounded-lg z-[9991] ring-4 ring-white animate-pulse"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.85)",
              backgroundColor: "transparent",
            }}
          />

          {/* Tooltip */}
          <div
            className="fixed left-3 right-3 bg-card rounded-xl shadow-2xl p-3 z-[10000] border border-border"
            style={{
              bottom: window.innerHeight - targetRect.top + 16,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-primary text-white flex-shrink-0">
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="flex gap-1">
                    {tutorialSteps.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1.5 w-1.5 rounded-full ${
                          index === currentStep
                            ? "bg-primary"
                            : index < currentStep
                            ? "bg-primary/50"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {currentStep + 1}/{tutorialSteps.length}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              <Button
                onClick={handleNext}
                size="sm"
                className="bg-gradient-primary hover:opacity-90 text-white flex-shrink-0"
              >
                {currentStep < tutorialSteps.length - 1 ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  "OK"
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default OnboardingTutorial;
