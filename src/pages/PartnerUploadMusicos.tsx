import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { uploadToStorage } from "@/hooks/useStorageUpload";
import { optimizeImage, isImageFile, formatBytes } from "@/hooks/useImageOptimizer";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const PartnerUploadMusicos = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [partner, setPartner] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [canvaLink, setCanvaLink] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    checkPartnerAccess();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('artes_categories_musicos')
      .select('id, name, slug')
      .order('display_order', { ascending: true });
    
    if (!error && data) {
      setCategories(data);
    }
  };

  const checkPartnerAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/parceiro-login-unificado");
        return;
      }

      // Check partner role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'partner')
        .maybeSingle();

      if (!roleData) {
        navigate("/parceiro-login-unificado");
        return;
      }

      // Get partner info
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('id, name')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (partnerError || !partnerData) {
        toast.error("Conta de colaborador não encontrada");
        navigate("/parceiro-login-unificado");
        return;
      }

      // Check platform access
      const { data: platformData } = await supabase
        .from('partner_platforms')
        .select('platform')
        .eq('partner_id', partnerData.id)
        .eq('platform', 'artes_musicos')
        .eq('is_active', true)
        .maybeSingle();

      if (!platformData) {
        toast.error("Você não tem acesso a esta plataforma");
        navigate("/parceiro-plataformas");
        return;
      }

      setPartner(partnerData);
    } catch (error) {
      console.error("Error checking access:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor, selecione uma imagem");
        return;
      }
      
      // Optimize image before setting
      if (isImageFile(file)) {
        toast.info("Otimizando imagem...");
        const result = await optimizeImage(file);
        setSelectedFile(result.file);
        setPreviewUrl(URL.createObjectURL(result.file));
        if (result.savingsPercent > 0) {
          toast.success(`Imagem otimizada: ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${result.savingsPercent}% economizado)`);
        }
      } else {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const formatTitle = (title: string) => {
    return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !category || !selectedFile) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!partner) {
      toast.error("Erro ao identificar colaborador");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload image to Storage
      setIsUploading(true);
      const uploadResult = await uploadToStorage(selectedFile, 'artes-cloudinary');
      setIsUploading(false);
      
      if (!uploadResult.success || !uploadResult.url) {
        toast.error("Erro ao fazer upload da imagem");
        setIsSubmitting(false);
        return;
      }
      
      const imageUrl = uploadResult.url;

      // Insert into partner_artes_musicos
      const { error } = await supabase
        .from('partner_artes_musicos')
        .insert({
          partner_id: partner.id,
          title: formatTitle(title),
          category: category,
          description: description || null,
          image_url: imageUrl,
          canva_link: canvaLink || null,
          drive_link: driveLink || null,
          approved: false,
          rejected: false,
        });

      if (error) {
        console.error("Error inserting arte:", error);
        toast.error("Erro ao enviar arte");
        return;
      }

      toast.success("Arte enviada com sucesso! Aguarde a aprovação do administrador.");
      navigate("/parceiro-dashboard-musicos");
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Erro ao enviar arte");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] p-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="text-white/70 hover:text-white mb-6"
          onClick={() => navigate("/parceiro-dashboard-musicos")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>

        <Card className="bg-[#1a1a2e]/80 border-pink-500/30">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Enviar Nova Arte</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="text-white">Imagem *</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                    ${previewUrl 
                      ? 'border-pink-500/50' 
                      : 'border-white/20 hover:border-pink-500/50'
                    }`}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                  ) : (
                    <div className="text-white/60">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                      <p>Clique para selecionar uma imagem</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label className="text-white">Título *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome da arte"
                  className="bg-[#0f0f1a] border-pink-500/50 text-white"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-white">Categoria *</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger className="bg-[#0f0f1a] border-pink-500/50 text-white">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-pink-500/50">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.slug} className="text-white">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-white">Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição opcional"
                  className="bg-[#0f0f1a] border-pink-500/50 text-white min-h-[100px]"
                />
              </div>

              {/* Canva Link */}
              <div className="space-y-2">
                <Label className="text-white">Link do Canva (opcional)</Label>
                <Input
                  value={canvaLink}
                  onChange={(e) => setCanvaLink(e.target.value)}
                  placeholder="https://www.canva.com/..."
                  className="bg-[#0f0f1a] border-pink-500/50 text-white"
                />
              </div>

              {/* Drive Link */}
              <div className="space-y-2">
                <Label className="text-white">Link do Drive (opcional)</Label>
                <Input
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="bg-[#0f0f1a] border-pink-500/50 text-white"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
                disabled={isSubmitting || isUploading}
              >
                {isSubmitting || isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Arte
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnerUploadMusicos;