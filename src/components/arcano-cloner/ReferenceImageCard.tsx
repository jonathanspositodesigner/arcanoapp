import React from 'react';
import { Plus, X, ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ReferenceImageCardProps {
  image: string | null;
  onClearImage: () => void;
  onOpenLibrary: () => void;
  disabled?: boolean;
}

const ReferenceImageCard: React.FC<ReferenceImageCardProps> = ({
  image,
  onClearImage,
  onOpenLibrary,
  disabled = false,
}) => {
  return (
    <Card className={cn(
      "relative overflow-hidden bg-purple-900/20 border-purple-500/30",
      disabled && "opacity-50 cursor-not-allowed"
    )}>
      {/* Header - same as ImageUploadCard */}
      <div className="px-2 py-1 border-b border-purple-500/20">
        <h3 className="text-[10px] font-semibold text-white flex items-center gap-1">
          <ImageIcon className="w-3 h-3 text-purple-400" />
          Foto de Referência
        </h3>
      </div>

      {/* Content Area - matches ImageUploadCard sizing */}
      <div
        className={cn(
          "relative h-32 lg:h-auto lg:aspect-[3/4] flex items-center justify-center transition-all",
          !image && "cursor-pointer hover:bg-purple-500/10",
          disabled && "cursor-not-allowed"
        )}
        onClick={!image && !disabled ? onOpenLibrary : undefined}
      >
        {image ? (
          <>
            <div className="w-full h-full flex items-center justify-center p-2">
              <img
                src={image}
                alt="Foto de referência"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearImage();
              }}
              disabled={disabled}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </>
        ) : (
          /* Overlay absoluto para centralização perfeita */
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="flex flex-col items-center gap-1 text-center -translate-y-1">
              <div className="w-8 h-8 rounded-lg bg-fuchsia-500/20 border border-dashed border-fuchsia-500/40 flex items-center justify-center">
                <Plus className="w-4 h-4 text-fuchsia-400" />
              </div>
              <p className="text-[10px] text-purple-200 font-medium">Escolher da biblioteca</p>
              <p className="text-[9px] text-purple-400">Ou envie sua foto</p>
            </div>
          </div>
        )}
      </div>

      {/* Change button when image selected - same style as library button */}
      {image && (
        <div className="px-2 py-1 border-t border-purple-500/20">
          <button
            onClick={onOpenLibrary}
            disabled={disabled}
            className="w-full h-6 text-[10px] rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-200 hover:bg-purple-500/20 hover:text-white transition-colors flex items-center justify-center gap-1"
          >
            <ImageIcon className="w-3 h-3" />
            Trocar Imagem
          </button>
        </div>
      )}
    </Card>
  );
};

export default ReferenceImageCard;
