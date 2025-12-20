import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, ArrowLeft, X, CheckCircle, ImagePlus, Video } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { uploadToStorage } from "@/hooks/useStorageUpload";
import { optimizeImage, isImageFile, formatBytes } from "@/hooks/useImageOptimizer";

const promptSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório").max(200, "Título deve ter no máximo 200 caracteres"),
  prompt: z.string().trim().min(1, "Prompt é obrigatório").max(10000, "Prompt deve ter no máximo 10.000 caracteres"),
  category: z.string().min(1, "Selecione uma categoria válida"),
});

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return `Arquivo muito grande. Máximo 100MB.`;
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return `Tipo de arquivo não permitido. Use JPEG, PNG, GIF, WebP, MP4, WebM ou MOV.`;
  }
  return null;
};

interface ReferenceImage {
  file: File;
  preview: string;
}

interface MediaData {
  file: File;
  preview: string;
  title: string;
  prompt: string;
  category: string;
  isVideo: boolean;
  referenceImages: ReferenceImage[];
  hasTutorial: boolean;
  tutorialUrl: string;
}

const PartnerUpload = () => {
  const navigate = useNavigate();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    checkPartnerAccess();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('prompts_categories')
      .select('id, name, is_admin_only')
      .eq('is_admin_only', false)
      .order('display_order', { ascending: true });
    if (data) setCategories(data);
  };

  const checkPartnerAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/parceiro-login');
      return;
    }

    const { data: partnerData, error } = await supabase
      .from('partners')
      .select('id, is_active')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !partnerData || !partnerData.is_active) {
      toast.error("Acesso negado");
      navigate('/');
      return;
    }

    setPartnerId(partnerData.id);
    setIsLoading(false);
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
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
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
        prompt: "",
        category: "",
        isVideo,
        referenceImages: [],
        hasTutorial: false,
        tutorialUrl: ""
      });
    }
    
    if (newMedia.length > 0) {
      toast.success(`${newMedia.length} arquivo(s) otimizado(s) e adicionado(s)`);
      setMediaFiles(prev => [...prev, ...newMedia]);
      setShowModal(true);
      setCurrentIndex(0);
    }
  };

  const handleReferenceImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFiles(prev => prev.map((media, idx) => 
          idx === currentIndex 
            ? { ...media, referenceImages: [...media.referenceImages, { file, preview: reader.result as string }] }
            : media
        ));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReferenceImage = (refIndex: number) => {
    setMediaFiles(prev => prev.map((media, idx) => 
      idx === currentIndex 
        ? { ...media, referenceImages: media.referenceImages.filter((_, i) => i !== refIndex) }
        : media
    ));
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateMediaData = (field: keyof MediaData, value: string | boolean) => {
    setMediaFiles(prev => prev.map((media, idx) => 
      idx === currentIndex ? { ...media, [field]: value } : media
    ));
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

  const allFieldsFilled = mediaFiles.every(media => 
    media.title && media.prompt && media.category
  );

  const formatTitle = (title: string): string => {
    if (!title) return "";
    return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
  };

  const handleSubmitAll = async () => {
    if (!partnerId) {
      toast.error("Erro de autenticação");
      return;
    }

    for (const media of mediaFiles) {
      const validationResult = promptSchema.safeParse({
        title: media.title,
        prompt: media.prompt,
        category: media.category,
      });
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast.error(`Erro em "${media.title || 'item sem título'}": ${firstError.message}`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      for (const media of mediaFiles) {
        // Upload to Cloudinary
        const uploadResult = await uploadToStorage(media.file, 'prompts-cloudinary');
        
        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || 'Failed to upload media');
        }

        const imageStoragePath = uploadResult.url;

        // Upload reference images if it's a video
        let referenceImageUrls: string[] = [];
        if (media.isVideo && media.referenceImages.length > 0) {
          for (const refImg of media.referenceImages) {
            const refUploadResult = await uploadToStorage(refImg.file, 'prompts-cloudinary/references');
            
            if (!refUploadResult.success || !refUploadResult.url) {
              throw new Error(refUploadResult.error || 'Failed to upload reference image');
            }

            referenceImageUrls.push(refUploadResult.url);
          }
        }

        const { error: insertError } = await supabase
          .from('partner_prompts')
          .insert({
            partner_id: partnerId,
            title: formatTitle(media.title),
            prompt: media.prompt,
            category: media.category,
            image_url: imageStoragePath,
            reference_images: referenceImageUrls.length > 0 ? referenceImageUrls : null,
            tutorial_url: media.hasTutorial && media.tutorialUrl ? media.tutorialUrl : null,
            approved: false,
            is_premium: true,
          });

        if (insertError) throw insertError;
      }

      setMediaFiles([]);
      setShowModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error submitting prompts:", error);
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentMedia = mediaFiles[currentIndex];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/parceiro-dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar à Dashboard
        </Button>

        <Card className="p-8 shadow-hover">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Enviar Novo Arquivo
            </h1>
            <p className="text-muted-foreground text-lg">
              Seus arquivos serão analisados por um administrador antes de serem publicados
            </p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
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
            </label>
          </div>

          {mediaFiles.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                Arquivos selecionados: {mediaFiles.length}
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {mediaFiles.map((media, idx) => (
                  <div key={idx} className="relative group">
                    {media.isVideo ? (
                      <video
                        src={media.preview}
                        className="w-full h-32 object-cover rounded-lg"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <img
                        src={media.preview}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    )}
                    <button
                      onClick={() => removeMedia(idx)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className={`absolute bottom-2 left-2 right-2 text-xs ${
                      media.title && media.prompt && media.category 
                        ? 'bg-green-500' 
                        : 'bg-yellow-500'
                    } text-white px-2 py-1 rounded`}>
                      {media.title && media.prompt && media.category ? 'Completo' : 'Pendente'}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setShowModal(true)}
                className="w-full mt-6 bg-gradient-primary hover:opacity-90"
              >
                Preencher Informações
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Informações {currentIndex + 1} de {mediaFiles.length}
            </DialogTitle>
          </DialogHeader>

          {currentMedia && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex justify-center">
                {currentMedia.isVideo ? (
                  <video
                    src={currentMedia.preview}
                    className="max-h-40 sm:max-h-64 object-contain rounded-lg"
                    controls
                    muted
                    autoPlay
                    loop
                  />
                ) : (
                  <img
                    src={currentMedia.preview}
                    alt="Preview"
                    className="max-h-40 sm:max-h-64 object-contain rounded-lg"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={currentMedia.title}
                  onChange={(e) => updateMediaData('title', e.target.value)}
                  placeholder="Ex: Selo 3D de Natal"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select 
                  value={currentMedia.category} 
                  onValueChange={(value) => updateMediaData('category', value)}
                >
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

              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/50">
                <div className="flex items-center gap-2">
                  <Video className={`h-5 w-5 ${currentMedia.hasTutorial ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Label htmlFor="hasTutorial" className="font-medium">
                    {currentMedia.hasTutorial ? 'Tem Tutorial' : 'Sem Tutorial'}
                  </Label>
                </div>
                <Switch
                  id="hasTutorial"
                  checked={currentMedia.hasTutorial}
                  onCheckedChange={(checked) => updateMediaData('hasTutorial', checked)}
                />
              </div>

              {currentMedia.hasTutorial && (
                <div>
                  <Label htmlFor="tutorialUrl">Link do Tutorial (YouTube, Vimeo, etc.)</Label>
                  <Input
                    id="tutorialUrl"
                    value={currentMedia.tutorialUrl}
                    onChange={(e) => updateMediaData('tutorialUrl', e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="mt-2"
                  />
                </div>
              )}

              {currentMedia.isVideo && (
                <div>
                  <Label>Imagens de Referência (opcional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Adicione imagens que serão baixadas junto com o vídeo
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {currentMedia.referenceImages.map((ref, idx) => (
                      <div key={idx} className="relative group">
                        <img src={ref.preview} alt={`Ref ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg" />
                        <button
                          onClick={() => removeReferenceImage(idx)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-16 h-16 flex items-center justify-center border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleReferenceImageSelect}
                        className="hidden"
                      />
                      <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    </label>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  value={currentMedia.prompt}
                  onChange={(e) => updateMediaData('prompt', e.target.value)}
                  placeholder="Descreva o prompt detalhado..."
                  className="mt-2 min-h-[120px]"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="flex-1"
                >
                  Anterior
                </Button>
                {currentIndex < mediaFiles.length - 1 ? (
                  <Button
                    onClick={goToNext}
                    className="flex-1 bg-gradient-primary hover:opacity-90"
                  >
                    Próximo
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitAll}
                    disabled={!allFieldsFilled || isSubmitting}
                    className="flex-1 bg-gradient-primary hover:opacity-90"
                  >
                    {isSubmitting ? "Enviando..." : "Enviar Todos"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="text-center">
          <div className="flex flex-col items-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Envio Realizado!
            </h2>
            <p className="text-muted-foreground mb-6">
              Seus arquivos foram enviados e aguardam aprovação de um administrador.
            </p>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessModal(false);
                }}
              >
                Enviar Mais
              </Button>
              <Button
                onClick={() => navigate('/parceiro-dashboard')}
                className="bg-gradient-primary hover:opacity-90"
              >
                Ver Meus Arquivos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerUpload;
