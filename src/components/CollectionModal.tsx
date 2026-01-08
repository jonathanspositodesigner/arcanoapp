import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Play, ArrowRight, Copy, Download, X, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { SecureImage, SecureVideo, getSecureDownloadUrl } from "@/components/SecureMedia";
import { trackCollectionView } from "@/hooks/useCollectionViewTracker";

interface CollectionItem {
  id: string;
  title: string;
  prompt: string;
  imageUrl: string;
  isPremium: boolean;
  category: string;
  tutorialUrl: string | null;
}

interface CollectionModalProps {
  slug: string;
  onClose: () => void;
}

const isVideoUrl = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

// IMPORTANT: Do NOT use dynamic transformations on Supabase Storage!
// They cost $5 per 1000 transformations. Images should already be optimized at upload time.
const getThumbnailUrl = (url: string) => {
  // Return URL as-is - no transformations to avoid costs
  return url;
};

const CollectionModal = ({ slug, onClose }: CollectionModalProps) => {
  const navigate = useNavigate();
  const { isPremium } = usePremiumStatus();
  const [collection, setCollection] = useState<{ name: string; id: string } | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [tutorialUrl, setTutorialUrl] = useState<string | null>(null);
  const hasTracked = useRef(false);

  const getEmbedUrl = (url: string): string => {
    if (url.includes('<iframe')) {
      const srcMatch = url.match(/src=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1]) {
        return srcMatch[1];
      }
    }
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return url;
  };

  const openTutorial = (url: string) => {
    setTutorialUrl(getEmbedUrl(url));
    setShowTutorialModal(true);
  };

  useEffect(() => {
    fetchCollection();
  }, [slug]);

  // Track collection view once when collection is loaded
  useEffect(() => {
    if (collection && !hasTracked.current) {
      hasTracked.current = true;
      trackCollectionView(collection.id, slug, collection.name);
    }
  }, [collection, slug]);

  const fetchCollection = async () => {
    const { data: collectionData, error: collectionError } = await supabase
      .from('admin_collections')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (collectionError || !collectionData) {
      console.error("Collection not found:", collectionError);
      setIsLoading(false);
      return;
    }

    setCollection({ name: collectionData.name, id: collectionData.id });

    const { data: itemsData, error: itemsError } = await supabase
      .from('admin_collection_items')
      .select('prompt_id, prompt_type, item_order')
      .eq('collection_id', collectionData.id)
      .order('item_order', { ascending: true });

    if (itemsError) {
      console.error("Error fetching items:", itemsError);
      setIsLoading(false);
      return;
    }

    const adminIds = itemsData?.filter(i => i.prompt_type === 'admin').map(i => i.prompt_id) || [];
    const communityIds = itemsData?.filter(i => i.prompt_type === 'community').map(i => i.prompt_id) || [];

    const [{ data: adminPrompts }, { data: communityPrompts }] = await Promise.all([
      adminIds.length > 0 
        ? supabase.from('admin_prompts').select('id, title, prompt, image_url, is_premium, category, tutorial_url').in('id', adminIds)
        : Promise.resolve({ data: [] }),
      communityIds.length > 0
        ? supabase.from('community_prompts').select('id, title, prompt, image_url, category').in('id', communityIds)
        : Promise.resolve({ data: [] })
    ]);

    const orderedItems: CollectionItem[] = [];
    
    for (const item of itemsData || []) {
      if (item.prompt_type === 'admin') {
        const prompt = adminPrompts?.find(p => p.id === item.prompt_id);
        if (prompt) {
          orderedItems.push({
            id: prompt.id,
            title: prompt.title,
            prompt: prompt.prompt,
            imageUrl: prompt.image_url,
            isPremium: prompt.is_premium,
            category: prompt.category,
            tutorialUrl: prompt.tutorial_url || null
          });
        }
      } else {
        const prompt = communityPrompts?.find(p => p.id === item.prompt_id);
        if (prompt) {
          orderedItems.push({
            id: prompt.id,
            title: prompt.title,
            prompt: prompt.prompt,
            imageUrl: prompt.image_url,
            isPremium: false,
            category: prompt.category,
            tutorialUrl: null
          });
        }
      }
    }

    setItems(orderedItems);
    setIsLoading(false);
  };

  const handleCopyPrompt = useCallback(async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Prompt copiado!");
    } catch {
      toast.error("Erro ao copiar prompt");
    }
  }, []);

  const handleDownload = useCallback(async (url: string, title: string, isPremiumContent: boolean = false) => {
    try {
      const signedUrl = await getSecureDownloadUrl(url);
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const extension = isVideoUrl(url) ? 'mp4' : 'png';
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${title}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success("Download iniciado!");
    } catch {
      toast.error("Erro ao baixar arquivo");
    }
  }, []);

  const goToLibrary = () => {
    onClose();
    navigate('/biblioteca-prompts');
  };

  const canAccessContent = (item: CollectionItem) => {
    return !item.isPremium || isPremium;
  };

  if (isLoading) {
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!collection) {
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Coleção não encontrada</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Esta coleção não existe ou foi removida.</p>
          <Button onClick={goToLibrary} className="w-full mt-4">
            Ir para Biblioteca
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Item detail view
  if (selectedItem) {
    const hasAccess = canAccessContent(selectedItem);
    
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-xl">{selectedItem.title}</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedItem(null)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-4">
            {/* Media */}
            <div className="rounded-lg overflow-hidden">
              {isVideoUrl(selectedItem.imageUrl) ? (
                <SecureVideo
                  src={selectedItem.imageUrl}
                  isPremium={selectedItem.isPremium}
                  className="w-full max-h-[400px] object-contain bg-black"
                  controls
                  autoPlay
                  muted
                />
              ) : (
                <SecureImage
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  isPremium={selectedItem.isPremium}
                  className="w-full max-h-[400px] object-contain"
                />
              )}
            </div>

            {/* Badges */}
            <div className="flex gap-2">
              {selectedItem.isPremium ? (
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                  <Star className="h-3 w-3 mr-1" fill="currentColor" />
                  Premium
                </Badge>
              ) : (
                <Badge variant="outline" className="border-green-500 text-green-600">
                  Grátis
                </Badge>
              )}
            </div>

            {/* Prompt */}
            {hasAccess ? (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedItem.prompt}</p>
              </div>
            ) : (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-muted-foreground">Conteúdo exclusivo para assinantes Premium</p>
              </div>
            )}

            {/* Action Buttons */}
            {hasAccess ? (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleCopyPrompt(selectedItem.prompt)}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Prompt
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleDownload(selectedItem.imageUrl, selectedItem.title, selectedItem.isPremium)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Ref.
                  </Button>
                </div>
                {selectedItem.tutorialUrl && (
                  <Button 
                    onClick={() => openTutorial(selectedItem.tutorialUrl!)}
                    variant="outline" 
                    className="w-full border-red-500 text-red-500 hover:bg-red-500/10"
                  >
                    <Youtube className="h-4 w-4 mr-2" />
                    Ver Tutorial
                  </Button>
                )}
              </div>
            ) : (
              <Button 
                onClick={() => navigate('/planos')}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90"
              >
                <Star className="h-4 w-4 mr-2" fill="currentColor" />
                Torne-se Premium
              </Button>
            )}

            {/* Back button */}
            <Button 
              variant="ghost" 
              onClick={() => setSelectedItem(null)}
              className="w-full"
            >
              Voltar para coleção
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{collection.name}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
            {items.map(item => (
              <div 
                key={item.id}
                className="relative rounded-lg overflow-hidden border border-border cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedItem(item)}
              >
                {isVideoUrl(item.imageUrl) ? (
                  <div className="relative aspect-square">
                    <SecureVideo
                      src={item.imageUrl}
                      isPremium={item.isPremium}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-8 w-8 text-white" fill="currentColor" />
                    </div>
                  </div>
                ) : (
                  <SecureImage
                    src={getThumbnailUrl(item.imageUrl)}
                    alt={item.title}
                    isPremium={item.isPremium}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                )}
                
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {item.isPremium ? (
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-[10px]">
                      <Star className="h-2.5 w-2.5 mr-0.5" fill="currentColor" />
                      Premium
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-green-500 text-green-600 text-[10px] bg-background/80">
                      Grátis
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-white text-xs font-medium truncate">{item.title}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button 
            onClick={goToLibrary} 
            className="w-full mt-6 bg-gradient-primary hover:opacity-90 text-white font-semibold py-6"
          >
            Ver Mais Prompts
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </DialogContent>
      </Dialog>

      {/* Tutorial Modal */}
      <Dialog open={showTutorialModal} onOpenChange={setShowTutorialModal}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black">
          <button 
            onClick={() => setShowTutorialModal(false)} 
            className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          {tutorialUrl && (
            <div className="aspect-video">
              <iframe 
                src={tutorialUrl} 
                className="w-full h-full" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen 
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CollectionModal;
