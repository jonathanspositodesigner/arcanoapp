import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, ArrowLeft, X, Star, Video, Sparkles, Plus, Image } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/hooks/useStorageUpload";
import { optimizeImage, isImageFile, formatBytes } from "@/hooks/useImageOptimizer";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const TUTORIAL_TEMPLATES = [
  {
    name: "Tutorial de criar movie pra telão",
    url: '<iframe width="1250" height="703" src="https://www.youtube.com/embed/jbc00r7nX1U" title="COMO FAZER MOVIE PARA TELÃO" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
  },
];

const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return `Arquivo "${file.name}" muito grande. Máximo 100MB.`;
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return `Tipo de arquivo "${file.name}" não permitido.`;
  }
  return null;
};

interface MediaData {
  file: File;
  preview: string;
  title: string;
  description: string;
  category: string;
  isVideo: boolean;
  isPremium: boolean;
  hasTutorial: boolean;
  tutorialUrl: string;
  isAiGenerated: boolean;
  aiPrompt: string;
  aiReferenceImage: File | null;
  aiReferenceImagePreview: string;
  canvaLink: string;
  driveLink: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const AdminUploadArtesMusicos = () => {
  const navigate = useNavigate();
  const [mediaFiles, setMediaFiles] = useState<MediaData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('artes_categories_musicos')
      .select('id, name, slug')
      .order('display_order', { ascending: true });
    setCategories(data || []);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Digite o nome da categoria");
      return;
    }

