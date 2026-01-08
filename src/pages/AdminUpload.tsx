import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, ArrowLeft, X, Star, ImagePlus, Video, FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { uploadToStorage } from "@/hooks/useStorageUpload";
import { optimizeImage, isImageFile, formatBytes } from "@/hooks/useImageOptimizer";
import { generateAndUploadThumbnail } from "@/hooks/useVideoThumbnail";

// Validation schema - category validated dynamically
const promptSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório").max(200, "Título deve ter no máximo 200 caracteres"),
  prompt: z.string().trim().min(1, "Prompt é obrigatório").max(10000, "Prompt deve ter no máximo 10.000 caracteres"),
  category: z.string().min(1, "Selecione uma categoria válida"),
});

// File validation constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for admin uploads
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return `Arquivo "${file.name}" muito grande. Máximo 100MB.`;
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return `Tipo de arquivo "${file.name}" não permitido. Use JPEG, PNG, GIF, WebP, MP4, WebM ou MOV.`;
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
  isPremium: boolean;
  referenceImages: ReferenceImage[];
  hasTutorial: boolean;
  tutorialUrl: string;
  txtFileName?: string;
}

const AdminUpload = () => {
  const navigate = useNavigate();
  const [mediaFiles, setMediaFiles] = useState<MediaData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('prompts_categories')
        .select('id, name')
        .order('display_order', { ascending: true });
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // Safeguard: keep currentIndex within valid bounds
  useEffect(() => {
    if (mediaFiles.length === 0) {
      setShowModal(false);
      setCurrentIndex(0);
    } else if (currentIndex >= mediaFiles.length) {
      setCurrentIndex(mediaFiles.length - 1);
    }
  }, [mediaFiles.length, currentIndex]);

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
    
    // Allow images, videos, and TXT files
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/') || 
      file.type.startsWith('video/') ||
      file.name.toLowerCase().endsWith('.txt') ||
      file.type === 'text/plain'
    );
    
    if (files.length === 0) {
      toast.error("Por favor, envie imagens, vídeos ou arquivos .txt");
      return;
    }
    
    processFiles(files);
  };

  const getFileNameWithoutExtension = (fileName: string): string => {
    return fileName.replace(/\.[^/.]+$/, '').toLowerCase();
  };

  const readTxtFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string)?.trim() || '');
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  const processFiles = async (files: File[]) => {
    // Separate media files from TXT files
    const txtFiles: File[] = [];
    const mediaFilesToProcess: File[] = [];
    
    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.txt') || file.type === 'text/plain') {
        txtFiles.push(file);
      } else {
        const validationError = validateFile(file);
        if (validationError) {
          toast.error(validationError);
          continue;
        }
        mediaFilesToProcess.push(file);
      }
    }
    
    if (mediaFilesToProcess.length === 0) {
      if (txtFiles.length > 0) {
        toast.error("Envie imagens/vídeos junto com os arquivos TXT para vincular automaticamente");
      }
      return;
    }

    // Create a map of TXT files by base name for quick lookup
    const txtMap = new Map<string, File>();
    for (const txt of txtFiles) {
      const baseName = getFileNameWithoutExtension(txt.name);
      txtMap.set(baseName, txt);
    }
    
    const newMedia: MediaData[] = [];
    let matchedCount = 0;
    
    for (const file of mediaFilesToProcess) {
      const isVideo = file.type.startsWith('video/');
      const baseName = getFileNameWithoutExtension(file.name);
      
      // Optimize images before adding
      let processedFile = file;
      if (isImageFile(file)) {
        const result = await optimizeImage(file);
        processedFile = result.file;
        if (result.savingsPercent > 0) {
          console.log(`Optimized ${file.name}: ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${result.savingsPercent}% saved)`);
        }
      }

      // Check if there's a matching TXT file
      let prompt = '';
      let txtFileName: string | undefined;
      const matchingTxt = txtMap.get(baseName);
      if (matchingTxt) {
        try {
          prompt = await readTxtFile(matchingTxt);
          txtFileName = matchingTxt.name;
          matchedCount++;
        } catch (e) {
          console.error(`Failed to read TXT for ${file.name}:`, e);
        }
      }
      
      newMedia.push({
        file: processedFile,
        preview: URL.createObjectURL(processedFile),
        title: "",
        prompt,
        category: "",
        isVideo,
        isPremium: false,
        referenceImages: [],
        hasTutorial: false,
        tutorialUrl: "",
        txtFileName
      });
    }
    
    if (newMedia.length > 0) {
      let message = `${newMedia.length} arquivo(s) adicionado(s)`;
      if (matchedCount > 0) {
        message += ` (${matchedCount} prompt(s) vinculado(s) automaticamente)`;
      }
      toast.success(message);
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

  const handleTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
      toast.error("Por favor, selecione um arquivo .txt");
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      toast.error("Arquivo TXT muito grande. Máximo 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setMediaFiles(prev => prev.map((media, idx) => 
        idx === currentIndex 
          ? { ...media, prompt: content.trim(), txtFileName: file.name }
          : media
      ));
      toast.success(`Prompt carregado de "${file.name}"`);
    };
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo");
    };
    reader.readAsText(file, 'UTF-8');
    
    // Reset input
    e.target.value = '';
  };

  const clearTxtFile = () => {
    setMediaFiles(prev => prev.map((media, idx) => 
      idx === currentIndex 
        ? { ...media, txtFileName: undefined }
        : media
    ));
  };

  const allFieldsFilled = mediaFiles.every(media => 
    media.title && media.prompt && media.category
  );

  const handleSubmitAll = async () => {
    // Validate all media items with zod
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
        // Upload media to Cloudinary
        const uploadResult = await uploadToStorage(media.file, 'prompts-cloudinary');
        
        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || 'Failed to upload media');
        }

        const publicUrl = uploadResult.url;

        // Upload reference images if it's a video
        let referenceImageUrls: string[] = [];
        let thumbnailUrl: string | null = null;
        
        if (media.isVideo) {
          // Generate thumbnail from first frame
          thumbnailUrl = await generateAndUploadThumbnail(media.file, 'prompts-cloudinary');
          if (thumbnailUrl) {
            console.log('Thumbnail generated:', thumbnailUrl);
          } else {
            console.warn('Failed to generate thumbnail for video');
          }
          
          // Upload reference images
          if (media.referenceImages.length > 0) {
            for (const refImg of media.referenceImages) {
              const refUploadResult = await uploadToStorage(refImg.file, 'prompts-cloudinary/references');
              
              if (!refUploadResult.success || !refUploadResult.url) {
                throw new Error(refUploadResult.error || 'Failed to upload reference image');
              }

              referenceImageUrls.push(refUploadResult.url);
            }
          }
        }

        // Insert into database
        const { error: insertError } = await supabase
          .from('admin_prompts')
          .insert({
            title: media.title,
            prompt: media.prompt,
            category: media.category,
            image_url: publicUrl,
            is_premium: media.isPremium,
            reference_images: referenceImageUrls.length > 0 ? referenceImageUrls : null,
            tutorial_url: media.hasTutorial && media.tutorialUrl ? media.tutorialUrl : null,
            thumbnail_url: thumbnailUrl,
          });

        if (insertError) throw insertError;
      }

      setMediaFiles([]);
      setShowModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error submitting admin prompts:", error);
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
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="p-8 shadow-hover">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Upload de Arquivos Exclusivos
            </h1>
            <p className="text-muted-foreground text-lg">
              Envio de administrador - Arquivos com tag exclusiva
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
              accept="image/*,video/*,.txt,text/plain"
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
                  <div 
                    key={idx} 
                    className="relative group cursor-pointer"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowModal(true);
                    }}
                  >
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
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMedia(idx);
                      }}
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
                onClick={() => {
                  // Find first pending item, or default to first
                  const pendingIdx = mediaFiles.findIndex(m => !m.title || !m.prompt || !m.category);
                  setCurrentIndex(pendingIdx >= 0 ? pendingIdx : 0);
                  setShowModal(true);
                }}
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

          {currentMedia ? (
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
                  <Star className={`h-5 w-5 ${currentMedia.isPremium ? 'text-yellow-500' : 'text-muted-foreground'}`} fill={currentMedia.isPremium ? 'currentColor' : 'none'} />
                  <Label htmlFor="isPremium" className="font-medium">
                    {currentMedia.isPremium ? 'Conteúdo Premium' : 'Conteúdo Gratuito'}
                  </Label>
                </div>
                <Switch
                  id="isPremium"
                  checked={currentMedia.isPremium}
                  onCheckedChange={(checked) => updateMediaData('isPremium', checked)}
                />
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
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
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
                <Label className="text-muted-foreground text-sm">Carregar Prompt de Arquivo TXT (opcional)</Label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="file"
                    id="txtFile"
                    accept=".txt,text/plain"
                    onChange={handleTxtUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="txtFile"
                    className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors flex-1"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate">
                      {currentMedia.txtFileName || "Selecionar arquivo .txt"}
                    </span>
                  </label>
                  {currentMedia.txtFileName && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={clearTxtFile}
                      className="h-9 w-9"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  value={currentMedia.prompt}
                  onChange={(e) => updateMediaData('prompt', e.target.value)}
                  placeholder="Cole ou escreva seu prompt aqui..."
                  className="mt-2 min-h-32"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  variant="outline"
                  className="flex-1"
                >
                  Anterior
                </Button>
                <Button
                  onClick={goToNext}
                  disabled={currentIndex === mediaFiles.length - 1}
                  variant="outline"
                  className="flex-1"
                >
                  Próximo
                </Button>
              </div>

              {allFieldsFilled && (
                <Button
                  onClick={handleSubmitAll}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-primary hover:opacity-90 text-lg py-6"
                >
                  {isSubmitting ? "Enviando..." : "Upload de Todos"}
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">Nenhum item selecionado ou índice inválido.</p>
              <div className="flex gap-2 justify-center">
                {mediaFiles.length > 0 && (
                  <Button onClick={() => setCurrentIndex(0)} variant="outline">
                    Ir para o primeiro item
                  </Button>
                )}
                <Button onClick={() => setShowModal(false)} variant="secondary">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Envio Concluído!</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Selos exclusivos enviados com sucesso! Deseja enviar mais?
          </p>
          <div className="flex gap-4 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowSuccessModal(false);
                navigate("/biblioteca-prompts");
              }}
            >
              Não, ir para Biblioteca
            </Button>
            <Button
              className="flex-1 bg-gradient-primary hover:opacity-90"
              onClick={() => setShowSuccessModal(false)}
            >
              Sim, enviar mais
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUpload;
