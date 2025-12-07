import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Copy, Smartphone, Zap } from "lucide-react";

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
    description: "Clique aqui para copiar o prompt e usar na sua ferramenta de IA favorita!",
    targetSelector: "[data-tutorial='copy-prompt']",
    position: "top",
    icon: <Copy className="h-6 w-6" />,
  },
  {
    id: "generate-image",
    title: "Gere sua Imagem",
    description: "Use o botão do menu para acessar as ferramentas de geração de imagem no celular.",
    targetSelector: "[data-tutorial='mobile-menu']",
    position: "top",
    icon: <Smartphone className="h-6 w-6" />,
  },
  {
    id: "ai-tools",
    title: "Ferramentas de IA",
    description: "Acesse ChatGPT, Nano Banana, Whisk, Flux 2 e VEO 3 para gerar suas imagens!",
    targetSelector: "[data-tutorial='ai-tools']",
    position: "right",
    icon: <Zap className="h-6 w-6" />,
  },
];

interface OnboardingTutorialProps {
  onComplete: () => void;
}

const OnboardingTutorial = ({ onComplete }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const step = tutorialSteps[currentStep];

  useEffect(() => {
    const updateTargetPosition = () => {
      const target = document.querySelector(step.targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        // If target not found (e.g., on desktop for mobile menu), skip to next step
        if (step.id === "mobile-menu" && window.innerWidth >= 1024) {
          handleNext();
        }
      }
    };

    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition);

    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
    };
  }, [currentStep, step]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
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
    const tooltipHeight = 180;

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

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Dark overlay with spotlight cutout */}
      <div className="absolute inset-0 bg-black/80 transition-all duration-300">
        {targetRect && (
          <div
            className="absolute bg-transparent rounded-lg ring-4 ring-primary ring-offset-4 ring-offset-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.8)] transition-all duration-300"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
        )}
      </div>

      {/* Skip button */}
      <Button
        onClick={handleSkip}
        variant="ghost"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
      >
        <X className="h-4 w-4 mr-2" />
        Pular Tutorial
      </Button>

      {/* Tutorial tooltip */}
      <div
        className="absolute bg-card rounded-xl shadow-2xl p-6 w-[300px] transition-all duration-300 animate-scale-in"
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
    </div>
  );
};

export default OnboardingTutorial;
