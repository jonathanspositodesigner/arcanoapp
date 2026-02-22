import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, ImageIcon, Upload, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import imageCompression from 'browser-image-compression';

interface FlyerLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhoto: (imageUrl: string) => void;
  onUploadPhoto?: (dataUrl: string, file: File) => void;
}

interface FlyerItem {
  id: string;
  title: string;
  image_url: string;
  category: string;
}

const ITEMS_PER_PAGE = 20;

const FlyerLibraryModal: React.FC<FlyerLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectPhoto,
  onUploadPhoto,
}) => {
  const [flyers, setFlyers] = useState<FlyerItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchFlyers = useCallback(async (pageNum: number, reset = false) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('admin_artes')
        .select('id, title, image_url, category');

      if (debouncedSearch.trim()) {
        const s = debouncedSearch.toLowerCase().trim();
        query = query.or(`title.ilike.%${s}%,category.ilike.%${s}%`);
      }

      query = query
        .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) { console.error('[FlyerLibrary] Error:', error); return; }

      if (reset) setFlyers(data || []);
      else setFlyers(prev => [...prev, ...(data || [])]);

      setHasMore((data?.length ?? 0) === ITEMS_PER_PAGE);
    } catch (err) {
      console.error('[FlyerLibrary] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (isOpen) {
      setPage(0);
      setFlyers([]);
      setHasMore(true);
      fetchFlyers(0, true);
    }
  }, [isOpen, debouncedSearch, fetchFlyers]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFlyers(nextPage);
  };

  const handleSelectFlyer = (flyer: FlyerItem) => {
    onSelectPhoto(flyer.image_url);
    onClose();
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onUploadPhoto) return;
    setIsUploading(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 2048, useWebWorker: true });
      const reader = new FileReader();
      reader.onloadend = () => { onUploadPhoto(reader.result as string, compressed as unknown as File); onClose(); };
      reader.readAsDataURL(compressed);
    } catch (err) { console.error('[FlyerLibrary] Upload error:', err); }
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[calc(100%-32px)] sm:w-full bg-[#1A0A2E] border border-purple-500/40 text-white max-h-[80vh] sm:max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6 rounded-xl">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-fuchsia-400" />
            Biblioteca de Flyers
          </DialogTitle>
        </DialogHeader>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        {onUploadPhoto && (
          <Button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="w-full mt-2 sm:mt-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-sm font-medium py-2.5 h-auto flex-shrink-0"
          >
            {isUploading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>) : (<><Upload className="w-4 h-4 mr-2" /> Enviar Seu Próprio Flyer</>)}
          </Button>
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
            placeholder="buscar por nome ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9 text-sm bg-purple-500/10 border-purple-500/30 text-white placeholder:text-purple-400/50 focus:border-fuchsia-400"
          />
        </div>

        <div className="mt-3 sm:mt-4 overflow-y-auto flex-1 pr-1 -mr-1">
          {isLoading && flyers.length === 0 ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 animate-spin" />
            </div>
          ) : flyers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-purple-400">
              <ImageIcon className="w-8 h-8 sm:w-12 sm:h-12 mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">Nenhum flyer encontrado</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {flyers.map((flyer) => (
                  <button
                    key={flyer.id}
                    onClick={() => handleSelectFlyer(flyer)}
                    className="group relative aspect-[3/4] rounded-lg sm:rounded-xl overflow-hidden border border-purple-500/30 hover:border-fuchsia-400 transition-all active:scale-95 sm:hover:scale-105"
                  >
                    <img src={flyer.image_url} alt={flyer.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="hidden sm:block absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white font-medium text-center line-clamp-2">{flyer.title}</p>
                    </div>
                    <div className="absolute inset-0 bg-fuchsia-500/0 group-hover:bg-fuchsia-500/10 transition-colors flex items-center justify-center">
                      <span className="hidden sm:block opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-fuchsia-600 px-3 py-1 rounded-full transition-opacity">Selecionar</span>
                    </div>
                  </button>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-3 sm:mt-4">
                  <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={isLoading} className="bg-purple-500/10 border-purple-500/30 text-purple-200 hover:bg-purple-500/20 text-xs h-8">
                    {isLoading ? (<><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Carregando...</>) : 'Carregar mais'}
                  </Button>
                </div>
              )}
            </>
          )}
          <p className="text-[10px] sm:text-xs text-purple-400/70 text-center mt-3 pb-1">💡 Toque para selecionar um flyer de referência</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlyerLibraryModal;
