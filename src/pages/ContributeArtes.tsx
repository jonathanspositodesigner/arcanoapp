import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const arteSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório").max(200, "Título deve ter no máximo 200 caracteres"),
  description: z.string().max(1000, "Descrição deve ter no máximo 1.000 caracteres").optional(),
  category: z.enum(["Aniversário", "Casamento", "Formatura", "15 Anos", "Batizado", "Chá de Bebê", "Corporativo", "Outros"], { 
    errorMap: () => ({ message: "Selecione uma categoria válida" })
  }),
  contributorName: z.string().trim().min(1, "Seu nome é obrigatório").max(20, "Nome deve ter no máximo 20 caracteres"),
});

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return "Arquivo muito grande. Máximo 20MB.";
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return "Tipo de arquivo não permitido.";
  }
  return null;
};

const ContributeArtes = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [contributorName, setContributorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const error = validateFile(selectedFile);
    if (error) {
      toast.error(error);
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    const error = validateFile(droppedFile);
    if (error) {
      toast.error(error);
      return;
    }

    setFile(droppedFile);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(droppedFile);
  };

  const removeFile = () => {
    setFile(null);
    setPreview("");
  };

  const handleSubmit = async () => {
    const validationResult = arteSchema.safeParse({
      title,
      description,
      category,
      contributorName,
    });

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    if (!file) {
      toast.error("Por favor, selecione uma imagem ou vídeo");
      return;
    }

    setIsSubmitting(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('community-artes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('community-artes')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('community_artes')
        .insert({
          title: title.charAt(0).toUpperCase() + title.slice(1).toLowerCase(),
          description: description || null,
          category,
          image_url: publicUrl,
          contributor_name: contributorName,
          approved: false
        });

      if (insertError) throw insertError;

      toast.success("Arte enviada com sucesso! Ela será analisada pela nossa equipe.");
      navigate('/biblioteca-artes');
    } catch (error) {
      console.error("Error submitting arte:", error);
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVideo = file?.type.startsWith('video/');

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate("/biblioteca-artes")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="p-8 shadow-hover">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Envie sua Arte
            </h1>
            <p className="text-muted-foreground">
              Compartilhe suas artes com a comunidade! Após análise, sua arte será publicada na biblioteca.
            </p>
          </div>

          <div className="space-y-6">
            {/* File Upload */}
            {!preview ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
              >
                <input
                  id="file"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="file" className="cursor-pointer">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground mb-2">
                    Arraste uma imagem ou vídeo aqui ou clique para selecionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Máximo 20MB
                  </p>
                </label>
              </div>
            ) : (
              <div className="relative">
                {isVideo ? (
                  <video src={preview} className="w-full rounded-lg" controls />
                ) : (
                  <img src={preview} alt="Preview" className="w-full rounded-lg" />
                )}
                <button
                  onClick={removeFile}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Form Fields */}
            <div>
              <Label htmlFor="contributorName">Seu Nome *</Label>
              <Input
                id="contributorName"
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value.slice(0, 20))}
                placeholder="Como você quer ser creditado"
                className="mt-2"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground mt-1">{contributorName.length}/20 caracteres</p>
            </div>

            <div>
              <Label htmlFor="title">Título da Arte *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Convite Floral Elegante"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva sua arte..."
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="category">Categoria (Tipo de Evento) *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aniversário">Aniversário</SelectItem>
                  <SelectItem value="Casamento">Casamento</SelectItem>
                  <SelectItem value="Formatura">Formatura</SelectItem>
                  <SelectItem value="15 Anos">15 Anos</SelectItem>
                  <SelectItem value="Batizado">Batizado</SelectItem>
                  <SelectItem value="Chá de Bebê">Chá de Bebê</SelectItem>
                  <SelectItem value="Corporativo">Corporativo</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !file || !title || !category || !contributorName}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              {isSubmitting ? "Enviando..." : "Enviar Arte"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ContributeArtes;
