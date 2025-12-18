import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, ArrowLeft, X, Star, Video, Megaphone, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { AnnouncementConfigModal } from "@/components/AnnouncementConfigModal";
import { AnnouncementPreviewModal } from "@/components/AnnouncementPreviewModal";
import { uploadToCloudinary } from "@/hooks/useCloudinaryUpload";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return `Arquivo "${file.name}" muito grande. Máximo 100MB.`;
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return `Tipo de arquivo "${file.name}" não permitido.`;
  }
  return null;
};

interface Pack {
  id: string;
  name: string;
}

interface MediaData {
  file: File;
  preview: string;
  title: string;
  description: string;
  category: string;
  pack: string;
  isVideo: boolean;
  isPremium: boolean;
  hasTutorial: boolean;
  tutorialUrl: string;
  downloadFile: File | null;
  downloadPreview: string;
  canvaLink: string;
  driveLink: string;
}

interface Category {
  id: string;
  name: string;
}

const AdminUploadArtes = () => {
  const navigate = useNavigate();
  const [mediaFiles, setMediaFiles] = useState<MediaData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  
  // Announcement state
  const [showAnnouncementConfig, setShowAnnouncementConfig] = useState(false);
  const [selectedPushTemplate, setSelectedPushTemplate] = useState<{
    id: string;
    name: string;
    title: string;
    body: string;
    url: string | null;
  } | null>(null);
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
  const [showAnnouncementPreview, setShowAnnouncementPreview] = useState(false);

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

  const handleOpenAnnouncementPreview = () => {
    if (!selectedPushTemplate) {
      toast.error("Configure o modelo de Push primeiro");
      setShowAnnouncementConfig(true);
      return;
    }
    setShowAnnouncementPreview(true);
  };

  const handleConfirmSendAnnouncement = async () => {
    if (!selectedPushTemplate) return;

    setIsSendingAnnouncement(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-announcement', {
        body: {
          push_title: selectedPushTemplate.title,
          push_body: selectedPushTemplate.body,
          push_url: selectedPushTemplate.url || "/biblioteca-artes",
        },
      });

      if (error) throw error;

      setShowAnnouncementPreview(false);
      toast.success(`Push enviado para ${data.push?.sent || 0} usuários!`);
    } catch (error) {
      console.error("Error sending announcement:", error);
      toast.error("Erro ao enviar push notification");
    } finally {
      setIsSendingAnnouncement(false);
    }
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
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'));
    if (files.length === 0) {
      toast.error("Por favor, envie apenas imagens ou vídeos");
      return;
    }
    processFiles(files);
  };
  const processFiles = (files: File[]) => {
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
    validFiles.forEach(file => {
      const isVideo = file.type.startsWith('video/');
      const reader = new FileReader();
      reader.onloadend = () => {
        newMedia.push({
          file,
          preview: reader.result as string,
          title: "",
          description: "",
          category: "",
          pack: "",
          isVideo,
          isPremium: false,
          hasTutorial: false,
          tutorialUrl: "",
          downloadFile: null,
          downloadPreview: "",
          canvaLink: "",
          driveLink: ""
        });
        if (newMedia.length === validFiles.length) {
          setMediaFiles(prev => [...prev, ...newMedia]);
          setShowModal(true);
          setCurrentIndex(0);
        }
      };
      reader.readAsDataURL(file);
    });
  };
  const handleDownloadFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaFiles(prev => prev.map((media, idx) => idx === currentIndex ? {
        ...media,
        downloadFile: file,
        downloadPreview: reader.result as string
      } : media));
    };
    reader.readAsDataURL(file);
  };
  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };
  const updateMediaData = (field: keyof MediaData, value: string | boolean | File | null) => {
    setMediaFiles(prev => prev.map((media, idx) => idx === currentIndex ? {
      ...media,
      [field]: value
    } : media));
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
  const isCurrentItemComplete = (media: MediaData) => media.title && media.category && media.pack && media.canvaLink && media.driveLink;
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
    if (!media.pack) {
      toast.error("Pack é obrigatório");
      return;
    }
    if (!media.canvaLink.trim()) {
      toast.error("Link Canva é obrigatório");
      return;
    }
    if (!media.driveLink.trim()) {
      toast.error("Link Drive é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload preview image/video to Cloudinary
      const uploadResult = await uploadToCloudinary(media.file, 'admin-artes');
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Failed to upload media');
      }
      
      const publicUrl = uploadResult.url;

      // Upload download file if exists
      let downloadUrl = null;
      if (media.downloadFile) {
        const dlUploadResult = await uploadToCloudinary(media.downloadFile, 'admin-artes/downloads');
        
        if (!dlUploadResult.success || !dlUploadResult.url) {
          throw new Error(dlUploadResult.error || 'Failed to upload download file');
        }
        
        downloadUrl = dlUploadResult.url;
      }

      // Insert into database
      const { error: insertError } = await supabase.from('admin_artes').insert({
        title: media.title.charAt(0).toUpperCase() + media.title.slice(1).toLowerCase(),
        description: media.description || null,
        category: media.category,
        pack: media.pack,
        image_url: publicUrl,
        download_url: downloadUrl,
        is_premium: media.isPremium,
        tutorial_url: media.hasTutorial && media.tutorialUrl ? media.tutorialUrl : null,
        canva_link: media.canvaLink || null,
        drive_link: media.driveLink || null
      });
      if (insertError) throw insertError;

      // Remove saved item from list
      setMediaFiles(prev => prev.filter((_, idx) => idx !== currentIndex));
      setShowModal(false);
      toast.success(`"${media.title}" enviado com sucesso!`);
      
      // If was last item, show success modal
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
      if (!media.pack) {
        toast.error(`Pack é obrigatório para "${media.title}"`);
        return;
      }
      if (!media.canvaLink.trim()) {
        toast.error(`Link Canva é obrigatório para "${media.title}"`);
        return;
      }
      if (!media.driveLink.trim()) {
        toast.error(`Link Drive é obrigatório para "${media.title}"`);
        return;
      }
    }
    setIsSubmitting(true);
    try {
      for (const media of mediaFiles) {
        // Upload preview image/video to Cloudinary
        const uploadResult = await uploadToCloudinary(media.file, 'admin-artes');
        
        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || 'Failed to upload media');
        }
        
        const publicUrl = uploadResult.url;

        // Upload download file if exists
        let downloadUrl = null;
        if (media.downloadFile) {
          const dlUploadResult = await uploadToCloudinary(media.downloadFile, 'admin-artes/downloads');
          
          if (!dlUploadResult.success || !dlUploadResult.url) {
            throw new Error(dlUploadResult.error || 'Failed to upload download file');
          }
          
          downloadUrl = dlUploadResult.url;
        }

        // Insert into database
        const {
          error: insertError
        } = await supabase.from('admin_artes').insert({
          title: media.title.charAt(0).toUpperCase() + media.title.slice(1).toLowerCase(),
          description: media.description || null,
          category: media.category,
          pack: media.pack,
          image_url: publicUrl,
          download_url: downloadUrl,
          is_premium: media.isPremium,
          tutorial_url: media.hasTutorial && media.tutorialUrl ? media.tutorialUrl : null,
          canva_link: media.canvaLink || null,
          drive_link: media.driveLink || null
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
  return <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate("/admin-artes-eventos/ferramentas")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="p-8 shadow-hover">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  Upload de Artes Exclusivas
                </h1>
                <p className="text-muted-foreground text-lg">
                  Envio de administrador - Artes para eventos
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleOpenAnnouncementPreview}
                  disabled={isSendingAnnouncement}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <Megaphone className="h-4 w-4 mr-2" />
                  Anunciar Atualizações
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowAnnouncementConfig(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div onDragOver={handleDragOver} onDrop={handleDrop} className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer">
            <input id="media" type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" />
            <label htmlFor="media" className="cursor-pointer">
              <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-foreground mb-2">
                Arraste imagens ou vídeos aqui ou clique para selecionar
              </p>
              <p className="text-sm text-muted-foreground">
                Você pode enviar vários arquivos de uma vez
              </p>
              <p className="text-xs text-amber-600 mt-2 font-medium">
                Tamanho recomendado: 1080x1350 pixels
              </p>
            </label>
          </div>

          {mediaFiles.length > 0 && <div className="mt-8">
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
                      <video src={media.preview} className="w-full h-32 object-cover rounded-lg hover:ring-2 hover:ring-primary transition-all" muted loop autoPlay playsInline />
                    ) : (
                      <img src={media.preview} alt={`Preview ${idx + 1}`} className="w-full h-32 object-cover rounded-lg hover:ring-2 hover:ring-primary transition-all" />
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
                    <div className={`absolute bottom-2 left-2 right-2 text-xs ${isCurrentItemComplete(media) ? 'bg-green-500' : 'bg-yellow-500'} text-white px-2 py-1 rounded text-center`}>
                      {isCurrentItemComplete(media) ? 'Completo' : 'Pendente'}
                    </div>
                  </div>
                ))}
              </div>
              {allFieldsFilled && (
                <Button onClick={handleSubmitAll} className="w-full mt-6 bg-gradient-primary hover:opacity-90" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Enviar Todos"}
                </Button>
              )}
            </div>}
        </Card>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Informações {currentIndex + 1} de {mediaFiles.length}
            </DialogTitle>
          </DialogHeader>

          {currentMedia && <div className="space-y-4">
              <div className="flex justify-center">
                {currentMedia.isVideo ? <video src={currentMedia.preview} className="max-h-40 object-contain rounded-lg" controls muted autoPlay loop /> : <img src={currentMedia.preview} alt="Preview" className="max-h-40 object-contain rounded-lg" />}
              </div>

              <div>
                <Label htmlFor="title">Título</Label>
                <Input id="title" value={currentMedia.title} onChange={e => updateMediaData('title', e.target.value)} placeholder="Ex: Convite de Aniversário Elegante" className="mt-1" />
              </div>

              <div>
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea id="description" value={currentMedia.description} onChange={e => updateMediaData('description', e.target.value)} placeholder="Descrição da arte..." className="mt-1 min-h-[60px]" />
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={currentMedia.category} onValueChange={value => {
                  if (value === '__new__') {
                    const newCat = prompt('Nome da nova categoria:');
                    if (newCat && newCat.trim()) {
                      const formattedCat = newCat.trim();
                      supabase.from('artes_categories').insert({ name: formattedCat, slug: formattedCat.toLowerCase().replace(/\s+/g, '-') })
                        .then(() => {
                          fetchCategories();
                          updateMediaData('category', formattedCat);
                          toast.success('Categoria criada!');
                        });
                    }
                  } else {
                    updateMediaData('category', value);
                  }
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                    <SelectItem value="__new__" className="text-primary font-medium">+ Adicionar nova categoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="pack">Pack <span className="text-destructive">*</span></Label>
                <Select value={currentMedia.pack} onValueChange={value => updateMediaData('pack', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o pack" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {packs.map(pack => (
                      <SelectItem key={pack.id} value={pack.name}>{pack.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/50">
                <div className="flex items-center gap-2">
                  <Star className={`h-4 w-4 ${currentMedia.isPremium ? 'text-yellow-500' : 'text-muted-foreground'}`} fill={currentMedia.isPremium ? 'currentColor' : 'none'} />
                  <Label htmlFor="isPremium" className="font-medium text-sm">
                    {currentMedia.isPremium ? 'Premium' : 'Gratuito'}
                  </Label>
                </div>
                <Switch id="isPremium" checked={currentMedia.isPremium} onCheckedChange={checked => updateMediaData('isPremium', checked)} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/50">
                <div className="flex items-center gap-2">
                  <Video className={`h-4 w-4 ${currentMedia.hasTutorial ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Label htmlFor="hasTutorial" className="font-medium text-sm">
                    {currentMedia.hasTutorial ? 'Com Tutorial' : 'Sem Tutorial'}
                  </Label>
                </div>
                <Switch id="hasTutorial" checked={currentMedia.hasTutorial} onCheckedChange={checked => updateMediaData('hasTutorial', checked)} />
              </div>

              {currentMedia.hasTutorial && <div>
                  <Label htmlFor="tutorialUrl">Link do Tutorial</Label>
                  <Input id="tutorialUrl" value={currentMedia.tutorialUrl} onChange={e => updateMediaData('tutorialUrl', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="mt-2" />
                </div>}

              <div>
                <Label htmlFor="canvaLink">Link Canva <span className="text-destructive">*</span></Label>
                <Input 
                  id="canvaLink" 
                  value={currentMedia.canvaLink} 
                  onChange={e => updateMediaData('canvaLink', e.target.value)} 
                  placeholder="https://www.canva.com/..." 
                  className="mt-2" 
                  required
                />
              </div>

              <div>
                <Label htmlFor="driveLink">Link Drive <span className="text-destructive">*</span></Label>
                <Input 
                  id="driveLink" 
                  value={currentMedia.driveLink} 
                  onChange={e => updateMediaData('driveLink', e.target.value)} 
                  placeholder="https://drive.google.com/..." 
                  className="mt-2" 
                  required
                />
              </div>

              <div>
                <Label>Arquivo para Download (opcional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  PSD, arquivo editável, etc.
                </p>
                <input type="file" onChange={handleDownloadFileSelect} className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/80" />
                {currentMedia.downloadFile && <p className="text-sm text-green-600 mt-2">
                    ✓ {currentMedia.downloadFile.name}
                  </p>}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Fechar
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveSingleItem} 
                    disabled={!isCurrentItemComplete(currentMedia) || isSubmitting} 
                    className="bg-gradient-primary"
                  >
                    {isSubmitting ? "Enviando..." : "Salvar Este"}
                  </Button>
                </div>
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">Upload Concluído!</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Suas artes foram enviadas com sucesso.
          </p>
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={() => {
            setShowSuccessModal(false);
            setMediaFiles([]);
          }}>
              Sim, enviar mais
            </Button>
            <Button variant="outline" onClick={() => navigate('/biblioteca-artes')}>
              Não, ir para Biblioteca
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AnnouncementConfigModal
        open={showAnnouncementConfig}
        onOpenChange={setShowAnnouncementConfig}
        onSelectPushTemplate={setSelectedPushTemplate}
        selectedPushTemplate={selectedPushTemplate}
      />

      <AnnouncementPreviewModal
        open={showAnnouncementPreview}
        onOpenChange={setShowAnnouncementPreview}
        pushTemplate={selectedPushTemplate}
        onConfirmSend={handleConfirmSendAnnouncement}
        isSending={isSendingAnnouncement}
      />
    </div>;
};
export default AdminUploadArtes;