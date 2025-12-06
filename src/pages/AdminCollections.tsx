import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Copy, Pencil, Trash2, Check, X, Search, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  type: 'admin' | 'community';
}

interface CollectionItem {
  id: string;
  prompt_id: string;
  prompt_type: string;
  item_order: number;
}

const AdminCollections = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [availablePrompts, setAvailablePrompts] = useState<PromptItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [collectionName, setCollectionName] = useState("");

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/admin-login');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      toast.error("Acesso negado");
      navigate('/');
      return;
    }

    setIsAdmin(true);
    await Promise.all([fetchCollections(), fetchPrompts()]);
    setIsLoading(false);
  };

  const fetchCollections = async () => {
    const { data, error } = await supabase
      .from('admin_collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching collections:", error);
      return;
    }

    // Fetch item counts for each collection
    const collectionsWithCounts = await Promise.all(
      (data || []).map(async (collection) => {
        const { count } = await supabase
          .from('admin_collection_items')
          .select('*', { count: 'exact', head: true })
          .eq('collection_id', collection.id);
        
        return { ...collection, itemCount: count || 0 };
      })
    );

    setCollections(collectionsWithCounts);
  };

  const fetchPrompts = async () => {
    const [{ data: adminData }, { data: communityData }] = await Promise.all([
      supabase.from('admin_prompts').select('id, title, image_url, is_premium, category').order('created_at', { ascending: false }),
      supabase.from('community_prompts').select('id, title, image_url, category').eq('approved', true).order('created_at', { ascending: false })
    ]);

    const prompts: PromptItem[] = [
      ...(adminData || []).map(p => ({
        id: p.id,
        title: p.title,
        imageUrl: p.image_url,
        isPremium: p.is_premium,
        category: p.category,
        type: 'admin' as const
      })),
      ...(communityData || []).map(p => ({
        id: p.id,
        title: p.title,
        imageUrl: p.image_url,
        isPremium: false,
        category: p.category,
        type: 'community' as const
      }))
    ];

    setAvailablePrompts(prompts);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const createCollection = async () => {
    if (!collectionName.trim()) {
      toast.error("Digite um nome para a coleção");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("Selecione pelo menos um item");
      return;
    }

    const slug = generateSlug(collectionName) + '-' + Date.now().toString(36);

    const { data: collection, error: collectionError } = await supabase
      .from('admin_collections')
      .insert({ name: collectionName.trim(), slug })
      .select()
      .single();

    if (collectionError) {
      toast.error("Erro ao criar coleção");
      console.error(collectionError);
      return;
    }

    // Insert collection items
    const items = selectedItems.map((promptId, index) => {
      const prompt = availablePrompts.find(p => p.id === promptId);
      return {
        collection_id: collection.id,
        prompt_id: promptId,
        prompt_type: prompt?.type || 'admin',
        item_order: index
      };
    });

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
    fetchCollections();
  };

  const updateCollection = async () => {
    if (!editingCollection || !collectionName.trim()) {
      toast.error("Digite um nome para a coleção");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("Selecione pelo menos um item");
      return;
    }

    // Update collection name
    const { error: updateError } = await supabase
      .from('admin_collections')
      .update({ name: collectionName.trim() })
      .eq('id', editingCollection.id);

    if (updateError) {
      toast.error("Erro ao atualizar coleção");
      console.error(updateError);
      return;
    }

    // Delete existing items and insert new ones
    await supabase
      .from('admin_collection_items')
      .delete()
      .eq('collection_id', editingCollection.id);

    const items = selectedItems.map((promptId, index) => {
      const prompt = availablePrompts.find(p => p.id === promptId);
      return {
        collection_id: editingCollection.id,
        prompt_id: promptId,
        prompt_type: prompt?.type || 'admin',
        item_order: index
      };
    });

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
    fetchCollections();
  };

  const deleteCollection = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta coleção?")) return;

    const { error } = await supabase
      .from('admin_collections')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erro ao excluir coleção");
      console.error(error);
      return;
    }

    toast.success("Coleção excluída!");
    fetchCollections();
  };

  const openEditModal = async (collection: Collection) => {
    setEditingCollection(collection);
    setCollectionName(collection.name);

    // Fetch existing items
    const { data } = await supabase
      .from('admin_collection_items')
      .select('prompt_id')
      .eq('collection_id', collection.id)
      .order('item_order', { ascending: true });

    setSelectedItems((data || []).map(item => item.prompt_id));
    setShowEditModal(true);
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/biblioteca-prompts?colecao=${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const toggleItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const filteredPrompts = availablePrompts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  const PromptSelector = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Nome da Coleção</Label>
        <Input
          id="name"
          value={collectionName}
          onChange={(e) => setCollectionName(e.target.value)}
          placeholder="Ex: Stranger Things"
          className="mt-1"
        />
      </div>

      <div>
        <Label>Buscar Prompts</Label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título..."
            className="pl-10"
          />
        </div>
      </div>

      <div>
        <Label>Selecione os Prompts ({selectedItems.length} selecionados)</Label>
        <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[400px] overflow-y-auto p-2 border rounded-lg">
          {filteredPrompts.map(prompt => (
            <div
              key={prompt.id}
              onClick={() => toggleItem(prompt.id)}
              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                selectedItems.includes(prompt.id) 
                  ? 'border-primary ring-2 ring-primary/50' 
                  : 'border-transparent hover:border-muted-foreground/30'
              }`}
            >
              <img
                src={prompt.imageUrl}
                alt={prompt.title}
                className="w-full aspect-square object-cover"
              />
              {selectedItems.includes(prompt.id) && (
                <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                  <Check className="h-8 w-8 text-white" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
                <p className="text-white text-[10px] truncate">{prompt.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/admin-dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Coleções</h1>
            <p className="text-muted-foreground">Crie coleções com links compartilháveis</p>
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
            <p className="text-muted-foreground mb-4">Crie sua primeira coleção para compartilhar prompts selecionados</p>
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
                  <Button variant="outline" size="sm" onClick={() => deleteCollection(collection.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Coleção</DialogTitle>
            </DialogHeader>
            <PromptSelector />
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

        {/* Edit Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Coleção</DialogTitle>
            </DialogHeader>
            <PromptSelector />
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

export default AdminCollections;
