import React, { useState } from 'react';
import { X, Library, Image as ImageIcon, Video, LayoutGrid, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMyCreations, type MediaType } from './useMyCreations';
import MyCreationsGrid from './MyCreationsGrid';

interface MyCreationsModalProps {
  open: boolean;
  onClose: () => void;
}

const FILTERS: { value: MediaType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Tudo', icon: <LayoutGrid className="w-4 h-4" /> },
  { value: 'image', label: 'Imagens', icon: <ImageIcon className="w-4 h-4" /> },
  { value: 'video', label: 'Vídeos', icon: <Video className="w-4 h-4" /> },
];

const MyCreationsModal: React.FC<MyCreationsModalProps> = ({ open, onClose }) => {
  const [mediaType, setMediaType] = useState<MediaType>('all');
  
  const { 
    creations, 
    isLoading, 
    error, 
    hasMore, 
    loadMore, 
    refresh 
  } = useMyCreations({ mediaType });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col bg-[#0D0221] border-purple-500/30 p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-purple-500/20 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl text-white">
              <Library className="w-5 h-5 text-purple-400" />
              Minhas Criações
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-purple-300 hover:text-white hover:bg-purple-500/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Expiration Warning */}
          <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
            <p className="text-sm text-yellow-200/80">
              Os arquivos expiram em <strong>5 dias</strong> após a geração e somem automaticamente. Faça download para guardar.
            </p>
          </div>
          
          {/* Filters */}
          <div className="flex gap-2 mt-4">
            {FILTERS.map((filter) => (
              <Button
                key={filter.value}
                variant="outline"
                size="sm"
                onClick={() => setMediaType(filter.value)}
                className={cn(
                  "gap-2 transition-all",
                  mediaType === filter.value
                    ? "bg-purple-500/30 border-purple-500/50 text-white"
                    : "bg-transparent border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
                )}
              >
                {filter.icon}
                {filter.label}
              </Button>
            ))}
          </div>
        </DialogHeader>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <MyCreationsGrid
            creations={creations}
            isLoading={isLoading}
            error={error}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onRetry={refresh}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MyCreationsModal;
