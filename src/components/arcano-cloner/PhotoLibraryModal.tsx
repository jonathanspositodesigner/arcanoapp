import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Loader2, ImageIcon, Upload, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { useSmartSearch, buildSmartSearchFilter } from '@/hooks/useSmartSearch';
import { isAcceptedImage, ensureBrowserCompatibleImage, IMAGE_ACCEPT } from '@/lib/heicConverter';

interface PhotoLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhoto: (imageUrl: string) => void;
  onUploadPhoto?: (dataUrl: string, file: File) => void;
}

type GenderFilter = 'masculino' | 'feminino';

interface PhotoItem {
  id: string;
  title: string;
  image_url: string;
  thumbnail_url?: string | null;
  gender?: string | null;
}

const ITEMS_PER_PAGE = 20;
const FETCH_BATCH_SIZE = 1000;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const PhotoLibraryModal: React.FC<PhotoLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectPhoto,
  onUploadPhoto,
}) => {
  const [filter, setFilter] = useState<GenderFilter>('masculino');
  const [allPhotos, setAllPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isUploading, setIsUploading] = useState(false);
  const { searchTerm, setSearchTerm, debouncedSearch, expandedTerms } = useSmartSearch();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAllPhotos = useCallback(async () => {
    setIsLoading(true);

    try {
      const allData: PhotoItem[] = [];
      let from = 0;

      while (true) {
        let query = supabase
          .from('admin_prompts')
          .select('id, title, image_url, thumbnail_url, gender, tags')
          .eq('category', 'Fotos')
          .eq('gender', filter)
          .order('created_at', { ascending: false })
          .range(from, from + FETCH_BATCH_SIZE - 1);

        if (expandedTerms.length > 0) {
          const orFilter = buildSmartSearchFilter(expandedTerms, ['title'], 'tags');
          query = query.or(orFilter);
        }

        const { data, error } = await query;

        if (error) {
          console.error('[PhotoLibrary] Error fetching photos:', error);
          break;
        }

        const batch = data || [];
        allData.push(...batch);

        if (batch.length < FETCH_BATCH_SIZE) {
          break;
        }

        from += FETCH_BATCH_SIZE;
      }

      // Shuffle full dataset (all ages of photos mixed together)
      setAllPhotos(shuffleArray(allData));
    } catch (error) {
      console.error('[PhotoLibrary] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, expandedTerms]);

  // Reset and fetch when modal opens, filter changes, or search changes
  useEffect(() => {
    if (isOpen) {
      setVisibleCount(ITEMS_PER_PAGE);
      setAllPhotos([]);
      fetchAllPhotos();
    }
  }, [isOpen, filter, expandedTerms, fetchAllPhotos]);

  // Derived: visible photos (client-side pagination)
  const photos = allPhotos.slice(0, visibleCount);
  const hasMore = visibleCount < allPhotos.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  const handleSelectPhoto = (photo: PhotoItem) => {
    onSelectPhoto(photo.image_url);
    onClose();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = event.target.files?.[0];
    if (!rawFile || !onUploadPhoto) return;
    if (!isAcceptedImage(rawFile)) {
      toast.error('Selecione uma imagem válida (JPG, PNG, WEBP ou HEIC).');
      return;
    }

    setIsUploading(true);

    try {
      // Convert HEIC (iPhone) → JPEG before processing
      const file = await ensureBrowserCompatibleImage(rawFile);

      // Compress image before using
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 2048,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      
      // Convert to data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onUploadPhoto(dataUrl, compressedFile as unknown as File);
        onClose();
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('[PhotoLibrary] Upload error:', error);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
  <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[calc(100%-32px)] sm:w-full bg-background border border-purple-500/40 text-foreground max-h-[80vh] sm:max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6 rounded-xl">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            Biblioteca de Fotos
          </DialogTitle>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Upload Button - Compact on mobile */}
        {onUploadPhoto && (
          <Button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="w-full mt-2 sm:mt-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-sm font-medium py-2.5 h-auto flex-shrink-0"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Enviar Sua Própria Imagem
              </>
            )}
          </Button>
        )}

        {/* Separator */}
        <div className="flex items-center gap-2 mt-3 sm:mt-4 flex-shrink-0">
          <div className="flex-1 h-px bg-accent0/30" />
          <span className="text-[10px] sm:text-xs text-muted-foreground/80">ou escolha da biblioteca</span>
          <div className="flex-1 h-px bg-accent0/30" />
        </div>

        {/* Filter Tabs - More compact on mobile */}
        <div className="flex gap-2 mt-3 flex-shrink-0">
          <Button
            variant={filter === 'masculino' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('masculino')}
            className={cn(
              "flex-1 h-8 sm:h-9 text-xs sm:text-sm",
              filter === 'masculino'
                ? "bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0"
                : "bg-transparent border-border text-muted-foreground hover:bg-accent0/20"
            )}
          >
            <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
            Masculino
          </Button>
          <Button
            variant={filter === 'feminino' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('feminino')}
            className={cn(
              "flex-1 h-8 sm:h-9 text-xs sm:text-sm",
              filter === 'feminino'
                ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white border-0"
                : "bg-transparent border-border text-muted-foreground hover:bg-accent0/20"
            )}
          >
            <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
            Feminino
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative mt-3 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por palavra-chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9 text-sm bg-accent0/10 border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {/* Photos Grid */}
        <div className="mt-3 sm:mt-4 overflow-y-auto flex-1 pr-1 -mr-1">
          {isLoading && photos.length === 0 ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground animate-spin" />
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground">
              <ImageIcon className="w-8 h-8 sm:w-12 sm:h-12 mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">Nenhuma foto encontrada</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => handleSelectPhoto(photo)}
                    className="group relative aspect-[3/4] rounded-lg sm:rounded-xl overflow-hidden border border-border hover:border-white-400 transition-all active:scale-95 sm:hover:scale-105"
                  >
                    {/* Photo Image */}
                    <img
                      src={photo.thumbnail_url || photo.image_url}
                      alt={photo.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Gradient overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Title on hover - hidden on mobile */}
                    <div className="hidden sm:block absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white font-medium text-center line-clamp-2">
                        {photo.title}
                      </p>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-accent0/0 group-hover:bg-accent0/10 transition-colors flex items-center justify-center">
                      <span className="hidden sm:block opacity-0 group-hover:opacity-100 text-foreground text-xs font-medium bg-secondary px-3 py-1 rounded-full transition-opacity">
                        Selecionar
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center mt-3 sm:mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="bg-accent0/10 border-border text-muted-foreground hover:bg-accent0/20 text-xs h-8"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      'Carregar mais'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Info text */}
          <p className="text-[10px] sm:text-xs text-muted-foreground/70 text-center mt-3 pb-1">
            💡 Toque para selecionar uma foto
          </p>
        </div>
      </DialogContent>
    </Dialog>

  </>
  );
};

export default PhotoLibraryModal;