import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Loader2, ImageIcon, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import imageCompression from 'browser-image-compression';

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

const PhotoLibraryModal: React.FC<PhotoLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectPhoto,
  onUploadPhoto,
}) => {
  const [filter, setFilter] = useState<GenderFilter>('masculino');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async (pageNum: number, reset = false) => {
    setIsLoading(true);
    
    try {
      // Query photos from admin_prompts where category = 'Fotos' and gender matches filter
      let query = supabase
        .from('admin_prompts')
        .select('id, title, image_url, thumbnail_url, gender')
        .eq('category', 'Fotos')
        .eq('gender', filter)
        .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('[PhotoLibrary] Error fetching photos:', error);
        return;
      }

      if (reset) {
        setPhotos(data || []);
      } else {
        setPhotos(prev => [...prev, ...(data || [])]);
      }

      // If we got less than expected, we've reached the end
      setHasMore(data && data.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('[PhotoLibrary] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  // Reset and fetch when modal opens or filter changes
  useEffect(() => {
    if (isOpen) {
      setPage(0);
      setPhotos([]);
      setHasMore(true);
      fetchPhotos(0, true);
    }
  }, [isOpen, filter, fetchPhotos]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPhotos(nextPage);
  };

  const handleSelectPhoto = (photo: PhotoItem) => {
    onSelectPhoto(photo.image_url);
    onClose();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onUploadPhoto) return;

    setIsUploading(true);
    
    try {
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#1A0A2E] border-purple-500/30 text-white max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-fuchsia-400" />
            Biblioteca de Fotos de Referência
          </DialogTitle>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Upload Button - Prominent at top */}
        {onUploadPhoto && (
          <Button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="w-full mt-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-medium py-3 flex-shrink-0"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Enviar Sua Própria Imagem
              </>
            )}
          </Button>
        )}

        {/* Separator */}
        <div className="flex items-center gap-3 mt-4 flex-shrink-0">
          <div className="flex-1 h-px bg-purple-500/30" />
          <span className="text-xs text-purple-400">ou escolha da biblioteca</span>
          <div className="flex-1 h-px bg-purple-500/30" />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4 flex-shrink-0">
          <Button
            variant={filter === 'masculino' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('masculino')}
            className={cn(
              "flex-1",
              filter === 'masculino'
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0"
                : "bg-transparent border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            )}
          >
            <User className="w-4 h-4 mr-2" />
            Masculino
          </Button>
          <Button
            variant={filter === 'feminino' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('feminino')}
            className={cn(
              "flex-1",
              filter === 'feminino'
                ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white border-0"
                : "bg-transparent border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            )}
          >
            <User className="w-4 h-4 mr-2" />
            Feminino
          </Button>
        </div>

        {/* Photos Grid */}
        <div className="mt-4 overflow-y-auto flex-1 pr-2">
          {isLoading && photos.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-purple-400">
              <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">Nenhuma foto encontrada nesta categoria</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => handleSelectPhoto(photo)}
                    className="group relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-purple-500/30 hover:border-fuchsia-400 transition-all hover:scale-105"
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

                    {/* Title on hover */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white font-medium text-center line-clamp-2">
                        {photo.title}
                      </p>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-fuchsia-500/0 group-hover:bg-fuchsia-500/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-fuchsia-600 px-3 py-1 rounded-full transition-opacity">
                        Selecionar
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="bg-purple-500/10 border-purple-500/30 text-purple-200 hover:bg-purple-500/20"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
          <p className="text-xs text-purple-400 text-center mt-4 pb-2">
            💡 Clique em uma foto para usá-la como referência
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoLibraryModal;
