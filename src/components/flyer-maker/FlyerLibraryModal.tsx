import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2, ImageIcon, Upload, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import imageCompression from 'browser-image-compression';
import { useSmartSearch, buildSmartSearchFilter } from '@/hooks/useSmartSearch';
import { isAcceptedImage, ensureBrowserCompatibleImage, IMAGE_ACCEPT } from '@/lib/heicConverter';
import { toast } from 'sonner';

interface FlyerLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhoto: (imageUrl: string) => void;
  onUploadPhoto?: (dataUrl: string, file: File) => void;
  /** Quando definido, filtra a biblioteca apenas pela categoria de slug informado e oculta as tabs. */
  categorySlug?: string;
}

interface FlyerItem {
  id: string;
  title: string;
  image_url: string;
  category: string;
  category_id: string | null;
}

interface CategoryTab {
  id: string;
  name: string;
  slug: string;
  display_order: number;
}

const TOOL_SLUG = 'flyer_maker';

const FlyerLibraryModal: React.FC<FlyerLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectPhoto,
  onUploadPhoto,
  categorySlug,
}) => {
  const [flyers, setFlyers] = useState<FlyerItem[]>([]);
  const [categories, setCategories] = useState<CategoryTab[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { searchTerm, setSearchTerm, expandedTerms } = useSmartSearch();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1) Carrega categorias da ferramenta
      const { data: catData } = await supabase
        .from('ai_tool_library_categories')
        .select('id, name, slug, display_order')
        .eq('tool_slug', TOOL_SLUG)
        .order('display_order', { ascending: true });
      setCategories(catData || []);

      // 2) Carrega itens visíveis curados da biblioteca da ferramenta
      let libItems: Array<{ source_id: string; category_id: string | null; display_order: number }> = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error: libErr } = await supabase
          .from('ai_tool_library_items')
          .select('source_id, category_id, display_order')
          .eq('tool_slug', TOOL_SLUG)
          .eq('is_visible', true)
          .order('display_order', { ascending: true })
          .range(from, from + PAGE - 1);
        if (libErr) { console.error('[FlyerLibrary] lib err:', libErr); setFlyers([]); return; }
        libItems = libItems.concat(data || []);
        if (!data || data.length < PAGE) break;
      }

      const sourceIds = libItems.map(i => i.source_id);
      if (sourceIds.length === 0) { setFlyers([]); return; }

      // 3) Carrega artes em lotes (evita URL muito longa com .in())
      const CHUNK = 100;
      const allArtes: Array<{ id: string; title: string; image_url: string; category: string }> = [];
      for (let i = 0; i < sourceIds.length; i += CHUNK) {
        const chunk = sourceIds.slice(i, i + CHUNK);
        const { data: artesData, error: artesErr } = await supabase
          .from('admin_artes')
          .select('id, title, image_url, category')
          .in('id', chunk)
          .not('image_url', 'like', '%.mp4');
        if (artesErr) { console.error('[FlyerLibrary] artes err:', artesErr); setFlyers([]); return; }
        if (artesData) allArtes.push(...artesData);
      }
      const artesData = allArtes;

      const catById = new Map((libItems || []).map(i => [i.source_id, i.category_id]));
      const merged: FlyerItem[] = (artesData || []).map(a => ({
        id: a.id,
        title: a.title,
        image_url: a.image_url,
        category: a.category,
        category_id: catById.get(a.id) ?? null,
      }));
      // Ordem aleatória (Fisher-Yates)
      for (let i = merged.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [merged[i], merged[j]] = [merged[j], merged[i]];
      }

      setFlyers(merged);
    } catch (err) {
      console.error('[FlyerLibrary] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveCategoryId('all');
      fetchAll();
    }
  }, [isOpen, fetchAll]);

  // Quando categorySlug é fornecido, força a categoria correspondente após carregar
  useEffect(() => {
    if (!categorySlug || categories.length === 0) return;
    const found = categories.find(c => c.slug === categorySlug);
    if (found) setActiveCategoryId(found.id);
  }, [categorySlug, categories]);

  // Filtragem cliente (categoria + busca expandida)
  const visibleFlyers = useMemo(() => {
    let list = flyers;
    if (activeCategoryId === 'uncategorized') list = list.filter(f => !f.category_id);
    else if (activeCategoryId !== 'all') list = list.filter(f => f.category_id === activeCategoryId);

    if (expandedTerms.length > 0) {
      const terms = expandedTerms.map(t => t.toLowerCase());
      list = list.filter(f => {
        const hay = `${f.title} ${f.category}`.toLowerCase();
        return terms.some(t => hay.includes(t));
      });
    }
    return list;
  }, [flyers, activeCategoryId, expandedTerms]);

  const handleSelectFlyer = (flyer: FlyerItem) => {
    onSelectPhoto(flyer.image_url);
    onClose();
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = event.target.files?.[0];
    if (!rawFile || !onUploadPhoto) return;
    if (!isAcceptedImage(rawFile)) {
      toast.error('Selecione uma imagem válida (JPG, PNG, WEBP ou HEIC).');
      return;
    }
    setIsUploading(true);
    try {
      const file = await ensureBrowserCompatibleImage(rawFile);
      const compressed = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 2048, useWebWorker: true });
      const reader = new FileReader();
      reader.onloadend = () => { onUploadPhoto(reader.result as string, compressed as unknown as File); onClose(); };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error('[FlyerLibrary] Upload error:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao processar a imagem.');
    }
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const uncategorizedCount = flyers.filter(f => !f.category_id).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[calc(100%-32px)] sm:w-full bg-background border border-purple-500/40 text-foreground max-h-[80vh] sm:max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6 rounded-xl">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            Biblioteca de Flyers
          </DialogTitle>
        </DialogHeader>

        <input ref={fileInputRef} type="file" accept={IMAGE_ACCEPT} onChange={handleFileChange} className="hidden" />

        {onUploadPhoto && (
          <Button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="w-full mt-2 sm:mt-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-sm font-medium py-2.5 h-auto flex-shrink-0"
          >
            {isUploading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>) : (<><Upload className="w-4 h-4 mr-2" /> Enviar Seu Próprio Flyer</>)}
          </Button>
        )}

        <div className="flex items-center gap-2 mt-3 sm:mt-4 flex-shrink-0">
          <div className="flex-1 h-px bg-accent0/30" />
          <span className="text-[10px] sm:text-xs text-muted-foreground/80">ou escolha da biblioteca</span>
          <div className="flex-1 h-px bg-accent0/30" />
        </div>

        <div className="relative mt-3 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="buscar por nome ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9 text-sm bg-accent0/10 border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {/* Tabs de categorias */}
        {!categorySlug && categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 mt-3 flex-shrink-0 scrollbar-thin">
            <button
              onClick={() => setActiveCategoryId('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategoryId === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent0/10 text-muted-foreground hover:bg-accent0/20'
              }`}
            >
              Todos ({flyers.length})
            </button>
            {categories.map((c) => {
              const count = flyers.filter(f => f.category_id === c.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategoryId(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCategoryId === c.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent0/10 text-muted-foreground hover:bg-accent0/20'
                  }`}
                >
                  {c.name} ({count})
                </button>
              );
            })}
            {uncategorizedCount > 0 && (
              <button
                onClick={() => setActiveCategoryId('uncategorized')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategoryId === 'uncategorized'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent0/10 text-muted-foreground hover:bg-accent0/20'
                }`}
              >
                Sem categoria ({uncategorizedCount})
              </button>
            )}
          </div>
        )}

        <div className="mt-3 sm:mt-4 overflow-y-auto flex-1 pr-1 -mr-1">
          {isLoading && flyers.length === 0 ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground animate-spin" />
            </div>
          ) : visibleFlyers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground">
              <ImageIcon className="w-8 h-8 sm:w-12 sm:h-12 mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">Nenhum flyer encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {visibleFlyers.map((flyer) => (
                <button
                  key={flyer.id}
                  onClick={() => handleSelectFlyer(flyer)}
                  className="group relative aspect-[3/4] rounded-lg sm:rounded-xl overflow-hidden border border-border hover:border-white-400 transition-all active:scale-95 sm:hover:scale-105"
                >
                  <img 
                    src={flyer.image_url} 
                    alt={flyer.title} 
                    className="absolute inset-0 w-full h-full object-cover" 
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="hidden sm:block absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white font-medium text-center line-clamp-2">{flyer.title}</p>
                  </div>
                  <div className="absolute inset-0 bg-accent0/0 group-hover:bg-accent0/10 transition-colors flex items-center justify-center">
                    <span className="hidden sm:block opacity-0 group-hover:opacity-100 text-foreground text-xs font-medium bg-secondary px-3 py-1 rounded-full transition-opacity">Selecionar</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <p className="text-[10px] sm:text-xs text-muted-foreground/70 text-center mt-3 pb-1">💡 Toque para selecionar um flyer de referência</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlyerLibraryModal;
