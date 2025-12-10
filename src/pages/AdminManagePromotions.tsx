import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Edit, Copy, Package, Gift, Webhook, Search, X } from "lucide-react";

interface Pack {
  id: string;
  name: string;
  slug: string;
  type: string;
}

type AccessType = '3_meses' | '6_meses' | '1_ano' | 'vitalicio';

interface PromotionItem {
  id?: string;
  pack_slug: string;
  pack_name?: string;
  access_type: AccessType;
}

interface Promotion {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  greenn_product_id: number | null;
  has_bonus_access: boolean;
  created_at: string;
  items?: PromotionItem[];
}

const WEBHOOK_URL = "https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/webhook-greenn-artes";

const ACCESS_TYPE_LABELS: Record<string, string> = {
  '3_meses': '3 Meses',
  '6_meses': '6 Meses',
  '1_ano': '1 Ano',
  'vitalicio': 'Vitalício'
};

export default function AdminManagePromotions() {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    greenn_product_id: '',
    has_bonus_access: false
  });
  const [promotionItems, setPromotionItems] = useState<PromotionItem[]>([]);
  
  // Pack search state
  const [packSearch, setPackSearch] = useState('');
  const [showPackSearch, setShowPackSearch] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchData();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/admin-login');
      return;
    }
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');
    if (!roles || roles.length === 0) {
      navigate('/admin-login');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch promotions with items
    const { data: promotionsData, error: promotionsError } = await supabase
      .from('artes_promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (promotionsError) {
      toast.error("Erro ao carregar promoções");
      console.error(promotionsError);
    }

    // Fetch promotion items
    const { data: itemsData } = await supabase
      .from('artes_promotion_items')
      .select('*');

    // Fetch packs
    const { data: packsData } = await supabase
      .from('artes_packs')
      .select('id, name, slug, type')
      .eq('type', 'pack')
      .order('name');

    if (packsData) {
      setPacks(packsData);
    }

    // Merge items into promotions
    if (promotionsData) {
      const promotionsWithItems = promotionsData.map(promo => ({
        ...promo,
        items: itemsData?.filter(item => item.promotion_id === promo.id).map(item => ({
          ...item,
          pack_name: packsData?.find(p => p.slug === item.pack_slug)?.name || item.pack_slug
        })) || []
      }));
      setPromotions(promotionsWithItems);
    }

    setLoading(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const resetForm = () => {
    setFormData({ name: '', greenn_product_id: '', has_bonus_access: false });
    setPromotionItems([]);
    setEditingPromotion(null);
    setPackSearch('');
    setShowPackSearch(false);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = async (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      greenn_product_id: promotion.greenn_product_id?.toString() || '',
      has_bonus_access: promotion.has_bonus_access
    });
    setPromotionItems(promotion.items || []);
    setIsDialogOpen(true);
  };

  const handleAddPack = (pack: Pack) => {
    if (promotionItems.some(item => item.pack_slug === pack.slug)) {
      toast.error("Este pack já foi adicionado");
      return;
    }
    setPromotionItems([...promotionItems, {
      pack_slug: pack.slug,
      pack_name: pack.name,
      access_type: 'vitalicio' as AccessType
    }]);
    setPackSearch('');
    setShowPackSearch(false);
  };

  const handleRemovePack = (packSlug: string) => {
    setPromotionItems(promotionItems.filter(item => item.pack_slug !== packSlug));
  };

  const handleUpdateAccessType = (packSlug: string, accessType: AccessType) => {
    setPromotionItems(promotionItems.map(item => 
      item.pack_slug === packSlug ? { ...item, access_type: accessType } : item
    ));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome da promoção é obrigatório");
      return;
    }

    if (promotionItems.length === 0) {
      toast.error("Adicione pelo menos um pack à promoção");
      return;
    }

    const slug = generateSlug(formData.name);

    try {
      if (editingPromotion) {
        // Update promotion
        const { error: updateError } = await supabase
          .from('artes_promotions')
          .update({
            name: formData.name,
            slug,
            greenn_product_id: formData.greenn_product_id ? parseInt(formData.greenn_product_id) : null,
            has_bonus_access: formData.has_bonus_access,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPromotion.id);

        if (updateError) throw updateError;

        // Delete old items
        await supabase
          .from('artes_promotion_items')
          .delete()
          .eq('promotion_id', editingPromotion.id);

        // Insert new items
        const { error: itemsError } = await supabase
          .from('artes_promotion_items')
          .insert(promotionItems.map(item => ({
            promotion_id: editingPromotion.id,
            pack_slug: item.pack_slug,
            access_type: item.access_type
          })));

        if (itemsError) throw itemsError;

        toast.success("Promoção atualizada com sucesso!");
      } else {
        // Create promotion
        const { data: newPromo, error: createError } = await supabase
          .from('artes_promotions')
          .insert({
            name: formData.name,
            slug,
            greenn_product_id: formData.greenn_product_id ? parseInt(formData.greenn_product_id) : null,
            has_bonus_access: formData.has_bonus_access
          })
          .select()
          .single();

        if (createError) throw createError;

        // Insert items
        const { error: itemsError } = await supabase
          .from('artes_promotion_items')
          .insert(promotionItems.map(item => ({
            promotion_id: newPromo.id,
            pack_slug: item.pack_slug,
            access_type: item.access_type
          })));

        if (itemsError) throw itemsError;

        toast.success("Promoção criada com sucesso!");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar promoção");
    }
  };

  const handleDelete = async (promotion: Promotion) => {
    if (!confirm(`Tem certeza que deseja excluir a promoção "${promotion.name}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('artes_promotions')
      .delete()
      .eq('id', promotion.id);

    if (error) {
      toast.error("Erro ao excluir promoção");
      return;
    }

    toast.success("Promoção excluída com sucesso!");
    fetchData();
  };

  const handleToggleActive = async (promotion: Promotion) => {
    const { error } = await supabase
      .from('artes_promotions')
      .update({ is_active: !promotion.is_active })
      .eq('id', promotion.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    fetchData();
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    toast.success("URL do webhook copiada!");
  };

  const filteredPacks = packs.filter(pack => 
    pack.name.toLowerCase().includes(packSearch.toLowerCase()) &&
    !promotionItems.some(item => item.pack_slug === pack.slug)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/admin-dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold">Gerenciar Promoções</h1>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Promoção
          </Button>
        </div>

        {/* Webhook URL Card */}
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Webhook className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">URL do Webhook para Greenn:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">{WEBHOOK_URL}</code>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyWebhook}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Promotions List */}
        <div className="grid gap-4">
          {promotions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma promoção cadastrada</p>
                <p className="text-sm">Clique em "Nova Promoção" para começar</p>
              </CardContent>
            </Card>
          ) : (
            promotions.map(promotion => (
              <Card key={promotion.id} className={!promotion.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{promotion.name}</CardTitle>
                        <Badge variant={promotion.is_active ? "default" : "secondary"}>
                          {promotion.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                        {promotion.has_bonus_access && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                            + Bônus
                          </Badge>
                        )}
                      </div>
                      {promotion.greenn_product_id && (
                        <p className="text-sm text-muted-foreground">
                          Product ID: <code className="bg-muted px-1 rounded">{promotion.greenn_product_id}</code>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={promotion.is_active} 
                        onCheckedChange={() => handleToggleActive(promotion)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(promotion)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(promotion)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {promotion.items?.map(item => (
                      <Badge key={item.pack_slug} variant="secondary" className="gap-1">
                        <Package className="h-3 w-3" />
                        {item.pack_name || item.pack_slug}
                        <span className="text-xs opacity-70">({ACCESS_TYPE_LABELS[item.access_type]})</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPromotion ? 'Editar Promoção' : 'Nova Promoção'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>Nome da Promoção *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Combo 3 Packs por 1"
              />
            </div>

            {/* Greenn Product ID */}
            <div className="space-y-2">
              <Label>Product ID da Greenn</Label>
              <Input
                type="number"
                value={formData.greenn_product_id}
                onChange={(e) => setFormData({ ...formData, greenn_product_id: e.target.value })}
                placeholder="Ex: 123456"
              />
              <p className="text-xs text-muted-foreground">
                ID do produto na Greenn que dispara esta promoção via webhook
              </p>
            </div>

            {/* Bonus Access */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Liberar acesso aos Bônus</Label>
                <p className="text-xs text-muted-foreground">
                  Quem comprar esta promoção terá acesso ao conteúdo bônus
                </p>
              </div>
              <Switch
                checked={formData.has_bonus_access}
                onCheckedChange={(checked) => setFormData({ ...formData, has_bonus_access: checked })}
              />
            </div>

            {/* Packs Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Packs Inclusos *</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowPackSearch(!showPackSearch)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Pack
                </Button>
              </div>

              {/* Pack Search */}
              {showPackSearch && (
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={packSearch}
                        onChange={(e) => setPackSearch(e.target.value)}
                        placeholder="Buscar pack..."
                        className="pl-9"
                        autoFocus
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setShowPackSearch(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {packSearch && filteredPacks.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredPacks.map(pack => (
                        <button
                          key={pack.id}
                          className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2"
                          onClick={() => handleAddPack(pack)}
                        >
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {pack.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Packs */}
              <div className="space-y-2">
                {promotionItems.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum pack adicionado</p>
                  </div>
                ) : (
                  promotionItems.map(item => (
                    <div key={item.pack_slug} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Package className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 font-medium">{item.pack_name || item.pack_slug}</div>
                      <Select
                        value={item.access_type}
                        onValueChange={(value) => handleUpdateAccessType(item.pack_slug, value as AccessType)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3_meses">3 Meses</SelectItem>
                          <SelectItem value="6_meses">6 Meses</SelectItem>
                          <SelectItem value="1_ano">1 Ano</SelectItem>
                          <SelectItem value="vitalicio">Vitalício</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemovePack(item.pack_slug)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingPromotion ? 'Salvar' : 'Criar Promoção'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
