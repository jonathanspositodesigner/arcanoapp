import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ImageData {
  file: File;
  preview: string;
  title: string;
  prompt: string;
  category: string;
}

const AdminUpload = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState<ImageData[]>([]);
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
      file.type.startsWith('image/')
    );
    
    if (files.length === 0) {
      toast.error("Por favor, envie apenas imagens");
      return;
    }
    
    processFiles(files);
  };

  const processFiles = (files: File[]) => {
    const newImages: ImageData[] = [];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push({
          file,
          preview: reader.result as string,
          title: "",
          prompt: "",
          category: ""
        });
        
        if (newImages.length === files.length) {
          setImages(prev => [...prev, ...newImages]);
          setShowModal(true);
          setCurrentIndex(0);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const updateImageData = (field: keyof ImageData, value: string) => {
    setImages(prev => prev.map((img, idx) => 
      idx === currentIndex ? { ...img, [field]: value } : img
    ));
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const allFieldsFilled = images.every(img => 
    img.title && img.prompt && img.category
  );

  const handleSubmitAll = async () => {
    if (!allFieldsFilled) {
      toast.error("Preencha todos os campos antes de enviar");
      return;
    }

    setIsSubmitting(true);

    try {
      for (const image of images) {
        // Upload image to storage
        const fileExt = image.file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('admin-prompts')
          .upload(filePath, image.file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('admin-prompts')
          .getPublicUrl(filePath);

        // Insert into database
        const { error: insertError } = await supabase
          .from('admin_prompts')
          .insert({
            title: image.title,
            prompt: image.prompt,
            category: image.category,
            image_url: publicUrl,
          });

        if (insertError) throw insertError;
      }

      setImages([]);
      setShowModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error submitting admin prompts:", error);
      toast.error("Erro ao enviar selos. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentImage = images[currentIndex];

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
              id="images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <label htmlFor="images" className="cursor-pointer">
              <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-foreground mb-2">
                Arraste múltiplas imagens aqui ou clique para selecionar
              </p>
              <p className="text-sm text-muted-foreground">
                Você pode enviar vários selos de uma vez
              </p>
            </label>
          </div>

          {images.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                Imagens selecionadas: {images.length}
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img.preview}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className={`absolute bottom-2 left-2 right-2 text-xs ${
                      img.title && img.prompt && img.category 
                        ? 'bg-green-500' 
                        : 'bg-yellow-500'
                    } text-white px-2 py-1 rounded`}>
                      {img.title && img.prompt && img.category ? 'Completo' : 'Pendente'}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setShowModal(true)}
                className="w-full mt-6 bg-gradient-primary hover:opacity-90"
              >
                Preencher Informações dos Selos
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Informações do Selo {currentIndex + 1} de {images.length}
            </DialogTitle>
          </DialogHeader>

          {currentImage && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <img
                  src={currentImage.preview}
                  alt="Preview"
                  className="max-h-64 object-contain rounded-lg"
                />
              </div>

              <div>
                <Label htmlFor="title">Título do Selo</Label>
                <Input
                  id="title"
                  value={currentImage.title}
                  onChange={(e) => updateImageData('title', e.target.value)}
                  placeholder="Ex: Selo 3D de Natal"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select 
                  value={currentImage.category} 
                  onValueChange={(value) => updateImageData('category', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Selos 3D">Selos 3D</SelectItem>
                    <SelectItem value="Fotos">Fotos</SelectItem>
                    <SelectItem value="Cenários">Cenários</SelectItem>
                    <SelectItem value="Controles de Câmera">Controles de Câmera</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  value={currentImage.prompt}
                  onChange={(e) => updateImageData('prompt', e.target.value)}
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
                  disabled={currentIndex === images.length - 1}
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
                  {isSubmitting ? "Enviando..." : "Upload de Todos os Selos"}
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