    const slug = newCategoryName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const { data, error } = await supabase
      .from('artes_categories_musicos')
      .insert({ name: newCategoryName.trim(), slug })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar categoria");
      return;
    }

    setCategories(prev => [...prev, data]);
    updateMediaData('category', data.slug);
    setNewCategoryName("");
    setShowNewCategoryInput(false);
    toast.success("Categoria criada!");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    if (files.length === 0) {
      toast.error("Por favor, envie apenas imagens ou vídeos");
      return;
    }
    processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    const validFiles: File[] = [];
    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;
    
    const newMedia: MediaData[] = [];
    for (const file of validFiles) {
      const isVideo = file.type.startsWith('video/');
      
      // Optimize images before adding
      let processedFile = file;
      if (isImageFile(file)) {
        const result = await optimizeImage(file);
        processedFile = result.file;
        if (result.savingsPercent > 0) {
          console.log(`Optimized ${file.name}: ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${result.savingsPercent}% saved)`);
        }
      }
      
      newMedia.push({
        file: processedFile,
        preview: URL.createObjectURL(processedFile),
        title: "",
        description: "",
        category: "",
        isVideo,
        isPremium: false,
        hasTutorial: false,
        tutorialUrl: "",
        isAiGenerated: false,
        aiPrompt: "",
        aiReferenceImage: null,
        aiReferenceImagePreview: "",
        canvaLink: "",
        driveLink: ""
      });
    }
    
    if (newMedia.length > 0) {
      toast.success(`${newMedia.length} arquivo(s) otimizado(s) e adicionado(s)`);
      setMediaFiles(prev => [...prev, ...newMedia]);
      setShowModal(true);
      setCurrentIndex(0);
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateMediaData = (field: keyof MediaData, value: string | boolean | File | null) => {
    setMediaFiles(prev => prev.map((media, idx) => 
      idx === currentIndex ? { ...media, [field]: value } : media
    ));
  };

  const handleAiReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error("Apenas imagens são permitidas para referência");
        return;
      }
      updateMediaData('aiReferenceImage', file);
      const reader = new FileReader();
      reader.onloadend = () => updateMediaData('aiReferenceImagePreview', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const goToNext = () => {
    if (currentIndex < mediaFiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const isCurrentItemComplete = (media: MediaData) => {
    const baseComplete = media.title && media.category;
    if (media.isAiGenerated && !media.aiPrompt) return false;
    return baseComplete;
  };

  const allFieldsFilled = mediaFiles.every(media => isCurrentItemComplete(media));

  const handleClickItem = (index: number) => {
    setCurrentIndex(index);
    setShowModal(true);
  };

  const handleSaveSingleItem = async () => {
    const media = mediaFiles[currentIndex];
    if (!media.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (!media.category) {
      toast.error("Categoria é obrigatória");
      return;
    }
    if (media.isAiGenerated && !media.aiPrompt.trim()) {
      toast.error("Prompt é obrigatório para conteúdo de IA");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadResult = await uploadToStorage(media.file, 'artes-cloudinary');
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Failed to upload media');
      }
      
      const publicUrl = uploadResult.url;

      // Upload AI reference image if exists
      let aiReferenceImageUrl = null;
      if (media.isAiGenerated && media.aiReferenceImage) {
        const refUploadResult = await uploadToStorage(media.aiReferenceImage, 'artes-cloudinary');
        if (refUploadResult.success && refUploadResult.url) {
          aiReferenceImageUrl = refUploadResult.url;
        }
      }

      const { error: insertError } = await supabase.from('admin_artes').insert({
        title: media.title.charAt(0).toUpperCase() + media.title.slice(1).toLowerCase(),
        description: media.description || null,
        category: media.category,
        pack: null,
        image_url: publicUrl,
        download_url: null,
        is_premium: media.isPremium,
        tutorial_url: media.hasTutorial && media.tutorialUrl ? media.tutorialUrl : null,
        canva_link: media.canvaLink || null,
        drive_link: media.driveLink || null,
        platform: 'musicos',
        is_ai_generated: media.isAiGenerated,
        ai_prompt: media.isAiGenerated ? media.aiPrompt : null,
        ai_reference_image_url: aiReferenceImageUrl
      });
      
      if (insertError) throw insertError;

      setMediaFiles(prev => prev.filter((_, idx) => idx !== currentIndex));
      setShowModal(false);
      toast.success(`"${media.title}" enviado com sucesso!`);
      
      if (mediaFiles.length === 1) {
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Error submitting arte:", error);
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAll = async () => {
    for (const media of mediaFiles) {
      if (!media.title.trim()) {
        toast.error(`Título é obrigatório para "${media.title || 'item sem título'}"`);
        return;
      }
      if (!media.category) {
        toast.error(`Categoria é obrigatória para "${media.title}"`);
        return;
      }
      if (media.isAiGenerated && !media.aiPrompt.trim()) {
        toast.error(`Prompt é obrigatório para "${media.title}"`);
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      for (const media of mediaFiles) {
        const uploadResult = await uploadToStorage(media.file, 'artes-cloudinary');
        
        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || 'Failed to upload media');
        }
        
        const publicUrl = uploadResult.url;

        // Upload AI reference image if exists
        let aiReferenceImageUrl = null;
        if (media.isAiGenerated && media.aiReferenceImage) {
          const refUploadResult = await uploadToStorage(media.aiReferenceImage, 'artes-cloudinary');
          if (refUploadResult.success && refUploadResult.url) {
            aiReferenceImageUrl = refUploadResult.url;
          }
        }

        const { error: insertError } = await supabase.from('admin_artes').insert({
          title: media.title.charAt(0).toUpperCase() + media.title.slice(1).toLowerCase(),
          description: media.description || null,
          category: media.category,
          pack: null,
          image_url: publicUrl,
          download_url: null,
          is_premium: media.isPremium,
          tutorial_url: media.hasTutorial && media.tutorialUrl ? media.tutorialUrl : null,
          canva_link: media.canvaLink || null,
          drive_link: media.driveLink || null,
          platform: 'musicos',
          is_ai_generated: media.isAiGenerated,
          ai_prompt: media.isAiGenerated ? media.aiPrompt : null,
          ai_reference_image_url: aiReferenceImageUrl
        });
        
        if (insertError) throw insertError;
      }
      
      setMediaFiles([]);
      setShowModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error submitting artes:", error);
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentMedia = mediaFiles[currentIndex];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/admin-artes-musicos/ferramentas")} 
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="p-8 shadow-hover">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Upload de Artes - Músicos
            </h1>
            <p className="text-muted-foreground text-lg">
              Envie artes exclusivas para músicos e artistas
            </p>
          </div>

          <div 
            onDragOver={handleDragOver} 
            onDrop={handleDrop} 
            className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-violet-500 transition-colors cursor-pointer"
          >
            <input 
              id="media" 
              type="file" 
              accept="image/*,video/*" 
              multiple 
              onChange={handleFileSelect} 
              className="hidden" 
            />
            <label htmlFor="media" className="cursor-pointer">
              <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-foreground mb-2">
                Arraste imagens ou vídeos aqui ou clique para selecionar
              </p>
              <p className="text-sm text-muted-foreground">
                Você pode enviar vários arquivos de uma vez
              </p>
              <p className="text-xs text-violet-600 mt-2 font-medium">
                Tamanho recomendado: 1080x1350 pixels
              </p>
            </label>
          </div>

          {mediaFiles.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                Arquivos selecionados: {mediaFiles.length}
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {mediaFiles.map((media, idx) => (
                  <div 
                    key={idx} 
                    className="relative group cursor-pointer"
                    onClick={() => handleClickItem(idx)}
                  >
                    {media.isVideo ? (
                      <video 
                        src={media.preview} 
                        className="w-full h-32 object-cover rounded-lg hover:ring-2 hover:ring-violet-500 transition-all" 
                        muted 
                        loop 
                        autoPlay 
                        playsInline 
                      />
                    ) : (
                      <img 
                        src={media.preview} 
                        alt={`Preview ${idx + 1}`} 
                        className="w-full h-32 object-cover rounded-lg hover:ring-2 hover:ring-violet-500 transition-all" 
                      />
                    )}
                    <div className={`absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded ${media.isVideo ? 'bg-violet-500' : 'bg-blue-500'} text-white flex items-center gap-1`}>
                      {media.isVideo ? <Video className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                      {media.isVideo ? 'Vídeo' : 'Img'}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMedia(idx);
                      }} 
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className={`absolute bottom-2 left-2 right-2 text-xs ${isCurrentItemComplete(media) ? 'bg-green-500' : 'bg-yellow-500'} text-white px-2 py-1 rounded text-center`}>
                      {isCurrentItemComplete(media) ? 'Completo' : 'Pendente'}
                    </div>
                  </div>
                ))}
              </div>
              {allFieldsFilled && (
                <Button 
                  onClick={handleSubmitAll} 
                  className="w-full mt-6 bg-violet-600 hover:bg-violet-500" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Enviando..." : "Enviar Todos"}
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Informações {currentIndex + 1} de {mediaFiles.length}
            </DialogTitle>
          </DialogHeader>

          {currentMedia && (
            <div className="space-y-6">
              {/* Preview */}
              <div className="flex justify-center">
                {currentMedia.isVideo ? (
                  <video 
                    src={currentMedia.preview} 
                    className="max-h-48 rounded-lg" 
                    muted 
                    loop 
                    autoPlay 
                    playsInline 
                  />
                ) : (
                  <img 
                    src={currentMedia.preview} 
                    alt="Preview" 
                    className="max-h-48 rounded-lg object-contain" 
                  />
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={currentMedia.title}
                  onChange={(e) => updateMediaData('title', e.target.value)}
                  placeholder="Nome da arte"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={currentMedia.description}
                  onChange={(e) => updateMediaData('description', e.target.value)}
                  placeholder="Descrição opcional"
                  rows={2}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Categoria *</Label>
                {showNewCategoryInput ? (
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nome da nova categoria"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <Button onClick={handleAddCategory} size="sm">
                      Criar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowNewCategoryInput(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={currentMedia.category}
                    onValueChange={(value) => {
                      if (value === '__new__') {
                        setShowNewCategoryInput(true);
                      } else {
                        updateMediaData('category', value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.slug}>
                          {cat.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__" className="text-violet-600">
                        <span className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Adicionar nova categoria
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Premium Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">Premium</p>
                    <p className="text-sm text-muted-foreground">Apenas para membros</p>
                  </div>
                </div>
                <Switch
                  checked={currentMedia.isPremium}
                  onCheckedChange={(checked) => updateMediaData('isPremium', checked)}
                />
              </div>

              {/* Tutorial Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Com Tutorial</p>
                      <p className="text-sm text-muted-foreground">Inclui vídeo tutorial</p>
                    </div>
                  </div>
                  <Switch
                    checked={currentMedia.hasTutorial}
                    onCheckedChange={(checked) => updateMediaData('hasTutorial', checked)}
                  />
                </div>
                {currentMedia.hasTutorial && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <p className="text-sm text-muted-foreground w-full">Sugestões:</p>
                      {TUTORIAL_TEMPLATES.map((template) => (
                        <Button
                          key={template.name}
                          type="button"
                          variant={currentMedia.tutorialUrl === template.url ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateMediaData('tutorialUrl', template.url)}
                          className="text-xs"
                        >
                          {template.name}
                        </Button>
                      ))}
                    </div>
                    <Input
                      value={currentMedia.tutorialUrl}
                      onChange={(e) => updateMediaData('tutorialUrl', e.target.value)}
                      placeholder="Ou cole a URL do tutorial manualmente..."
                    />
                  </div>
                )}
              </div>

              {/* AI Generated Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-violet-500" />
                    <div>
                      <p className="font-medium">Feito com IA</p>
                      <p className="text-sm text-muted-foreground">Gerado por inteligência artificial</p>
                    </div>
                  </div>
                  <Switch
                    checked={currentMedia.isAiGenerated}
                    onCheckedChange={(checked) => updateMediaData('isAiGenerated', checked)}
                  />
                </div>
                {currentMedia.isAiGenerated && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="aiPrompt">Prompt utilizado *</Label>
                      <Textarea
                        id="aiPrompt"
                        value={currentMedia.aiPrompt}
                        onChange={(e) => updateMediaData('aiPrompt', e.target.value)}
                        placeholder="Digite o prompt usado para gerar esta arte..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Imagem de Referência (para o usuário baixar)</Label>
                      {currentMedia.aiReferenceImagePreview && (
                        <div className="relative">
                          <img 
                            src={currentMedia.aiReferenceImagePreview} 
                            alt="Referência" 
                            className="w-full max-h-32 object-contain rounded-lg bg-muted/50"
                          />
                          <button
                            onClick={() => {
                              updateMediaData('aiReferenceImage', null);
                              updateMediaData('aiReferenceImagePreview', '');
                            }}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAiReferenceImageChange}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-500 file:text-white hover:file:bg-violet-400"
                      />
                      <p className="text-xs text-muted-foreground">
                        Esta imagem será disponibilizada para os usuários baixarem junto com o prompt
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Links (optional) */}
              <div className="space-y-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Links (opcionais)</p>
                <div className="space-y-2">
                  <Label htmlFor="driveLink">Link Drive</Label>
                  <Input
                    id="driveLink"
                    value={currentMedia.driveLink}
                    onChange={(e) => updateMediaData('driveLink', e.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="canvaLink">Link Canva</Label>
                  <Input
                    id="canvaLink"
                    value={currentMedia.canvaLink}
                    onChange={(e) => updateMediaData('canvaLink', e.target.value)}
                    placeholder="https://canva.com/..."
                  />
                </div>
              </div>

              {/* Navigation & Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={goToPrevious} 
                    disabled={currentIndex === 0}
                  >
                    Anterior
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={goToNext} 
                    disabled={currentIndex === mediaFiles.length - 1}
                  >
                    Próximo
                  </Button>
                </div>
                <Button 
                  onClick={handleSaveSingleItem} 
                  disabled={isSubmitting || !isCurrentItemComplete(currentMedia)}
                  className="bg-violet-600 hover:bg-violet-500"
                >
                  {isSubmitting ? "Enviando..." : "Enviar Este"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Concluído!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-muted-foreground mb-6">
              Suas artes foram enviadas com sucesso!
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate("/admin-artes-musicos/ferramentas");
                }}
              >
                Voltar ao Painel
              </Button>
              <Button 
                onClick={() => setShowSuccessModal(false)}
                className="bg-violet-600 hover:bg-violet-500"
              >
                Enviar Mais
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUploadArtesMusicos;