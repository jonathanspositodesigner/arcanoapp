import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Copy, Pencil, Trash2, Check, Search, FolderOpen, Star, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SecureImage, SecureVideo } from "@/components/SecureMedia";

interface Collection {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  itemCount?: number;
}

interface PromptItem {
  id: string;
  title: string;
  imageUrl: string;
  isPremium: boolean;
  category: string;
  createdAt: string;
}

const isVideoUrl = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

const PartnerCollections = () => {
  const navigate = useNavigate();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [availablePrompts, setAvailablePrompts] = useState<PromptItem[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 30;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [collectionName, setCollectionName] = useState("");

  useEffect(() => {
    void checkPartnerAndFetch();
  }, []);

  const checkPartnerAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/parceiro-login');
      return;
    }
    setPartnerId(user.id);
    await Promise.all([fetchCollections(user.id), fetchPrompts(user.id)]);
    setIsLoading(false);
  };

  const fetchCollections = async (uid: string) => {
    const { data, error } = await supabase
      .from('admin_collections')
      .select('*')
      .eq('partner_id', uid)
      .order('created_at', { ascending: false });
    if (error) {
      console.error("Error fetching collections:", error);
      return;
    }
    const withCounts = await Promise.all(
      (data || []).map(async (c) => {
        const { count } = await supabase
          .from('admin_collection_items')
          .select('*', { count: 'exact', head: true })
          .eq('collection_id', c.id);
        return { ...c, itemCount: count || 0 };
      })
    );
    setCollections(withCounts);
  };

  const fetchPrompts = async (uid: string) => {
    const { data } = await supabase
      .from('partner_prompts')
      .select('id, title, image_url, is_premium, category, created_at, approved, rejected')
      .eq('partner_id', uid)
      .eq('approved', true)
      .order('created_at', { ascending: false });

    const prompts: PromptItem[] = (data || [])
      .filter((p: any) => !p.rejected)
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        imageUrl: p.image_url,
        isPremium: !!p.is_premium,
        category: p.category,
        createdAt: p.created_at || '',
      }));
    setAvailablePrompts(prompts);
  };

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const createCollection = async () => {
    if (!partnerId) return;
    if (!collectionName.trim()) {
      toast.error("Digite um nome para a coleção");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Selecione pelo menos um prompt");
      return;
    }

    const slug = generateSlug(collectionName) + '-' + Date.now().toString(36);

    const { data: collection, error: collectionError } = await supabase
      .from('admin_collections')
      .insert({ name: collectionName.trim(), slug, partner_id: partnerId, created_by: partnerId })
      .select()
      .single();

    if (collectionError || !collection) {
      toast.error("Erro ao criar coleção");
      console.error(collectionError);
      return;
    }

    const items = selectedItems.map((promptId, index) => ({
      collection_id: collection.id,
      prompt_id: promptId,
      prompt_type: 'partner',
      item_order: index,
    }));

    const { error: itemsError } = await supabase
      .from('admin_collection_items')
      .insert(items);

    if (itemsError) {
      toast.error("Erro ao adicionar itens");
      console.error(itemsError);
      return;
    }

    toast.success("Coleção criada com sucesso!");
    setShowCreateModal(false);
    setCollectionName("");
    setSelectedItems([]);
    setSearchQuery("");
    void fetchCollections(partnerId);
  };

  const updateCollection = async () => {
    if (!partnerId || !editingCollection) return;
    if (!collectionName.trim()) {
      toast.error("Digite um nome para a coleção");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Selecione pelo menos um prompt");
      return;
    }

    const { error: updateError } = await supabase
      .from('admin_collections')
      .update({ name: collectionName.trim() })
      .eq('id', editingCollection.id);

    if (updateError) {
      toast.error("Erro ao atualizar coleção");
      console.error(updateError);
      return;
    }

    await supabase
      .from('admin_collection_items')
      .delete()
      .eq('collection_id', editingCollection.id);

    const items = selectedItems.map((promptId, index) => ({
      collection_id: editingCollection.id,
      prompt_id: promptId,
      prompt_type: 'partner',
      item_order: index,
    }));

    const { error: itemsError } = await supabase
      .from('admin_collection_items')
      .insert(items);

    if (itemsError) {
      toast.error("Erro ao atualizar itens");
      console.error(itemsError);
      return;
    }

    toast.success("Coleção atualizada!");
    setShowEditModal(false);
    setEditingCollection(null);
    setCollectionName("");
    setSelectedItems([]);
    setSearchQuery("");
    void fetchCollections(partnerId);
  };

  const deleteCollection = async (id: string) => {
    if (!partnerId) return;
    if (!confirm("Tem certeza que deseja excluir esta coleção?")) return;
    const { error } = await supabase.from('admin_collections').delete().eq('id', id);
    if (error) {
      toast.error("Erro ao excluir coleção");
      console.error(error);
      return;
    }
    toast.success("Coleção excluída!");
    void fetchCollections(partnerId);
  };

  const openEditModal = async (collection: Collection) => {
    setEditingCollection(collection);
    setCollectionName(collection.name);
    setSearchQuery("");
    const { data } = await supabase
      .from('admin_collection_items')
      .select('prompt_id')
      .eq('collection_id', collection.id)
      .order('item_order', { ascending: true });
    setSelectedItems((data || []).map((item: any) => item.prompt_id));
    setShowEditModal(true);
  };

  const copyLink = (slug: string) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/biblioteca-prompts?colecao=${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const toggleItem = useCallback((id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const filteredPrompts = availablePrompts.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredPrompts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPrompts = filteredPrompts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  const renderPromptGrid = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="collection-name">Nome da Coleção</Label>
        <Input
          id="collection-name"
          value={collectionName}
          onChange={(e) => setCollectionName(e.target.value)}
          placeholder="Ex: Meus melhores prompts"
          className="mt-1"
          autoComplete="off"
        />
      </div>

      <div>
        <Label>Buscar nos meus prompts</Label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar por título..."
            className="pl-10"
            autoComplete="off"
          />
        </div>
      </div>

      <div>
        <Label>Selecione os Prompts ({selectedItems.length} selecionados)</Label>
        {availablePrompts.length === 0 ? (
          <Card className="p-6 text-center mt-2">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem prompts aprovados. Envie prompts e aguarde aprovação para criar coleções.
            </p>
          </Card>
        ) : (
          <div
            ref={scrollContainerRef}
            className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[400px] overflow-y-auto p-2 border rounded-lg"
          >
            {paginatedPrompts.map(prompt => {
              const isSelected = selectedItems.includes(prompt.id);
              return (
                <div
                  key={prompt.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleItem(prompt.id);
                  }}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/50'
                      : 'border-transparent hover:border-muted-foreground/30'
                  }`}
                >
                  {isVideoUrl(prompt.imageUrl) ? (
                    <div className="relative aspect-square">
                      <SecureVideo
                        src={prompt.imageUrl}
                        className="w-full h-full object-cover"
                        isPremium={prompt.isPremium}
                        muted
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                        <Play className="h-6 w-6 text-foreground" fill="currentColor" />
                      </div>
                    </div>
                  ) : (
                    <SecureImage
                      src={prompt.imageUrl}
                      alt={prompt.title}
                      className="w-full aspect-square object-cover"
                      isPremium={prompt.isPremium}
                    />
                  )}

                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                      <Check className="h-8 w-8 text-foreground" />
                    </div>
                  )}

                  <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                    {prompt.isPremium ? (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-foreground border-0 text-[8px] px-1 py-0">
                        <Star className="h-2 w-2 mr-0.5" fill="currentColor" />
                        Premium
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-500 text-green-400 text-[8px] px-1 py-0 bg-background/80">
                        Grátis
                      </Badge>
                    )}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
                    <p className="text-foreground text-[10px] truncate">{prompt.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {availablePrompts.length > 0 && (
          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-muted-foreground">
              {filteredPrompts.length} prompts • Página {safePage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/parceiro-dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Minhas Coleções</h1>
            <p className="text-muted-foreground">Crie coleções com seus prompts aprovados e compartilhe via link</p>
          </div>
          <Button onClick={() => {
            setCollectionName("");
            setSelectedItems([]);
            setSearchQuery("");
            setShowCreateModal(true);
          }} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Coleção
          </Button>
        </div>

        {collections.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Nenhuma coleção criada</h2>
            <p className="text-muted-foreground mb-4">
              Crie sua primeira coleção para compartilhar uma seleção dos seus prompts aprovados
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Coleção
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {collections.map(collection => (
              <Card key={collection.id} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{collection.name}</h3>
                  <p className="text-sm text-muted-foreground">{collection.itemCount} itens</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyLink(collection.slug)}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar Link
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEditModal(collection)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteCollection(collection.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showCreateModal} onOpenChange={(open) => {
          if (!open) {
            setCollectionName("");
            setSelectedItems([]);
            setSearchQuery("");
          }
          setShowCreateModal(open);
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Coleção</DialogTitle>
            </DialogHeader>
            {renderPromptGrid()}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button onClick={createCollection}>
                Criar Coleção
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditModal} onOpenChange={(open) => {
          if (!open) {
            setEditingCollection(null);
            setCollectionName("");
            setSelectedItems([]);
            setSearchQuery("");
          }
          setShowEditModal(open);
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Coleção</DialogTitle>
            </DialogHeader>
            {renderPromptGrid()}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancelar
              </Button>
              <Button onClick={updateCollection}>
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PartnerCollections;