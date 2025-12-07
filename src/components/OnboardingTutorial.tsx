import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
    position: "bottom",
    icon: <Copy className="h-6 w-6" />,
  },
  {
    id: "download-ref",
    title: "Baixe a Referência",
    description: "Baixe a imagem de referência para usar junto com o prompt!",
    targetSelector: "[data-tutorial-modal='download-ref']",
    position: "bottom",
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
    setTimeout(() => {
      const target = document.querySelector(step.targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        if (step.id === "generate-image" && window.innerWidth >= 1024) {
          handleNext();
        }
      }
    }, 150);
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

    const padding = 20;
    const tooltipWidth = 300;
    const tooltipHeight = 220;

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
      {/* Dark overlay - lowest z-index */}
      <div className="fixed inset-0 bg-black/85 z-[9990]" />

      {/* Example Modal - above dark overlay */}
      {showExampleModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9995] p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex flex-col">
              {/* Image placeholder area */}
              <div className="bg-gradient-to-br from-primary/30 to-secondary aspect-video flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
                    <span className="text-4xl">🎬</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{defaultExample.title}</h3>
                </div>
              </div>
              
              {/* Content area */}
              <div className="p-5 space-y-4">
                <h3 className="font-bold text-lg text-foreground">{defaultExample.title}</h3>
                <div className="bg-secondary p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground line-clamp-3">{defaultExample.prompt}</p>
                </div>
                
                {/* Buttons with spotlight effect */}
                <div className="flex gap-3 flex-wrap">
                  <Button 
                    className={`flex-1 bg-gradient-primary hover:opacity-90 text-white relative ${step.id === 'copy-prompt' ? 'ring-4 ring-white ring-offset-2 ring-offset-card animate-pulse' : ''}`}
                    size="sm"
                    data-tutorial-modal="copy-prompt"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Prompt
                  </Button>
                  <Button 
                    variant="outline" 
                    className={`flex-1 border-border hover:bg-secondary relative ${step.id === 'download-ref' ? 'ring-4 ring-white ring-offset-2 ring-offset-card animate-pulse' : ''}`}
                    size="sm"
                    data-tutorial-modal="download-ref"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Referência
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spotlight cutout for non-modal steps */}
      {!isModalStep && targetRect && (
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
      )}

      {/* Skip button - highest z-index */}
      <Button
        onClick={handleSkip}
        variant="ghost"
        className="fixed top-4 right-4 text-white hover:bg-white/20 z-[10000]"
      >
        <X className="h-4 w-4 mr-2" />
        Pular Tutorial
      </Button>

      {/* Tutorial tooltip - highest z-index */}
      <div
        className="fixed bg-card rounded-xl shadow-2xl p-5 w-[300px] transition-all duration-300 animate-scale-in z-[10000] border border-border"
        style={getTooltipPosition()}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-1.5">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-primary"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground ml-auto font-medium">
            {currentStep + 1} de {tutorialSteps.length}
          </span>
        </div>

        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-primary text-white mb-4 shadow-lg">
          {step.icon}
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{step.description}</p>

        {/* Navigation */}
        <Button
          onClick={handleNext}
          className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold"
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
    </>
  );
};

export default OnboardingTutorial;
