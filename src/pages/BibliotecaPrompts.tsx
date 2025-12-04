import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExternalLink, Copy, Download, Zap, Sparkles, X, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import logoHorizontal from "@/assets/LOGO_HORIZONTAL_4.png";
interface PromptItem {
  id: string | number;
  title: string;
  prompt: string;
  imageUrl: string;
  category?: string;
  isCommunity?: boolean;
  isExclusive?: boolean;
}

const isVideoUrl = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

const ITEMS_PER_PAGE = 16;

const BibliotecaPrompts = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("Ver Tudo");
  const [allPrompts, setAllPrompts] = useState<PromptItem[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchCommunityPrompts();
  }, []);

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  const fetchCommunityPrompts = async () => {
    const {
      data: communityData,
      error: communityError
    } = await supabase.from('community_prompts').select('*').eq('approved', true).order('created_at', {
      ascending: false
    });
    if (communityError) {
      console.error("Error fetching community prompts:", communityError);
    }
    const {
      data: adminData,
      error: adminError
    } = await supabase.from('admin_prompts').select('*').order('created_at', {
      ascending: false
    });
    if (adminError) {
      console.error("Error fetching admin prompts:", adminError);
    }
    const communityPrompts: PromptItem[] = (communityData || []).map(item => ({
      id: item.id,
      title: item.title,
      prompt: item.prompt,
      imageUrl: item.image_url,
      category: item.category,
      isCommunity: true
    }));
    const adminPrompts: PromptItem[] = (adminData || []).map(item => ({
      id: item.id,
      title: item.title,
      prompt: item.prompt,
      imageUrl: item.image_url,
      category: item.category,
      isExclusive: true
    }));
    setAllPrompts([...adminPrompts, ...communityPrompts]);
  };

  // Filter out camera controls from "Ver Tudo" - they only appear in their own tab
  const filteredPrompts = selectedCategory === "Ver Tudo" 
    ? allPrompts.filter(p => p.category !== "Controles de Câmera")
    : allPrompts.filter(p => p.category === selectedCategory);

  // Pagination logic
  const totalPages = Math.ceil(filteredPrompts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPrompts = filteredPrompts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
  const categories = ["Ver Tudo", "Selos 3D", "Fotos", "Cenários", "Controles de Câmera"];
  const copyToClipboard = async (prompt: string, title: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success(`Prompt "${title}" copiado!`);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Erro ao copiar prompt");
    }
  };
  const downloadMedia = (mediaUrl: string, title: string) => {
    const isVideo = isVideoUrl(mediaUrl);
    const extension = isVideo ? 'mp4' : 'jpg';
    const link = document.createElement("a");
    link.href = mediaUrl;
    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${isVideo ? 'Vídeo' : 'Imagem'} "${title}" baixado!`);
  };
  const externalLinks = [{
    name: "Gerar no ChatGPT",
    url: "https://chatgpt.com/",
    icon: Sparkles
  }, {
    name: "Gerar no Nano Banana",
    url: "https://aistudio.google.com/prompts/new_chat?model=gemini-2.5-flash-image",
    icon: Sparkles
  }, {
    name: "Gerar no Whisk",
    url: "https://labs.google/fx/pt/tools/whisk",
    icon: Sparkles
  }, {
    name: "Gerar no Flux 2",
    url: "https://www.runninghub.ai/workflow/1995538803421020162",
    icon: Sparkles
  }];
  return <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 min-h-screen bg-card border-r border-border p-6 space-y-4">
          <div className="mb-6">
            <img src={logoHorizontal} alt="Biblioteca de Artes Arcanas" className="w-full mb-4" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-6">Ferramentas de IA</h2>
          {externalLinks.map(link => <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full h-auto py-4 px-4 flex items-center justify-between text-left hover:bg-secondary hover:scale-105 transition-all duration-300 border-border">
                <span className="font-medium text-foreground">{link.name}</span>
                <ExternalLink className="h-5 w-5 ml-2 flex-shrink-0 text-muted-foreground" />
              </Button>
            </a>)}
          <Button onClick={() => navigate("/contribuir")} className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold mt-4">
            Envie o seu
          </Button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-background">
          {/* Featured Card */}
          <Card className="mb-8 p-8 bg-gradient-primary text-primary-foreground shadow-hover bg-primary">
            <div className="flex items-center gap-4 mb-4">
              <Zap className="h-12 w-12" />
              <div>
                <h1 className="text-3xl font-bold mb-2">Conheça a Forja de Selos 3D</h1>
                <p className="text-lg opacity-90">Gere um selo novo, substitua o título, deixe em 4K e anime seus selos 3D em um só lugar.
Sem precisar mais pagar ChatGPT e VEO3.</p>
              </div>
            </div>
            <a href="https://youtu.be/XmPDm7ikUbU" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="lg" className="mt-4 font-semibold hover:scale-105 transition-transform bg-white text-primary hover:bg-white/90">
                Acessar Forja de Selos 3D
                <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </Card>

          {/* Page Title and Category Filters */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold mb-4 text-foreground">Biblioteca de Prompts</h2>
            <p className="text-lg mb-6 text-muted-foreground">
              Explore nossa coleção de prompts para criar selos 3D incríveis
            </p>
            
            <div className="flex gap-3 flex-wrap">
              {categories.map(cat => <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} onClick={() => setSelectedCategory(cat)} className={selectedCategory === cat ? "bg-gradient-primary hover:opacity-90 text-white" : "hover:bg-secondary hover:text-primary border-border"}>
                  {cat}
                </Button>)}
            </div>
          </div>

          {/* Prompts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginatedPrompts.map(item => {
              const isVideo = isVideoUrl(item.imageUrl);
              return (
                <Card key={item.id} className="overflow-hidden hover:shadow-hover transition-all duration-300 hover:scale-[1.02] bg-card border-border">
                  {/* Media Preview */}
                  <div className="aspect-square overflow-hidden bg-secondary relative">
                    {isVideo ? (
                      <>
                        <video 
                          src={item.imageUrl} 
                          className="w-full h-full object-cover cursor-pointer"
                          muted
                          loop
                          autoPlay
                          playsInline
                          onClick={() => setSelectedPrompt(item)}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-black/50 rounded-full p-3">
                            <Play className="h-8 w-8 text-white" fill="white" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => setSelectedPrompt(item)}
                      />
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="font-bold text-lg text-foreground mb-2">{item.title}</h3>
                    {item.isExclusive && <Badge className="bg-gradient-primary text-white border-0">
                          {item.category === "Fotos" ? "Foto Exclusiva" : item.category === "Cenários" ? "Cenário Exclusivo" : item.category === "Controles de Câmera" ? "Controle de Câmera" : "Selo Exclusivo"}
                        </Badge>}
                      {item.isCommunity && !item.isExclusive && <Badge variant="secondary" className="bg-secondary text-foreground">
                          Enviado pela comunidade
                        </Badge>}
                    </div>

                    {/* Prompt Box */}
                    <div className="bg-secondary p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground line-clamp-3">{item.prompt}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button onClick={() => copyToClipboard(item.prompt, item.title)} className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity text-white">
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Prompt
                      </Button>
                      <Button onClick={() => downloadMedia(item.imageUrl, item.title)} variant="outline" className="flex-1 border-border hover:bg-secondary">
                        <Download className="h-4 w-4 mr-2" />
                        Baixar Ref.
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="border-border hover:bg-secondary"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              <span className="text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="border-border hover:bg-secondary"
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Media Preview Modal */}
          <Dialog open={!!selectedPrompt} onOpenChange={() => setSelectedPrompt(null)}>
            <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden bg-card">
              <button 
                onClick={() => setSelectedPrompt(null)}
                className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              {selectedPrompt && (
                <div className="flex flex-col max-h-[90vh]">
                  <div className="flex-shrink-0">
                    {isVideoUrl(selectedPrompt.imageUrl) ? (
                      <video 
                        src={selectedPrompt.imageUrl} 
                        className="w-full h-auto max-h-[50vh] object-contain bg-black"
                        controls
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <img 
                        src={selectedPrompt.imageUrl} 
                        alt={selectedPrompt.title} 
                        className="w-full h-auto max-h-[50vh] object-contain bg-black"
                      />
                    )}
                  </div>
                  <div className="p-4 space-y-3 flex-shrink-0">
                    <h3 className="font-bold text-lg text-foreground">{selectedPrompt.title}</h3>
                    <div className="bg-secondary p-3 rounded-lg max-h-24 overflow-y-auto">
                      <p className="text-xs text-muted-foreground">{selectedPrompt.prompt}</p>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => copyToClipboard(selectedPrompt.prompt, selectedPrompt.title)} 
                        className="flex-1 bg-gradient-primary hover:opacity-90 text-white"
                        size="sm"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Prompt
                      </Button>
                      <Button 
                        onClick={() => downloadMedia(selectedPrompt.imageUrl, selectedPrompt.title)} 
                        variant="outline" 
                        className="flex-1 border-border hover:bg-secondary"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar {isVideoUrl(selectedPrompt.imageUrl) ? 'Vídeo' : 'Imagem'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>;
};
export default BibliotecaPrompts;