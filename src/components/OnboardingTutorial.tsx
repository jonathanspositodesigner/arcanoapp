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
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

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
    if (isMobile === false && isVisible) {
      handleComplete();
    }
  }, [isMobile]);

  // Fetch real item from database
  useEffect(() => {
    const fetchRealItem = async () => {
      // Try to find Stranger Things first
      let { data, error } = await supabase
        .from('admin_prompts')
        .select('id, title, prompt, image_url')
        .ilike('title', '%stranger things%')
        .limit(1)
        .single();
      
      // Fallback to any item if Stranger Things not found
      if (!data || error) {
        const fallback = await supabase
          .from('admin_prompts')
          .select('id, title, prompt, image_url')
          .limit(1)
          .single();
        data = fallback.data;
      }
      
      if (data) {
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

  if (!isVisible || isMobile === null || isMobile === false) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/90" />

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-3 right-3 z-10 flex items-center gap-1 text-white/80 hover:text-white text-sm"
      >
        <X className="h-4 w-4" />
        Pular
      </button>

      {/* Modal step content */}
      {showExampleModal && realItem && (
        <div className="absolute inset-0 flex flex-col p-4 pt-14 pb-6">
          {/* Example card */}
          <div className="bg-card rounded-2xl overflow-hidden shadow-xl flex flex-col" style={{ height: '55vh', maxHeight: '400px' }}>
            {/* Image */}
            <div className="h-40 w-full bg-muted flex-shrink-0 overflow-hidden">
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
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
              <h3 className="font-bold text-foreground text-lg truncate">{realItem.title}</h3>
              
              <div className="bg-muted/50 p-3 rounded-lg flex-1 overflow-hidden">
                <p className="text-sm text-muted-foreground line-clamp-3">{realItem.prompt}</p>
              </div>
              
              {/* Highlighted button */}
              <Button 
                className="w-full bg-gradient-primary text-white font-semibold py-3 ring-4 ring-white/50 animate-pulse"
                onClick={handleCopyPrompt}
                data-tutorial-modal="copy-prompt"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copiar Prompt
              </Button>
            </div>
          </div>

          {/* Instructions tooltip - fixed at bottom */}
          <div className="mt-auto pt-4">
            <div className="bg-card rounded-xl p-4 shadow-xl border border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                  <Copy className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {tutorialSteps.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 w-2 rounded-full ${
                          index === currentStep ? "bg-primary" : index < currentStep ? "bg-primary/50" : "bg-muted"
                        }`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">
                      {currentStep + 1}/{tutorialSteps.length}
                    </span>
                  </div>
                  <h4 className="font-bold text-foreground">Copie o Prompt</h4>
                  <p className="text-sm text-muted-foreground">Clique no botão acima para copiar!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Non-modal steps */}
      {!isModalStep && targetRect && (
        <>
          {/* Spotlight cutout - clickable area */}
          <div 
            className="absolute rounded-lg ring-4 ring-white animate-pulse cursor-pointer"
            onClick={handleNext}
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.9)",
              backgroundColor: "transparent",
              zIndex: 10,
            }}
          />

          {/* Tooltip */}
          <div
            className="absolute left-4 right-4 bg-card rounded-xl shadow-xl p-4 border border-border"
            style={{
              bottom: window.innerHeight - targetRect.top + 20,
              zIndex: 11,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                {step.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {tutorialSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 w-2 rounded-full ${
                        index === currentStep ? "bg-primary" : index < currentStep ? "bg-primary/50" : "bg-muted"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">
                    {currentStep + 1}/{tutorialSteps.length}
                  </span>
                </div>
                <h4 className="font-bold text-foreground">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              <Button
                onClick={handleNext}
                size="sm"
                className="bg-gradient-primary text-white flex-shrink-0"
              >
                {currentStep < tutorialSteps.length - 1 ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  "Concluir"
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OnboardingTutorial;
