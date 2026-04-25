/**
 * FloatingJobButton - Botão flutuante GLOBAL de jobs de IA em andamento
 * 
 * - Aparece automaticamente quando QUALQUER ferramenta de IA registra um job
 *   no AIJobContext (via useAIJobWithNotification).
 * - Funciona para todas as ferramentas atuais e futuras sem alteração.
 * - Arrastável (touch + mouse). Posição persistida em localStorage.
 * - Estados: loading (spinner), expandido (nome + barra), concluído (verde + check).
 * - Ao tocar quando concluído: navega para "/" e abre o modal Minhas Criações
 *   via evento global "open-my-creations".
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Check, X } from "lucide-react";
import { useAIJob } from "@/contexts/AIJobContext";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "floating-job-btn-pos";
const SIZE = 56;
const MARGIN = 12;

type Pos = { x: number; y: number };

const ACTIVE = ["pending", "queued", "starting", "running"];
const DONE_OK = ["completed"];
const DONE_ERR = ["failed", "cancelled"];

const getDefaultPos = (): Pos => ({
  x: Math.max(MARGIN, window.innerWidth - SIZE - MARGIN),
  y: Math.max(MARGIN, window.innerHeight - SIZE - 100),
});

const loadPos = (): Pos => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.x === "number" && typeof p.y === "number") return p;
    }
  } catch {}
  return getDefaultPos();
};

const clampPos = (p: Pos, expanded: boolean): Pos => {
  const w = expanded ? 240 : SIZE;
  const h = expanded ? 96 : SIZE;
  return {
    x: Math.min(Math.max(MARGIN, p.x), window.innerWidth - w - MARGIN),
    y: Math.min(Math.max(MARGIN, p.y), window.innerHeight - h - MARGIN),
  };
};

export const FloatingJobButton = () => {
  const navigate = useNavigate();
  const { jobStatus, activeToolName, clearJob } = useAIJob();

  const [pos, setPos] = useState<Pos>(() => loadPos());
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [progress, setProgress] = useState(0);

  const dragStateRef = useRef<{
    dragging: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({ dragging: false, moved: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const isActive = jobStatus !== null && ACTIVE.includes(jobStatus);
  const isDone = jobStatus !== null && DONE_OK.includes(jobStatus);
  const isError = jobStatus !== null && DONE_ERR.includes(jobStatus);
  const visible = !dismissed && (isActive || isDone || isError);

  // Reset dismissal whenever a NEW job is registered (status went from null → active)
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevStatusRef.current === null && jobStatus !== null) {
      setDismissed(false);
    }
    prevStatusRef.current = jobStatus;
  }, [jobStatus]);

  // Fake progress while running (real progress depends on each tool)
  useEffect(() => {
    if (!isActive) {
      setProgress(isDone ? 100 : 0);
      return;
    }
    setProgress((p) => (p < 5 ? 8 : p));
    const id = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.max(1, (90 - p) * 0.04) : p));
    }, 800);
    return () => clearInterval(id);
  }, [isActive, isDone]);

  // Persist + clamp on resize
  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p, expanded));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [expanded]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {}
  }, [pos]);

  // Pointer drag
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragStateRef.current = {
      dragging: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const s = dragStateRef.current;
    if (!s.dragging) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.moved && Math.hypot(dx, dy) > 4) s.moved = true;
    if (s.moved) {
      setPos(clampPos({ x: s.origX + dx, y: s.origY + dy }, expanded));
    }
  }, [expanded]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const s = dragStateRef.current;
    s.dragging = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);

    if (s.moved) return; // it was a drag, not a tap

    // Tap behavior
    if (isDone) {
      // navigate to home and open My Creations modal globally
      setDismissed(true);
      clearJob();
      navigate("/");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("open-my-creations"));
      }, 50);
      return;
    }
    if (isError) {
      setExpanded((v) => !v);
      return;
    }
    setExpanded((v) => !v);
  }, [isDone, isError, navigate, clearJob]);

  const onClose = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    setDismissed(true);
    if (isDone || isError) clearJob();
  };

  if (!visible) return null;

  const colorClass = isDone
    ? "bg-green-500/90 text-white border-green-400 shadow-[0_8px_24px_-4px_rgba(34,197,94,0.5)]"
    : isError
    ? "bg-destructive/90 text-destructive-foreground border-destructive shadow-[0_8px_24px_-4px_hsl(var(--destructive)/0.5)]"
    : "bg-background/95 text-foreground border-border shadow-[0_8px_24px_-4px_hsl(var(--foreground)/0.18)]";

  return (
    <div
      role="button"
      aria-label={isDone ? "Job concluído" : isError ? "Job falhou" : "Job em andamento"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(e) => {
        dragStateRef.current.dragging = false;
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      }}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 9998,
        touchAction: "none",
        width: expanded ? 240 : SIZE,
        height: expanded ? 96 : SIZE,
        transition:
          "width 200ms ease, height 200ms ease, background-color 300ms ease, box-shadow 300ms ease",
      }}
      className={cn(
        "select-none rounded-2xl border backdrop-blur-md flex items-center justify-center cursor-grab active:cursor-grabbing animate-scale-in",
        colorClass,
        isDone && "animate-[pulse_1.2s_ease-in-out_2]"
      )}
    >
      {!expanded ? (
        <div className="relative flex items-center justify-center w-full h-full">
          {isActive && <Loader2 className="h-6 w-6 animate-spin" />}
          {isDone && <Check className="h-7 w-7" strokeWidth={3} />}
          {isError && <X className="h-7 w-7" strokeWidth={3} />}
        </div>
      ) : (
        <div className="w-full h-full px-3 py-2 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide opacity-70">
                {isDone ? "Concluído" : isError ? "Falhou" : "Processando"}
              </div>
              <div className="text-sm font-semibold truncate">
                {activeToolName || "Job de IA"}
              </div>
            </div>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onClose}
              className="opacity-60 hover:opacity-100 -mr-1 -mt-1 p-1"
              aria-label="Fechar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isDone ? "bg-green-400" : isError ? "bg-destructive-foreground" : "bg-primary"
                )}
                style={{ width: `${isDone ? 100 : isError ? 100 : progress}%` }}
              />
            </div>
            <div className="text-[10px] opacity-70">
              {isDone ? "Toque para ver suas criações" : isError ? "Toque para fechar" : "Toque para minimizar"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingJobButton;
