import React from 'react';
import { Loader2, Download, RotateCcw, AlertCircle, Film, Bookmark, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="flex flex-col h-full">
      {/* Warning banner */}
      {isProcessing && (
        <div className="bg-amber-500/20 border-b border-amber-500/50 px-3 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-200">Não feche esta página. Geração leva 1-3 minutos.</p>
        </div>
      )}

      {/* Main preview area */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        {status === 'completed' && outputUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <video
              src={outputUrl}
              autoPlay muted controls loop playsInline
              className="max-w-full max-h-[60vh] rounded-lg"
            />
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-200">⚠️ Este vídeo expira em 24 horas. Faça o download agora.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                onClick={downloadResult}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-sm"
              >
                <Download className="w-4 h-4 mr-1.5" /> Download MP4
              </Button>
              <Button
                variant="outline"
                onClick={addToStoryboard}
                className="border-white/10 text-gray-300 hover:bg-white/5 text-sm"
              >
                <Bookmark className="w-4 h-4 mr-1.5" /> Storyboard
              </Button>
              {mode === 'photo' && (
                <Button
                  variant="outline"
                  onClick={() => setMode('video')}
                  className="border-white/10 text-gray-300 hover:bg-white/5 text-sm"
                >
                  Animar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              <Button
                variant="outline"
                onClick={resetTool}
                className="border-white/10 text-gray-300 hover:bg-white/5 text-sm"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" /> Nova Geração
              </Button>
            </div>
          </div>
        ) : isProcessing ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <Loader2 className="w-14 h-14 text-purple-400 animate-spin" />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                {progress}%
              </span>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-white">
                {status === 'uploading' ? 'Enviando...' : progress < 60 ? 'Processando vídeo...' : 'Quase pronto...'}
              </p>
              <p className="text-sm text-purple-300/70 mt-1">
                Tempo: {formatTime(elapsedTime)}
              </p>
            </div>
            <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <Button
              variant="outline"
              onClick={cancelGeneration}
              className="mt-2 border-white/10 text-gray-400 hover:bg-white/5 text-xs"
            >
              Cancelar
            </Button>
          </div>
        ) : status === 'error' && errorMessage ? (
          <div className="flex flex-col items-center gap-3 max-w-sm text-center">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-sm text-red-300">{errorMessage}</p>
            <Button
              variant="outline"
              onClick={resetTool}
              className="border-white/10 text-gray-300 hover:bg-white/5 text-sm"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" /> Tentar Novamente
            </Button>
          </div>
        ) : referenceImagePreviews.length > 0 ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={referenceImagePreviews[0]}
              alt="Hero Frame"
              className="max-w-full max-h-[50vh] rounded-lg border border-white/10"
            />
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <Film className="w-3 h-3" /> Hero Frame — primeira referência
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Film className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-sm text-gray-400">Configure a cena e gere</p>
            <p className="text-[10px] text-gray-600 max-w-xs text-center">
              Ajuste os controles no painel à esquerda para montar seu plano cinematográfico
            </p>
          </div>
        )}
      </div>

      {/* Credit cost display */}
      {status === 'idle' && (
        <div className="border-t border-white/5 px-4 py-2 text-center">
          <span className="text-[10px] text-gray-500">
            {mode === 'video' ? `${estimatedCredits} créditos estimados` : 'Photo mode — custo reduzido'}
          </span>
        </div>
      )}
    </div>
  );
};

export default PreviewPanel;
