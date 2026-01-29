import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Pencil, Trash2, Star, Search, Upload, Copy, CalendarDays, Plus, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SecureImage, SecureVideo } from "@/components/SecureMedia";

interface Category {
  id: string;
  name: string;
}

const formatTitle = (title: string): string => {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm", "video/quicktime"];

interface Pack {
  id: string;
  name: string;
}

type ArteType = 'admin' | 'partner';

interface Arte {
  id: string;
  title: string;
  description?: string;
  category: string;
  pack?: string;
  image_url: string;
  download_url?: string;
  type: ArteType;
  is_premium?: boolean;
  created_at?: string;
  tutorial_url?: string;
  bonus_clicks?: number;
  canva_link?: string;
  drive_link?: string;
}

type SortOption = 'date' | 'downloads';

const AdminManageArtes = () => {
  const navigate = useNavigate();
  const [artes, setArtes] = useState<Arte[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingArte, setEditingArte] = useState<Arte | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editIsPremium, setEditIsPremium] = useState(false);
  const [editPack, setEditPack] = useState("");
  const [editHasTutorial, setEditHasTutorial] = useState(false);
  const [editTutorialUrl, setEditTutorialUrl] = useState("");
  const [editBonusClicks, setEditBonusClicks] = useState(0);
  const [editCanvaLink, setEditCanvaLink] = useState("");
  const [editDriveLink, setEditDriveLink] = useState("");
  const [editMotionType, setEditMotionType] = useState<'canva' | 'after_effects' | ''>('');
  const [searchTerm, setSearchTerm] = useState("");
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [newMediaPreview, setNewMediaPreview] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<ArteType | 'all'>('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  
  // Broken artes filter state
  const [brokenFilter, setBrokenFilter] = useState(false);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const [isCheckingBroken, setIsCheckingBroken] = useState(false);

  // Helper function to check if URL is a video
  const isVideoUrl = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  useEffect(() => {
    fetchCategories();
    fetchPacks();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('artes_categories')
      .select('id, name')
      .order('display_order', { ascending: true });
    setCategories(data || []);
  };

  const fetchPacks = async () => {
    const { data } = await supabase
      .from('artes_packs')
      .select('id, name')
      .order('display_order', { ascending: true });
    setPacks(data || []);
  };

  useEffect(() => {
    checkAdminAndFetchArtes();
  }, []);

  const checkAdminAndFetchArtes = async () => {
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

    fetchArtes();
  };

  const fetchArtes = async () => {
    try {
      const [adminData, partnerData] = await Promise.all([
        supabase.from('admin_artes').select('*').order('created_at', { ascending: false }),
        supabase.from('partner_artes').select('*').eq('approved', true).order('created_at', { ascending: false })
      ]);

      const allArtes: Arte[] = [
        ...(adminData.data || []).map(a => ({ ...a, type: 'admin' as const })),
        ...(partnerData.data || []).map(a => ({ ...a, type: 'partner' as const }))
      ];

      setArtes(allArtes);

      const { data: clickData } = await supabase.from('arte_clicks').select('arte_id');
      const counts: Record<string, number> = {};
      (clickData || []).forEach(d => {
        counts[d.arte_id] = (counts[d.arte_id] || 0) + 1;
      });
      setClickCounts(counts);
    } catch (error) {
      console.error("Error fetching artes:", error);
      toast.error("Erro ao carregar artes");
    } finally {
      setIsLoading(false);
    }
  };

  const extractFileNameFromUrl = (url: string): { bucket: string; path: string } | null => {
    try {
      // Handle URLs like: https://xxx.supabase.co/storage/v1/object/public/bucket-name/folder/file.ext
      const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (match) {
        return { bucket: match[1], path: match[2] };
      }
      return null;
    } catch {
      return null;
    }
  };

  const checkBrokenArtes = async () => {
    setIsCheckingBroken(true);
    try {
      const brokenSet = new Set<string>();
      
      // Get all files from admin-artes bucket
      const { data: adminFiles } = await supabase.storage.from('admin-artes').list('', { limit: 10000 });
      const adminFileNames = new Set((adminFiles || []).map(f => f.name));
      
      // Get all files from artes-cloudinary bucket (admin_artes folder)
      const { data: cloudinaryFiles } = await supabase.storage.from('artes-cloudinary').list('admin_artes', { limit: 10000 });
      const cloudinaryFileNames = new Set((cloudinaryFiles || []).map(f => `admin_artes/${f.name}`));
      
      // Get all files from partner-artes bucket
      const { data: partnerFiles } = await supabase.storage.from('partner-artes').list('', { limit: 10000 });
      const partnerFileNames = new Set((partnerFiles || []).map(f => f.name));
      
      // Check each arte
      for (const arte of artes) {
        const fileInfo = extractFileNameFromUrl(arte.image_url);
        if (!fileInfo) {
          brokenSet.add(arte.id);
          continue;
        }
        
        let exists = false;
        if (fileInfo.bucket === 'admin-artes') {
          exists = adminFileNames.has(fileInfo.path);
        } else if (fileInfo.bucket === 'artes-cloudinary') {
          exists = cloudinaryFileNames.has(fileInfo.path);
        } else if (fileInfo.bucket === 'partner-artes') {
          exists = partnerFileNames.has(fileInfo.path);
        }
        
        if (!exists) {
          brokenSet.add(arte.id);
        }
      }
      
      setBrokenIds(brokenSet);
      toast.success(`Verificação concluída: ${brokenSet.size} arte(s) quebrada(s) encontrada(s)`);
    } catch (error) {
      console.error("Error checking broken artes:", error);
      toast.error("Erro ao verificar artes quebradas");
    } finally {
      setIsCheckingBroken(false);
    }
  };

  const getClickCount = (arte: Arte) => {
    return (clickCounts[arte.id] || 0) + (arte.bonus_clicks || 0);
  };

  const isArteBroken = (arteId: string) => brokenIds.has(arteId);

  const filteredAndSortedArtes = artes
    .filter(a => {
      const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || a.type === typeFilter;
      const matchesBroken = !brokenFilter || brokenIds.has(a.id);
      const isVideo = isVideoUrl(a.image_url);
      const matchesMediaType = mediaTypeFilter === 'all' || 
        (mediaTypeFilter === 'video' && isVideo) || 
        (mediaTypeFilter === 'image' && !isVideo);
      return matchesSearch && matchesType && matchesBroken && matchesMediaType;
    })
    .sort((a, b) => {
      if (sortBy === 'downloads') {
        return getClickCount(b) - getClickCount(a);
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  const handleEdit = (arte: Arte) => {
    setEditingArte(arte);
    setEditTitle(arte.title);
    setEditDescription(arte.description || "");
    setEditCategory(arte.category);
    setEditPack(arte.pack || "");
    setEditIsPremium(arte.is_premium || false);
    setEditHasTutorial(!!arte.tutorial_url);
    setEditTutorialUrl(arte.tutorial_url || "");
    setEditBonusClicks(arte.bonus_clicks || 0);
    setEditCanvaLink(arte.canva_link || "");
    setEditDriveLink(arte.drive_link || "");
    setEditMotionType((arte as any).motion_type || '');
    setNewMediaFile(null);
    setNewMediaPreview("");
  };

  const handleCloseEdit = () => {
    setEditingArte(null);
    setNewMediaFile(null);
    setNewMediaPreview("");
  };

  const handleNewMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Arquivo muito grande. Máximo 50MB.");
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Tipo de arquivo não permitido.");
        return;
      }
      setNewMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewMediaPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const getTableAndBucket = (type: ArteType) => {
    switch (type) {
      case 'admin': return { table: 'admin_artes', bucket: 'admin-artes' };
      case 'partner': return { table: 'partner_artes', bucket: 'partner-artes' };
    }
  };

  const handleSaveEdit = async () => {
    if (!editingArte) return;

    try {
      const { table, bucket } = getTableAndBucket(editingArte.type);
      
      let newImageUrl = editingArte.image_url;

      if (newMediaFile) {
        const fileExt = newMediaFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, newMediaFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        newImageUrl = publicUrl;

        const oldFileName = editingArte.image_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from(bucket).remove([oldFileName]);
        }
      }

      const updateData: any = {
        title: formatTitle(editTitle),
        description: editDescription || null,
        category: editCategory,
        pack: editPack || null,
        image_url: newImageUrl,
        bonus_clicks: editBonusClicks,
        canva_link: editCanvaLink || null,
        drive_link: editDriveLink || null,
        motion_type: isVideoUrl(editingArte.image_url) ? editMotionType || null : null
      };

      if (editingArte.type === 'admin' || editingArte.type === 'partner') {
        updateData.is_premium = editIsPremium;
        updateData.tutorial_url = editHasTutorial && editTutorialUrl ? editTutorialUrl : null;
      }

      const { error } = await supabase
        .from(table as 'admin_artes')
        .update(updateData)
        .eq('id', editingArte.id);

      if (error) throw error;

      toast.success("Arte atualizada com sucesso!");
      handleCloseEdit();
      fetchArtes();
    } catch (error) {
      console.error("Error updating arte:", error);
      toast.error("Erro ao atualizar arte");
    }
  };

  const handleDelete = async (arte: Arte) => {
    if (!confirm("Tem certeza que deseja deletar esta arte?")) return;

    try {
      const { table, bucket } = getTableAndBucket(arte.type);
      
      const fileName = arte.image_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from(bucket).remove([fileName]);
      }

      const { error } = await supabase
        .from(table as 'admin_artes')
        .delete()
        .eq('id', arte.id);

      if (error) throw error;

      toast.success("Arte deletada com sucesso!");
      fetchArtes();
    } catch (error) {
      console.error("Error deleting arte:", error);
      toast.error("Erro ao deletar arte");
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate("/admin-artes-eventos/ferramentas")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Painel
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Gerenciar Artes
          </h1>
          <p className="text-muted-foreground text-lg mb-4">
            {filteredAndSortedArtes.length} artes {searchTerm || typeFilter !== 'all' ? 'encontradas' : 'publicadas'}
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant={typeFilter === 'all' && !brokenFilter ? 'default' : 'outline'} size="sm" onClick={() => { setTypeFilter('all'); setBrokenFilter(false); }}>
              Todos
            </Button>
            <Button variant={typeFilter === 'admin' && !brokenFilter ? 'default' : 'outline'} size="sm" onClick={() => { setTypeFilter('admin'); setBrokenFilter(false); }}
              className={typeFilter === 'admin' && !brokenFilter ? 'bg-gradient-primary' : ''}>
              Envios de Administradores
            </Button>
            <Button variant={typeFilter === 'partner' && !brokenFilter ? 'default' : 'outline'} size="sm" onClick={() => { setTypeFilter('partner'); setBrokenFilter(false); }}
              className={typeFilter === 'partner' && !brokenFilter ? 'bg-green-500 hover:bg-green-600' : ''}>
              Envios de Colaboradores
            </Button>
            <Button 
              variant={brokenFilter ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => { setBrokenFilter(!brokenFilter); setTypeFilter('all'); }}
              className={brokenFilter ? 'bg-destructive hover:bg-destructive/90' : 'border-destructive text-destructive hover:bg-destructive/10'}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Artes Quebradas
              {brokenIds.size > 0 && (
                <Badge variant="secondary" className="ml-2 bg-white text-destructive font-bold">
                  {brokenIds.size}
                </Badge>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground self-center mr-2">Tipo de mídia:</span>
            <Button variant={mediaTypeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setMediaTypeFilter('all')}>
              Todos
            </Button>
            <Button 
              variant={mediaTypeFilter === 'image' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setMediaTypeFilter('image')}
              className={mediaTypeFilter === 'image' ? 'bg-blue-500 hover:bg-blue-600' : ''}
            >
              🖼️ Imagens
            </Button>
            <Button 
              variant={mediaTypeFilter === 'video' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setMediaTypeFilter('video')}
              className={mediaTypeFilter === 'video' ? 'bg-purple-500 hover:bg-purple-600' : ''}
            >
              🎬 Vídeos
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground self-center mr-2">Ordenar por:</span>
            <Button variant={sortBy === 'date' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('date')}
              className={sortBy === 'date' ? 'bg-primary' : ''}>
              <CalendarDays className="h-4 w-4 mr-1" />Mais recente
            </Button>
            <Button variant={sortBy === 'downloads' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('downloads')}
              className={sortBy === 'downloads' ? 'bg-primary' : ''}>
              <Copy className="h-4 w-4 mr-1" />Mais baixados
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkBrokenArtes}
              disabled={isCheckingBroken}
              className="ml-auto border-orange-500 text-orange-500 hover:bg-orange-500/10"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isCheckingBroken ? 'animate-spin' : ''}`} />
              {isCheckingBroken ? 'Verificando...' : 'Verificar Artes Quebradas'}
            </Button>
          </div>
          
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedArtes.map((arte) => {
            const isVideo = isVideoUrl(arte.image_url);
            const isBroken = isArteBroken(arte.id);
            return (
              <Card key={`${arte.type}-${arte.id}`} className={`overflow-hidden ${isBroken ? 'ring-2 ring-destructive ring-offset-2' : ''}`}>
                <div className="relative">
                  {isBroken ? (
                    <div className="w-full h-48 bg-destructive/10 flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="h-12 w-12 text-destructive" />
                      <span className="text-sm text-destructive font-medium">Imagem não encontrada</span>
                    </div>
                  ) : isVideo ? (
                    <SecureVideo src={arte.image_url} className="w-full h-48 object-cover" isPremium={arte.is_premium || false} autoPlay muted loop />
                  ) : (
                    <SecureImage src={arte.image_url} alt={arte.title} className="w-full h-48 object-cover" isPremium={arte.is_premium || false} />
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {isBroken && (
                      <Badge className="bg-destructive text-white border-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />Quebrada
                      </Badge>
                    )}
                    {arte.is_premium && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                        <Star className="h-3 w-3 mr-1" fill="currentColor" />Premium
                      </Badge>
                    )}
                    <Badge className={arte.type === 'admin' ? 'bg-gradient-primary' : arte.type === 'partner' ? 'bg-green-500' : 'bg-blue-500'}>
                      {arte.type === 'admin' ? 'Exclusivo' : arte.type === 'partner' ? 'Parceiro' : 'Comunidade'}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{arte.title}</h3>
                      <Badge variant="secondary" className="mt-1">{arte.category}</Badge>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary flex items-center gap-1">
                      <Copy className="h-3 w-3" />{getClickCount(arte)}
                    </Badge>
                  </div>
                  {arte.description && <p className="text-sm text-muted-foreground line-clamp-2">{arte.description}</p>}
                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => handleEdit(arte)} variant={isBroken ? "default" : "outline"} className={`flex-1 ${isBroken ? 'bg-orange-500 hover:bg-orange-600' : ''}`}>
                      {isBroken ? <Upload className="h-4 w-4 mr-2" /> : <Pencil className="h-4 w-4 mr-2" />}
                      {isBroken ? 'Fazer Upload' : 'Editar'}
                    </Button>
                    <Button onClick={() => handleDelete(arte)} variant="destructive" className="flex-1">
                      <Trash2 className="h-4 w-4 mr-2" />Excluir
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredAndSortedArtes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchTerm ? 'Nenhuma arte encontrada com esse nome' : 'Nenhuma arte encontrada'}
            </p>
          </div>
        )}
      </div>

      <Dialog open={!!editingArte} onOpenChange={() => handleCloseEdit()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Arte</DialogTitle>
          </DialogHeader>
          {editingArte && (
            <div className="space-y-4">
              {isArteBroken(editingArte.id) && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                  <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    Imagem não encontrada no storage
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Faça upload de uma nova imagem para corrigir esta arte.
                  </p>
                  {(editingArte.canva_link || editingArte.drive_link) && (
                    <div className="flex flex-wrap gap-2">
                      {editingArte.canva_link && (
                        <a href={editingArte.canva_link} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="border-blue-500 text-blue-500">
                            <ExternalLink className="h-4 w-4 mr-1" />Abrir no Canva
                          </Button>
                        </a>
                      )}
                      {editingArte.drive_link && (
                        <a href={editingArte.drive_link} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="border-green-500 text-green-500">
                            <ExternalLink className="h-4 w-4 mr-1" />Abrir no Drive
                          </Button>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-center">
                {newMediaPreview ? (
                  <img src={newMediaPreview} alt="Preview" className="max-h-48 object-contain rounded-lg" />
                ) : isArteBroken(editingArte.id) ? (
                  <div className="w-full h-48 bg-muted rounded-lg flex flex-col items-center justify-center gap-2">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Faça upload de uma nova imagem</span>
                  </div>
                ) : isVideoUrl(editingArte.image_url) ? (
                  <SecureVideo src={editingArte.image_url} className="max-h-48 object-contain rounded-lg" isPremium={editingArte.is_premium || false} controls />
                ) : (
                  <SecureImage src={editingArte.image_url} alt={editingArte.title} className="max-h-48 object-contain rounded-lg" isPremium={editingArte.is_premium || false} />
                )}
              </div>
              
              <div className={isArteBroken(editingArte.id) ? 'p-3 bg-orange-500/10 border-2 border-dashed border-orange-500 rounded-lg' : ''}>
                <Label className={isArteBroken(editingArte.id) ? 'text-orange-500 font-medium' : ''}>
                  {isArteBroken(editingArte.id) ? '⚠️ Upload Nova Imagem (Obrigatório)' : 'Substituir Mídia'}
                </Label>
                <input type="file" accept="image/*,video/*" onChange={handleNewMediaChange}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 mt-2" />
              </div>

              <div>
                <Label>Título</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label>Categoria</Label>
                <Select value={editCategory} onValueChange={(value) => {
                  if (value === '__new__') {
                    const newCat = prompt('Nome da nova categoria:');
                    if (newCat && newCat.trim()) {
                      const formattedCat = newCat.trim();
                      supabase.from('artes_categories').insert({ name: formattedCat, slug: formattedCat.toLowerCase().replace(/\s+/g, '-') })
                        .then(() => {
                          fetchCategories();
                          setEditCategory(formattedCat);
                          toast.success('Categoria criada!');
                        });
                    }
                  } else {
                    setEditCategory(value);
                  }
                }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {editCategory && !categories.find(c => c.name === editCategory) && (
                      <SelectItem value={editCategory}>{editCategory}</SelectItem>
                    )}
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                    <SelectItem value="__new__" className="text-primary font-medium">+ Adicionar nova categoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Pack</Label>
                <Select value={editPack} onValueChange={setEditPack}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o pack" /></SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {editPack && !packs.find(p => p.name === editPack) && (
                      <SelectItem value={editPack}>{editPack}</SelectItem>
                    )}
                    {packs.map(pack => (
                      <SelectItem key={pack.id} value={pack.name}>{pack.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(editingArte.type === 'admin' || editingArte.type === 'partner') && (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-secondary/50">
                    <Label className="flex items-center gap-2">
                      <Star className={`h-4 w-4 ${editIsPremium ? 'text-yellow-500' : 'text-muted-foreground'}`} fill={editIsPremium ? 'currentColor' : 'none'} />
                      {editIsPremium ? 'Conteúdo Premium' : 'Conteúdo Gratuito'}
                    </Label>
                    <Switch checked={editIsPremium} onCheckedChange={setEditIsPremium} />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-secondary/50">
                    <Label>Tem Tutorial</Label>
                    <Switch checked={editHasTutorial} onCheckedChange={setEditHasTutorial} />
                  </div>

                  {editHasTutorial && (
                    <div>
                      <Label>URL do Tutorial</Label>
                      <Input value={editTutorialUrl} onChange={(e) => setEditTutorialUrl(e.target.value)} className="mt-1" placeholder="https://youtube.com/..." />
                    </div>
                  )}

                  {isVideoUrl(editingArte.image_url) && (
                    <div className="p-4 rounded-lg border border-border bg-secondary/50">
                      <Label className="text-sm font-medium mb-3 flex items-center gap-2">
                        🎬 Tipo de Motion
                      </Label>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="editMotionType" 
                            value="canva" 
                            checked={editMotionType === 'canva'} 
                            onChange={() => setEditMotionType('canva')}
                            className="w-4 h-4 text-cyan-500"
                          />
                          <span className="text-sm">🎨 Motion Canva</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="editMotionType" 
                            value="after_effects" 
                            checked={editMotionType === 'after_effects'} 
                            onChange={() => setEditMotionType('after_effects')}
                            className="w-4 h-4 text-purple-500"
                          />
                          <span className="text-sm">🎬 Motion After Effects</span>
                        </label>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <Label>Link Canva <span className="text-destructive">*</span></Label>
                <Input value={editCanvaLink} onChange={(e) => setEditCanvaLink(e.target.value)} className="mt-1" placeholder="https://www.canva.com/..." required />
              </div>

              <div>
                <Label>Link Drive <span className="text-destructive">*</span></Label>
                <Input value={editDriveLink} onChange={(e) => setEditDriveLink(e.target.value)} className="mt-1" placeholder="https://drive.google.com/..." required />
              </div>

              <div>
                <Label>Cliques Bônus</Label>
                <Input type="number" value={editBonusClicks} onChange={(e) => setEditBonusClicks(parseInt(e.target.value) || 0)} className="mt-1" />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseEdit}>Cancelar</Button>
                <Button onClick={handleSaveEdit} className="bg-gradient-primary">Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminManageArtes;
