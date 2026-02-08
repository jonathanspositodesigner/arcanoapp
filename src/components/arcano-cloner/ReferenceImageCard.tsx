import React from 'react';
import { Plus, RefreshCw, X, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    <Card className="bg-purple-900/20 border-purple-500/30">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-fuchsia-400" />
          Foto de Referência
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {!image ? (
          // Empty state - large "+" square that opens library
          <button
            onClick={onOpenLibrary}
            disabled={disabled}
            className={cn(
              "w-full aspect-[3/4] rounded-xl border-2 border-dashed border-purple-500/50 bg-purple-900/30",
              "flex flex-col items-center justify-center gap-3 transition-all duration-200",
              "hover:border-fuchsia-400 hover:bg-purple-900/40 hover:shadow-lg hover:shadow-fuchsia-500/20",
              "focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:ring-offset-2 focus:ring-offset-[#1A0A2E]",
              "group cursor-pointer",
              disabled && "opacity-50 cursor-not-allowed hover:border-purple-500/50 hover:bg-purple-900/30 hover:shadow-none"
            )}
          >
            <div className={cn(
              "w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center",
              "group-hover:bg-fuchsia-500/30 group-hover:scale-110 transition-all duration-200",
              disabled && "group-hover:bg-purple-500/20 group-hover:scale-100"
            )}>
              <Plus className={cn(
                "w-7 h-7 text-purple-300 group-hover:text-fuchsia-300 transition-colors",
                disabled && "group-hover:text-purple-300"
              )} />
            </div>
            <span className={cn(
              "text-xs text-purple-300 group-hover:text-fuchsia-300 transition-colors font-medium",
              disabled && "group-hover:text-purple-300"
            )}>
              Escolha da biblioteca
            </span>
          </button>
        ) : (
          // Image selected state
          <div className="relative">
            {/* Clear button */}
            <button
              onClick={onClearImage}
              disabled={disabled}
              className={cn(
                "absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/60 text-white",
                "hover:bg-red-500/80 transition-colors",
                disabled && "opacity-50 cursor-not-allowed hover:bg-black/60"
              )}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Image preview */}
            <div className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-purple-500/30">
              <img
                src={image}
                alt="Foto de referência"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Change button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenLibrary}
              disabled={disabled}
              className="w-full mt-2 text-xs bg-purple-500/10 border-purple-500/30 text-purple-200 hover:bg-purple-500/20 hover:text-fuchsia-200"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Trocar Imagem
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferenceImageCard;
