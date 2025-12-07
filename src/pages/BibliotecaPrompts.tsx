import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExternalLink, Copy, Download, Zap, Sparkles, X, Play, ChevronLeft, ChevronRight, Video, Star, Lock, LogIn, Smartphone, Menu, Bell, BellOff, Youtube, AlertTriangle } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useDailyPromptLimit } from "@/hooks/useDailyPromptLimit";
import { trackPromptClick } from "@/hooks/usePromptClickTracker";
import logoHorizontal from "@/assets/logo_horizontal.png";
import CollectionModal from "@/components/CollectionModal";
interface PromptItem {
  id: string | number;
  title: string;
  prompt: string;
  imageUrl: string;
  category?: string;
  isCommunity?: boolean;
  isExclusive?: boolean;
  isPremium?: boolean;
  referenceImages?: string[];
  tutorialUrl?: string;
}
const isVideoUrl = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};
const getThumbnailUrl = (url: string, width: number = 400) => {
  if (isVideoUrl(url)) return url;

  // Convert Supabase storage URL to render URL for image transformation
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    return url.replace('/storage/v1/object/public/', `/storage/v1/render/image/public/`) + `?width=${width}&height=${width}&resize=cover`;
  }
  return url;
};
const ITEMS_PER_PAGE = 16;
// Fisher-Yates shuffle function
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
const BibliotecaPrompts = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    isPremium,
    planType,
    logout
  } = usePremiumStatus();
  const { 
    copiesUsed, 
    remainingCopies, 
    hasReachedLimit, 
    recordCopy 
  } = useDailyPromptLimit(user, planType);
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();
  const [contentType, setContentType] = useState<"exclusive" | "community">("exclusive");
  const [selectedCategory, setSelectedCategory] = useState<string>("Ver Tudo");
  const [allPrompts, setAllPrompts] = useState<PromptItem[]>([]);
  const [shuffledVerTudo, setShuffledVerTudo] = useState<PromptItem[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumModalItem, setPremiumModalItem] = useState<PromptItem | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [tutorialUrl, setTutorialUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collectionSlug, setCollectionSlug] = useState<string | null>(null);
  useEffect(() => {
    fetchCommunityPrompts();
    // Check for collection slug in URL
    const colecao = searchParams.get("colecao");
    if (colecao) {
      setCollectionSlug(colecao);
    }
  }, []);

  // Open modal from URL parameter
  useEffect(() => {
    const itemId = searchParams.get("item");
    if (itemId && allPrompts.length > 0) {
      const item = allPrompts.find(p => p.id === itemId);
      if (item) {
        if (item.isPremium && !isPremium) {
          setPremiumModalItem(item);
          setShowPremiumModal(true);
        } else {
          setSelectedPrompt(item);
        }
      }
    }
  }, [searchParams, allPrompts, isPremium]);

  // Shuffle "Ver Tudo" items when allPrompts changes
  useEffect(() => {
    const verTudoItems = allPrompts.filter(p => p.category !== "Controles de Câmera");
    setShuffledVerTudo(shuffleArray(verTudoItems));
  }, [allPrompts]);
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, contentType]);
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
      isCommunity: true,
      isPremium: false
    }));
    const adminPrompts: PromptItem[] = (adminData || []).map(item => ({
      id: item.id,
      title: item.title,
      prompt: item.prompt,
      imageUrl: item.image_url,
      category: item.category,
      isExclusive: true,
      isPremium: (item as any).is_premium || false,
      referenceImages: (item as any).reference_images || [],
      tutorialUrl: (item as any).tutorial_url || null
    }));
    setAllPrompts([...adminPrompts, ...communityPrompts]);
  };
  // Filter by content type first
  const contentTypePrompts = contentType === "exclusive" 
    ? allPrompts.filter(p => p.isExclusive) 
    : allPrompts.filter(p => p.isCommunity);
  
  // Shuffled items for "Ver Tudo" based on content type
  const shuffledContentType = contentType === "exclusive" 
    ? shuffledVerTudo.filter(p => p.isExclusive)
    : shuffledVerTudo.filter(p => p.isCommunity);

  const filteredPrompts = selectedCategory === "Ver Tudo" 
    ? shuffledContentType 
    : selectedCategory === "Novos" 
      ? contentTypePrompts.filter(p => p.category !== "Controles de Câmera").slice(0, 16) 
      : selectedCategory === "Grátis" 
        ? contentTypePrompts.filter(p => !p.isPremium && p.category !== "Controles de Câmera") 
        : contentTypePrompts.filter(p => p.category === selectedCategory);
  
  const totalPages = Math.ceil(filteredPrompts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPrompts = filteredPrompts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
  // Categories - Controles de Câmera only for exclusive
  const categories = contentType === "exclusive" 
    ? ["Novos", "Grátis", "Selos 3D", "Fotos", "Cenários", "Movies para Telão", "Controles de Câmera", "Ver Tudo"]
    : ["Novos", "Selos 3D", "Fotos", "Cenários", "Ver Tudo"];
  
  // Helper to check if user has a plan with daily limit
  const hasLimitPlan = planType === "arcano_basico" || planType === "arcano_pro";

  const copyToClipboard = async (promptItem: PromptItem) => {
    // Check daily limit for premium items on basic and pro plans
    if (promptItem.isPremium && hasLimitPlan) {
      if (hasReachedLimit) {
        setShowLimitModal(true);
        return;
      }
      // Record the copy
      const recorded = await recordCopy(String(promptItem.id));
      if (!recorded) {
        setShowLimitModal(true);
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(promptItem.prompt);
      toast.success(`Prompt "${promptItem.title}" copiado!`);
      // Track the click
      trackPromptClick(String(promptItem.id), promptItem.title, !!promptItem.isExclusive);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Erro ao copiar prompt");
    }
  };
  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  };
  const downloadMedia = async (mediaUrl: string, title: string, referenceImages?: string[]) => {
    const isVideo = isVideoUrl(mediaUrl);
    const extension = isVideo ? 'mp4' : 'jpg';
    const baseTitle = title.toLowerCase().replace(/\s+/g, "-");

    // Download main media
    await downloadFile(mediaUrl, `${baseTitle}.${extension}`);

    // Download reference images if it's a video with references
    if (isVideo && referenceImages && referenceImages.length > 0) {
      for (let i = 0; i < referenceImages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await downloadFile(referenceImages[i], `${baseTitle}-ref-${i + 1}.jpg`);
      }
      toast.success(`Vídeo e ${referenceImages.length} imagem(ns) de referência baixados!`);
    } else {
      toast.success(`${isVideo ? 'Vídeo' : 'Imagem'} "${title}" baixado!`);
    }
  };
  const handleItemClick = (item: PromptItem) => {
    // Update URL with item ID for sharing
    setSearchParams({ item: String(item.id) });
    
    if (item.isPremium && !isPremium) {
      setPremiumModalItem(item);
      setShowPremiumModal(true);
    } else {
      setSelectedPrompt(item);
    }
  };

  const handleCloseModal = () => {
    setSelectedPrompt(null);
    // Remove item from URL when closing
    searchParams.delete("item");
    setSearchParams(searchParams);
  };

  const handleClosePremiumModal = (open: boolean) => {
    setShowPremiumModal(open);
    if (!open) {
      setPremiumModalItem(null);
      // Remove item from URL when closing
      searchParams.delete("item");
      setSearchParams(searchParams);
    }
  };

  const getEmbedUrl = (url: string): string => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    // Return original if no match (might be a direct embed URL)
    return url;
  };

  const openTutorial = (url: string) => {
    setTutorialUrl(getEmbedUrl(url));
    setShowTutorialModal(true);
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
  const getBadgeContent = (item: PromptItem) => {
    return <div className="flex flex-wrap gap-1">
        {/* Premium or Grátis badge - always show one */}
        {item.isPremium ? <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-[10px] sm:text-xs">
            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" fill="currentColor" />
            Premium
          </Badge> : <Badge variant="outline" className="border-green-500 text-green-600 text-[10px] sm:text-xs">
            Grátis
          </Badge>}
        {/* Tutorial badge */}
        {item.tutorialUrl && <Badge className="bg-red-600 text-white border-0 text-[10px] sm:text-xs">
            <Youtube className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
            Tutorial
          </Badge>}
        {/* Category badge */}
        {item.isExclusive && <Badge className="bg-gradient-primary text-white border-0 text-[10px] sm:text-xs">
            {item.category === "Fotos" ? "Foto Exclusiva" : item.category === "Cenários" ? "Cenário Exclusivo" : item.category === "Controles de Câmera" ? "Controle de Câmera" : item.category === "Movies para Telão" ? "Movie Exclusivo" : "Selo Exclusivo"}
          </Badge>}
        {item.isCommunity && <Badge variant="secondary" className="bg-secondary text-foreground text-[10px] sm:text-xs">
            Comunidade
          </Badge>}
      </div>;
  };
  return <div className="min-h-screen bg-background">
      {/* Mobile Top Header */}
      <header className="lg:hidden bg-primary px-4 py-3 flex items-center justify-between shadow-lg">
        <img alt="Arcano Lab" className="h-8" src="/lovable-uploads/ea4c204d-433a-43a8-97ab-728ae5b79720.png" />
        {!isPremium && <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/login")} size="sm" variant="ghost" className="text-white hover:bg-white/20 text-xs">
              <LogIn className="h-4 w-4 mr-1" />
              Login
            </Button>
            <Button onClick={() => navigate("/planos")} size="sm" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white text-xs">
              <Star className="h-3 w-3 mr-1" fill="currentColor" />
              Premium
            </Button>
          </div>}
        {isPremium && <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
            <Star className="h-3 w-3 mr-1" fill="currentColor" />
            Premium Ativo
          </Badge>}
      </header>

      {/* Mobile Bottom Menu Button */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Button onClick={() => setSidebarOpen(!sidebarOpen)} className="bg-primary hover:bg-primary/90 text-white shadow-xl px-6 py-6 rounded-full">
          <Menu className="h-6 w-6 mr-2" />
          <span className="font-semibold">Gere sua imagem    </span>
        </Button>
      </div>

      {/* Overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-72 min-h-screen bg-card border-r border-border p-6 space-y-4
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="mb-6">
            <img 
              src={logoHorizontal} 
              alt="Arcano Lab" 
              className="w-full mb-4 cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={() => navigate('/')}
            />
          </div>

          {/* Install App Button */}
          <Button onClick={() => navigate("/install")} className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold mb-2">
            <Smartphone className="h-4 w-4 mr-2" />
            Instalar App
          </Button>

          {/* Premium & Login Buttons */}
          {!isPremium && <>
              <Button onClick={() => navigate("/planos")} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white font-semibold mb-2">
                <Star className="h-4 w-4 mr-2" fill="currentColor" />
                Torne-se Premium
              </Button>
              <Button onClick={() => navigate("/login")} variant="outline" className="w-full border-border hover:bg-secondary font-semibold mb-4">
                <LogIn className="h-4 w-4 mr-2" />
                Fazer Login
              </Button>
            </>}

          <h2 className="text-xl font-bold text-foreground mb-6">Ferramentas de IA</h2>
          {externalLinks.map(link => <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full h-auto py-4 px-4 flex items-center justify-between text-left hover:bg-secondary hover:scale-105 transition-all duration-300 border-border">
                <span className="font-medium text-foreground">{link.name}</span>
                <ExternalLink className="h-5 w-5 ml-2 flex-shrink-0 text-muted-foreground" />
              </Button>
            </a>)}
          <a href="https://labs.google/fx/pt/tools/flow" target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" className="w-full h-auto py-4 px-4 flex items-center justify-between text-left hover:bg-secondary hover:scale-105 transition-all duration-300 border-border">
              <span className="font-medium text-foreground">Gerar Video no VEO 3</span>
              <Video className="h-5 w-5 ml-2 flex-shrink-0 text-muted-foreground" />
            </Button>
          </a>
          <Button onClick={() => navigate("/contribuir")} className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold mt-4">
            Envie o seu prompt 
          </Button>

          {/* Push Notifications Button */}
          {pushSupported && (
            <Button
              onClick={async () => {
                if (pushSubscribed) {
                  await pushUnsubscribe();
                } else {
                  // Clear dismissed state to allow re-subscription
                  localStorage.removeItem("push-notification-dismissed");
                  localStorage.removeItem("push-notification-dismissed-time");
                  await pushSubscribe();
                }
              }}
              disabled={pushLoading}
              variant={pushSubscribed ? "outline" : "default"}
              className={`w-full mt-2 font-semibold ${pushSubscribed ? "border-border hover:bg-secondary" : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white"}`}
            >
              {pushSubscribed ? (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Desativar Notificações
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Ativar Notificações
                </>
              )}
            </Button>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background pb-24 lg:pb-8">
          {/* Mobile Install App Button */}
          <Button onClick={() => navigate("/install")} className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold mb-4 lg:hidden">
            <Smartphone className="h-4 w-4 mr-2" />
            Instalar App
          </Button>

          {/* Featured Card */}
          <Card className="mb-6 sm:mb-8 p-4 sm:p-6 lg:p-8 bg-gradient-primary text-primary-foreground shadow-hover bg-primary">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
              <Zap className="h-8 w-8 sm:h-12 sm:w-12 flex-shrink-0" />
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Conheça a Forja de Selos 3D</h1>
                <p className="text-sm sm:text-base lg:text-lg opacity-90">
                  Gere um selo novo, substitua o título, deixe em 4K e anime seus selos 3D em um só lugar.
                </p>
              </div>
            </div>
            <a href="https://youtu.be/XmPDm7ikUbU" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="default" className="mt-2 sm:mt-4 font-semibold hover:scale-105 transition-transform bg-white text-primary hover:bg-white/90 text-sm sm:text-base">
                 Forja de Selos 3D
                <ExternalLink className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </a>
          </Card>

          {/* Page Title and Content Type Tabs */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-foreground">Biblioteca de Prompts</h2>
            <p className="text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 text-muted-foreground">
              Explore nossa coleção de prompts para criar selos 3D incríveis
            </p>
            
            {/* Content Type Tabs */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={contentType === "exclusive" ? "default" : "outline"}
                onClick={() => {
                  setContentType("exclusive");
                  setSelectedCategory("Ver Tudo");
                }}
                className={`text-sm font-semibold ${contentType === "exclusive" 
                  ? "bg-gradient-primary hover:opacity-90 text-white" 
                  : "hover:bg-secondary border-border"}`}
              >
                Arquivos Exclusivos
              </Button>
              <Button
                variant={contentType === "community" ? "default" : "outline"}
                onClick={() => {
                  setContentType("community");
                  setSelectedCategory("Ver Tudo");
                }}
                className={`text-sm font-semibold ${contentType === "community" 
                  ? "bg-gradient-primary hover:opacity-90 text-white" 
                  : "hover:bg-secondary border-border"}`}
              >
                Enviados pela Comunidade
              </Button>
            </div>

            {/* Category Filters */}
            <div className="flex gap-2 sm:gap-3 flex-wrap">
              {categories.map(cat => <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} onClick={() => setSelectedCategory(cat)} size="sm" className={`text-xs sm:text-sm ${selectedCategory === cat ? "bg-gradient-primary hover:opacity-90 text-white" : "hover:bg-secondary hover:text-primary border-border"}`}>
                  {cat}
                </Button>)}
            </div>
          </div>

          {/* Prompts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {paginatedPrompts.map(item => {
            const isVideo = isVideoUrl(item.imageUrl);
            const canAccess = !item.isPremium || isPremium;
            return <Card key={item.id} className="overflow-hidden hover:shadow-hover transition-all duration-300 hover:scale-[1.02] bg-card border-border">
                  {/* Media Preview */}
                  <div className="aspect-square overflow-hidden bg-secondary relative">
                    {isVideo ? <>
                        <video src={item.imageUrl} className="w-full h-full object-cover cursor-pointer" muted loop autoPlay playsInline onClick={() => handleItemClick(item)} />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-black/50 rounded-full p-3">
                            <Play className="h-8 w-8 text-white" fill="white" />
                          </div>
                        </div>
                      </> : <img src={getThumbnailUrl(item.imageUrl)} alt={item.title} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer" onClick={() => handleItemClick(item)} />}
                    {item.isPremium && !isPremium && <div className="absolute top-2 right-2 bg-black/60 rounded-full p-2">
                        <Lock className="h-5 w-5 text-white" />
                      </div>}
                  </div>

                  {/* Card Content */}
                  <div className="p-3 sm:p-5 space-y-2 sm:space-y-4">
                    <div>
                      <h3 className="font-bold text-sm sm:text-lg text-foreground mb-1 sm:mb-2 line-clamp-2">{item.title}</h3>
                      {getBadgeContent(item)}
                    </div>

                    {/* Prompt Box - Hidden for premium items when user is not premium */}
                    {canAccess && <div className="bg-secondary p-2 sm:p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-3">{item.prompt}</p>
                      </div>}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      {canAccess ? (
                        // Check if user has reached daily limit for premium items
                        item.isPremium && hasReachedLimit && hasLimitPlan ? (
                          <Button onClick={() => setShowLimitModal(true)} size="sm" className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white text-xs sm:text-sm">
                            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            Limite diário atingido
                          </Button>
                        ) : (
                          <>
                            <Button onClick={() => copyToClipboard(item)} size="sm" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity text-white text-xs sm:text-sm">
                              <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              Copiar Prompt {item.isPremium && hasLimitPlan && `(${remainingCopies} restantes)`}
                            </Button>
                            <Button onClick={() => downloadMedia(item.imageUrl, item.title, item.referenceImages)} variant="outline" size="sm" className="w-full border-border hover:bg-secondary text-xs sm:text-sm">
                              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              Baixar Referência
                            </Button>
                          </>
                        )
                      ) : (
                        <Button onClick={() => navigate("/planos")} size="sm" className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white text-xs sm:text-sm">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" fill="currentColor" />
                          Torne-se Premium
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>;
          })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6 sm:mt-8">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="border-border hover:bg-secondary">
                <ChevronLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="border-border hover:bg-secondary">
                <span className="hidden sm:inline">Próxima</span>
                <ChevronRight className="h-4 w-4 sm:ml-2" />
              </Button>
            </div>}

          {/* Media Preview Modal */}
          <Dialog open={!!selectedPrompt} onOpenChange={() => handleCloseModal()}>
            <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden bg-card">
              <button onClick={() => handleCloseModal()} className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors">
                <X className="h-4 w-4" />
              </button>
              {selectedPrompt && <div className="flex flex-col max-h-[90vh]">
                  <div className="flex-shrink-0">
                    {isVideoUrl(selectedPrompt.imageUrl) ? <video src={selectedPrompt.imageUrl} className="w-full h-auto max-h-[50vh] object-contain bg-black" controls autoPlay playsInline /> : <img src={selectedPrompt.imageUrl} alt={selectedPrompt.title} className="w-full h-auto max-h-[50vh] object-contain bg-black" />}
                  </div>
                  <div className="p-4 space-y-3 flex-shrink-0">
                    <h3 className="font-bold text-lg text-foreground">{selectedPrompt.title}</h3>
                    <div className="bg-secondary p-3 rounded-lg max-h-24 overflow-y-auto">
                      <p className="text-xs text-muted-foreground">{selectedPrompt.prompt}</p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {selectedPrompt.isPremium && hasReachedLimit && hasLimitPlan ? (
                        <Button onClick={() => {
                          handleCloseModal();
                          setShowLimitModal(true);
                        }} className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white" size="sm">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Limite atingido
                        </Button>
                      ) : (
                        <>
                          <Button onClick={() => copyToClipboard(selectedPrompt)} className="flex-1 bg-gradient-primary hover:opacity-90 text-white" size="sm">
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar Prompt
                          </Button>
                          <Button onClick={() => downloadMedia(selectedPrompt.imageUrl, selectedPrompt.title, selectedPrompt.referenceImages)} variant="outline" className="flex-1 border-border hover:bg-secondary" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Baixar {isVideoUrl(selectedPrompt.imageUrl) ? 'Vídeo' : 'Imagem'}
                          </Button>
                        </>
                      )}
                      {selectedPrompt.tutorialUrl && (
                        <Button onClick={() => openTutorial(selectedPrompt.tutorialUrl!)} variant="outline" className="w-full border-red-500 text-red-500 hover:bg-red-500/10" size="sm">
                          <Youtube className="h-4 w-4 mr-2" />
                          Tutorial
                        </Button>
                      )}
                    </div>
                  </div>
                </div>}
            </DialogContent>
          </Dialog>

          {/* Premium Access Modal */}
          <Dialog open={showPremiumModal} onOpenChange={handleClosePremiumModal}>
            <DialogContent className="max-w-lg p-0 overflow-hidden bg-card">
              <button onClick={() => handleClosePremiumModal(false)} className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors">
                <X className="h-4 w-4" />
              </button>
              <div className="flex flex-col max-h-[90vh]">
                {/* Media Preview */}
                {premiumModalItem && <div className="flex-shrink-0">
                    {isVideoUrl(premiumModalItem.imageUrl) ? <video src={premiumModalItem.imageUrl} className="w-full h-auto max-h-[40vh] object-contain bg-black" controls playsInline /> : <img src={premiumModalItem.imageUrl} alt={premiumModalItem.title} className="w-full h-auto max-h-[40vh] object-contain bg-black" />}
                  </div>}
                
                <div className="text-center space-y-4 p-6">
                  <div className="flex justify-center">
                    <div className="p-3 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
                      <Star className="h-10 w-10 text-yellow-500" fill="currentColor" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Conteúdo Premium</h3>
                    <p className="text-sm text-muted-foreground">
                      Este conteúdo está disponível apenas para assinantes premium.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button onClick={() => {
                    setShowPremiumModal(false);
                    navigate("/login");
                  }} variant="outline" className="w-full">
                      <LogIn className="h-4 w-4 mr-2" />
                      Fazer Login
                    </Button>
                    <Button onClick={() => {
                    setShowPremiumModal(false);
                    navigate("/planos");
                  }} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white">
                      <Star className="h-4 w-4 mr-2" fill="currentColor" />
                      Torne-se Premium
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Tutorial Modal */}
          <Dialog open={showTutorialModal} onOpenChange={setShowTutorialModal}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black">
              <button onClick={() => setShowTutorialModal(false)} className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors">
                <X className="h-4 w-4" />
              </button>
              {tutorialUrl && (
                <div className="aspect-video">
                  <iframe
                    src={tutorialUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Daily Limit Reached Modal */}
          <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-card">
              <button onClick={() => setShowLimitModal(false)} className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors">
                <X className="h-4 w-4" />
              </button>
              <div className="text-center space-y-4 p-6">
                <div className="flex justify-center">
                  <div className="p-3 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20">
                    <AlertTriangle className="h-10 w-10 text-orange-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Limite diário atingido!</h3>
                  <p className="text-sm text-muted-foreground">
                    Você já utilizou seus {copiesUsed} prompts premium do dia no plano Arcano Básico.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Faça upgrade para continuar explorando ou aguarde até amanhã.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button onClick={() => {
                    setShowLimitModal(false);
                    navigate("/upgrade");
                  }} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white">
                    <Star className="h-4 w-4 mr-2" fill="currentColor" />
                    Fazer Upgrade
                  </Button>
                  <Button onClick={() => setShowLimitModal(false)} variant="outline" className="w-full">
                    Continuar navegando
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>

      {/* Collection Modal */}
      {collectionSlug && (
        <CollectionModal 
          slug={collectionSlug} 
          onClose={() => {
            setCollectionSlug(null);
            searchParams.delete("colecao");
            setSearchParams(searchParams);
          }} 
        />
      )}
    </div>;
};
export default BibliotecaPrompts;