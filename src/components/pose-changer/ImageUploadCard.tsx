import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Upload, X, ImageIcon, Library } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getImageDimensions, MAX_AI_DIMENSION } from '@/hooks/useImageOptimizer';
import ImageCompressionModal from '@/components/ai-tools/ImageCompressionModal';

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
  
  // Compression modal state
  const [showCompressionModal, setShowCompressionModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDimensions, setPendingDimensions] = useState<{ w: number; h: number } | null>(null);
  
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

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    try {
      // Get dimensions first
      const dimensions = await getImageDimensions(file);
      
      // Check if image exceeds limit
      if (dimensions.width > MAX_AI_DIMENSION || dimensions.height > MAX_AI_DIMENSION) {
        // Show compression modal instead of error
        setPendingFile(file);
        setPendingDimensions({ w: dimensions.width, h: dimensions.height });
        setShowCompressionModal(true);
        return;
      }

      // Image is within limits, process directly
      await processFile(file, dimensions);
    } catch (error) {
      console.error('[ImageUploadCard] Error getting dimensions:', error);
      toast.error('Erro ao processar imagem');
    }
  }, [processFile]);

  const handleCompressComplete = useCallback((compressedFile: File, newWidth: number, newHeight: number) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onImageChange(e.target?.result as string, compressedFile);
      setFinalDimensions({ w: newWidth, h: newHeight });
    };
    reader.readAsDataURL(compressedFile);
    
    // Clear pending state
    setPendingFile(null);
    setPendingDimensions(null);
    
    toast.success(`Imagem comprimida para ${newWidth}x${newHeight}px`);
  }, [onImageChange]);

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
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) handleFileSelect(file);
            break;
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
        "relative overflow-hidden bg-purple-900/20 border-purple-500/30",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}>
        {/* Header */}
        <div className="px-2 py-1 border-b border-purple-500/20">
          <h3 className="text-[10px] font-semibold text-white flex items-center gap-1">
            <ImageIcon className="w-3 h-3 text-purple-400" />
            {title}
          </h3>
        </div>

        {/* Upload Area - Responsive with 3:4 aspect ratio on desktop */}
        <div
          className={cn(
            "relative h-20 lg:h-auto lg:aspect-[3/4] flex flex-col items-center justify-center cursor-pointer transition-all",
            !image && "hover:bg-purple-500/10",
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
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 p-2 text-center">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-dashed border-purple-500/40 flex items-center justify-center">
                <Upload className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-[10px] text-purple-200 font-medium">Arraste ou clique</p>
              <p className="text-[9px] text-purple-400">Ctrl+V para colar</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled}
          />
        </div>

        {/* Dimensions display */}
        {finalDimensions && image && (
          <div className="text-[9px] text-purple-300 text-center py-1 border-t border-purple-500/20">
            📐 {finalDimensions.w} x {finalDimensions.h} px
          </div>
        )}

        {/* Library Button */}
        {showLibraryButton && (
          <div className="px-2 py-1 border-t border-purple-500/20">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-6 text-[10px] bg-purple-500/10 border-purple-500/30 text-purple-200 hover:bg-purple-500/20 hover:text-white"
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

      {/* Compression Modal */}
      <ImageCompressionModal
        isOpen={showCompressionModal}
        onClose={() => {
          setShowCompressionModal(false);
          setPendingFile(null);
          setPendingDimensions(null);
        }}
        file={pendingFile}
        originalWidth={pendingDimensions?.w || 0}
        originalHeight={pendingDimensions?.h || 0}
        onCompress={handleCompressComplete}
      />
    </>
  );
};

export default ImageUploadCard;
