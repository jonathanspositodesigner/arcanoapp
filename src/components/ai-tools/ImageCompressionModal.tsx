import React, { useState } from 'react';
import { Loader2, ImageIcon, Minimize2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { compressToMaxDimension, MAX_AI_DIMENSION } from '@/hooks/useImageOptimizer';

interface ImageCompressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  originalWidth: number;
  originalHeight: number;
  onCompress: (compressedFile: File, newWidth: number, newHeight: number) => void;
}

const ImageCompressionModal: React.FC<ImageCompressionModalProps> = ({
  isOpen,
  onClose,
  file,
  originalWidth,
  originalHeight,
  onCompress,
}) => {
  const [isCompressing, setIsCompressing] = useState(false);

  const handleCompress = async () => {
    if (!file) return;

    setIsCompressing(true);
    try {
      const result = await compressToMaxDimension(file, MAX_AI_DIMENSION - 1); // 1999px max
      onCompress(result.file, result.width, result.height);
      onClose();
    } catch (error) {
      console.error('[ImageCompressionModal] Compression error:', error);
    } finally {
      setIsCompressing(false);
    }
  };

  // Calculate what the new dimensions will be
  const maxDim = MAX_AI_DIMENSION - 1; // 1999
  const scale = Math.min(maxDim / originalWidth, maxDim / originalHeight);
  const newWidth = Math.round(originalWidth * scale);
  const newHeight = Math.round(originalHeight * scale);

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-[#1A0A2E] border-white/10 max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/20 rounded-full">
              <ImageIcon className="w-6 h-6 text-yellow-400" />
            </div>
            <AlertDialogTitle className="text-white text-lg">
              📐 Imagem Muito Grande
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-gray-300/70 space-y-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300/60">Tamanho atual:</span>
                <span className="text-sm font-medium text-red-400">
                  {originalWidth} x {originalHeight} px
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300/60">Limite máximo:</span>
                <span className="text-sm font-medium text-gray-300">
                  {MAX_AI_DIMENSION} x {MAX_AI_DIMENSION} px
                </span>
              </div>
            </div>

            <p className="text-sm">
              Deseja comprimir automaticamente para <strong className="text-green-400">{newWidth} x {newHeight} px</strong>?
            </p>
            <p className="text-xs text-gray-300/60">
              A proporção será mantida. Compressão 100% no seu dispositivo.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            onClick={onClose}
            className="border-white/10 text-gray-300 hover:bg-slate-500/10 bg-transparent"
          >
            Cancelar
          </AlertDialogCancel>

          <Button
            onClick={handleCompress}
            disabled={isCompressing}
            className="bg-gradient-to-r from-slate-600 to-slate-500 hover:opacity-90 text-white flex items-center gap-2"
          >
            {isCompressing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Comprimindo...
              </>
            ) : (
              <>
                <Minimize2 className="w-4 h-4" />
                Comprimir e Usar
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ImageCompressionModal;
