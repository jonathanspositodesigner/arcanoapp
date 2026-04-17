import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Upload, X, ImageIcon, Library } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getImageDimensions, compressToMaxDimension, MAX_AI_DIMENSION } from '@/hooks/useImageOptimizer';
import { isAcceptedImage, ensureBrowserCompatibleImage, IMAGE_ACCEPT } from '@/lib/heicConverter';

interface ImageUploadCardProps {
  title: string;
  subtitle?: string;
  image: string | null;
  onImageChange: (image: string | null, file?: File) => void;
  showLibraryButton?: boolean;
  onOpenLibrary?: () => void;
  libraryButtonLabel?: string;
  className?: string;
  disabled?: boolean;
}

const ImageUploadCard: React.FC<ImageUploadCardProps> = ({
  title,
  subtitle,
  image,
  onImageChange,
  showLibraryButton = false,
  onOpenLibrary,
  libraryButtonLabel = 'Biblioteca de Poses',
  className,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Final dimensions to display below image
  const [finalDimensions, setFinalDimensions] = useState<{ w: number; h: number } | null>(null);

  const processFile = useCallback(async (file: File, dimensions: { width: number; height: number }) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onImageChange(e.target?.result as string, file);
      setFinalDimensions({ w: dimensions.width, h: dimensions.height });
    };
    reader.readAsDataURL(file);
  }, [onImageChange]);

  const handleFileSelect = useCallback(async (rawFile: File) => {
    if (!isAcceptedImage(rawFile)) {
      toast.error('Por favor, selecione uma imagem válida.');
      return;
    }

    if (rawFile.size > 15 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 15MB.');
      return;
    }

    let file: File;
    try {
      file = await ensureBrowserCompatibleImage(rawFile);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar a imagem.');
      return;
    }

    try {
      const dimensions = await getImageDimensions(file);
      let fileToProcess = file;
      let dims = dimensions;
      
      // Auto-compress if exceeds limit
      if (dimensions.width > MAX_AI_DIMENSION || dimensions.height > MAX_AI_DIMENSION) {
        toast.info('Redimensionando imagem automaticamente...');
        const compressed = await compressToMaxDimension(file, MAX_AI_DIMENSION - 1);
        fileToProcess = compressed.file;
        dims = { width: compressed.width, height: compressed.height };
      }

      await processFile(fileToProcess, dims);
    } catch (error) {
      console.error('[ImageUploadCard] Error getting dimensions:', error);
      toast.error('Erro ao processar imagem. Tente outro formato.');
    }
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input value to allow re-selecting the same file
    e.target.value = '';
  }, [handleFileSelect]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange(null);
    setFinalDimensions(null);
  }, [onImageChange]);

  // Handle paste events
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/') || item.type === '') {
            const file = item.getAsFile();
            if (file && isAcceptedImage(file)) { handleFileSelect(file); break; }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFileSelect, disabled]);

  return (
    <>
      <Card className={cn(
        "relative overflow-hidden bg-accent border-border",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}>
        {/* Header */}
        <div className="px-2 py-1 border-b border-border">
          <h3 className="text-[10px] font-semibold text-foreground flex items-center gap-1">
            <ImageIcon className="w-3 h-3 text-muted-foreground" />
            {title}
          </h3>
        </div>

        {/* Upload Area - Responsive with aspect ratio on desktop */}
        <div
          className={cn(
            "relative h-[120px] lg:h-[160px] cursor-pointer transition-all",
            !image && "hover:bg-accent0/10",
            disabled && "cursor-not-allowed"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={!image ? handleClick : undefined}
        >
          {image ? (
            <>
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  src={image}
                  alt={title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              {/* Remove button */}
              <button
                onClick={handleRemove}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500/100 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-foreground" />
              </button>
            </>
          ) : (
            /* Overlay absoluto para centralização perfeita */
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="flex flex-col items-center gap-1 text-center">
                <div className="w-8 h-8 rounded-lg bg-accent0/20 border border-dashed border-slate-500/40 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-[10px] text-muted-foreground font-medium">Arraste ou clique</p>
                <p className="text-[9px] text-muted-foreground">Ctrl+V para colar</p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled}
          />
        </div>

        {/* Dimensions display */}
        {finalDimensions && image && (
          <div className="text-[9px] text-muted-foreground text-center py-1 border-t border-border">
            📐 {finalDimensions.w} x {finalDimensions.h} px
          </div>
        )}

        {/* Library Button */}
        {showLibraryButton && (
          <div className="px-2 py-1 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-6 text-[10px] bg-accent0/10 border-border text-muted-foreground hover:bg-accent0/20 hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLibrary?.();
              }}
              disabled={disabled}
            >
              <Library className="w-3 h-3 mr-1" />
              {libraryButtonLabel}
            </Button>
          </div>
        )}
      </Card>

    </>
  );
};

export default ImageUploadCard;
