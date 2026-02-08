import { useEffect, useState, useRef } from "react";
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
import { ArrowLeft, Pencil, Trash2, Star, Search, Video, Upload, Copy, CalendarDays, ImageIcon, Play, Loader2, StopCircle, AlertTriangle, Zap, Wrench, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SecureImage } from "@/components/SecureMedia";
import { generateThumbnailFromUrl, optimizeAndUploadThumbnail } from '@/hooks/useVideoThumbnail';

// Format title: first letter uppercase, rest lowercase
const formatTitle = (title: string): string => {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

// File validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return "Arquivo muito grande. Máximo 50MB.";
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return "Tipo de arquivo não permitido. Use JPEG, PNG, GIF, WebP, MP4, WebM ou MOV.";
  }
  return null;
};

type PromptType = 'admin' | 'community' | 'partner';

interface Prompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  image_url: string;
  type: PromptType;
  is_premium?: boolean;
  created_at?: string;
  tutorial_url?: string;
  partner_id?: string;
  bonus_clicks?: number;
  thumbnail_url?: string;
  reference_images?: string[];
  gender?: string | null;
  tags?: string[] | null;
}

type SortOption = 'date' | 'downloads';

interface FailedThumbnail {
  title: string;
  error: string;
}

const AdminManageImages = () => {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPromptText, setEditPromptText] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editIsPremium, setEditIsPremium] = useState(false);
  const [editHasTutorial, setEditHasTutorial] = useState(false);
  const [editTutorialUrl, setEditTutorialUrl] = useState("");
  const [editBonusClicks, setEditBonusClicks] = useState(0);
  const [editGender, setEditGender] = useState<string | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [newMediaPreview, setNewMediaPreview] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<PromptType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [generatingThumbnails, setGeneratingThumbnails] = useState<Set<string>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentTitle: '' });
  const [failedThumbnails, setFailedThumbnails] = useState<FailedThumbnail[]>([]);
  const stopBulkRef = useRef(false);

  useEffect(() => {
    checkAdminAndFetchPrompts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('prompts_categories')
      .select('id, name')
      .order('display_order', { ascending: true });
    if (data) setCategories(data);
  };

  const checkAdminAndFetchPrompts = async () => {
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

    fetchPrompts();
  };

  const fetchPrompts = async () => {
    try {
      const [adminData, communityData, partnerData] = await Promise.all([
        supabase.from('admin_prompts').select('id, title, prompt, category, image_url, is_premium, created_at, tutorial_url, bonus_clicks, thumbnail_url, reference_images, gender, tags').order('created_at', { ascending: false }),
        supabase.from('community_prompts').select('id, title, prompt, category, image_url, created_at, bonus_clicks, thumbnail_url').eq('approved', true).order('created_at', { ascending: false }),
        supabase.from('partner_prompts').select('id, title, prompt, category, image_url, is_premium, created_at, tutorial_url, partner_id, bonus_clicks, thumbnail_url, reference_images').eq('approved', true).order('created_at', { ascending: false })
      ]);

      const allPrompts: Prompt[] = [
        ...(adminData.data || []).map(p => ({ ...p, type: 'admin' as const })),
        ...(communityData.data || []).map(p => ({ ...p, type: 'community' as const, is_premium: false })),
        ...(partnerData.data || []).map(p => ({ ...p, type: 'partner' as const }))
      ];

      setPrompts(allPrompts);

      // Fetch click counts for all prompts from prompt_clicks table
      const { data: clickData } = await supabase
        .from('prompt_clicks')
        .select('prompt_id');

      const counts: Record<string, number> = {};
      (clickData || []).forEach(d => {
        counts[d.prompt_id] = (counts[d.prompt_id] || 0) + 1;
      });
      setClickCounts(counts);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast.error("Erro ao carregar imagens");
    } finally {
      setIsLoading(false);
    }
  };

  const getClickCount = (prompt: Prompt) => {
    const realClicks = clickCounts[prompt.id] || 0;
    const bonus = prompt.bonus_clicks || 0;
    return realClicks + bonus;
  };

  const filteredAndSortedPrompts = prompts
    .filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || p.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesType && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'downloads') {
        return getClickCount(b) - getClickCount(a);
      }
      // Default: sort by date
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setEditTitle(prompt.title);
    setEditPromptText(prompt.prompt);
    setEditCategory(prompt.category);
    setEditIsPremium(prompt.is_premium || false);
    setEditHasTutorial(!!prompt.tutorial_url);
    setEditTutorialUrl(prompt.tutorial_url || "");
    setEditBonusClicks(prompt.bonus_clicks || 0);
    setEditGender(prompt.gender || null);
    setEditTags(prompt.tags || []);
    setNewMediaFile(null);
    setNewMediaPreview("");
  };

  const handleCloseEdit = () => {
    setEditingPrompt(null);
    setNewMediaFile(null);
    setNewMediaPreview("");
  };

  const handleNewMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      setNewMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getTableAndBucket = (type: PromptType) => {
    switch (type) {
      case 'admin':
        return { table: 'admin_prompts', bucket: 'admin-prompts' };
      case 'community':
        return { table: 'community_prompts', bucket: 'community-prompts' };
      case 'partner':
        return { table: 'partner_prompts', bucket: 'partner-prompts' };
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPrompt) return;

    try {
      const { table, bucket } = getTableAndBucket(editingPrompt.type);
      
      let newImageUrl = editingPrompt.image_url;

      // If there's a new media file, upload it and delete the old one
      if (newMediaFile) {
        // Upload new file
        const fileExt = newMediaFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, newMediaFile);

        if (uploadError) throw uploadError;

        // Get new public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        newImageUrl = publicUrl;

        // Delete old file
        const oldFileName = editingPrompt.image_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from(bucket).remove([oldFileName]);
        }
      }

      const updateData: any = {
        title: formatTitle(editTitle),
        prompt: editPromptText,
        category: editCategory,
        image_url: newImageUrl,
        bonus_clicks: editBonusClicks
      };

      // Only add is_premium and tutorial_url for admin and partner prompts
      if (editingPrompt.type === 'admin' || editingPrompt.type === 'partner') {
        updateData.is_premium = editIsPremium;
        updateData.tutorial_url = editHasTutorial && editTutorialUrl ? editTutorialUrl : null;
      }

      // Add gender and tags for admin prompts when category is 'Fotos'
      if (editingPrompt.type === 'admin') {
        updateData.gender = editCategory === 'Fotos' ? editGender : null;
        updateData.tags = editCategory === 'Fotos' && editTags.length > 0 ? editTags : null;
      }

      const { error } = await supabase
        .from(table as 'admin_prompts')
        .update(updateData)
        .eq('id', editingPrompt.id);

      if (error) throw error;

      toast.success("Arquivo atualizado com sucesso!");
      handleCloseEdit();
      fetchPrompts();
    } catch (error) {
      console.error("Error updating prompt:", error);
      toast.error("Erro ao atualizar arquivo");
    }
  };

  const handleDelete = async (prompt: Prompt) => {
    if (!confirm("Tem certeza que deseja deletar este arquivo?")) return;

    try {
      const { table, bucket } = getTableAndBucket(prompt.type);
      
      // Delete from storage
      const fileName = prompt.image_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from(bucket).remove([fileName]);
      }

      // Delete from database
      const { error } = await supabase
        .from(table as 'admin_prompts')
        .delete()
        .eq('id', prompt.id);

      if (error) throw error;

      toast.success("Arquivo deletado com sucesso!");
      fetchPrompts();
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast.error("Erro ao deletar arquivo");
    }
  };

  const isVideoUrl = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  // Get display thumbnail: thumbnail_url > reference_images[0] > null
  const getDisplayThumbnail = (prompt: Prompt): string | null => {
    if (prompt.thumbnail_url) return prompt.thumbnail_url;
    if (prompt.reference_images && prompt.reference_images.length > 0) {
      return prompt.reference_images[0];
    }
    return null;
  };

  // Check if has reference image but no thumbnail
  const hasReferenceButNoThumbnail = (prompt: Prompt): boolean => {
    return !prompt.thumbnail_url && 
           !!prompt.reference_images && 
           prompt.reference_images.length > 0;
  };

  // Optimize reference image and use as thumbnail (resizes to 512px, ~30KB)
  // FALLBACK: if reference fails, tries to generate from video
  const handleUseReferenceAsThumbnail = async (prompt: Prompt) => {
    if (!prompt.reference_images || prompt.reference_images.length === 0) return;
    
    const key = `${prompt.type}-${prompt.id}`;
    setGeneratingThumbnails(prev => new Set(prev).add(key));
    
    try {
      // Try to optimize the reference image
      const optimizedUrl = await optimizeAndUploadThumbnail(prompt.reference_images[0]);
      
      if (!optimizedUrl) {
        // FALLBACK: Reference image doesn't exist, try generating from video
        console.log(`Reference image failed for ${prompt.id}, trying video fallback...`);
        
        if (isVideoUrl(prompt.image_url)) {
          const videoThumbnailUrl = await generateThumbnailFromUrl(prompt.image_url);
          if (videoThumbnailUrl) {
            const { table } = getTableAndBucket(prompt.type);
            const { error } = await supabase
              .from(table as 'admin_prompts')
              .update({ thumbnail_url: videoThumbnailUrl })
              .eq('id', prompt.id);
            if (error) throw error;
            toast.success("Thumbnail gerada do vídeo (referência não encontrada)!");
            fetchPrompts();
            return;
          }
        }
        throw new Error('Falha ao otimizar imagem de referência e ao gerar do vídeo');
      }

      const { table } = getTableAndBucket(prompt.type);
      
      const { error } = await supabase
        .from(table as 'admin_prompts')
        .update({ thumbnail_url: optimizedUrl })
        .eq('id', prompt.id);

      if (error) throw error;

      toast.success("Thumbnail otimizada e salva!");
      fetchPrompts();
    } catch (error) {
      console.error("Error optimizing thumbnail:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao otimizar thumbnail");
    } finally {
      setGeneratingThumbnails(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Generate thumbnail from video (may timeout)
  const handleGenerateThumbnailFromVideo = async (prompt: Prompt) => {
    const key = `${prompt.type}-${prompt.id}`;
    setGeneratingThumbnails(prev => new Set(prev).add(key));
    
    try {
      const thumbnailUrl = await generateThumbnailFromUrl(prompt.image_url);
      
      if (!thumbnailUrl) {
        throw new Error('Falha ao gerar thumbnail');
      }

      const { table } = getTableAndBucket(prompt.type);
      
      const { error } = await supabase
        .from(table as 'admin_prompts')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', prompt.id);

      if (error) throw error;

      toast.success("Thumbnail gerada com sucesso!");
      fetchPrompts();
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar thumbnail");
    } finally {
      setGeneratingThumbnails(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Smart thumbnail handler - uses reference if available, otherwise generates from video
  const handleGenerateThumbnail = async (prompt: Prompt) => {
    if (hasReferenceButNoThumbnail(prompt)) {
      await handleUseReferenceAsThumbnail(prompt);
    } else {
      await handleGenerateThumbnailFromVideo(prompt);
    }
  };

  const handleStopBulkGeneration = () => {
    stopBulkRef.current = true;
    toast.info("Parando geração em lote...");
  };

  const handleGenerateAllThumbnails = async () => {
    const videosWithoutThumbnails = filteredAndSortedPrompts.filter(
      p => isVideoUrl(p.image_url) && !p.thumbnail_url
    );

    if (videosWithoutThumbnails.length === 0) {
      toast.info("Todos os vídeos já possuem thumbnails!");
      return;
    }

    stopBulkRef.current = false;
    setBulkGenerating(true);
    setBulkProgress({ current: 0, total: videosWithoutThumbnails.length, currentTitle: '' });
    setFailedThumbnails([]);

    let successCount = 0;
    let failCount = 0;
    const failed: FailedThumbnail[] = [];

    for (let i = 0; i < videosWithoutThumbnails.length; i++) {
      // Check if stopped
      if (stopBulkRef.current) {
        toast.info(`Geração interrompida. ${successCount} geradas, ${failCount} falharam, ${videosWithoutThumbnails.length - i} restantes.`);
        break;
      }

      const prompt = videosWithoutThumbnails[i];
      setBulkProgress({ 
        current: i + 1, 
        total: videosWithoutThumbnails.length, 
        currentTitle: prompt.title 
      });

      try {
        let thumbnailUrl: string | null = null;
        
        // If has reference image, try to optimize and use it
        if (hasReferenceButNoThumbnail(prompt)) {
          thumbnailUrl = await optimizeAndUploadThumbnail(prompt.reference_images![0]);
          
          // FALLBACK: if reference failed (file doesn't exist), try generating from video
          if (!thumbnailUrl) {
            console.log(`Reference failed for ${prompt.id}, falling back to video...`);
            thumbnailUrl = await generateThumbnailFromUrl(prompt.image_url);
          }
        } else {
          // Generate from video directly
          thumbnailUrl = await generateThumbnailFromUrl(prompt.image_url);
        }
        
        if (thumbnailUrl) {
          const { table } = getTableAndBucket(prompt.type);
          await supabase
            .from(table as 'admin_prompts')
            .update({ thumbnail_url: thumbnailUrl })
            .eq('id', prompt.id);
          successCount++;
        } else {
          throw new Error('Falha ao gerar thumbnail');
        }
      } catch (error) {
        console.error(`Error generating thumbnail for ${prompt.id}:`, error);
        failCount++;
        failed.push({
          title: prompt.title,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    setBulkGenerating(false);
    setFailedThumbnails(failed);
    fetchPrompts();
    
    if (!stopBulkRef.current) {
      if (failCount === 0) {
        toast.success(`${successCount} thumbnails geradas com sucesso!`);
      } else {
        toast.warning(`${successCount} geradas, ${failCount} falharam`);
      }
    }
  };

  // Fix broken references - for items where reference_images file doesn't exist
  const handleFixBrokenReferences = async () => {
    // Find videos with reference_images that point to broken files (no thumbnail yet)
    const itemsWithBrokenRefs = filteredAndSortedPrompts.filter(
      p => isVideoUrl(p.image_url) && !p.thumbnail_url && hasReferenceButNoThumbnail(p)
    );

    if (itemsWithBrokenRefs.length === 0) {
      toast.info("Nenhum item com referência quebrada encontrado!");
      return;
    }

    stopBulkRef.current = false;
    setBulkGenerating(true);
    setBulkProgress({ current: 0, total: itemsWithBrokenRefs.length, currentTitle: '' });
    setFailedThumbnails([]);

    let successCount = 0;
    let failCount = 0;
    const failed: FailedThumbnail[] = [];

    for (let i = 0; i < itemsWithBrokenRefs.length; i++) {
      if (stopBulkRef.current) {
        toast.info(`Correção interrompida. ${successCount} corrigidas, ${failCount} falharam.`);
        break;
      }

      const prompt = itemsWithBrokenRefs[i];
      setBulkProgress({ 
        current: i + 1, 
        total: itemsWithBrokenRefs.length, 
        currentTitle: prompt.title 
      });

      try {
        // First, try to use the reference image
        let thumbnailUrl = await optimizeAndUploadThumbnail(prompt.reference_images![0]);
        
        // If reference failed (file doesn't exist), generate from video
        if (!thumbnailUrl) {
          console.log(`Ref broken for ${prompt.id}, generating from video...`);
          thumbnailUrl = await generateThumbnailFromUrl(prompt.image_url);
        }
        
        if (thumbnailUrl) {
          const { table } = getTableAndBucket(prompt.type);
          await supabase
            .from(table as 'admin_prompts')
            .update({ thumbnail_url: thumbnailUrl })
            .eq('id', prompt.id);
          successCount++;
        } else {
          throw new Error('Falha ao gerar thumbnail do vídeo');
        }
      } catch (error) {
        console.error(`Error fixing ${prompt.id}:`, error);
        failCount++;
        failed.push({
          title: prompt.title,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    setBulkGenerating(false);
    setFailedThumbnails(failed);
    fetchPrompts();
    
    if (!stopBulkRef.current) {
      if (failCount === 0) {
        toast.success(`${successCount} itens corrigidos com sucesso!`);
      } else {
        toast.warning(`${successCount} corrigidos, ${failCount} falharam`);
      }
    }
  };

  const videosWithoutThumbnails = prompts.filter(
    p => isVideoUrl(p.image_url) && !p.thumbnail_url
  ).length;

  const itemsWithBrokenRefs = prompts.filter(
    p => isVideoUrl(p.image_url) && !p.thumbnail_url && hasReferenceButNoThumbnail(p)
  ).length;

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
        <Button
          variant="ghost"
          onClick={() => navigate("/admin-prompts/ferramentas")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Painel
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Gerenciar Arquivos Enviados
          </h1>
          <p className="text-muted-foreground text-lg mb-4">
            {filteredAndSortedPrompts.length} arquivos {searchTerm || typeFilter !== 'all' ? 'encontrados' : 'publicados'}
          </p>
          
          {/* Type Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('all')}
            >
              Todos
            </Button>
            <Button
              variant={typeFilter === 'admin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('admin')}
              className={typeFilter === 'admin' ? 'bg-gradient-primary' : ''}
            >
              Envios de Administradores
            </Button>
            <Button
              variant={typeFilter === 'community' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('community')}
              className={typeFilter === 'community' ? 'bg-blue-500 hover:bg-blue-600' : ''}
            >
              Envios da Comunidade
            </Button>
            <Button
              variant={typeFilter === 'partner' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('partner')}
              className={typeFilter === 'partner' ? 'bg-green-500 hover:bg-green-600' : ''}
            >
              Envios de Parceiros
            </Button>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground self-center mr-2">Categoria:</span>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Options */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground self-center mr-2">Ordenar por:</span>
            <Button
              variant={sortBy === 'date' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('date')}
              className={sortBy === 'date' ? 'bg-primary' : ''}
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Mais recente
            </Button>
            <Button
              variant={sortBy === 'downloads' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('downloads')}
              className={sortBy === 'downloads' ? 'bg-primary' : ''}
            >
              <Copy className="h-4 w-4 mr-1" />
              Mais copiados
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {(videosWithoutThumbnails > 0 || itemsWithBrokenRefs > 0) && (
              <div className="flex flex-wrap gap-2">
                {videosWithoutThumbnails > 0 && (
                  <Button
                    onClick={handleGenerateAllThumbnails}
                    disabled={bulkGenerating}
                    className="bg-gradient-primary"
                  >
                    {bulkGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {bulkProgress.current}/{bulkProgress.total}
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Gerar Todas ({videosWithoutThumbnails})
                      </>
                    )}
                  </Button>
                )}
                
                {itemsWithBrokenRefs > 0 && !bulkGenerating && (
                  <Button
                    onClick={handleFixBrokenReferences}
                    variant="outline"
                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Corrigir Referências ({itemsWithBrokenRefs})
                  </Button>
                )}
                
                {bulkGenerating && (
                  <Button
                    onClick={handleStopBulkGeneration}
                    variant="destructive"
                    size="icon"
                  >
                    <StopCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Bulk progress details */}
          {bulkGenerating && bulkProgress.currentTitle && (
            <div className="mt-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground">
                Processando: <span className="text-foreground font-medium">{bulkProgress.currentTitle}</span>
              </p>
              <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Failed thumbnails list */}
          {failedThumbnails.length > 0 && !bulkGenerating && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Falhas na geração ({failedThumbnails.length})</span>
              </div>
              <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                {failedThumbnails.map((f, i) => (
                  <li key={i} className="text-muted-foreground">
                    • {f.title}: <span className="text-destructive">{f.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedPrompts.map((prompt) => {
            const isVideo = isVideoUrl(prompt.image_url);
            const promptKey = `${prompt.type}-${prompt.id}`;
            const isGenerating = generatingThumbnails.has(promptKey);
            const displayThumbnail = getDisplayThumbnail(prompt);
            const hasRefButNoThumb = hasReferenceButNoThumbnail(prompt);
            
            return (
              <Card key={promptKey} className="overflow-hidden">
                <div className="relative">
                  {isVideo ? (
                    // Para vídeos: mostra thumbnail, reference_images[0], ou placeholder
                    displayThumbnail ? (
                      <div className="relative">
                        <SecureImage
                          src={displayThumbnail}
                          alt={prompt.title}
                          className="w-full h-48 object-cover"
                          isPremium={prompt.is_premium || false}
                        />
                        {/* Badge indicando se é thumbnail provisória (reference_images) */}
                        {hasRefButNoThumb && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-yellow-500/90 text-white text-xs">
                              Imagem de referência
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <div className="text-center">
                          <Video className="h-12 w-12 text-primary/50 mx-auto mb-2" />
                          <span className="text-xs text-muted-foreground">Sem thumbnail</span>
                        </div>
                      </div>
                    )
                  ) : (
                    <SecureImage
                      src={prompt.image_url}
                      alt={prompt.title}
                      className="w-full h-48 object-cover"
                      isPremium={prompt.is_premium || false}
                    />
                  )}
                  
                  {/* Badge de vídeo */}
                  {isVideo && (
                    <div className="absolute bottom-2 left-2">
                      <Badge className="bg-black/70 text-white">
                        <Play className="h-3 w-3 mr-1" fill="currentColor" />
                        Vídeo
                      </Badge>
                    </div>
                  )}
                  
                  <div className="absolute top-2 right-2 flex gap-1">
                    {prompt.is_premium && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                        <Star className="h-3 w-3 mr-1" fill="currentColor" />
                        Premium
                      </Badge>
                    )}
                    <Badge className={
                      prompt.type === 'admin' 
                        ? 'bg-gradient-primary' 
                        : prompt.type === 'partner' 
                          ? 'bg-green-500' 
                          : 'bg-blue-500'
                    }>
                      {prompt.type === 'admin' ? 'Exclusivo' : prompt.type === 'partner' ? 'Parceiro' : 'Comunidade'}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">
                        {prompt.title}
                      </h3>
                      <Badge variant="secondary" className="mt-1">
                        {prompt.category}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary flex items-center gap-1">
                      <Copy className="h-3 w-3" />
                      {getClickCount(prompt)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {prompt.prompt}
                  </p>
                  
                  {/* Botões para gerar thumbnail de vídeo */}
                  {isVideo && (
                    <div className="flex gap-2">
                      {hasRefButNoThumb ? (
                        // Se tem reference_images mas não tem thumbnail, mostra opção rápida
                        <>
                          <Button
                            onClick={() => handleUseReferenceAsThumbnail(prompt)}
                            variant="secondary"
                            size="sm"
                            disabled={isGenerating}
                            className="flex-1"
                          >
                            {isGenerating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Zap className="h-4 w-4 mr-1" />
                                Usar Referência
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleGenerateThumbnailFromVideo(prompt)}
                            variant="outline"
                            size="sm"
                            disabled={isGenerating}
                            title="Gerar do 1º frame do vídeo (pode demorar)"
                          >
                            <Video className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        // Sem reference_images, gera do vídeo ou regenera
                        <Button
                          onClick={() => handleGenerateThumbnailFromVideo(prompt)}
                          variant="secondary"
                          size="sm"
                          disabled={isGenerating}
                          className="w-full"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Gerando...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-4 w-4 mr-2" />
                              {prompt.thumbnail_url ? 'Regerar Thumbnail' : 'Gerar Thumbnail'}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleEdit(prompt)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(prompt)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredAndSortedPrompts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchTerm ? 'Nenhum arquivo encontrado com esse nome' : 'Nenhum arquivo encontrado'}
            </p>
          </div>
        )}
      </div>

      <Dialog open={!!editingPrompt} onOpenChange={handleCloseEdit}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Arquivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Replace Media Section */}
            <div>
              <Label>Substituir Imagem/Vídeo</Label>
              <div className="mt-2">
                <label
                  htmlFor="new-media"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                >
                  {newMediaPreview ? (
                    newMediaFile?.type.startsWith('video/') ? (
                      <video
                        src={newMediaPreview}
                        className="h-full object-contain"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <img
                        src={newMediaPreview}
                        alt="New Preview"
                        className="h-full object-contain"
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Clique para selecionar nova mídia
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Atual: {editingPrompt?.image_url.split('/').pop()?.substring(0, 30)}...
                      </p>
                    </div>
                  )}
                </label>
                <input
                  id="new-media"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleNewMediaChange}
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Categoria</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Gender field - only shows when category is 'Fotos' and type is admin */}
            {editCategory === 'Fotos' && editingPrompt?.type === 'admin' && (
              <>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    <Label className="font-medium">Gênero da Foto</Label>
                  </div>
                  <Select value={editGender || ''} onValueChange={(value) => setEditGender(value || null)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags field for editing 'Fotos' category */}
                <div className="space-y-2">
                  <Label className="font-medium">Tags de Busca (até 10)</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editTags.map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setEditTags(editTags.filter((_, tagIdx) => tagIdx !== idx))}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  {editTags.length < 10 && (
                    <Input
                      placeholder="Digite uma tag e pressione Enter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const value = e.currentTarget.value.trim().substring(0, 30);
                          if (value && !editTags.includes(value)) {
                            setEditTags([...editTags, value]);
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {editTags.length}/10 tags • Use palavras como: formal, cantor, estúdio, etc.
                  </p>
                </div>
              </>
            )}
            
            {(editingPrompt?.type === 'admin' || editingPrompt?.type === 'partner') && (
              <>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <Star className={`h-5 w-5 ${editIsPremium ? 'text-yellow-500' : 'text-muted-foreground'}`} fill={editIsPremium ? 'currentColor' : 'none'} />
                    <Label htmlFor="edit-isPremium" className="font-medium">
                      {editIsPremium ? 'Conteúdo Premium' : 'Conteúdo Gratuito'}
                    </Label>
                  </div>
                  <Switch
                    id="edit-isPremium"
                    checked={editIsPremium}
                    onCheckedChange={setEditIsPremium}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <Video className={`h-5 w-5 ${editHasTutorial ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Label htmlFor="edit-hasTutorial" className="font-medium">
                      {editHasTutorial ? 'Tem Tutorial' : 'Sem Tutorial'}
                    </Label>
                  </div>
                  <Switch
                    id="edit-hasTutorial"
                    checked={editHasTutorial}
                    onCheckedChange={setEditHasTutorial}
                  />
                </div>

                {editHasTutorial && (
                  <div>
                    <Label htmlFor="edit-tutorialUrl">Link do Tutorial (YouTube, Vimeo, etc.)</Label>
                    <Input
                      id="edit-tutorialUrl"
                      value={editTutorialUrl}
                      onChange={(e) => setEditTutorialUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="mt-2"
                    />
                  </div>
                )}
              </>
            )}

            {/* Bonus Clicks */}
            <div className="p-4 rounded-lg border border-border bg-secondary/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Copy className="h-5 w-5 text-primary" />
                  <Label htmlFor="edit-bonusClicks" className="font-medium">
                    Cliques Bônus
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Total exibido: {(clickCounts[editingPrompt?.id || ''] || 0) + editBonusClicks}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Input
                  id="edit-bonusClicks"
                  type="number"
                  min="0"
                  value={editBonusClicks}
                  onChange={(e) => setEditBonusClicks(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  cliques adicionais
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-prompt">Prompt</Label>
              <Textarea
                id="edit-prompt"
                value={editPromptText}
                onChange={(e) => setEditPromptText(e.target.value)}
                className="mt-2 min-h-32"
              />
            </div>
            <Button
              onClick={handleSaveEdit}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminManageImages;
