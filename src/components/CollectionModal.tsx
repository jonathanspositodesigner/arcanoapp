import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Play, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CollectionItem {
  id: string;
  title: string;
  prompt: string;
  imageUrl: string;
  isPremium: boolean;
  category: string;
}

interface CollectionModalProps {
  slug: string;
  onClose: () => void;
}

const isVideoUrl = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

const CollectionModal = ({ slug, onClose }: CollectionModalProps) => {
  const navigate = useNavigate();
  const [collection, setCollection] = useState<{ name: string } | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCollection();
  }, [slug]);

  const fetchCollection = async () => {
    // Fetch collection by slug
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

    setCollection({ name: collectionData.name });

    // Fetch collection items
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

    // Fetch the actual prompts
    const adminIds = itemsData?.filter(i => i.prompt_type === 'admin').map(i => i.prompt_id) || [];
    const communityIds = itemsData?.filter(i => i.prompt_type === 'community').map(i => i.prompt_id) || [];

    const [{ data: adminPrompts }, { data: communityPrompts }] = await Promise.all([
      adminIds.length > 0 
        ? supabase.from('admin_prompts').select('id, title, prompt, image_url, is_premium, category').in('id', adminIds)
        : Promise.resolve({ data: [] }),
      communityIds.length > 0
        ? supabase.from('community_prompts').select('id, title, prompt, image_url, category').in('id', communityIds)
        : Promise.resolve({ data: [] })
    ]);

    // Map and order items
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
            category: prompt.category
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
            category: prompt.category
          });
        }
      }
    }

    setItems(orderedItems);
    setIsLoading(false);
  };

  const goToLibrary = () => {
    onClose();
    navigate('/biblioteca-prompts');
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

  return (
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
              onClick={() => {
                onClose();
                navigate(`/biblioteca-prompts?item=${item.id}`);
              }}
            >
              {isVideoUrl(item.imageUrl) ? (
                <div className="relative aspect-square">
                  <video
                    src={item.imageUrl}
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
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full aspect-square object-cover"
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
  );
};

export default CollectionModal;
