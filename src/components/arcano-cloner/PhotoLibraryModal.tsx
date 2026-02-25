import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Loader2, ImageIcon, Upload, Search, Lock, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

interface PhotoLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhoto: (imageUrl: string) => void;
  onUploadPhoto?: (dataUrl: string, file: File) => void;
  isPremiumUser?: boolean;
}

type GenderFilter = 'masculino' | 'feminino';

interface PhotoItem {
  id: string;
  title: string;
  image_url: string;
  thumbnail_url?: string | null;
  gender?: string | null;
  is_premium?: boolean;
}

const ITEMS_PER_PAGE = 20;

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
  isPremiumUser = false,
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<GenderFilter>('masculino');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchPhotos = useCallback(async (pageNum: number, reset = false) => {
    setIsLoading(true);
    
    try {
      // Query photos from admin_prompts where category = 'Fotos' and gender matches filter
      let query = supabase
        .from('admin_prompts')
        .select('id, title, image_url, thumbnail_url, gender, tags, is_premium')
        .eq('category', 'Fotos')
        .eq('gender', filter);

      // Add search filter if there's a search term
      if (debouncedSearch.trim()) {
        const searchLower = debouncedSearch.toLowerCase().trim();
        query = query.or(`title.ilike.%${searchLower}%,tags.cs.{${searchLower}}`);
      }

      query = query
        .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('[PhotoLibrary] Error fetching photos:', error);
        return;
      }

      const shuffledData = shuffleArray(data || []);
      if (reset) {
        setPhotos(shuffledData);
      } else {
        setPhotos(prev => [...prev, ...shuffledData]);
      }

      // If we got less than expected, we've reached the end
      setHasMore(data && data.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('[PhotoLibrary] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  // Reset and fetch when modal opens, filter changes, or search changes
  useEffect(() => {
    if (isOpen) {
      setPage(0);
      setPhotos([]);
      setHasMore(true);
      fetchPhotos(0, true);
    }
  }, [isOpen, filter, debouncedSearch, fetchPhotos]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPhotos(nextPage);
  };

  const handleSelectPhoto = (photo: PhotoItem) => {
    if (photo.is_premium && !isPremiumUser) {
      setShowPremiumModal(true);
      return;
    }
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
  <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[calc(100%-32px)] sm:w-full bg-[#1A0A2E] border border-purple-500/40 text-white max-h-[80vh] sm:max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6 rounded-xl">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-fuchsia-400" />
            Biblioteca de Fotos
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

        {/* Upload Button - Compact on mobile */}
        {onUploadPhoto && (
          <Button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="w-full mt-2 sm:mt-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-sm font-medium py-2.5 h-auto flex-shrink-0"
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
          <div className="flex-1 h-px bg-purple-500/30" />
          <span className="text-[10px] sm:text-xs text-purple-400/80">ou escolha da biblioteca</span>
          <div className="flex-1 h-px bg-purple-500/30" />
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
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0"
                : "bg-transparent border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
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
                : "bg-transparent border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            )}
          >
            <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
            Feminino
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative mt-3 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
          <Input
            type="text"
            placeholder="Buscar por palavra-chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9 text-sm bg-purple-500/10 border-purple-500/30 text-white placeholder:text-purple-400/50 focus:border-fuchsia-400"
          />
        </div>

        {/* Photos Grid */}
        <div className="mt-3 sm:mt-4 overflow-y-auto flex-1 pr-1 -mr-1">
          {isLoading && photos.length === 0 ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 animate-spin" />
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-purple-400">
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
                    className="group relative aspect-[3/4] rounded-lg sm:rounded-xl overflow-hidden border border-purple-500/30 hover:border-fuchsia-400 transition-all active:scale-95 sm:hover:scale-105"
                  >
                    {/* Photo Image */}
                    <img
                      src={photo.thumbnail_url || photo.image_url}
                      alt={photo.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Premium badge (top-right) for both premium and non-premium users */}
                    {photo.is_premium && (
                      <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5">
                        {!isPremiumUser && <Lock className="w-3 h-3 text-purple-300" />}
                        <Badge className="bg-purple-600/80 text-white text-[8px] px-1.5 py-0 border-0 gap-0.5">
                          <Crown className="w-2.5 h-2.5" />
                          Premium
                        </Badge>
                      </div>
                    )}
                    
                    {/* Gradient overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Title on hover - hidden on mobile */}
                    <div className="hidden sm:block absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white font-medium text-center line-clamp-2">
                        {photo.title}
                      </p>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-fuchsia-500/0 group-hover:bg-fuchsia-500/10 transition-colors flex items-center justify-center">
                      <span className="hidden sm:block opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-fuchsia-600 px-3 py-1 rounded-full transition-opacity">
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
                    className="bg-purple-500/10 border-purple-500/30 text-purple-200 hover:bg-purple-500/20 text-xs h-8"
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
          <p className="text-[10px] sm:text-xs text-purple-400/70 text-center mt-3 pb-1">
            💡 Toque para selecionar uma foto
          </p>
        </div>
      </DialogContent>
    </Dialog>

    {/* Premium Upsell Modal */}
    <Dialog open={showPremiumModal} onOpenChange={setShowPremiumModal}>
      <DialogContent className="max-w-sm bg-[#1A0A2E] border border-purple-500/40 text-white p-6 rounded-xl">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-purple-600/20 flex items-center justify-center">
            <Crown className="w-7 h-7 text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Foto Exclusiva Premium</h3>
          <p className="text-sm text-purple-300/80">
            Esta foto de referência é exclusiva para assinantes Premium. Assine agora para desbloquear todas as fotos e recursos avançados!
          </p>
          <div className="flex gap-2 w-full mt-2">
            <Button
              variant="outline"
              onClick={() => setShowPremiumModal(false)}
              className="flex-1 bg-transparent border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            >
              Voltar
            </Button>
            <Button
              onClick={() => {
                setShowPremiumModal(false);
                onClose();
                navigate('/planos-2');
              }}
              className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white border-0"
            >
              <Crown className="w-4 h-4 mr-1.5" />
              Torne-se Premium
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
};

export default PhotoLibraryModal;
