import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, ArrowLeft, X, CheckCircle, ImagePlus, Video, FileText, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { uploadToStorage } from "@/hooks/useStorageUpload";
import { optimizeImage, isImageFile, formatBytes } from "@/hooks/useImageOptimizer";
import { ensureBrowserCompatibleImage, isHeicFile } from "@/lib/heicConverter";
import { fetchFotosSubcategories, type IALibraryCategory } from "@/lib/iaLibrarySync";

const promptSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório").max(200, "Título deve ter no máximo 200 caracteres"),
  prompt: z.string().trim().min(1, "Prompt é obrigatório").max(10000, "Prompt deve ter no máximo 10.000 caracteres"),
  category: z.string().min(1, "Selecione uma categoria válida"),
});

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return `Arquivo muito grande. Máximo 100MB.`;
  }
  const isHeicByName = /\.(heic|heif)$/i.test(file.name);
  const isAllowed =
    ALLOWED_IMAGE_TYPES.includes(file.type) ||
    ALLOWED_VIDEO_TYPES.includes(file.type) ||
    isHeicByName;
  if (!isAllowed) {
    return `Tipo de arquivo não permitido. Use JPEG, PNG, HEIC, WebP, MP4, WebM ou MOV.`;
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
  txtFileName?: string;
  gender: string | null;
  tags: string[];
  subcategorySlug: string | null;
  isFree: boolean;
}

