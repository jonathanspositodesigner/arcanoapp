import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExternalLink, Copy, Download, Zap, Sparkles, X, Play, ChevronLeft, ChevronRight, Video, Star, Lock, LogIn, Smartphone, Menu, Bell, BellOff, Youtube, AlertTriangle, Users, HelpCircle, Flame, User, LogOut, Settings } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useDailyPromptLimit } from "@/hooks/useDailyPromptLimit";
import { trackPromptClick, hasClickedInSession } from "@/hooks/usePromptClickTracker";
import logoHorizontal from "@/assets/logo_horizontal.png";
import CollectionModal from "@/components/CollectionModal";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import { SecureImage, SecureVideo, getSecureDownloadUrl } from "@/components/SecureMedia";
import ArcaneAIStudioModal from "@/components/ArcaneAIStudioModal";
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
  createdAt?: string;
  promptType?: 'admin' | 'community' | 'partner';
  clickCount?: number;
  bonusClicks?: number;
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
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe
  } = usePushNotifications();
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [clickIncrements, setClickIncrements] = useState<Record<string, number>>({});
  const [animatingClicks, setAnimatingClicks] = useState<Set<string>>(new Set());
  const [showArcaneStudioModal, setShowArcaneStudioModal] = useState(false);

  // Check if first time user - show tutorial only on first visit
  useEffect(() => {
    const tutorialCompleted = localStorage.getItem("biblioteca-tutorial-completed");
    if (!tutorialCompleted) {
      // Small delay to let the page render first
      setTimeout(() => setShowOnboarding(true), 1000);
    }
  }, []);
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
    const [communityResult, adminResult, partnerResult, clicksResult] = await Promise.all([supabase.from('community_prompts').select('*').eq('approved', true).order('created_at', {
      ascending: false
    }), supabase.from('admin_prompts').select('*').order('created_at', {
      ascending: false
    }), supabase.from('partner_prompts').select('*').eq('approved', true).order('created_at', {
      ascending: false
    }), supabase.from('prompt_clicks').select('prompt_id')]);
    if (communityResult.error) {
      console.error("Error fetching community prompts:", communityResult.error);
    }
    if (adminResult.error) {
      console.error("Error fetching admin prompts:", adminResult.error);
    }
    if (partnerResult.error) {
      console.error("Error fetching partner prompts:", partnerResult.error);
    }

    // Count clicks per prompt
    const clickCounts: Record<string, number> = {};
    (clicksResult.data || []).forEach(d => {
      clickCounts[d.prompt_id] = (clickCounts[d.prompt_id] || 0) + 1;
    });
    const communityPrompts: PromptItem[] = (communityResult.data || []).map(item => ({
      id: item.id,
      title: item.title,
      prompt: item.prompt,
      imageUrl: item.image_url,
      category: item.category,
      isCommunity: true,
      isPremium: false,
      createdAt: item.created_at || undefined,
      promptType: 'community' as const,
      clickCount: clickCounts[item.id] || 0,
      bonusClicks: (item as any).bonus_clicks || 0
    }));
    const adminPrompts: PromptItem[] = (adminResult.data || []).map(item => ({
      id: item.id,
      title: item.title,
      prompt: item.prompt,
      imageUrl: item.image_url,
      category: item.category,
      isExclusive: true,
      isPremium: (item as any).is_premium || false,
      referenceImages: (item as any).reference_images || [],
      tutorialUrl: (item as any).tutorial_url || null,
      createdAt: item.created_at || undefined,
      promptType: 'admin' as const,
      clickCount: clickCounts[item.id] || 0,
      bonusClicks: (item as any).bonus_clicks || 0
    }));

    // Partner prompts are shown as exclusive content (no partner badge)
    const partnerPrompts: PromptItem[] = (partnerResult.data || []).map(item => ({
      id: item.id,
      title: item.title,
      prompt: item.prompt,
      imageUrl: item.image_url,
      category: item.category,
      isExclusive: true,
      isPremium: (item as any).is_premium || false,
      referenceImages: (item as any).reference_images || [],
      tutorialUrl: (item as any).tutorial_url || null,
      createdAt: item.created_at || undefined,
      promptType: 'partner' as const,
      clickCount: clickCounts[item.id] || 0,
      bonusClicks: (item as any).bonus_clicks || 0
    }));

    // Combine all prompts and sort by created_at descending
    const allCombined = [...adminPrompts, ...partnerPrompts, ...communityPrompts].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Most recent first
    });
    setAllPrompts(allCombined);
  };
  // Filter by content type first
  const contentTypePrompts = contentType === "exclusive" ? allPrompts.filter(p => p.isExclusive) : allPrompts.filter(p => p.isCommunity);

  // Shuffled items for "Ver Tudo" based on content type
  const shuffledContentType = contentType === "exclusive" ? shuffledVerTudo.filter(p => p.isExclusive) : shuffledVerTudo.filter(p => p.isCommunity);

  // Sort function - by total clicks (real + bonus)
  const sortByClicks = (a: PromptItem, b: PromptItem) => {
    const clicksA = (a.clickCount || 0) + (a.bonusClicks || 0);
    const clicksB = (b.clickCount || 0) + (b.bonusClicks || 0);
    return clicksB - clicksA;
  };

  // For "Ver Tudo" we use shuffled array, for other categories we sort by created_at (most recent first)
  const getFilteredAndSortedPrompts = () => {
    if (selectedCategory === "Ver Tudo") {
      return shuffledContentType;
    }

    // Sort function - most recent first
    const sortByDate = (a: PromptItem, b: PromptItem) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    };
    if (selectedCategory === "Populares") {
      return contentTypePrompts.filter(p => p.category !== "Controles de Câmera").sort(sortByClicks);
    }
    if (selectedCategory === "Novos") {
      return contentTypePrompts.filter(p => p.category !== "Controles de Câmera").sort(sortByDate).slice(0, 16);
    }
    if (selectedCategory === "Grátis") {
      return contentTypePrompts.filter(p => !p.isPremium && p.category !== "Controles de Câmera").sort(sortByDate);
    }

    // For specific categories - filter and sort by date
    return contentTypePrompts.filter(p => p.category === selectedCategory).sort(sortByDate);
  };
  const filteredPrompts = getFilteredAndSortedPrompts();
  const totalPages = Math.ceil(filteredPrompts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPrompts = filteredPrompts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Categories - Controles de Câmera only for exclusive, Populares comes first before Ver Tudo
  const categories = contentType === "exclusive" ? ["Populares", "Ver Tudo", "Novos", "Grátis", "Selos 3D", "Fotos", "Cenários", "Movies para Telão", "Controles de Câmera"] : ["Populares", "Ver Tudo", "Novos", "Selos 3D", "Fotos", "Cenários"];

  // Helper function to get category icon
  const getCategoryIcon = (category: string) => {
    if (category === "Populares") {
      return <Flame className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />;
    }
    return null;
  };

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

      // Track the click and increment counter locally if it's a new click
      const promptId = String(promptItem.id);
      const wasTracked = await trackPromptClick(promptId, promptItem.title, !!promptItem.isExclusive);
      if (wasTracked) {
        // Increment local counter with animation
        setClickIncrements(prev => ({
          ...prev,
          [promptId]: (prev[promptId] || 0) + 1
        }));

        // Trigger animation
        setAnimatingClicks(prev => new Set(prev).add(promptId));
        setTimeout(() => {
          setAnimatingClicks(prev => {
            const next = new Set(prev);
            next.delete(promptId);
            return next;
          });
        }, 300);
      }
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Erro ao copiar prompt");
    }
  };
  const downloadFile = async (url: string, filename: string, isPremiumContent: boolean = false) => {
    try {
      // Get signed URL for secure download
      const signedUrl = await getSecureDownloadUrl(url, isPremiumContent);
      const response = await fetch(signedUrl);
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
      toast.error("Erro ao baixar arquivo");
    }
  };
  const downloadMedia = async (mediaUrl: string, title: string, referenceImages?: string[], isPremiumContent: boolean = false) => {
    const isVideo = isVideoUrl(mediaUrl);
    const extension = isVideo ? 'mp4' : 'jpg';
    const baseTitle = title.toLowerCase().replace(/\s+/g, "-");

    // Download main media
    await downloadFile(mediaUrl, `${baseTitle}.${extension}`, isPremiumContent);

    // Download reference images if it's a video with references
    if (isVideo && referenceImages && referenceImages.length > 0) {
      for (let i = 0; i < referenceImages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await downloadFile(referenceImages[i], `${baseTitle}-ref-${i + 1}.jpg`, isPremiumContent);
      }
      toast.success(`Vídeo e ${referenceImages.length} imagem(ns) de referência baixados!`);
    } else {
      toast.success(`${isVideo ? 'Vídeo' : 'Imagem'} "${title}" baixado!`);
    }
  };
  const handleItemClick = (item: PromptItem) => {
    // Update URL with item ID for sharing
    setSearchParams({
      item: String(item.id)
    });
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
      {/* Top Bar - Desktop */}
      <header className="hidden lg:flex bg-card border-b border-border px-6 py-3 items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={logoHorizontal} alt="Arcano Lab" className="h-10 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')} />
        </div>
        <div className="flex items-center gap-3">
          {!isPremium && <>
            <Button onClick={() => navigate("/login")} variant="ghost" size="sm">
              <LogIn className="h-4 w-4 mr-2" />
              Login
            </Button>
            <Button onClick={() => navigate("/planos")} size="sm" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white">
              <Star className="h-3 w-3 mr-2" fill="currentColor" />
              Torne-se Premium
            </Button>
          </>}
          {isPremium && <>
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
              <Star className="h-3 w-3 mr-1" fill="currentColor" />
              Premium Ativo
            </Badge>
            <Button onClick={() => navigate("/profile-settings")} variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Meu Perfil
            </Button>
            <Button onClick={logout} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </>}
        </div>
      </header>

      {/* Top Bar - Mobile */}
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
        {isPremium && <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
              <Star className="h-3 w-3 mr-1" fill="currentColor" />
              Premium
            </Badge>
            <Button onClick={() => navigate("/profile-settings")} size="sm" variant="ghost" className="text-white hover:bg-white/20 p-1.5">
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={logout} size="sm" variant="ghost" className="text-white hover:bg-white/20 p-1.5">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>}
      </header>

      {/* Mobile Bottom Menu Button */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50" data-tutorial="mobile-menu">
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
          lg:pt-4
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Logo only on mobile sidebar */}
          <div className="mb-6 flex justify-center lg:hidden">
            <img src={logoHorizontal} alt="Arcano Lab" className="w-[70%] mb-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')} />
          </div>

          {/* Install App Button */}
          <Button onClick={() => navigate("/install")} className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold mb-2">
            <Smartphone className="h-4 w-4 mr-2" />
            Instalar App
          </Button>

          {/* Premium Badge - only show badge, buttons moved to top bar */}
          {isPremium && <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
              <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
              <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">Premium Ativo</span>
            </div>}

          {/* Login/Premium buttons for non-premium users only */}
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
          <div data-tutorial="ai-tools" className="space-y-3">
          {externalLinks.map(link => <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full h-auto py-4 px-4 flex items-center justify-between text-left hover:bg-secondary hover:scale-105 transition-all duration-300 border-border">
                <span className="font-medium text-foreground">{link.name}</span>
                <ExternalLink className="h-5 w-5 ml-2 flex-shrink-0 text-muted-foreground" />
              </Button>
            </a>)}
          </div>
          <a href="https://labs.google/fx/pt/tools/flow" target="_blank" rel="noopener noreferrer" className="block mt-3">
            <Button variant="outline" className="w-full h-auto py-4 px-4 flex items-center justify-between text-left hover:bg-secondary hover:scale-105 transition-all duration-300 border-border">
              <span className="font-medium text-foreground">Gerar Video no VEO 3</span>
              <Video className="h-5 w-5 ml-2 flex-shrink-0 text-muted-foreground" />
            </Button>
          </a>
          <Button onClick={() => navigate("/contribuir")} className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold mt-4">
            Envie o seu prompt 
          </Button>

          {/* Push Notifications Button */}
          {pushSupported && <Button onClick={async () => {
          if (pushSubscribed) {
            await pushUnsubscribe();
          } else {
            // Clear dismissed state to allow re-subscription
            localStorage.removeItem("push-notification-dismissed");
            localStorage.removeItem("push-notification-dismissed-time");
            await pushSubscribe();
          }
        }} disabled={pushLoading} variant={pushSubscribed ? "outline" : "default"} className={`w-full mt-2 font-semibold ${pushSubscribed ? "border-border hover:bg-secondary" : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white"}`}>
              {pushSubscribed ? <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Desativar Notificações
                </> : <>
                  <Bell className="h-4 w-4 mr-2" />
                  Ativar Notificações
                </>}
            </Button>}

          {/* Tutorial button */}
          <Button onClick={() => {
          localStorage.removeItem("biblioteca-tutorial-completed");
          setShowOnboarding(true);
        }} variant="ghost" className="w-full mt-4 text-muted-foreground hover:text-foreground">
            <HelpCircle className="h-4 w-4 mr-2" />
            Ver tutorial novamente
          </Button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background pb-24 lg:pb-8 overflow-x-hidden max-w-full">
          {/* Mobile Install App Button */}
          <Button onClick={() => navigate("/install")} className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold mb-4 lg:hidden">
            <Smartphone className="h-4 w-4 mr-2" />
            Instalar App
          </Button>

          {/* Arcane AI Studio Card */}
          <Card className="mb-6 sm:mb-8 p-4 sm:p-6 lg:p-8 bg-gradient-primary text-primary-foreground shadow-hover bg-primary">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
              <Zap className="h-8 w-8 sm:h-12 sm:w-12 flex-shrink-0" />
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Arcane AI Studio</h1>
                <p className="text-sm sm:text-base lg:text-lg opacity-90">
                  Acesse nossas ferramentas de IA exclusivas para potenciar seus resultados e facilitar seu dia a dia.
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setShowArcaneStudioModal(true)}
              variant="secondary" 
              size="default" 
              className="mt-2 sm:mt-4 font-semibold hover:scale-105 transition-transform bg-white text-primary hover:bg-white/90 text-sm sm:text-base"
            >
              <Zap className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Acessar Ferramentas
            </Button>
          </Card>

          {/* Page Title and Content Type Tabs */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-foreground">Biblioteca de Prompts</h2>
            <p className="text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 text-muted-foreground">Explore nossa coleção de prompts para criar projetos incríveis com IA</p>
            
            {/* Content Type Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button variant={contentType === "exclusive" ? "default" : "outline"} onClick={() => {
              setContentType("exclusive");
              setSelectedCategory("Ver Tudo");
            }} size="sm" className={`text-xs sm:text-sm font-semibold ${contentType === "exclusive" ? "bg-gradient-primary hover:opacity-90 text-white" : "hover:bg-secondary border-border"}`}>
                <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Arquivos Exclusivos
              </Button>
              <Button variant={contentType === "community" ? "default" : "outline"} onClick={() => {
              setContentType("community");
              setSelectedCategory("Ver Tudo");
            }} size="sm" className={`text-xs sm:text-sm font-semibold ${contentType === "community" ? "bg-gradient-primary hover:opacity-90 text-white" : "hover:bg-secondary border-border"}`}>
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Comunidade
              </Button>
            </div>

            {/* Category Filters */}
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              {categories.map(cat => <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} onClick={() => setSelectedCategory(cat)} size="sm" className={`text-[11px] sm:text-xs px-2 sm:px-3 ${selectedCategory === cat ? "bg-gradient-primary hover:opacity-90 text-white" : "hover:bg-secondary hover:text-primary border-border"}`}>
                  {getCategoryIcon(cat)}
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
                  {/* Media Preview - always load without premium check for preview, access control is on copy/download */}
                  <div className="aspect-square overflow-hidden bg-secondary relative">
                    {isVideo ? <>
                        <SecureVideo src={item.imageUrl} isPremium={false} className="w-full h-full object-cover cursor-pointer" muted loop autoPlay playsInline onClick={() => handleItemClick(item)} />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-black/50 rounded-full p-3">
                            <Play className="h-8 w-8 text-white" fill="white" />
                          </div>
                        </div>
                      </> : <SecureImage src={item.imageUrl} alt={item.title} isPremium={false} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer" onClick={() => handleItemClick(item)} />}
                    {item.isPremium && !isPremium && <div className="absolute top-2 right-2 bg-black/60 rounded-full p-2">
                        <Lock className="h-5 w-5 text-white" />
                      </div>}
                  </div>

                  {/* Card Content */}
                  <div className="p-3 sm:p-5 space-y-2 sm:space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-lg text-foreground mb-1 sm:mb-2 line-clamp-2">{item.title}</h3>
                        {getBadgeContent(item)}
                      </div>
                      <Badge variant="secondary" className={`bg-primary/10 text-primary flex items-center gap-1 shrink-0 text-[10px] sm:text-xs transition-transform duration-300 ${animatingClicks.has(String(item.id)) ? 'scale-125' : ''}`}>
                        <Copy className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {(item.clickCount || 0) + (item.bonusClicks || 0) + (clickIncrements[String(item.id)] || 0)}
                      </Badge>
                    </div>

                    {/* Prompt Box - Hidden for premium items when user is not premium */}
                    {canAccess && <div className="bg-secondary p-2 sm:p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-3">{item.prompt}</p>
                      </div>}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      {canAccess ?
                  // Check if user has reached daily limit for premium items
                  item.isPremium && hasReachedLimit && hasLimitPlan ? <Button onClick={() => setShowLimitModal(true)} size="sm" className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white text-xs sm:text-sm">
                            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            Limite diário atingido
                          </Button> : <>
                            <Button onClick={() => copyToClipboard(item)} size="sm" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity text-white text-xs sm:text-sm" data-tutorial="copy-prompt">
                              <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              Copiar Prompt {item.isPremium && hasLimitPlan && `(${remainingCopies} restantes)`}
                            </Button>
                            <Button onClick={() => downloadMedia(item.imageUrl, item.title, item.referenceImages, item.isPremium)} variant="outline" size="sm" className="w-full border-border hover:bg-secondary text-xs sm:text-sm">
                              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              Baixar Referência
                            </Button>
                          </> : <Button onClick={() => navigate("/planos")} size="sm" className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white text-xs sm:text-sm">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" fill="currentColor" />
                          Torne-se Premium
                        </Button>}
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
                    {isVideoUrl(selectedPrompt.imageUrl) ? <SecureVideo src={selectedPrompt.imageUrl} isPremium={false} className="w-full h-auto max-h-[50vh] object-contain bg-black" controls autoPlay playsInline /> : <SecureImage src={selectedPrompt.imageUrl} alt={selectedPrompt.title} isPremium={false} className="w-full h-auto max-h-[50vh] object-contain bg-black" />}
                  </div>
                  <div className="p-4 space-y-3 flex-shrink-0">
                    <h3 className="font-bold text-lg text-foreground">{selectedPrompt.title}</h3>
                    <div className="bg-secondary p-3 rounded-lg max-h-24 overflow-y-auto">
                      <p className="text-xs text-muted-foreground">{selectedPrompt.prompt}</p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {selectedPrompt.isPremium && hasReachedLimit && hasLimitPlan ? <Button onClick={() => {
                    handleCloseModal();
                    setShowLimitModal(true);
                  }} className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white" size="sm">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Limite atingido
                        </Button> : <>
                          <Button onClick={() => copyToClipboard(selectedPrompt)} className="flex-1 bg-gradient-primary hover:opacity-90 text-white" size="sm">
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar Prompt
                          </Button>
                          <Button onClick={() => downloadMedia(selectedPrompt.imageUrl, selectedPrompt.title, selectedPrompt.referenceImages, selectedPrompt.isPremium)} variant="outline" className="flex-1 border-border hover:bg-secondary" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Baixar {isVideoUrl(selectedPrompt.imageUrl) ? 'Vídeo' : 'Imagem'}
                          </Button>
                        </>}
                      {selectedPrompt.tutorialUrl && <Button onClick={() => openTutorial(selectedPrompt.tutorialUrl!)} variant="outline" className="w-full border-red-500 text-red-500 hover:bg-red-500/10" size="sm">
                          <Youtube className="h-4 w-4 mr-2" />
                          Tutorial
                        </Button>}
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
                    {isVideoUrl(premiumModalItem.imageUrl) ? <SecureVideo src={premiumModalItem.imageUrl} isPremium={false} className="w-full h-auto max-h-[40vh] object-contain bg-black" controls playsInline /> : <SecureImage src={premiumModalItem.imageUrl} alt={premiumModalItem.title} isPremium={false} className="w-full h-auto max-h-[40vh] object-contain bg-black" />}
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
              {tutorialUrl && <div className="aspect-video">
                  <iframe src={tutorialUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>}
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
      {collectionSlug && <CollectionModal slug={collectionSlug} onClose={() => {
      setCollectionSlug(null);
      searchParams.delete("colecao");
      setSearchParams(searchParams);
    }} />}

      {/* Onboarding Tutorial */}
      {showOnboarding && <OnboardingTutorial onComplete={() => setShowOnboarding(false)} />}

      {/* Arcane AI Studio Modal */}
      <ArcaneAIStudioModal 
        open={showArcaneStudioModal} 
        onOpenChange={setShowArcaneStudioModal}
        isPremium={isPremium}
        planType={planType}
        isLoggedIn={!!user}
      />
    </div>;
};
export default BibliotecaPrompts;