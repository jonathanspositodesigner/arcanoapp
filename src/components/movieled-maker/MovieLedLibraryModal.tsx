import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Upload, Search, AlertCircle, Video } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SecureVideo } from '@/components/SecureMedia';
import { supabase } from '@/integrations/supabase/client';
import imageCompression from 'browser-image-compression';
import { useSmartSearch, buildSmartSearchFilter } from '@/hooks/useSmartSearch';

interface MovieLedLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: MovieLedItem) => void;
  onUploadPhoto?: (dataUrl: string, file: File) => void;
}

export interface MovieLedItem {
  id: string;
  title: string;
  image_url: string;
  thumbnail_url?: string | null;
  reference_images?: string[] | null;
  prompt?: string;
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

const MovieLedLibraryModal: React.FC<MovieLedLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectItem,
  onUploadPhoto,
}) => {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<MovieLedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isUploading, setIsUploading] = useState(false);
  const { searchTerm, setSearchTerm, expandedTerms } = useSmartSearch();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAllItems = useCallback(async () => {
    setIsLoading(true);

    try {
      const allData: MovieLedItem[] = [];
      let from = 0;

      while (true) {
        let query = supabase
          .from('admin_prompts')
          .select('id, title, image_url, thumbnail_url, reference_images, prompt, tags')
          .eq('category', 'Movies para Telão')
          .order('created_at', { ascending: false })
          .range(from, from + FETCH_BATCH_SIZE - 1);

        if (freeOnly) {
          query = query.eq('is_premium', false);
        }

        if (expandedTerms.length > 0) {
          const orFilter = buildSmartSearchFilter(expandedTerms, ['title'], 'tags');
          query = query.or(orFilter);
        }

        const { data, error } = await query;

        if (error) {
          console.error('[MovieLedLibrary] Error fetching items:', error);
          break;
        }

        const batch = data || [];
        allData.push(...batch);

        if (batch.length < FETCH_BATCH_SIZE) {
          break;
        }

        from += FETCH_BATCH_SIZE;
      }

      setAllItems(shuffleArray(allData));
    } catch (error) {
      console.error('[MovieLedLibrary] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [expandedTerms]);

  useEffect(() => {
    if (isOpen) {
      setVisibleCount(ITEMS_PER_PAGE);
      setAllItems([]);
      fetchAllItems();
    }
  }, [isOpen, expandedTerms, fetchAllItems]);

  const items = allItems.slice(0, visibleCount);
  const hasMore = visibleCount < allItems.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const handleSelectItem = (item: MovieLedItem) => {
    if (item.is_premium && !isPremiumUser) {
      setShowPremiumModal(true);
      return;
    }
    onSelectItem(item);
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
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 2048,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onUploadPhoto(dataUrl, compressedFile as unknown as File);
        onClose();
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('[MovieLedLibrary] Upload error:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent data-tutorial-movieled="library-modal" className="max-w-2xl w-[calc(100%-32px)] sm:w-full bg-[#1A0A2E] border border-purple-500/40 text-white max-h-[80vh] sm:max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6 rounded-xl">
          <DialogHeader className="flex-shrink-0 pb-2">
            <DialogTitle className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-fuchsia-400" />
              Biblioteca de Telões
            </DialogTitle>
          </DialogHeader>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

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

          {onUploadPhoto && (
            <div className="flex items-center gap-2 px-2 py-1.5 mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex-shrink-0">
              <AlertCircle className="h-3 w-3 text-amber-400 flex-shrink-0" />
              <p className="text-[10px] text-amber-300">
                Para melhores resultados, envie imagens em <strong>1920x1080</strong> (16:9).
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 sm:mt-4 flex-shrink-0">
            <div className="flex-1 h-px bg-purple-500/30" />
            <span className="text-[10px] sm:text-xs text-purple-400/80">ou escolha da biblioteca</span>
            <div className="flex-1 h-px bg-purple-500/30" />
          </div>

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

          <div className="mt-3 sm:mt-4 overflow-y-auto flex-1 pr-1 -mr-1">
            {isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-purple-400">
                <Video className="w-8 h-8 sm:w-12 sm:h-12 mb-2 opacity-50" />
                <p className="text-xs sm:text-sm">Nenhum telão encontrado</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className="group relative aspect-video rounded-lg sm:rounded-xl overflow-hidden border border-purple-500/30 hover:border-fuchsia-400 transition-all active:scale-95 sm:hover:scale-105"
                    >
                      <SecureVideo
                        src={item.image_url}
                        poster={item.thumbnail_url || undefined}
                        muted
                        loop
                        autoPlay
                        playsInline
                        preload="auto"
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      {item.is_premium && (
                        <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5">
                          {!isPremiumUser && <Lock className="w-3 h-3 text-purple-300" />}
                          <Badge className="bg-purple-600/80 text-white text-[8px] px-1.5 py-0 border-0 gap-0.5">
                            <Crown className="w-2.5 h-2.5" />
                            Premium
                          </Badge>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="hidden sm:block absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] text-white font-medium text-center line-clamp-2">
                          {item.title}
                        </p>
                      </div>

                      <div className="absolute inset-0 bg-fuchsia-500/0 group-hover:bg-fuchsia-500/10 transition-colors flex items-center justify-center">
                        <span className="hidden sm:block opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-fuchsia-600 px-3 py-1 rounded-full transition-opacity">
                          Selecionar
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

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

            <p className="text-[10px] sm:text-xs text-purple-400/70 text-center mt-3 pb-1">
              💡 Toque para selecionar um telão
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPremiumModal} onOpenChange={setShowPremiumModal}>
        <DialogContent className="max-w-sm bg-[#1A0A2E] border border-purple-500/40 text-white p-6 rounded-xl">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-purple-600/20 flex items-center justify-center">
              <Crown className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Telão Exclusivo Premium</h3>
            <p className="text-sm text-purple-300/80">
              Este telão é exclusivo para assinantes Premium. Assine agora para desbloquear todos os telões e recursos avançados!
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

export default MovieLedLibraryModal;