const PartnerUpload = () => {
  const navigate = useNavigate();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<{ current: number; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [subcategories, setSubcategories] = useState<IALibraryCategory[]>([]);

  useEffect(() => {
    checkPartnerAccess();
    fetchCategories();
    fetchFotosSubcategories().then(setSubcategories);
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('prompts_categories')
      .select('id, name, is_admin_only')
      .eq('is_admin_only', false)
      .order('display_order', { ascending: true });
    if (data) setCategories(data);
  };

  // Safeguard: keep currentIndex within valid bounds
  useEffect(() => {
    if (mediaFiles.length === 0) {
      setShowModal(false);
      setCurrentIndex(0);
    } else if (currentIndex >= mediaFiles.length) {
      setCurrentIndex(mediaFiles.length - 1);
    }
  }, [mediaFiles.length, currentIndex]);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        referenceImages: [],
        hasTutorial: false,
        tutorialUrl: "",
        txtFileName,
        gender: null,
        tags: [],
        subcategorySlug: null,
        isFree: false,
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

  const updateMediaData = (field: keyof MediaData, value: string | boolean | null) => {
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

    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
      toast.error("Por favor, selecione um arquivo .txt");
      return;
    }

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
    setSubmitProgress({ current: 0, total: mediaFiles.length });

    // Helper: tenta uploadToStorage até `attempts` vezes (resiliente a falhas de rede)
    const uploadWithRetry = async (
      file: File,
      folder: string,
      attempts = 3,
    ): Promise<{ url: string }> => {
      let lastErr = '';
      for (let i = 0; i < attempts; i++) {
        try {
          const r = await uploadToStorage(file, folder);
          if (r.success && r.url) return { url: r.url };
          lastErr = r.error || 'Falha no upload';
        } catch (e) {
          lastErr = e instanceof Error ? e.message : 'Falha no upload';
        }
        // Backoff: 800ms, 1600ms
        if (i < attempts - 1) await new Promise(r => setTimeout(r, 800 * (i + 1)));
      }
      throw new Error(lastErr || 'Falha no upload após várias tentativas');
    };

    // Helper: prepara o arquivo (HEIC -> JPEG; otimiza imagem grande)
    const prepareFile = async (file: File, isVideo: boolean): Promise<File> => {
      if (isVideo) return file;
      let prepared = file;
      if (isHeicFile(prepared)) {
        prepared = await ensureBrowserCompatibleImage(prepared);
      }
      // Otimiza apenas se for imagem grande (>2MB) — não-bloqueante: se falhar, segue com o original
      if (prepared.size > 2 * 1024 * 1024) {
        try {
          const r = await optimizeImage(prepared, { maxWidth: 2048, quality: 0.85, format: 'webp' });
          if (r?.file) prepared = r.file;
        } catch (e) {
          console.warn('[PartnerUpload] otimização falhou, usando original', e);
        }
      }
      return prepared;
    };

    const failures: { title: string; reason: string }[] = [];
    const successes: number[] = []; // índices que entraram com sucesso

    for (let i = 0; i < mediaFiles.length; i++) {
      const media = mediaFiles[i];
      setSubmitProgress({ current: i + 1, total: mediaFiles.length });
      const label = media.title || `item ${i + 1}`;
      try {
        const preparedMain = await prepareFile(media.file, media.isVideo);
        const mainUpload = await uploadWithRetry(preparedMain, 'prompts-cloudinary');

        const referenceImageUrls: string[] = [];
        if (media.isVideo && media.referenceImages.length > 0) {
          for (const refImg of media.referenceImages) {
            const preparedRef = await prepareFile(refImg.file, false);
            const refUp = await uploadWithRetry(preparedRef, 'prompts-cloudinary/references');
            referenceImageUrls.push(refUp.url);
          }
        }

        const { error: insertError } = await supabase
          .from('partner_prompts')
          .insert({
            partner_id: partnerId,
            title: formatTitle(media.title),
            prompt: media.prompt,
            category: media.category,
            image_url: mainUpload.url,
            reference_images: referenceImageUrls.length > 0 ? referenceImageUrls : null,
            tutorial_url: media.hasTutorial && media.tutorialUrl ? media.tutorialUrl : null,
            approved: false,
            is_premium: !media.isFree,
            gender: media.category === 'Fotos' ? media.gender : null,
            tags: media.category === 'Fotos' && media.tags.length > 0 ? media.tags : null,
            subcategory_slug: media.category === 'Fotos' ? media.subcategorySlug : null,
          });

        if (insertError) throw new Error(insertError.message);
        successes.push(i);
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error(`[PartnerUpload] falha em "${label}":`, err);
        failures.push({ title: label, reason });
      }
    }

    setSubmitProgress(null);
    setIsSubmitting(false);

    if (failures.length === 0) {
      // Tudo certo
      setMediaFiles([]);
      setShowModal(false);
      setShowSuccessModal(true);
      return;
    }

    // Houve falhas: remove só os que enviaram com sucesso, mantém os que falharam para reenviar
    const remaining = mediaFiles.filter((_, idx) => !successes.includes(idx));
    setMediaFiles(remaining);
    setCurrentIndex(0);

    if (successes.length > 0) {
      toast.success(`${successes.length} de ${mediaFiles.length} prompts enviados com sucesso.`);
    }

    // Mostra cada falha em uma toast separada com motivo real
    failures.slice(0, 5).forEach(f => {
      toast.error(`Falhou "${f.title}": ${f.reason}`, { duration: 8000 });
    });
    if (failures.length > 5) {
      toast.error(`+${failures.length - 5} outros prompts falharam. Tente reenviar.`);
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
                    } text-foreground px-2 py-1 rounded`}>
                      {media.title && media.prompt && media.category ? 'Completo' : 'Pendente'}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => {
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

              {/* Gender + Subcategoria - only shows when category is 'Fotos' */}
              {currentMedia.category === 'Fotos' && (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👤</span>
                      <Label className="font-medium">Gênero da Foto</Label>
                    </div>
                    <Select
                      value={currentMedia.gender || ''}
                      onValueChange={(value) => updateMediaData('gender', value || null)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🗂️</span>
                      <div>
                        <Label className="font-medium">Subcategoria</Label>
                        <p className="text-xs text-muted-foreground">Aplicada em Cloner, Veste AI e Pose Maker</p>
                      </div>
                    </div>
                    <Select
                      value={currentMedia.subcategorySlug || ''}
                      onValueChange={(value) => updateMediaData('subcategorySlug', value || null)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategories.map((sc) => (
                          <SelectItem key={sc.id} value={sc.slug}>{sc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tags field for 'Fotos' category */}
                  <div className="space-y-2">
                    <Label className="font-medium">Tags de Busca (até 10)</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {currentMedia.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              setMediaFiles(prev => prev.map((media, i) =>
                                i === currentIndex
                                  ? { ...media, tags: media.tags.filter((_, tagIdx) => tagIdx !== idx) }
                                  : media
                              ));
                            }}
                            className="ml-1 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    {currentMedia.tags.length < 10 && (
                      <Input
                        placeholder="Digite uma tag e pressione Enter"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = e.currentTarget.value.trim().substring(0, 30);
                            if (value && !currentMedia.tags.includes(value)) {
                              setMediaFiles(prev => prev.map((media, i) =>
                                i === currentIndex
                                  ? { ...media, tags: [...media.tags, value] }
                                  : media
                              ));
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      {currentMedia.tags.length}/10 tags • Use palavras como: formal, cantor, estúdio, etc.
                    </p>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/50">
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className={`h-5 w-5 ${!currentMedia.isFree ? 'text-purple-400' : 'text-muted-foreground'}`} />
                    <Label htmlFor="isFree" className="font-medium">
                      {currentMedia.isFree ? 'Prompt Gratuito' : 'Prompt Premium'}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-7">
                    {currentMedia.isFree 
                      ? 'Gratuito para todos. Você ganha apenas por usos em ferramentas de IA.' 
                      : 'Premium: você ganha por cada liberação do prompt.'}
                  </p>
                </div>
                <Switch
                  id="isFree"
                  checked={!currentMedia.isFree}
                  onCheckedChange={(checked) => updateMediaData('isFree', !checked)}
                />
              </div>

              <div className="p-3 rounded-lg border border-border/50 bg-muted/30 text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground text-sm">💰 Como você ganha:</p>
                <div className="flex items-start gap-2">
                  <Zap className="h-3.5 w-3.5 text-purple-400 mt-0.5 shrink-0" />
                  <p><span className="font-medium text-foreground">Premium:</span> Você recebe por cada clique de liberação do prompt <span className="font-medium">+</span> por cada uso como referência nas ferramentas de IA.</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  <p><span className="font-medium text-foreground">Gratuito:</span> Você recebe apenas por cada uso como referência nas ferramentas de IA.</p>
                </div>
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
                  {isSubmitting ? "Enviando..." : "Enviar Todos"}
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
