import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Upload, X, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { uploadToStorage } from "@/hooks/useStorageUpload";
import { optimizeImage, isImageFile, formatBytes } from "@/hooks/useImageOptimizer";
import { linkArteToFlyerLibrary } from "@/lib/flyerLibrarySync";

interface MediaData {
  file: File;
  preview: string;
  title: string;
  category: string;
  flyerSubcategory: string;
  pack: string;
  description: string;
  canvaLink: string;
  driveLink: string;
  isVideo: boolean;
}

interface Pack {
  id: string;
  name: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

interface Category {
  id: string;
  name: string;
}

interface FlyerSubcategory {
  id: string;
  name: string;
  slug: string;
}

const PartnerUploadArtes = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [flyerSubcategories, setFlyerSubcategories] = useState<FlyerSubcategory[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);

  useEffect(() => {
    checkPartnerAccess();
    fetchCategories();
    fetchFlyerSubcategories();
    fetchPacks();
  }, []);

  const fetchFlyerSubcategories = async () => {
    const { data } = await supabase
      .from('ai_tool_library_categories')
      .select('id, name, slug')
      .eq('tool_slug', 'flyer_maker')
      .order('display_order', { ascending: true });
    setFlyerSubcategories(data || []);
  };

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

  const checkPartnerAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/parceiro-login-artes");
        return;
      }

      // Get partner info from partners_artes
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners_artes')
        .select('id, is_active')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (partnerError || !partnerData || !partnerData.is_active) {
        toast.error("Acesso negado");
        navigate("/parceiro-login-artes");
        return;
      }

      setPartnerId(partnerData.id);
    } catch (error) {
      console.error("Error checking partner access:", error);
      navigate("/parceiro-login-artes");
    } finally {
      setIsLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `Arquivo ${file.name} excede o limite de 100MB`;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return `Tipo de arquivo não suportado: ${file.type}`;
    }
    return null;
  };

  const processFiles = async (files: FileList | null) => {
    if (!files) return;

    const newMediaFiles: MediaData[] = [];

    for (const file of Array.from(files)) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        continue;
      }

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
      
      newMediaFiles.push({
        file: processedFile,
        preview: URL.createObjectURL(processedFile),
        title: "",
        category: "",
        flyerSubcategory: "",
        pack: "",
        description: "",
        canvaLink: "",
        driveLink: "",
        isVideo,
      });
    }

    if (newMediaFiles.length > 0) {
      toast.success(`${newMediaFiles.length} arquivo(s) otimizado(s) e adicionado(s)`);
      setMediaFiles((prev) => [...prev, ...newMediaFiles]);
      setCurrentIndex(mediaFiles.length);
      setShowModal(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    processFiles(e.dataTransfer.files);
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (currentIndex >= newFiles.length && currentIndex > 0) {
        setCurrentIndex(newFiles.length - 1);
      }
      if (newFiles.length === 0) {
        setShowModal(false);
      }
      return newFiles;
    });
  };

  const updateMediaData = (index: number, field: keyof MediaData, value: string) => {
    setMediaFiles((prev) =>
      prev.map((media, i) => (i === index ? { ...media, [field]: value } : media))
    );
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

  const allFieldsFilled = mediaFiles.every(
    (media) => media.title.trim() && media.category && media.pack && media.canvaLink.trim()
  );

  const formatTitle = (title: string) => {
    return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
  };

  const handleSubmitAll = async () => {
    if (!partnerId || !allFieldsFilled) return;

    setIsSubmitting(true);

    try {
      for (const media of mediaFiles) {
        // Upload image to Cloudinary
        const uploadResult = await uploadToStorage(media.file, 'artes-cloudinary');
        
        if (!uploadResult.success || !uploadResult.url) {
          toast.error(`Erro ao fazer upload: ${media.title}`);
          continue;
        }

        const publicUrl = uploadResult.url;

        // Insert record in partner_artes
        const { error: insertError } = await supabase
          .from('partner_artes')
          .insert({
            partner_id: partnerId,
            title: formatTitle(media.title),
            category: media.category,
            pack: media.pack,
            description: media.description || null,
            image_url: publicUrl,
            is_premium: true,
            approved: false,
            canva_link: media.canvaLink || null,
            drive_link: media.driveLink || null,
          });

        if (insertError) {
          toast.error(`Erro ao salvar: ${media.title}`);
          console.error("Insert error:", insertError);
        }
      }

      setShowModal(false);
      setMediaFiles([]);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Erro ao enviar arquivos");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center">
        <div className="text-foreground">Carregando...</div>
      </div>
    );
  }

  const currentMedia = mediaFiles[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] p-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground mb-6"
          onClick={() => navigate("/parceiro-dashboard-artes")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>

        <Card className="bg-card/80 border-border/30">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold text-foreground mb-6 text-center">
              Enviar Novas Artes
            </h1>

            {/* Upload Area */}
            <div
              className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center cursor-pointer hover:border-border transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-[#2d4a5e] mb-4" />
              <p className="text-foreground font-medium mb-2">
                Arraste imagens ou vídeos aqui ou clique para selecionar
              </p>
              <p className="text-muted-foreground text-sm">
                PNG, JPG, GIF, WebP, MP4, WebM (máximo 100MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Preview of selected files */}
            {mediaFiles.length > 0 && !showModal && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-muted-foreground text-sm">
                    {mediaFiles.length} arquivo(s) selecionado(s)
                  </span>
                  <Button
                    variant="outline"
                    className="border-border/50 text-muted-foreground"
                    onClick={() => setShowModal(true)}
                  >
                    Editar detalhes
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {mediaFiles.map((media, index) => (
                    <div key={index} className="relative aspect-square">
                      {media.isVideo ? (
                        <video
                          src={media.preview}
                          className="w-full h-full object-cover rounded-lg"
                          muted
                          loop
                          autoPlay
                          playsInline
                        />
                      ) : (
                        <img
                          src={media.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )}
                      <button
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                        onClick={() => removeMedia(index)}
                      >
                        <X className="h-3 w-3 text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border/30 text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes da Arte ({currentIndex + 1}/{mediaFiles.length})
            </DialogTitle>
          </DialogHeader>

          {currentMedia && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="aspect-video relative rounded-lg overflow-hidden bg-black">
                {currentMedia.isVideo ? (
                  <video
                    src={currentMedia.preview}
                    className="w-full h-full object-contain"
                    muted
                    loop
                    autoPlay
                    playsInline
                    controls
                  />
                ) : (
                  <img
                    src={currentMedia.preview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Form Fields */}
              <div>
                <label className="text-sm text-muted-foreground">Título *</label>
                <Input
                  value={currentMedia.title}
                  onChange={(e) => updateMediaData(currentIndex, "title", e.target.value)}
                  placeholder="Nome da arte"
                  className="bg-card border-border/50 text-foreground"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Categoria *</label>
                <Select
                  value={currentMedia.category}
                  onValueChange={(value) => updateMediaData(currentIndex, "category", value)}
                >
                  <SelectTrigger className="bg-card border-border/50 text-foreground">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50 z-50">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name} className="text-foreground">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Pack <span className="text-red-500">*</span></label>
                <Select
                  value={currentMedia.pack}
                  onValueChange={(value) => updateMediaData(currentIndex, "pack", value)}
                >
                  <SelectTrigger className="bg-card border-border/50 text-foreground">
                    <SelectValue placeholder="Selecione o pack" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50 z-50">
                    {packs.map((pack) => (
                      <SelectItem key={pack.id} value={pack.name} className="text-foreground">
                        {pack.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Descrição</label>
                <Textarea
                  value={currentMedia.description}
                  onChange={(e) => updateMediaData(currentIndex, "description", e.target.value)}
                  placeholder="Descrição opcional da arte"
                  className="bg-card border-border/50 text-foreground min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Link Canva <span className="text-red-500">*</span></label>
                <Input
                  value={currentMedia.canvaLink}
                  onChange={(e) => updateMediaData(currentIndex, "canvaLink", e.target.value)}
                  placeholder="https://www.canva.com/..."
                  className="bg-card border-border/50 text-foreground"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Link Drive (opcional)</label>
                <Input
                  value={currentMedia.driveLink}
                  onChange={(e) => updateMediaData(currentIndex, "driveLink", e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="bg-card border-border/50 text-foreground"
                />
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  className="border-border/50 text-muted-foreground"
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>

                {currentIndex < mediaFiles.length - 1 ? (
                  <Button
                    className="bg-primary hover:bg-primary/80 text-foreground"
                    onClick={goToNext}
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    className="bg-primary hover:bg-primary/80 text-foreground"
                    onClick={handleSubmitAll}
                    disabled={!allFieldsFilled || isSubmitting}
                  >
                    {isSubmitting ? "Enviando..." : "Enviar Todos"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="bg-card border-border/30 text-foreground">
          <div className="text-center py-6">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Artes Enviadas!</h2>
            <p className="text-muted-foreground mb-6">
              Suas artes foram enviadas e estão aguardando aprovação.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-border/50 text-muted-foreground"
                onClick={() => {
                  setShowSuccessModal(false);
                }}
              >
                Enviar mais
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/80 text-foreground"
                onClick={() => navigate("/parceiro-dashboard-artes")}
              >
                Ver Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerUploadArtes;
