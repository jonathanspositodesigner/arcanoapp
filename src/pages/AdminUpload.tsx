import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, ArrowLeft, X, Star, ImagePlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
}

const AdminUpload = () => {
  const navigate = useNavigate();
  const [mediaFiles, setMediaFiles] = useState<MediaData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const processFiles = (files: File[]) => {
    const newMedia: MediaData[] = [];
    
    files.forEach(file => {
      const isVideo = file.type.startsWith('video/');
      const reader = new FileReader();
      reader.onloadend = () => {
        newMedia.push({
          file,
          preview: reader.result as string,
          title: "",
          prompt: "",
          category: "",
          isVideo,
          isPremium: false,
          referenceImages: []
        });
        
        if (newMedia.length === files.length) {
          setMediaFiles(prev => [...prev, ...newMedia]);
          setShowModal(true);
          setCurrentIndex(0);
        }
      };
      reader.readAsDataURL(file);
    });
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

  const handleSubmitAll = async () => {
    if (!allFieldsFilled) {
      toast.error("Preencha todos os campos antes de enviar");
      return;
    }

    setIsSubmitting(true);

    try {
      for (const media of mediaFiles) {
        // Upload media to storage
        const fileExt = media.file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('admin-prompts')
          .upload(filePath, media.file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('admin-prompts')
          .getPublicUrl(filePath);

        // Upload reference images if it's a video
        let referenceImageUrls: string[] = [];
        if (media.isVideo && media.referenceImages.length > 0) {
          for (const refImg of media.referenceImages) {
            const refExt = refImg.file.name.split('.').pop();
            const refFileName = `ref_${Math.random().toString(36).substring(2)}.${refExt}`;
            
            const { error: refUploadError } = await supabase.storage
              .from('admin-prompts')
              .upload(refFileName, refImg.file);

            if (refUploadError) throw refUploadError;

            const { data: { publicUrl: refPublicUrl } } = supabase.storage
              .from('admin-prompts')
              .getPublicUrl(refFileName);

            referenceImageUrls.push(refPublicUrl);
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
              Upload de Selos Exclusivos
            </h1>
            <p className="text-muted-foreground text-lg">
              Envio de administrador - Selos com tag exclusiva
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Informações {currentIndex + 1} de {mediaFiles.length}
            </DialogTitle>
          </DialogHeader>

          {currentMedia && (
            <div className="space-y-6">
              <div className="flex justify-center">
                {currentMedia.isVideo ? (
                  <video
                    src={currentMedia.preview}
                    className="max-h-64 object-contain rounded-lg"
                    controls
                    muted
                    autoPlay
                    loop
                  />
                ) : (
                  <img
                    src={currentMedia.preview}
                    alt="Preview"
                    className="max-h-64 object-contain rounded-lg"
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
                    <SelectItem value="Selos 3D">Selos 3D</SelectItem>
                    <SelectItem value="Fotos">Fotos</SelectItem>
                    <SelectItem value="Cenários">Cenários</SelectItem>
                    <SelectItem value="Movies para Telão">Movies para Telão</SelectItem>
                    <SelectItem value="Controles de Câmera">Controles de Câmera</SelectItem>
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
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  value={currentMedia.prompt}
                  onChange={(e) => updateMediaData('prompt', e.target.value)}
                  placeholder="Cole ou escreva seu prompt aqui..."
                  className="mt-2 min-h-32"
                />
              </div>

              <div className="flex gap-4">
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
