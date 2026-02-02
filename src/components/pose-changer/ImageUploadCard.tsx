import React, { useCallback, useRef, useEffect } from 'react';
import { Upload, X, ImageIcon, Library } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploadCardProps {
  title: string;
  subtitle?: string;
  image: string | null;
  onImageChange: (image: string | null) => void;
  showLibraryButton?: boolean;
  onOpenLibrary?: () => void;
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
  className,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onImageChange(e.target?.result as string);
    };
    reader.readAsDataURL(file);
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
  }, [handleFileSelect]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange(null);
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
    <Card className={cn(
      "relative overflow-hidden bg-purple-900/20 border-purple-500/30",
      disabled && "opacity-50 cursor-not-allowed",
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-purple-500/20">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-purple-400" />
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-purple-300/70 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={cn(
          "relative aspect-square flex flex-col items-center justify-center cursor-pointer transition-all",
          !image && "hover:bg-purple-500/10",
          disabled && "cursor-not-allowed"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={!image ? handleClick : undefined}
      >
        {image ? (
          <>
            <img
              src={image}
              alt={title}
              className="w-full h-full object-contain"
            />
            {/* Remove button */}
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border-2 border-dashed border-purple-500/40 flex items-center justify-center">
              <Upload className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-purple-200 font-medium">
                Arraste sua imagem aqui
              </p>
              <p className="text-xs text-purple-400 mt-1">
                ou clique para selecionar • Ctrl+V
              </p>
            </div>
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

      {/* Library Button */}
      {showLibraryButton && (
        <div className="px-4 py-3 border-t border-purple-500/20">
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-purple-500/10 border-purple-500/30 text-purple-200 hover:bg-purple-500/20 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onOpenLibrary?.();
            }}
            disabled={disabled}
          >
            <Library className="w-4 h-4 mr-2" />
            Biblioteca de Poses
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ImageUploadCard;
