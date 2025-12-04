import { useState } from "react";
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

const ContributePrompts = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [isVideo, setIsVideo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setIsVideo(file.type.startsWith('video/'));
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
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
    
    if (!title || !prompt || !category || !mediaFile) {
      toast.error("Por favor, preencha todos os campos");
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

      // Insert into database
      const { error: insertError } = await supabase
        .from('community_prompts')
        .insert({
          title,
          prompt,
          category,
          image_url: publicUrl,
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

        <Card className="p-8 shadow-hover">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Contribua com a Comunidade Arcana
            </h1>
            <p className="text-muted-foreground text-lg">
              Compartilhe seus prompts e ajude outros criadores
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Título do Selo</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Selo 3D de Natal"
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
                  <SelectItem value="Selos 3D">Selos 3D</SelectItem>
                  <SelectItem value="Fotos">Fotos</SelectItem>
                  <SelectItem value="Cenários">Cenários</SelectItem>
                  <SelectItem value="Movies para Telão">Movies para Telão</SelectItem>
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
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
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
