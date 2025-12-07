import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ChevronRight, Copy, Smartphone, Zap, Download } from "lucide-react";

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
    description: "Clique aqui para copiar o prompt e colar na sua ferramenta de IA favorita!",
    targetSelector: "[data-tutorial-modal='copy-prompt']",
    position: "top",
    icon: <Copy className="h-6 w-6" />,
  },
  {
    id: "download-ref",
    title: "Baixe a Referência",
    description: "Baixe a imagem de referência para usar junto com o prompt!",
    targetSelector: "[data-tutorial-modal='download-ref']",
    position: "top",
    icon: <Download className="h-6 w-6" />,
  },
  {
    id: "generate-image",
    title: "Gere sua Imagem",
    description: "No celular, clique aqui para acessar as ferramentas de geração de imagem!",
    targetSelector: "[data-tutorial='mobile-menu']",
    position: "top",
    icon: <Smartphone className="h-6 w-6" />,
  },
  {
    id: "ai-tools",
    title: "Ferramentas de IA",
    description: "Use ChatGPT, Nano Banana, Whisk, Flux 2 ou VEO 3 para gerar suas imagens com o prompt copiado!",
    targetSelector: "[data-tutorial='ai-tools']",
    position: "right",
    icon: <Zap className="h-6 w-6" />,
  },
];

interface ExampleItem {
  title: string;
  prompt: string;
  imageUrl: string;
}

interface OnboardingTutorialProps {
  onComplete: () => void;
  exampleItem?: ExampleItem;
}

const OnboardingTutorial = ({ onComplete, exampleItem }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [showExampleModal, setShowExampleModal] = useState(true);

  const step = tutorialSteps[currentStep];
  const isModalStep = step.id === "copy-prompt" || step.id === "download-ref";

  const updateTargetPosition = useCallback(() => {
    // Small delay to let the modal render
    setTimeout(() => {
      const target = document.querySelector(step.targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        // If target not found (e.g., on desktop for mobile menu), skip to next step
        if (step.id === "generate-image" && window.innerWidth >= 1024) {
          handleNext();
        }
      }
    }, 100);
  }, [step]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition);

    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
    };
  }, [currentStep, updateTargetPosition]);

  // Close modal when moving past modal steps
  useEffect(() => {
    if (!isModalStep) {
      setShowExampleModal(false);
    } else {
      setShowExampleModal(true);
    }
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

  if (!isVisible) return null;

  const getTooltipPosition = () => {
    if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const padding = 16;
    const tooltipWidth = 300;
    const tooltipHeight = 200;

    switch (step.position) {
      case "top":
        return {
          top: `${Math.max(padding, targetRect.top - tooltipHeight - padding)}px`,
          left: `${Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding))}px`,
        };
      case "bottom":
        return {
          top: `${Math.min(window.innerHeight - tooltipHeight - padding, targetRect.bottom + padding)}px`,
          left: `${Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding))}px`,
        };
      case "left":
        return {
          top: `${Math.max(padding, targetRect.top + targetRect.height / 2 - tooltipHeight / 2)}px`,
          left: `${Math.max(padding, targetRect.left - tooltipWidth - padding)}px`,
        };
      case "right":
        return {
          top: `${Math.max(padding, targetRect.top + targetRect.height / 2 - tooltipHeight / 2)}px`,
          left: `${Math.min(window.innerWidth - tooltipWidth - padding, targetRect.right + padding)}px`,
        };
      default:
        return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
  };

  const defaultExample: ExampleItem = exampleItem || {
    title: "Stranger things 3",
    prompt: "A 3D metallic seal with 'STRANGER THINGS' text, featuring a glowing red neon style with dark atmospheric background, horror vibes, Netflix series inspired design",
    imageUrl: "https://jooojbaljrshgpaxdlou.supabase.co/storage/v1/object/public/prompt-images/stranger-things-example.jpg",
  };

  return (
    <>
      {/* Example Modal for first steps */}
      {showExampleModal && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden bg-card z-[9998]">
            <div className="flex flex-col max-h-[90vh]">
              <div className="flex-shrink-0 bg-gradient-to-br from-primary/20 to-secondary aspect-video flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <span className="text-4xl">🎬</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{defaultExample.title}</h3>
                </div>
              </div>
              <div className="p-4 space-y-3 flex-shrink-0">
                <h3 className="font-bold text-lg text-foreground">{defaultExample.title}</h3>
                <div className="bg-secondary p-3 rounded-lg max-h-24 overflow-y-auto">
                  <p className="text-xs text-muted-foreground">{defaultExample.prompt}</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Button 
                    className="flex-1 bg-gradient-primary hover:opacity-90 text-white" 
                    size="sm"
                    data-tutorial-modal="copy-prompt"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Prompt
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 border-border hover:bg-secondary" 
                    size="sm"
                    data-tutorial-modal="download-ref"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Referência
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dark overlay with spotlight cutout */}
      <div className="fixed inset-0 z-[9999] pointer-events-none">
        <div className="absolute inset-0 bg-black/80">
          {targetRect && (
            <div
              className="absolute bg-transparent rounded-lg transition-all duration-300"
              style={{
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.85)",
              }}
            />
          )}
        </div>
      </div>

      {/* Skip button */}
      <Button
        onClick={handleSkip}
        variant="ghost"
        className="fixed top-4 right-4 text-white hover:bg-white/20 z-[10000] pointer-events-auto"
      >
        <X className="h-4 w-4 mr-2" />
        Pular Tutorial
      </Button>

      {/* Tutorial tooltip */}
      <div
        className="fixed bg-card rounded-xl shadow-2xl p-6 w-[300px] transition-all duration-300 animate-scale-in z-[10000] pointer-events-auto"
        style={getTooltipPosition()}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
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
            {currentStep + 1} de {tutorialSteps.length}
          </span>
        </div>

        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-primary text-white mb-4">
          {step.icon}
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{step.description}</p>

        {/* Navigation */}
        <div className="flex gap-2">
          <Button
            onClick={handleNext}
            className="flex-1 bg-gradient-primary hover:opacity-90 text-white"
          >
            {currentStep < tutorialSteps.length - 1 ? (
              <>
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              "Concluir"
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

export default OnboardingTutorial;
