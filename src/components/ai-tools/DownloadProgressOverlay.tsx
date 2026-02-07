import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface DownloadProgressOverlayProps {
  isVisible: boolean;
  progress: number;
  onCancel?: () => void;
  mediaType?: 'image' | 'video';
  locale?: 'pt' | 'es';
}

/**
 * DownloadProgressOverlay - Overlay global de progresso de download
 * 
 * Design LIMPO - só mostra progresso, SEM tentativas visíveis
 * Usado por todas as ferramentas de IA
 */
export const DownloadProgressOverlay: React.FC<DownloadProgressOverlayProps> = ({
  isVisible,
  progress,
  onCancel,
  mediaType = 'image',
  locale = 'pt'
}) => {
  if (!isVisible) return null;

  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getDownloadText = () => {
    if (mediaType === 'video') {
      return locale === 'es' ? 'Descargando vídeo HD...' : 'Baixando vídeo HD...';
    }
    return locale === 'es' ? 'Descargando imagen HD...' : 'Baixando imagem HD...';
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-sm mx-4 text-center space-y-4 border border-white/10 shadow-2xl">
        
        {/* Circular progress indicator */}
        <div className="relative w-24 h-24 mx-auto">
          <svg className="w-24 h-24 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-muted-foreground/30"
            />
            {/* Progress circle */}
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-primary transition-all duration-300 ease-out"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          {/* Progress percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-foreground">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Download text - NO retry attempts visible */}
        <p className="text-foreground font-medium">
          {getDownloadText()}
        </p>

        {/* Cancel button */}
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <X className="w-4 h-4 mr-1" />
            {locale === 'es' ? 'Cancelar' : 'Cancelar'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default DownloadProgressOverlay;
