import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExternalLink, Copy, Download, Zap, Sparkles, X, Play, ChevronLeft, ChevronRight, Video, Star, Lock, LogIn, Smartphone, Menu, Youtube, AlertTriangle, Users, Flame, LogOut, Settings, User, Phone, Coins } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useDailyPromptLimit } from "@/hooks/useDailyPromptLimit";
import { trackPromptClick } from "@/hooks/usePromptClickTracker";
import { useUpscalerCredits } from "@/hooks/useUpscalerCredits";
import promptclubLogo from "@/assets/promptclub_horizontal.png";
import CollectionModal from "@/components/CollectionModal";
import { SecureImage, SecureVideo, getSecureDownloadUrl } from "@/components/SecureMedia";
import LazyVideo from "@/components/LazyVideo";
import { useTranslation } from "react-i18next";
import ExpiredSubscriptionModal from "@/components/ExpiredSubscriptionModal";
import ExpiringSubscriptionModal from "@/components/ExpiringSubscriptionModal";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import PushNotificationPrompt from "@/components/PushNotificationPrompt";
import { useOptimizedPrompts, PromptItem } from "@/hooks/useOptimizedPrompts";
const isVideoUrl = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

const ITEMS_PER_PAGE = 16;

// Category slug conversion functions
const categoryToSlug = (category: string): string => {
  return category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, '-'); // Spaces to hyphens
};

