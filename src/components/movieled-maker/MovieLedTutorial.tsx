import { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, CheckCircle2, Sparkles, Zap, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const STORAGE_KEY = 'movieled-tutorial-completed';

interface TutorialStep {
  step: number;
  title: string;
  description: string;
  targetSelector: string;
  emoji: string;
  action?: string;
}

const STEPS: TutorialStep[] = [
  {
    step: 1,
    title: 'Escolha o Motor',
    description: 'Selecione entre Wan 2.2 (15s, 720p) ou Veo 3.1 (8s, 1080p). Cada motor tem qualidade e duração diferentes!',
    targetSelector: '[data-tutorial-movieled="engine"]',
    emoji: '⚡',
    action: 'Clique em um dos motores',
  },
  {
    step: 2,
    title: 'Escolha o Telão',
    description: 'Clique no botão abaixo para abrir a biblioteca de telões de LED e escolher um modelo.',
    targetSelector: '[data-tutorial-movieled="reference"]',
    emoji: '🖼️',
    action: 'Clique para abrir a biblioteca',
  },
  {
    step: 3,
    title: 'Selecione um Modelo',
    description: 'Na biblioteca, escolha o telão "Boteco do Luan" (gratuito) ou qualquer outro modelo disponível!',
    targetSelector: '[data-tutorial-movieled="library-modal"]',
    emoji: '🎯',
    action: 'Escolha o telão Boteco do Luan',
  },
  {
    step: 4,
    title: 'Digite o Nome',
    description: 'Escreva o nome que aparecerá no telão de LED. Pode ser seu nome artístico, nome do evento, etc.',
    targetSelector: '[data-tutorial-movieled="text-input"]',
    emoji: '✍️',
    action: 'Digite o nome desejado',
  },
  {
    step: 5,
    title: 'Gerar Movie!',
    description: 'Tudo pronto! Agora é só clicar em "Gerar Movie" e aguardar a IA criar seu vídeo para telão.',
    targetSelector: '[data-tutorial-movieled="generate"]',
    emoji: '🚀',
    action: 'Clique em Gerar Movie',
  },
];

interface MovieLedTutorialProps {
  onComplete: () => void;
}

const MovieLedTutorial = ({ onComplete }: MovieLedTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [animateIn, setAnimateIn] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const step = STEPS[currentStep];
  const progress = ((currentStep) / STEPS.length) * 100;

  // Position the highlight around the target element
  const updateTargetPosition = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    // Small delay for DOM to settle
    const timer = setTimeout(updateTargetPosition, 200);
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition);
    };
  }, [currentStep, updateTargetPosition]);

  // Animate in on step change
  useEffect(() => {
    setAnimateIn(false);
    const t = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(t);
  }, [currentStep]);

  const finishTutorial = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
    onComplete();
  }, [onComplete]);

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finishTutorial();
    }
  };

  const handleSkip = () => {
    finishTutorial();
  };

  if (!isVisible) return null;

  const pad = 12;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay panels around target */}
      {targetRect ? (
        <>
          {/* Top */}
          <div
            className="absolute left-0 right-0 top-0 bg-black/80 pointer-events-auto"
            style={{ height: Math.max(0, targetRect.top - pad) }}
          />
          {/* Bottom */}
          <div
            className="absolute left-0 right-0 bottom-0 bg-black/80 pointer-events-auto"
            style={{ top: targetRect.bottom + pad }}
          />
          {/* Left */}
          <div
            className="absolute left-0 bg-black/80 pointer-events-auto"
            style={{
              top: targetRect.top - pad,
              height: targetRect.height + pad * 2,
              width: Math.max(0, targetRect.left - pad),
            }}
          />
          {/* Right */}
          <div
            className="absolute right-0 bg-black/80 pointer-events-auto"
            style={{
              top: targetRect.top - pad,
              height: targetRect.height + pad * 2,
              left: targetRect.right + pad,
            }}
          />

          {/* Highlight ring */}
          <div
            className="absolute rounded-xl pointer-events-none transition-all duration-500 ease-out"
            style={{
              top: targetRect.top - pad,
              left: targetRect.left - pad,
              width: targetRect.width + pad * 2,
              height: targetRect.height + pad * 2,
              boxShadow: '0 0 0 3px rgba(168, 85, 247, 0.7), 0 0 20px rgba(168, 85, 247, 0.3)',
            }}
          />

          {/* Pulsing ring animation */}
          <div
            className="absolute rounded-xl pointer-events-none animate-pulse"
            style={{
              top: targetRect.top - pad - 4,
              left: targetRect.left - pad - 4,
              width: targetRect.width + pad * 2 + 8,
              height: targetRect.height + pad * 2 + 8,
              border: '2px solid rgba(168, 85, 247, 0.4)',
            }}
          />
        </>
      ) : (
        /* Full overlay when no target found (e.g. step 3 modal not open yet) */
        <div className="absolute inset-0 bg-black/80 pointer-events-auto" />
      )}

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-3 right-3 z-[100] flex items-center gap-1.5 text-white/60 hover:text-white text-xs pointer-events-auto transition-colors"
      >
        <X className="h-3.5 w-3.5" />
        Pular tutorial
      </button>

      {/* Tooltip card */}
      <div
        className={`absolute pointer-events-auto transition-all duration-400 ${
          animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
        style={{
          ...(targetRect
            ? {
                // Position below target if enough space, else above
                top:
                  targetRect.bottom + pad + 16 + 220 < window.innerHeight
                    ? targetRect.bottom + pad + 12
                    : undefined,
                bottom:
                  targetRect.bottom + pad + 16 + 220 >= window.innerHeight
                    ? window.innerHeight - targetRect.top + pad + 12
                    : undefined,
                left: 16,
                right: 16,
              }
            : {
                top: '50%',
                left: 16,
                right: 16,
                transform: 'translateY(-50%)',
              }),
          zIndex: 100,
        }}
      >
        <div className="bg-[#1e1e3a] border border-purple-500/30 rounded-2xl p-5 shadow-2xl shadow-purple-900/30 max-w-lg mx-auto">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] font-medium text-purple-300 uppercase tracking-wider">
                  Tutorial MovieLed
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-medium">
                {currentStep + 1} de {STEPS.length}
              </span>
            </div>
            <Progress value={progress} className="h-1.5 bg-white/5" />
          </div>

          {/* Step indicator dots */}
          <div className="flex items-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'w-6 bg-purple-500'
                    : completedSteps.has(i)
                    ? 'w-2 bg-green-500'
                    : 'w-2 bg-white/15'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="flex items-start gap-3.5">
            {/* Emoji badge */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/20 flex items-center justify-center text-2xl flex-shrink-0">
              {step.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                Passo {step.step}: {step.title}
                {completedSteps.has(currentStep) && (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                )}
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">{step.description}</p>

              {/* Action hint */}
              {step.action && (
                <div className="mt-2.5 flex items-center gap-2 bg-purple-500/10 border border-purple-500/15 rounded-lg px-3 py-1.5">
                  <MousePointerClick className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span className="text-xs text-purple-300 font-medium">{step.action}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
            <button
              onClick={handleSkip}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Pular tudo
            </button>
            <Button
              onClick={handleNext}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-medium gap-1.5 rounded-lg px-5"
            >
              {currentStep < STEPS.length - 1 ? (
                <>
                  Próximo
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Concluir!
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieLedTutorial;
export { STORAGE_KEY as MOVIELED_TUTORIAL_STORAGE_KEY };
