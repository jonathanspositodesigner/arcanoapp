import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { optimizeImage, isImageFile, formatBytes } from "@/hooks/useImageOptimizer";

// Format title: first letter uppercase, rest lowercase
const formatTitle = (title: string): string => {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

// Validation schema
const promptSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório").max(200, "Título deve ter no máximo 200 caracteres"),
  prompt: z.string().trim().min(1, "Prompt é obrigatório").max(10000, "Prompt deve ter no máximo 10.000 caracteres"),
  category: z.string().min(1, "Selecione uma categoria válida"),
  contributorName: z.string().trim().max(20, "Nome deve ter no máximo 20 caracteres").optional(),
});

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

const ContributePrompts = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("");
  const [contributorName, setContributorName] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [isVideo, setIsVideo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('prompts_categories')
        .select('id, name, is_admin_only')
        .eq('is_admin_only', false)
        .order('display_order', { ascending: true });
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      
      const isVideoFile = file.type.startsWith('video/');
      setIsVideo(isVideoFile);
      
      // Optimize images before setting
      if (isImageFile(file)) {
        toast.info("Otimizando imagem...");
        const result = await optimizeImage(file);
        setMediaFile(result.file);
        setMediaPreview(URL.createObjectURL(result.file));
        if (result.savingsPercent > 0) {
          toast.success(`Imagem otimizada: ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${result.savingsPercent}% economizado)`);
        }
      } else {
        setMediaFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      setMediaFile(file);
      setIsVideo(file.type.startsWith('video/'));
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Por favor, envie apenas imagens ou vídeos");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mediaFile) {
      toast.error("Por favor, envie uma imagem ou vídeo");
      return;
    }

    // Validate inputs with zod
    const validationResult = promptSchema.safeParse({ title, prompt, category, contributorName });
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload media to storage
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('community-prompts')
        .upload(filePath, mediaFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('community-prompts')
        .getPublicUrl(filePath);

      // Insert into database with formatted title
      const { error: insertError } = await supabase
        .from('community_prompts')
        .insert({
          title: formatTitle(title),
          prompt,
          category,
          image_url: publicUrl,
          contributor_name: contributorName.trim() || null,
        });

      if (insertError) throw insertError;

      toast.success("Contribuição enviada com sucesso!");
      navigate("/biblioteca-prompts");
    } catch (error) {
      console.error("Error submitting contribution:", error);
      toast.error("Erro ao enviar contribuição. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <Card className="p-4 sm:p-8 shadow-hover">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">
              Contribua com a Comunidade Arcana
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Compartilhe seus prompts e ajude outros criadores
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="contributorName">Seu Nome (opcional)</Label>
              <Input
                id="contributorName"
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value.slice(0, 20))}
                placeholder="Ex: João Silva"
                maxLength={20}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {contributorName.length}/20 caracteres
              </p>
            </div>

            <div>
              <Label htmlFor="title">Título do Arquivo</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Arquivo de Natal"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
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

            <div>
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Cole ou escreva seu prompt aqui..."
                className="mt-2 min-h-32"
              />
            </div>

            <div>
              <Label htmlFor="media">Imagem ou Vídeo de Referência</Label>
              <div className="mt-2">
                <label
                  htmlFor="media"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="flex flex-col items-center justify-center w-full h-32 sm:h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                >
                  {mediaPreview ? (
                    isVideo ? (
                      <video
                        src={mediaPreview}
                        className="h-full object-contain"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="h-full object-contain"
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Clique ou arraste uma imagem ou vídeo aqui
                      </p>
                    </div>
                  )}
                </label>
                <input
                  id="media"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaChange}
                  className="hidden"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity text-lg py-6"
            >
              {isSubmitting ? "Enviando..." : "Enviar Contribuição"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ContributePrompts;
