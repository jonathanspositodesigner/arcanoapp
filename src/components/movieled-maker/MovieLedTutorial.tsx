import { useState, useEffect, useCallback, useRef } from 'react';
import { X, CheckCircle2, Sparkles, MousePointerClick, GraduationCap, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const STORAGE_KEY = 'movieled-tutorial-completed';

interface TutorialStep {
  step: number;
  title: string;
  description: string;
  targetSelector: string;
  emoji: string;
  action: string;
}

const STEPS: TutorialStep[] = [
  {
    step: 1,
    title: 'Escolha o Motor',
    description: 'Selecione entre Wan 2.2 (15s, 720p) ou Veo 3.1 (8s, 1080p). Cada motor tem qualidade e duração diferentes!',
    targetSelector: '[data-tutorial-movieled="engine"]',
    emoji: '⚡',
    action: 'Clique em um dos motores para continuar',
  },
  {
    step: 2,
    title: 'Escolha o Telão',
    description: 'Clique no botão abaixo para abrir a biblioteca de telões de LED e escolher um modelo.',
    targetSelector: '[data-tutorial-movieled="reference"]',
    emoji: '🖼️',
    action: 'Clique no botão para abrir a biblioteca',
  },
  {
    step: 3,
    title: 'Selecione um Modelo',
    description: 'Na biblioteca, escolha o telão "Boteco do Luan" (gratuito) ou qualquer outro modelo disponível!',
    targetSelector: '[data-tutorial-movieled="library-modal"]',
    emoji: '🎯',
    action: 'Selecione um telão da lista',
  },
  {
    step: 4,
    title: 'Digite o Nome',
    description: 'Escreva o nome que aparecerá no telão de LED. Pode ser seu nome artístico, nome do evento, etc.',
    targetSelector: '[data-tutorial-movieled="text-input"]',
    emoji: '✍️',
    action: 'Digite o nome e clique no ✓ para confirmar',
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
  persistCompletion?: boolean;
  onPhaseChange?: (phase: 'intro' | 'active') => void;
}

type Phase = 'intro' | 'active';

const MovieLedTutorial = ({ onComplete, persistCompletion = true, onPhaseChange }: MovieLedTutorialProps) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [animateIn, setAnimateIn] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const listenerCleanupRef = useRef<(() => void) | null>(null);

  const step = STEPS[currentStep];
  const progress = ((currentStep) / STEPS.length) * 100;

  const finishTutorial = useCallback(() => {
    listenerCleanupRef.current?.();
    if (persistCompletion) {
      localStorage.setItem(STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsVisible(false);
    onComplete();
  }, [onComplete, persistCompletion]);

  const advanceStep = useCallback(() => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      finishTutorial();
    }
  }, [currentStep, finishTutorial]);

  // Position the highlight around the target element
  const updateTargetPosition = useCallback(() => {
    if (phase !== 'active' || !step) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step, phase]);

  useEffect(() => {
    if (phase !== 'active') return;
    const timer = setTimeout(updateTargetPosition, 200);
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition);
    };
  }, [currentStep, updateTargetPosition, phase]);

  // Listen for clicks on the target element to advance
  useEffect(() => {
    if (phase !== 'active') return;

    // Clean up previous listener
    listenerCleanupRef.current?.();
    listenerCleanupRef.current = null;

    const attachListener = () => {
      const el = document.querySelector(step.targetSelector);
      if (!el) return;

      // For text input (step 4), listen for click on the confirm button
      if (step.step === 4) {
        const confirmBtn = document.querySelector('[data-tutorial-movieled="text-confirm"]');
        if (!confirmBtn) return;
        const handleClick = () => {
          const inputEl = el?.querySelector('input') as HTMLInputElement | null;
          if (inputEl && inputEl.value.trim().length > 0) {
            setTimeout(() => advanceStep(), 150);
          }
        };
        confirmBtn.addEventListener('click', handleClick, { capture: true });
        listenerCleanupRef.current = () => confirmBtn.removeEventListener('click', handleClick, { capture: true });
        return;
      }

      // For other steps, listen for click anywhere inside the target
      const handleClick = () => {
        // Small delay so the actual action happens first
        setTimeout(() => advanceStep(), 150);
      };
      el.addEventListener('click', handleClick, { capture: true });
      listenerCleanupRef.current = () => el.removeEventListener('click', handleClick, { capture: true });
    };

    // Retry finding the element (e.g. modal might not be open yet for step 3)
    const timer = setTimeout(attachListener, 300);
    const interval = setInterval(() => {
      if (!listenerCleanupRef.current) attachListener();
    }, 500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      listenerCleanupRef.current?.();
      listenerCleanupRef.current = null;
    };
  }, [phase, currentStep, step, advanceStep]);

  // Animate in on step change
  useEffect(() => {
    setAnimateIn(false);
    const t = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(t);
  }, [currentStep]);

  if (!isVisible) return null;

  // =================== INTRO SCREEN ===================
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 pointer-events-auto" onClick={finishTutorial} />
        <div className="relative z-10 bg-card border border-border rounded-2xl p-6 shadow-2xl shadow-black/40 max-w-xs w-full pointer-events-auto animate-scale-in text-center">
          <div className="text-4xl mb-3">🎬</div>
          <h2 className="text-lg font-bold text-foreground mb-1">Primeira vez aqui?</h2>
          <p className="text-xs text-muted-foreground mb-5">Aprenda a usar em 5 passos rápidos.</p>

          <Button
            onClick={() => { setPhase('active'); onPhaseChange?.('active'); }}
            className="w-full bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-700 hover:to-slate-600 text-foreground font-semibold gap-2 rounded-xl py-5 mb-2"
          >
            <Play className="w-4 h-4" />
            Iniciar Tutorial
          </Button>
          <button onClick={finishTutorial} className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors py-1">
            Não, já sei usar
          </button>
        </div>
      </div>
    );
  }

  // =================== ACTIVE TUTORIAL ===================
  const pad = 12;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Overlay panels around target */}
      {targetRect ? (
        <>
          <div className="absolute left-0 right-0 top-0 bg-black/75 pointer-events-auto" style={{ height: Math.max(0, targetRect.top - pad) }} />
          <div className="absolute left-0 right-0 bottom-0 bg-black/75 pointer-events-auto" style={{ top: targetRect.bottom + pad }} />
          <div className="absolute left-0 bg-black/75 pointer-events-auto" style={{ top: targetRect.top - pad, height: targetRect.height + pad * 2, width: Math.max(0, targetRect.left - pad) }} />
          <div className="absolute right-0 bg-black/75 pointer-events-auto" style={{ top: targetRect.top - pad, height: targetRect.height + pad * 2, left: targetRect.right + pad }} />

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
        <div className="absolute inset-0 bg-black/75 pointer-events-auto" />
      )}

      {/* Skip button */}
      <button
        onClick={finishTutorial}
        className="absolute top-3 right-3 z-[100] flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs pointer-events-auto transition-colors"
      >
        <X className="h-3.5 w-3.5" />
        Pular
      </button>

      {/* Tooltip card */}
      <div
        className={`absolute pointer-events-auto transition-all duration-400 ${
          animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
        style={{
          ...(targetRect
            ? {
                top: targetRect.bottom + pad + 16 + 200 < window.innerHeight
                  ? targetRect.bottom + pad + 12
                  : undefined,
                bottom: targetRect.bottom + pad + 16 + 200 >= window.innerHeight
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
        <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl shadow-black/30 max-w-lg mx-auto">
          {/* Progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tutorial</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{currentStep + 1}/{STEPS.length}</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-accent" />
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5 mb-3">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-6 bg-accent0' : completedSteps.has(i) ? 'w-2 bg-green-500' : 'w-2 bg-white/15'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-400/20 border border-border flex items-center justify-center text-xl flex-shrink-0">
              {step.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground mb-0.5 flex items-center gap-2">
                Passo {step.step}: {step.title}
                {completedSteps.has(currentStep) && <CheckCircle2 className="w-4 h-4 text-green-400" />}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>

              {/* Action hint - this is the key instruction */}
              <div className="mt-2 flex items-center gap-2 bg-accent0/10 border border-slate-500/15 rounded-lg px-3 py-1.5 animate-pulse">
                <MousePointerClick className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-[11px] text-muted-foreground font-medium">{step.action}</span>
              </div>
            </div>
          </div>

          {/* Skip only - no Next button */}
          <div className="flex justify-end mt-3 pt-2 border-t border-border">
            <button onClick={finishTutorial} className="text-[11px] text-muted-foreground hover:text-muted-foreground transition-colors">
              Pular tutorial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieLedTutorial;
export { STORAGE_KEY as MOVIELED_TUTORIAL_STORAGE_KEY };
