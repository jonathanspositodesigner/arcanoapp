import React from 'react';
import { Loader2, Download, RotateCcw, AlertCircle, Film } from 'lucide-react';
import type { ProcessingStatus, StudioMode } from '@/hooks/useCinemaStudio';

interface Props {
  mode: StudioMode;
  setMode: (m: StudioMode) => void;
  status: ProcessingStatus;
  progress: number;
  outputUrl: string | null;
  errorMessage: string | null;
  elapsedTime: number;
  isProcessing: boolean;
  estimatedCredits: number;
  formatTime: (s: number) => string;
  downloadResult: () => void;
  resetTool: () => void;
  cancelGeneration: () => void;
  addToStoryboard: () => void;
  referenceImagePreviews: string[];
}

const PreviewPanel: React.FC<Props> = ({
  mode, status, progress, outputUrl, errorMessage,
  elapsedTime, isProcessing, estimatedCredits, formatTime,
  downloadResult, resetTool, cancelGeneration,
  referenceImagePreviews,
}) => {
  return (
    <div className="flex h-full min-h-0 flex-col relative">
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="relative flex min-h-full items-center justify-center p-3 sm:p-4">
          {status === 'completed' && outputUrl ? (
            <div className="w-full h-full min-h-0 relative flex items-center justify-center">
              {mode === 'photo' ? (
                <img
                  src={outputUrl}
                  alt="Resultado"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <video
                  src={outputUrl}
                  autoPlay
                  muted
                  controls
                  loop
                  playsInline
                  className="max-w-full max-h-full object-contain"
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3 sm:px-4 flex items-center justify-between gap-2">
                <span className="text-[10px] text-amber-400/80 flex items-center gap-1 shrink-0">
                  <AlertCircle className="w-3 h-3" /> Expira em 24h
                </span>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    onClick={downloadResult}
                    className="text-[11px] text-muted-foreground hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3 h-3" /> Baixar
                  </button>
                  <button
                    onClick={resetTool}
                    className="text-[11px] text-muted-foreground hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="flex min-h-full flex-col items-center justify-center gap-3">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/[0.04]">
                <div className="h-full bg-accent0/50 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              <div className="text-center">
                <p className="text-[12px] text-muted-foreground">Processando sua cena...</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{formatTime(elapsedTime)}</p>
              </div>
              <button
                onClick={cancelGeneration}
                className="text-[10px] text-muted-foreground hover:text-muted-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : status === 'error' && errorMessage ? (
            <div className="flex min-h-full flex-col items-center justify-center gap-2 max-w-xs text-center mx-auto">
              <AlertCircle className="w-5 h-5 text-red-500/60" />
              <p className="text-[11px] text-red-400/80">{typeof errorMessage === 'object' && errorMessage !== null ? (errorMessage as any).message || JSON.stringify(errorMessage) : errorMessage}</p>
              <button
                onClick={resetTool}
                className="text-[10px] text-muted-foreground hover:text-muted-foreground flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Tentar novamente
              </button>
            </div>
          ) : referenceImagePreviews.length > 0 ? (
            <img
              src={referenceImagePreviews[0]}
              alt="Quadro Principal"
              className="max-w-full max-h-full object-contain opacity-60"
            />
          ) : (
            <div className="flex min-h-full flex-col items-center justify-center gap-2 text-center">
              <Film className="w-8 h-8 text-gray-200" strokeWidth={1} />
              <p className="text-[12px] text-muted-foreground">Sua cena aparecerá aqui</p>
            </div>
          )}
        </div>
      </div>

      {status === 'idle' && (
        <div className="flex-shrink-0 px-3 pb-2 text-center">
          <span className="text-[10px] text-muted-foreground">≈ {estimatedCredits} créditos</span>
        </div>
      )}
    </div>
  );
};

export default PreviewPanel;
