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
      <div className="px-2 py-1 border-b border-purple-500/20">
        <h3 className="text-[10px] font-semibold text-white flex items-center gap-1">
          <ImageIcon className="w-3 h-3 text-purple-400" />
          {title}
        </h3>
      </div>

      {/* Upload Area - Ultra Compact */}
      <div
        className={cn(
          "relative h-16 flex flex-col items-center justify-center cursor-pointer transition-all",
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
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 p-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-dashed border-purple-500/40 flex items-center justify-center">
              <Upload className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-purple-200 font-medium">Arraste ou clique</p>
              <p className="text-[9px] text-purple-400">Ctrl+V para colar</p>
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
            Biblioteca de Poses
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ImageUploadCard;
