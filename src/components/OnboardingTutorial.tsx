import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Copy, Smartphone, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SecureImage, SecureVideo } from "@/components/SecureMedia";

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

  // Add click listener to real target elements
  useEffect(() => {
    if (isModalStep || !isVisible) return;

    const handleTargetClick = () => {
      // Small delay to let the actual click action happen first
      setTimeout(() => {
        handleNext();
      }, 100);
    };

    // For step 2 (generate-image), listen to the mobile menu button
    if (step.id === "generate-image") {
      const menuButton = document.querySelector("[data-tutorial='mobile-menu']");
      if (menuButton) {
        menuButton.addEventListener("click", handleTargetClick);
        return () => menuButton.removeEventListener("click", handleTargetClick);
      }
    }

    // Step 3 (ai-tools) - buttons are NOT clickable, user clicks "Entendi" button
  }, [step, isModalStep, isVisible, currentStep]);

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

  // Calculate overlay panel dimensions
  const padding = 16;
  const overlayColor = "rgba(0,0,0,0.85)";

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Skip button - always on top and clickable */}
      <button
        onClick={handleSkip}
        className="absolute top-3 right-3 z-[100] flex items-center gap-1 text-white/80 hover:text-white text-sm pointer-events-auto"
      >
        <X className="h-4 w-4" />
        Pular
      </button>

      {/* Modal step content */}
      {showExampleModal && realItem && (
        <div className="absolute inset-0 flex flex-col p-4 pt-10 pb-6 pointer-events-auto overflow-y-auto" style={{ backgroundColor: overlayColor }}>
          {/* Welcome header */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-white mb-1">Seja bem-vindo! 👋</h2>
            <p className="text-white/70 text-sm">Este tutorial vai te ensinar como usar a plataforma</p>
          </div>
          {/* Example card */}
          <div className="bg-card rounded-2xl overflow-hidden shadow-xl flex flex-col" style={{ height: '55vh', maxHeight: '400px' }}>
            {/* Image */}
            <div className="h-40 w-full bg-muted flex-shrink-0 overflow-hidden">
              {isVideoUrl(realItem.image_url) ? (
                <SecureVideo 
                  src={realItem.image_url} 
                  className="w-full h-full object-cover"
                  isPremium={false}
                  autoPlay
                  muted
                  loop
                />
              ) : (
                <SecureImage 
                  src={realItem.image_url} 
                  alt={realItem.title}
                  className="w-full h-full object-cover"
                  isPremium={false}
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

      {/* Non-modal steps - 4 panel overlay system */}
      {!isModalStep && targetRect && (
        <>
          {/* TOP panel */}
          <div 
            className="absolute left-0 right-0 top-0 pointer-events-auto"
            style={{
              height: Math.max(0, targetRect.top - padding),
              backgroundColor: overlayColor,
            }}
          />

          {/* BOTTOM panel */}
          <div 
            className="absolute left-0 right-0 bottom-0 pointer-events-auto"
            style={{
              top: targetRect.bottom + padding,
              backgroundColor: overlayColor,
            }}
          />

          {/* LEFT panel */}
          <div 
            className="absolute left-0 pointer-events-auto"
            style={{
              top: targetRect.top - padding,
              height: targetRect.height + padding * 2,
              width: Math.max(0, targetRect.left - padding),
              backgroundColor: overlayColor,
            }}
          />

          {/* RIGHT panel */}
          <div 
            className="absolute right-0 pointer-events-auto"
            style={{
              top: targetRect.top - padding,
              height: targetRect.height + padding * 2,
              left: targetRect.right + padding,
              backgroundColor: overlayColor,
            }}
          />

          {/* Visual ring highlight - pointer-events none so it doesn't block */}
          <div 
            className="absolute rounded-xl ring-4 ring-white animate-pulse pointer-events-none"
            style={{
              top: targetRect.top - padding,
              left: targetRect.left - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2,
            }}
          />

          {/* Block clicks on AI tools in step 3 */}
          {step.id === "ai-tools" && (
            <div 
              className="absolute pointer-events-auto"
              style={{
                top: targetRect.top - padding,
                left: targetRect.left - padding,
                width: targetRect.width + padding * 2,
                height: targetRect.height + padding * 2,
              }}
            />
          )}

          {/* Tooltip */}
          <div
            className="absolute left-4 right-4 bg-card rounded-xl shadow-xl p-4 border border-border pointer-events-auto"
            style={{
              bottom: window.innerHeight - targetRect.top + padding + 8,
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
                  "Entendi"
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
