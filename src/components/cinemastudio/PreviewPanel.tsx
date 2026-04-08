import React from 'react';
import { Loader2, Download, RotateCcw, AlertCircle, Film, ArrowRight } from 'lucide-react';
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
  mode, setMode, status, progress, outputUrl, errorMessage,
  elapsedTime, isProcessing, estimatedCredits, formatTime,
  downloadResult, resetTool, cancelGeneration, addToStoryboard,
  referenceImagePreviews,
}) => {
  return (
    <div className="flex flex-col h-full relative">
      {/* Área principal de pré-visualização */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        {status === 'completed' && outputUrl ? (
          <div className="w-full h-full relative flex items-center justify-center">
            {mode === 'photo' ? (
              <img
                src={outputUrl}
                alt="Resultado"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <video
                src={outputUrl}
                autoPlay muted controls loop playsInline
                className="max-w-full max-h-full object-contain"
              />
            )}
            {/* Barra inferior */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 flex items-center justify-between">
              <span className="text-[10px] text-amber-400/80 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Expira em 24h
              </span>
              <div className="flex items-center gap-2">
                {mode === 'photo' && (
                  <button
                    onClick={() => setMode('video')}
                    className="text-[11px] text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <Film className="w-3 h-3" /> Animar <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={downloadResult}
                  className="text-[11px] text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" /> Baixar
                </button>
                <button
                  onClick={resetTool}
                  className="text-[11px] text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ) : isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            {/* Barra de progresso */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/[0.04]">
              <div className="h-full bg-gray-500/50 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
            <div className="text-center">
              <p className="text-[12px] text-gray-400">Processando sua cena...</p>
              <p className="text-[11px] text-gray-600 mt-0.5">{formatTime(elapsedTime)}</p>
            </div>
            <button
              onClick={cancelGeneration}
              className="absolute bottom-3 right-3 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : status === 'error' && errorMessage ? (
          <div className="flex flex-col items-center gap-2 max-w-xs text-center">
            <AlertCircle className="w-5 h-5 text-red-500/60" />
            <p className="text-[11px] text-red-400/80">{errorMessage}</p>
            <button
              onClick={resetTool}
              className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
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
          <div className="flex flex-col items-center gap-2 text-center">
            <Film className="w-8 h-8 text-gray-800" strokeWidth={1} />
            <p className="text-[12px] text-gray-600">Sua cena aparecerá aqui</p>
          </div>
        )}
      </div>

      {/* Estimativa de créditos */}
      {status === 'idle' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <span className="text-[10px] text-gray-700">
            ≈ {estimatedCredits} créditos
          </span>
        </div>
      )}
    </div>
  );
};

export default PreviewPanel;