const slugToCategory = (slug: string, categories: string[]): string | null => {
  return categories.find(cat => categoryToSlug(cat) === slug) || null;
};
const BibliotecaPrompts = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation('prompts');

  // Check for collection slug in URL first
  const colecaoParam = searchParams.get("colecao");
  
  const {
    user,
    isPremium,
    planType,
    logout,
    hasExpiredSubscription,
    expiredPlanType,
    expiringStatus
  } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading } = useUpscalerCredits(user?.id);
  const [userProfile, setUserProfile] = useState<{name?: string; phone?: string} | null>(null);
  const {
    copiesUsed,
    remainingCopies,
    hasReachedLimit,
    recordCopy
  } = useDailyPromptLimit(user, planType);
  const [contentType, setContentType] = useState<"exclusive" | "community">("exclusive");
  const [selectedCategory, setSelectedCategory] = useState<string>("Ver Tudo");
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [premiumModalItem, setPremiumModalItem] = useState<PromptItem | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [tutorialUrl, setTutorialUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collectionSlug, setCollectionSlug] = useState<string | null>(colecaoParam);
  const [clickIncrements, setClickIncrements] = useState<Record<string, number>>({});
  const [animatingClicks, setAnimatingClicks] = useState<Set<string>>(new Set());
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [showExpiringModal, setShowExpiringModal] = useState(false);
  

  // Use optimized hook for fetching prompts
  const { allPrompts, getFilteredPrompts } = useOptimizedPrompts();

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('id', user.id)
        .single();
      if (data) setUserProfile(data);
    };
    fetchProfile();
  }, [user]);

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

  // Show expired subscription modal once per session
  useEffect(() => {
    if (user && hasExpiredSubscription && expiredPlanType) {
      const modalShownKey = `expired_modal_shown_${user.id}`;
      const alreadyShown = sessionStorage.getItem(modalShownKey);
      
      if (!alreadyShown) {
        setShowExpiredModal(true);
        sessionStorage.setItem(modalShownKey, 'true');
      }
    }
  }, [user, hasExpiredSubscription, expiredPlanType]);

  // Show expiring subscription modal once per session (for today/tomorrow)
  useEffect(() => {
    if (user && isPremium && expiringStatus) {
      const modalShownKey = `expiring_modal_shown_${user.id}_${expiringStatus}`;
      const alreadyShown = sessionStorage.getItem(modalShownKey);
      
      if (!alreadyShown) {
        setShowExpiringModal(true);
        sessionStorage.setItem(modalShownKey, 'true');
      }
    }
  }, [user, isPremium, expiringStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, contentType]);

  // Categories - Controles de Câmera only for exclusive, Populares comes first before Ver Tudo
  const categories = contentType === "exclusive" 
    ? ["Populares", "Ver Tudo", "Novos", "Grátis", "Selos 3D", "Fotos", "Cenários", "Logo", "Movies para Telão", "Controles de Câmera"] 
    : ["Populares", "Ver Tudo", "Novos", "Selos 3D", "Fotos", "Cenários", "Logo"];

  // Category display names for i18n
  const getCategoryDisplayName = (category: string): string => {
    const categoryMap: Record<string, string> = {
      "Populares": t('categories.popular'),
      "Ver Tudo": t('categories.seeAll'),
      "Novos": t('categories.new'),
      "Grátis": t('categories.free'),
      "Selos 3D": t('categories.seals3D'),
      "Fotos": t('categories.photos'),
      "Cenários": t('categories.scenarios'),
      "Logo": t('categories.logo'),
      "Movies para Telão": t('categories.moviesForScreen'),
      "Controles de Câmera": t('categories.cameraControls'),
    };
    return categoryMap[category] || category;
  };

  // Read category from URL on mount and when searchParams change
  useEffect(() => {
    const categoriaUrl = searchParams.get('categoria');
    if (categoriaUrl) {
      const categoryFound = slugToCategory(categoriaUrl, categories);
      if (categoryFound && categoryFound !== selectedCategory) {
        setSelectedCategory(categoryFound);
      }
    }
    setCategoriesLoaded(true);
  }, [searchParams, contentType]);

  // Handle category selection and update URL
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    const newParams = new URLSearchParams(searchParams);
    
    if (category === 'Ver Tudo') {
      newParams.delete('categoria');
    } else {
      newParams.set('categoria', categoryToSlug(category));
    }
    
    // Preserve other params like 'item' and 'colecao'
    setSearchParams(newParams, { replace: true });
  };
  // Use memoized filtered prompts from the optimized hook
  const filteredPrompts = useMemo(() => {
    return getFilteredPrompts(contentType, selectedCategory);
  }, [contentType, selectedCategory, getFilteredPrompts]);

  const totalPages = Math.ceil(filteredPrompts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPrompts = filteredPrompts.slice(startIndex, startIndex + ITEMS_PER_PAGE);


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
      toast.success(t('toast.promptCopied', { title: promptItem.title }));

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
      toast.error(t('toast.copyError'));
    }
  };
  const downloadFile = async (url: string, filename: string, isPremiumContent: boolean = false) => {
    try {
      // Get signed URL for secure download
      const signedUrl = await getSecureDownloadUrl(url);
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
      toast.error(t('toast.downloadError'));
    }
  };
  const downloadMedia = async (mediaUrl: string, title: string, referenceImages?: string[], isPremiumContent: boolean = false, thumbnailUrl?: string) => {
    const isVideo = isVideoUrl(mediaUrl);
    const baseTitle = title.toLowerCase().replace(/\s+/g, "-");

    if (isVideo) {
      // Para vídeos, baixar apenas imagens (thumbnail ou referências)
      let imagesDownloaded = 0;
      
      // Primeiro, baixa o thumbnail se existir
      if (thumbnailUrl) {
        await downloadFile(thumbnailUrl, `${baseTitle}-thumbnail.jpg`, isPremiumContent);
        imagesDownloaded++;
      }
      
      // Depois, baixa as imagens de referência se existirem
      if (referenceImages && referenceImages.length > 0) {
        for (let i = 0; i < referenceImages.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          await downloadFile(referenceImages[i], `${baseTitle}-ref-${i + 1}.jpg`, isPremiumContent);
          imagesDownloaded++;
        }
      }
      
      if (imagesDownloaded > 0) {
        toast.success(t('toast.referenceImagesDownloaded', { count: imagesDownloaded }));
      } else {
        toast.error(t('toast.noReferenceImages'));
      }
    } else {
      // Para imagens, baixa normalmente
      await downloadFile(mediaUrl, `${baseTitle}.jpg`, isPremiumContent);
      toast.success(t('toast.imageDownloaded', { title }));
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
    // Se for um código iframe, extrair o src
    if (url.includes('<iframe')) {
      const srcMatch = url.match(/src=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1]) {
        return srcMatch[1];
      }
    }
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
    return url;
  };
  const openTutorial = (url: string) => {
    setTutorialUrl(getEmbedUrl(url));
    setShowTutorialModal(true);
  };
  const externalLinks = [{
    name: t('sidebar.generateInChatGPT'),
    url: "https://chatgpt.com/",
    icon: Sparkles
  }, {
    name: t('sidebar.generateInNanoBanana'),
    url: "https://labs.google/fx/pt/tools/flow",
    icon: Sparkles
  }, {
    name: t('sidebar.generateInWhisk'),
    url: "https://labs.google/fx/pt/tools/whisk",
    icon: Sparkles
  }, {
    name: t('sidebar.generateInFlux2'),
    url: "https://www.runninghub.ai/workflow/1995538803421020162",
    icon: Sparkles
  }];
  const getBadgeContent = (item: PromptItem) => {
    return <div className="flex flex-wrap gap-1">
        {/* Premium or Grátis badge - always show one */}
        {item.isPremium ? <Badge className="bg-gradient-to-r from-purple-600 to-blue-500 text-white border-0 text-[10px] sm:text-xs">
            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" fill="currentColor" />
            {t('badges.premium')}
          </Badge> : <Badge variant="outline" className="border-green-500 text-green-400 text-[10px] sm:text-xs">
            {t('badges.free')}
          </Badge>}
        {/* Tutorial badge */}
        {item.tutorialUrl && <Badge className="bg-red-600 text-white border-0 text-[10px] sm:text-xs">
            <Youtube className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
            {t('badges.tutorial')}
          </Badge>}
        {/* Community badge */}
        {item.isCommunity && <Badge variant="secondary" className="bg-purple-900/50 text-purple-200 text-[10px] sm:text-xs">
            {t('badges.community')}
          </Badge>}
      </div>;
  };

  // Profile Dropdown Component
  const ProfileDropdown = ({ isMobile = false }: { isMobile?: boolean }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`${isMobile ? 'text-white hover:bg-white/20' : 'text-purple-300 hover:text-white hover:bg-purple-500/20'} rounded-full`}
        >
          <User className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 bg-[#1A0A2E] border-purple-500/30 text-white"
      >
        <DropdownMenuLabel className="text-purple-200">
          <div className="flex flex-col gap-1">
            <span className="font-medium">
              {userProfile?.name || user?.email?.split('@')[0] || 'Meu Perfil'}
            </span>
            <span className="text-xs text-purple-400 font-normal">
              {user?.email}
            </span>
          </div>
        </DropdownMenuLabel>
        
        {userProfile?.phone && (
          <div className="px-2 py-1.5 text-sm text-purple-300 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" />
            {userProfile.phone}
          </div>
        )}
        
        <DropdownMenuSeparator className="bg-purple-500/20" />
        
        <div className="px-2 py-2 flex items-center justify-between">
          <span className="text-sm text-purple-300 flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            Créditos
          </span>
          <Badge className="bg-purple-600 text-white">
            {creditsLoading ? '...' : credits}
          </Badge>
        </div>
        
        <DropdownMenuSeparator className="bg-purple-500/20" />
        
        <DropdownMenuItem 
          onClick={() => navigate('/change-password')}
          className="cursor-pointer hover:bg-purple-500/20 focus:bg-purple-500/20"
        >
          <Lock className="w-4 h-4 mr-2" />
          Alterar Senha
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => navigate('/profile-settings')}
          className="cursor-pointer hover:bg-purple-500/20 focus:bg-purple-500/20"
        >
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-purple-500/20" />
        
        <DropdownMenuItem 
          onClick={logout}
          className="cursor-pointer text-red-400 hover:bg-red-500/20 focus:bg-red-500/20 focus:text-red-400"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return <div className="min-h-screen bg-[#0D0221]">
      {/* Mobile Top Header */}
      {/* Top Bar - Desktop */}
      <header className="hidden lg:flex bg-[#0D0221]/80 backdrop-blur-lg border-b border-purple-500/20 px-6 py-3 items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <img alt="PromptClub" onClick={() => navigate('/')} src={promptclubLogo} className="h-8 cursor-pointer hover:opacity-80 transition-opacity" />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate("/parceiro-login")} variant="ghost" size="sm" className="text-purple-300 hover:text-white hover:bg-purple-500/20">
            <Users className="h-4 w-4 mr-2" />
            {t('header.partnerArea')}
          </Button>
          {!user && (
            <>
              <Button onClick={() => navigate("/login?redirect=/biblioteca-prompts")} variant="ghost" size="sm" className="text-purple-300 hover:text-white hover:bg-purple-500/20">
                <LogIn className="h-4 w-4 mr-2" />
                {t('header.login')}
              </Button>
              <Button onClick={() => navigate("/planos")} size="sm" className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white">
                <Star className="h-3 w-3 mr-2" fill="currentColor" />
                {t('header.becomePremium')}
              </Button>
            </>
          )}
          {user && !isPremium && (
            <>
              <Button onClick={() => navigate("/planos")} size="sm" className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white">
                <Star className="h-3 w-3 mr-2" fill="currentColor" />
                {t('header.becomePremium')}
              </Button>
              <Badge 
                variant="outline" 
                className="bg-purple-900/50 border-purple-500/30 text-purple-200 flex items-center gap-1.5 px-2.5 py-1"
              >
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span className="font-medium">
                  {creditsLoading ? '...' : credits}
                </span>
              </Badge>
              <ProfileDropdown />
            </>
          )}
          {isPremium && <>
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
              <Star className="h-3 w-3 mr-1" fill="currentColor" />
              {t('header.premiumActive')}
            </Badge>
            <Badge 
              variant="outline" 
              className="bg-purple-900/50 border-purple-500/30 text-purple-200 flex items-center gap-1.5 px-2.5 py-1"
            >
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <span className="font-medium">
                {creditsLoading ? '...' : credits}
              </span>
            </Badge>
            <ProfileDropdown />
          </>}
        </div>
      </header>

      {/* Top Bar - Mobile */}
      <header className="lg:hidden bg-[#0D0221]/95 backdrop-blur-lg px-4 py-3 flex items-center justify-between shadow-lg border-b border-purple-500/20 sticky top-0 z-50">
        <img alt="ArcanoApp" src="/lovable-uploads/87022a3f-e907-4bc8-83b0-3c6ef7ab69da.png" className="h-6" />
        {!user && (
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/login?redirect=/biblioteca-prompts")} size="sm" variant="ghost" className="text-purple-300 hover:bg-purple-500/20 text-xs">
              <LogIn className="h-4 w-4 mr-1" />
              {t('header.login')}
            </Button>
            <Button onClick={() => navigate("/planos")} size="sm" className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white text-xs">
              <Star className="h-3 w-3 mr-1" fill="currentColor" />
              Premium
            </Button>
          </div>
        )}
        {user && !isPremium && (
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/planos")} size="sm" className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white text-xs">
              <Star className="h-3 w-3 mr-1" fill="currentColor" />
              Premium
            </Button>
            <Badge className="bg-purple-900/50 border-purple-500/30 text-purple-200 text-xs px-2 py-0.5 flex items-center gap-1">
              <Coins className="w-3 h-3 text-yellow-400" />
              {creditsLoading ? '...' : credits}
            </Badge>
            <ProfileDropdown isMobile />
          </div>
        )}
        {isPremium && <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
              <Star className="h-3 w-3 mr-1" fill="currentColor" />
              Premium
            </Badge>
            <Badge className="bg-purple-900/50 border-purple-500/30 text-purple-200 text-xs px-2 py-0.5 flex items-center gap-1">
              <Coins className="w-3 h-3 text-yellow-400" />
              {creditsLoading ? '...' : credits}
            </Badge>
            <ProfileDropdown isMobile />
          </div>}
      </header>

      {/* Mobile Bottom Menu Button */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50" data-tutorial="mobile-menu">
        <Button onClick={() => setSidebarOpen(!sidebarOpen)} className="bg-purple-600 hover:bg-purple-700 text-white shadow-xl px-6 py-6 rounded-full">
          <Menu className="h-6 w-6 mr-2" />
          <span className="font-semibold">{t('mobileMenu.generateImage')}    </span>
        </Button>
      </div>

      {/* Overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-72 min-h-screen bg-[#1A0A2E] border-r border-purple-500/20 p-6 space-y-4
          transform transition-transform duration-300 ease-in-out
          lg:pt-4
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Logo only on mobile sidebar */}
          <div className="mb-6 flex justify-center lg:hidden">
            <img alt="ArcanoApp" className="w-[70%] mb-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')} src="/lovable-uploads/7fbeb2fd-d77d-4357-acff-1947c5565fad.png" />
          </div>

          {/* Install App Button */}
          <Button onClick={() => navigate("/install-app")} variant="outline" className="w-full bg-purple-900/50 border-purple-400/50 text-white hover:bg-purple-500/30 font-semibold mb-2">
            <Smartphone className="h-4 w-4 mr-2" />
            {t('sidebar.installApp')}
          </Button>

          {/* Premium Badge - only show badge, buttons moved to top bar */}
          {isPremium && <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
              <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
              <span className="text-sm font-semibold text-yellow-400">{t('sidebar.premiumActive')}</span>
            </div>}

          {/* Premium button for logged-in non-premium users */}
          {user && !isPremium && (
            <Button onClick={() => navigate("/planos")} className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white font-semibold mb-2">
              <Star className="h-4 w-4 mr-2" fill="currentColor" />
              {t('sidebar.becomePremium')}
            </Button>
          )}
          
          {/* Login button only for non-logged users */}
          {!user && (
            <>
              <Button onClick={() => navigate("/planos")} className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white font-semibold mb-2">
                <Star className="h-4 w-4 mr-2" fill="currentColor" />
                {t('sidebar.becomePremium')}
              </Button>
              <Button onClick={() => navigate("/login")} variant="outline" className="w-full bg-purple-900/50 border-purple-400/50 text-white hover:bg-purple-500/30 font-semibold mb-4">
                <LogIn className="h-4 w-4 mr-2" />
                {t('sidebar.makeLogin')}
              </Button>
            </>
          )}

          <h2 className="text-xl font-bold text-white mb-6">{t('sidebar.generateWithAI')}</h2>
          <div data-tutorial="ai-tools" className="space-y-3">
          {externalLinks.map(link => <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full h-auto py-4 px-4 flex items-center justify-between text-left bg-purple-900/40 border-purple-400/50 text-white hover:bg-purple-500/30 hover:scale-105 transition-all duration-300">
                <span className="font-medium">{link.name}</span>
                <ExternalLink className="h-5 w-5 ml-2 flex-shrink-0 text-purple-300" />
              </Button>
            </a>)}
          </div>
          <a href="https://labs.google/fx/pt/tools/flow" target="_blank" rel="noopener noreferrer" className="block mt-3">
            <Button variant="outline" className="w-full h-auto py-4 px-4 flex items-center justify-between text-left bg-purple-900/40 border-purple-400/50 text-white hover:bg-purple-500/30 hover:scale-105 transition-all duration-300">
              <span className="font-medium">{t('sidebar.generateVideoVEO3')}</span>
              <Video className="h-5 w-5 ml-2 flex-shrink-0 text-purple-300" />
            </Button>
          </a>

          {/* Botão Ferramentas de IA destacado */}
          <Button 
            onClick={() => navigate("/ferramentas-ia")} 
            className="w-full mt-6 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:opacity-90 text-white font-semibold h-auto py-4 px-4"
          >
            <Zap className="h-5 w-5 mr-2" />
            {t('sidebar.aiTools')}
          </Button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-[#0D0221] pb-24 lg:pb-8 overflow-x-hidden max-w-full">
          {/* Mobile Install App Button */}
          <Button onClick={() => navigate("/install-app")} variant="outline" className="w-full bg-purple-900/50 border-purple-400/50 text-white hover:bg-purple-500/30 font-semibold mb-4 lg:hidden">
            <Smartphone className="h-4 w-4 mr-2" />
            {t('sidebar.installApp')}
          </Button>

          {/* Banner Upscaler Arcano com Vídeo */}
          <div className="mb-6 sm:mb-8 relative w-full rounded-2xl overflow-hidden border border-purple-500/20">
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/5]">
              {/* Vídeo Desktop */}
              <video 
                className="absolute inset-0 w-full h-full object-cover hidden sm:block"
                autoPlay 
                loop 
                muted 
                playsInline
              >
                <source src="/videos/upscaler-promo-desktop.mp4" type="video/mp4" />
              </video>

              {/* Vídeo Mobile */}
              <video 
                className="absolute inset-0 w-full h-full object-cover block sm:hidden"
                autoPlay 
                loop 
                muted 
                playsInline
              >
                <source src="/videos/upscaler-promo-mobile.mp4" type="video/mp4" />
              </video>
              
              {/* Overlay gradiente para legibilidade */}
              <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
              
              {/* Conteúdo sobreposto */}
              <div className="absolute inset-0 flex items-end sm:items-center">
                <div className="p-4 sm:p-10 lg:p-14 w-full sm:max-w-xl">
                  <h2 className="text-base sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-4 leading-tight">
                    {t('banner.upscalerTitle')}
                  </h2>
                  <p className="text-[10px] sm:text-sm lg:text-base text-white/80 mb-3 sm:mb-8 leading-relaxed">
                    {t('banner.upscalerDescription')}
                  </p>
                  <div className="flex flex-row items-center gap-3 sm:gap-4">
                    <Button 
                      onClick={() => navigate("/planos-upscaler-arcano-69")}
                      className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm px-4 py-2 sm:px-8 sm:py-6 text-xs sm:text-base font-semibold rounded-lg transition-all hover:scale-105"
                    >
                      {t('banner.buyNow')}
                    </Button>
                    <button 
                      onClick={() => navigate("/ferramentas-ia")}
                      className="text-white/80 hover:text-white text-xs sm:text-base underline underline-offset-4 transition-colors"
                    >
                      {t('banner.alreadyPurchased')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page Title and Content Type Tabs */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{t('library.title')}</h2>
            <p className="text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 text-purple-300/80">{t('library.description')}</p>
            
            {/* Content Type Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button variant={contentType === "exclusive" ? "default" : "outline"} onClick={() => {
              setContentType("exclusive");
              handleCategorySelect("Ver Tudo");
            }} size="sm" className={`text-xs sm:text-sm font-semibold ${contentType === "exclusive" ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-900/40 hover:bg-purple-500/20 border-purple-400/50 text-purple-200"}`}>
                <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                {t('library.exclusiveFiles')}
              </Button>
              <Button variant={contentType === "community" ? "default" : "outline"} onClick={() => {
              setContentType("community");
              handleCategorySelect("Ver Tudo");
            }} size="sm" className={`text-xs sm:text-sm font-semibold ${contentType === "community" ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-900/40 hover:bg-purple-500/20 border-purple-400/50 text-purple-200"}`}>
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                {t('library.community')}
              </Button>
            </div>

            {/* Category Filters */}
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              {categories.map(cat => <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} onClick={() => handleCategorySelect(cat)} size="sm" className={`text-[11px] sm:text-xs px-2 sm:px-3 ${selectedCategory === cat ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-900/40 hover:bg-purple-500/20 border-purple-400/50 text-purple-200"}`}>
                  {getCategoryIcon(cat)}
                  {getCategoryDisplayName(cat)}
                </Button>)}
            </div>
          </div>

          {/* Prompts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {paginatedPrompts.map(item => {
            const isVideo = isVideoUrl(item.imageUrl);
            const canAccess = !item.isPremium || isPremium;
            return <Card key={item.id} className="overflow-hidden hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02] bg-[#1A0A2E] border-purple-500/20">
                  {/* Media Preview - Videos use lightweight thumbnail, actual video loads in modal */}
                  <div className="aspect-square overflow-hidden bg-[#0D0221] relative">
                    {isVideo ? (
                      <LazyVideo 
                        src={item.imageUrl}
                        className="w-full h-full"
                        onClick={() => handleItemClick(item)}
                      />
                    ) : (
                      <SecureImage 
                        src={item.imageUrl} 
                        alt={item.title} 
                        isPremium={false} 
                        loading="lazy" 
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer" 
                        onClick={() => handleItemClick(item)} 
                      />
                    )}
                    {item.isPremium && !isPremium && (
                      <div className="absolute top-2 right-2 bg-black/60 rounded-full p-2">
                        <Lock className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-3 sm:p-5 space-y-2 sm:space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-lg text-white mb-1 sm:mb-2 line-clamp-2">{item.title}</h3>
                        {getBadgeContent(item)}
                      </div>
                      {/* Click counter */}
                      <div className={`flex items-center gap-1 text-xs text-purple-400 ${animatingClicks.has(String(item.id)) ? 'scale-125' : ''} transition-transform`}>
                        <Copy className="h-3 w-3" />
                        <span>{(item.bonusClicks || 0) + (clickIncrements[String(item.id)] || 0)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => canAccess ? copyToClipboard(item) : handleItemClick(item)}
                        size="sm"
                        className={`flex-1 text-xs ${canAccess ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-900/50 text-purple-300'}`}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {t('card.copyPrompt')}
                      </Button>
                      <Button
                        onClick={() => handleItemClick(item)}
                        variant="outline"
                        size="sm"
                        className="text-xs bg-purple-900/40 border-purple-400/50 text-purple-100 hover:bg-purple-500/20 hover:text-white"
                      >
                        {t('card.details')}
                      </Button>
                    </div>
                  </div>
                </Card>;
          })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="bg-purple-900/40 border-purple-400/50 text-purple-100 hover:bg-purple-500/20 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-purple-200">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="bg-purple-900/40 border-purple-400/50 text-purple-100 hover:bg-purple-500/20 hover:text-white disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {/* Premium Modal */}
      <Dialog open={showPremiumModal} onOpenChange={handleClosePremiumModal}>
        <DialogContent className="max-w-lg bg-[#1A0A2E] border-purple-500/30 text-white">
          <div className="text-center p-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-purple-600 to-blue-500 rounded-full flex items-center justify-center mb-4">
              <Star className="h-10 w-10 text-white" fill="currentColor" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t('premiumModal.title')}</h2>
            <p className="text-purple-300 mb-6">{t('premiumModal.description')}</p>
            
            {premiumModalItem && (
              <div className="mb-6 rounded-lg overflow-hidden border border-purple-500/30">
                <SecureImage 
                  src={premiumModalItem.imageUrl} 
                  alt={premiumModalItem.title} 
                  isPremium={false}
                  className="w-full h-48 object-cover opacity-50"
                />
                <div className="p-3 bg-[#0D0221]">
                  <p className="font-semibold text-white">{premiumModalItem.title}</p>
                </div>
              </div>
            )}
            
            <Button 
              onClick={() => navigate("/planos")} 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white py-6 text-lg"
            >
              <Star className="h-5 w-5 mr-2" fill="currentColor" />
              {t('premiumModal.becomePremium')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prompt Detail Modal */}
      <Dialog open={!!selectedPrompt} onOpenChange={() => handleCloseModal()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1A0A2E] border-purple-500/30 text-white">
          {selectedPrompt && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedPrompt.title}</h2>
                  <div className="mt-2">{getBadgeContent(selectedPrompt)}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleCloseModal} className="text-purple-300 hover:text-white hover:bg-purple-500/20">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Media */}
              <div className="rounded-lg overflow-hidden border border-purple-500/30">
                {isVideoUrl(selectedPrompt.imageUrl) ? (
                  <SecureVideo 
                    src={selectedPrompt.imageUrl}
                    isPremium={selectedPrompt.isPremium}
                    className="w-full"
                    controls
                    autoPlay
                    loop
                  />
                ) : (
                  <SecureImage 
                    src={selectedPrompt.imageUrl}
                    alt={selectedPrompt.title}
                    isPremium={selectedPrompt.isPremium}
                    className="w-full"
                  />
                )}
              </div>

              {/* Reference Images */}
              {selectedPrompt.referenceImages && selectedPrompt.referenceImages.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-purple-200">{t('modal.referenceImages')}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedPrompt.referenceImages.map((img, idx) => (
                      <SecureImage 
                        key={idx}
                        src={img}
                        alt={`Reference ${idx + 1}`}
                        isPremium={selectedPrompt.isPremium}
                        className="w-full h-24 object-cover rounded-lg border border-purple-500/30"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt Text */}
              <div>
                <h3 className="font-semibold mb-2 text-purple-200">{t('modal.prompt')}</h3>
                <div className="bg-[#0D0221] border border-purple-500/30 rounded-lg p-4">
                  <p className="text-purple-100 whitespace-pre-wrap text-sm">{selectedPrompt.prompt}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => copyToClipboard(selectedPrompt)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {t('modal.copyPrompt')}
                </Button>
                <Button 
                  onClick={() => downloadMedia(
                    selectedPrompt.imageUrl, 
                    selectedPrompt.title, 
                    selectedPrompt.referenceImages,
                    selectedPrompt.isPremium,
                    selectedPrompt.thumbnailUrl
                  )}
                  variant="outline"
                  className="bg-purple-900/40 border-purple-400/50 text-purple-100 hover:bg-purple-500/20 hover:text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('modal.download')}
                </Button>
                {selectedPrompt.tutorialUrl && (
                  <Button 
                    onClick={() => openTutorial(selectedPrompt.tutorialUrl!)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {t('modal.watchTutorial')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tutorial Modal */}
      <Dialog open={showTutorialModal} onOpenChange={setShowTutorialModal}>
        <DialogContent className="max-w-4xl bg-[#1A0A2E] border-purple-500/30 p-0 overflow-hidden">
          <div className="aspect-video w-full">
            {tutorialUrl && (
              <iframe 
                src={tutorialUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Daily Limit Modal */}
      <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <DialogContent className="max-w-md bg-[#1A0A2E] border-purple-500/30 text-white">
          <div className="text-center p-6">
            <div className="w-20 h-20 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-10 w-10 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t('limitModal.title')}</h2>
            <p className="text-purple-300 mb-6">
              {t('limitModal.description', { limit: planType === 'arcano_basico' ? 10 : 24 })}
            </p>
            <Button 
              onClick={() => {
                setShowLimitModal(false);
                navigate("/planos");
              }} 
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white py-6"
            >
              {t('limitModal.upgrade')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Expired Subscription Modal */}
      <ExpiredSubscriptionModal 
        isOpen={showExpiredModal}
        onClose={() => setShowExpiredModal(false)}
        planType={expiredPlanType}
      />

      {/* Expiring Subscription Modal */}
      <ExpiringSubscriptionModal 
        isOpen={showExpiringModal}
        onClose={() => setShowExpiringModal(false)}
        expiringStatus={expiringStatus}
        planType={planType}
      />

      {/* Push Notification Prompt */}
      <PushNotificationPrompt />
    </div>;
};

export default BibliotecaPrompts;
