import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExternalLink, Copy, Download, Zap, Sparkles, X, Play, ChevronLeft, ChevronRight, Video, Star, Lock, LogIn, Smartphone, Menu, Youtube, AlertTriangle, Users, Flame } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useDailyPromptLimit } from "@/hooks/useDailyPromptLimit";
import { usePlanos2Access } from "@/hooks/usePlanos2Access";
import { trackPromptClick } from "@/hooks/usePromptClickTracker";
import { useUpscalerCredits } from "@/hooks/useUpscalerCredits";
import CollectionModal from "@/components/CollectionModal";
import { SecureImage, SecureVideo, getSecureDownloadUrl } from "@/components/SecureMedia";
import LazyVideo from "@/components/LazyVideo";
import { useTranslation } from "react-i18next";
import ExpiredSubscriptionModal from "@/components/ExpiredSubscriptionModal";
import ExpiringSubscriptionModal from "@/components/ExpiringSubscriptionModal";
import RunningHubBonusModal from "@/components/RunningHubBonusModal";
import { useOptimizedPrompts, PromptItem } from "@/hooks/useOptimizedPrompts";
import AppLayout from "@/components/layout/AppLayout";
import PromoToolsBanner from "@/components/PromoToolsBanner";

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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
};

const slugToCategory = (slug: string, categories: string[]): string | null => {
  return categories.find(cat => categoryToSlug(cat) === slug) || null;
};

const BibliotecaPrompts = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation('prompts');

  const colecaoParam = searchParams.get("colecao");

  const {
    user,
    isPremium,
    planType,
    hasExpiredSubscription,
    expiredPlanType,
    expiringStatus
  } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits } = useUpscalerCredits(user?.id);
  const { subscription: planos2Sub } = usePlanos2Access(user?.id);
  const {
    copiesUsed,
    remainingCopies,
    hasReachedLimit,
    recordCopy
  } = useDailyPromptLimit(user, planType, planos2Sub?.daily_prompt_limit);
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
  const [collectionSlug, setCollectionSlug] = useState<string | null>(colecaoParam);
  const [revealedPrompts, setRevealedPrompts] = useState<Set<string>>(new Set());
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [showExpiringModal, setShowExpiringModal] = useState(false);

  const { allPrompts, getFilteredPrompts } = useOptimizedPrompts();

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

  const categories = contentType === "exclusive" 
    ? ["Populares", "Ver Tudo", "Novos", "Grátis", "Selos 3D", "Fotos", "Cenários", "Logo", "Movies para Telão", "Controles de Câmera"] 
    : ["Populares", "Ver Tudo", "Novos", "Selos 3D", "Fotos", "Cenários", "Logo"];

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

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    const newParams = new URLSearchParams(searchParams);
    if (category === 'Ver Tudo') {
      newParams.delete('categoria');
    } else {
      newParams.set('categoria', categoryToSlug(category));
    }
    setSearchParams(newParams, { replace: true });
  };

  const filteredPrompts = useMemo(() => {
    return getFilteredPrompts(contentType, selectedCategory);
  }, [contentType, selectedCategory, getFilteredPrompts]);

  const totalPages = Math.ceil(filteredPrompts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPrompts = filteredPrompts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getCategoryIcon = (category: string) => {
    if (category === "Populares") {
      return <Flame className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />;
    }
    return null;
  };

  const hasLimitPlan = planType === "arcano_basico" || planType === "arcano_pro" || (planos2Sub?.daily_prompt_limit != null && planos2Sub.daily_prompt_limit > 0);

  const copyToClipboard = async (promptItem: PromptItem) => {
    if (promptItem.isPremium && hasLimitPlan) {
      if (hasReachedLimit) {
        setShowLimitModal(true);
        return;
      }
      const recorded = await recordCopy(String(promptItem.id));
      if (!recorded) {
        setShowLimitModal(true);
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(promptItem.prompt);
      toast.success(t('toast.promptCopied', { title: promptItem.title }));
      const promptId = String(promptItem.id);
      setRevealedPrompts(prev => new Set(prev).add(promptId));
      await trackPromptClick(promptId, promptItem.title, !!promptItem.isExclusive);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error(t('toast.copyError'));
    }
  };

  const downloadFile = async (url: string, filename: string, isPremiumContent: boolean = false) => {
    try {
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
      let imagesDownloaded = 0;
      if (thumbnailUrl) {
        await downloadFile(thumbnailUrl, `${baseTitle}-thumbnail.jpg`, isPremiumContent);
        imagesDownloaded++;
      }
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
      await downloadFile(mediaUrl, `${baseTitle}.jpg`, isPremiumContent);
      toast.success(t('toast.imageDownloaded', { title }));
    }
  };

  const handleItemClick = (item: PromptItem) => {
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
    searchParams.delete("item");
    setSearchParams(searchParams);
  };

  const handleClosePremiumModal = (open: boolean) => {
    setShowPremiumModal(open);
    if (!open) {
      setPremiumModalItem(null);
      searchParams.delete("item");
      setSearchParams(searchParams);
    }
  };

  const getEmbedUrl = (url: string): string => {
    if (url.includes('<iframe')) {
      const srcMatch = url.match(/src=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1]) return srcMatch[1];
    }
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  const openTutorial = (url: string) => {
    setTutorialUrl(getEmbedUrl(url));
    setShowTutorialModal(true);
  };

  const getBadgeContent = (item: PromptItem) => {
    return <div className="flex flex-wrap gap-1">
      {item.isPremium ? <Badge className="bg-gradient-to-r from-purple-600 to-blue-500 text-white border-0 text-[10px] sm:text-xs">
        <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" fill="currentColor" />
        {t('badges.premium')}
      </Badge> : <Badge variant="outline" className="border-green-500 text-green-400 text-[10px] sm:text-xs">
        {t('badges.free')}
      </Badge>}
      {item.tutorialUrl && <Badge className="bg-red-600 text-white border-0 text-[10px] sm:text-xs">
        <Youtube className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
        {t('badges.tutorial')}
      </Badge>}
      {item.isCommunity && <Badge variant="secondary" className="bg-purple-900/50 text-purple-200 text-[10px] sm:text-xs">
        {t('badges.community')}
      </Badge>}
    </div>;
  };

  return (
    <AppLayout>
      {/* Promo Banner */}
      <PromoToolsBanner />
      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8 bg-[#0D0221] pb-24 lg:pb-8 overflow-x-hidden max-w-full">
        {/* Mobile Install App Button */}
        <Button onClick={() => navigate("/install-app")} variant="outline" className="w-full bg-purple-900/50 border-purple-400/50 text-white hover:bg-purple-500/30 font-semibold mb-4 lg:hidden">
          <Smartphone className="h-4 w-4 mr-2" />
          {t('sidebar.installApp')}
        </Button>

        {/* Banner Upscaler Arcano com Vídeo */}
        <div className="mb-6 sm:mb-8 relative w-full rounded-2xl overflow-hidden border border-purple-500/20">
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/5]">
            <video className="absolute inset-0 w-full h-full object-cover hidden sm:block" autoPlay loop muted playsInline>
              <source src="/videos/upscaler-promo-desktop.mp4" type="video/mp4" />
            </video>
            <video className="absolute inset-0 w-full h-full object-cover block sm:hidden" autoPlay loop muted playsInline>
              <source src="/videos/upscaler-promo-mobile.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            <div className="absolute inset-0 flex items-end sm:items-center">
              <div className="p-4 sm:p-10 lg:p-14 w-full sm:max-w-xl">
                <h2 className="text-base sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-4 leading-tight">
                  {t('banner.upscalerTitle')}
                </h2>
                <p className="text-[10px] sm:text-sm lg:text-base text-white/80 mb-3 sm:mb-8 leading-relaxed">
                  {t('banner.upscalerDescription')}
                </p>
                <div className="flex flex-row items-center gap-3 sm:gap-4">
                  <Button onClick={() => navigate("/upscaler-selection")} className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm px-4 py-2 sm:px-8 sm:py-6 text-xs sm:text-base font-semibold rounded-lg transition-all hover:scale-105">
                    {t('banner.buyNow')}
                  </Button>
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
            <Button variant={contentType === "exclusive" ? "default" : "outline"} onClick={() => { setContentType("exclusive"); handleCategorySelect("Ver Tudo"); }} size="sm" className={`text-xs sm:text-sm font-semibold ${contentType === "exclusive" ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-900/40 hover:bg-purple-500/20 border-purple-400/50 text-purple-200"}`}>
              <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t('library.exclusiveFiles')}
            </Button>
            <Button variant={contentType === "community" ? "default" : "outline"} onClick={() => { setContentType("community"); handleCategorySelect("Ver Tudo"); }} size="sm" className={`text-xs sm:text-sm font-semibold ${contentType === "community" ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-900/40 hover:bg-purple-500/20 border-purple-400/50 text-purple-200"}`}>
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
              <div className="aspect-square overflow-hidden bg-[#0D0221] relative">
                {isVideo ? (
                  <LazyVideo src={item.imageUrl} className="w-full h-full" onClick={() => handleItemClick(item)} />
                ) : (
                  <SecureImage src={item.imageUrl} alt={item.title} isPremium={false} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer" onClick={() => handleItemClick(item)} />
                )}
                {item.isPremium && !isPremium && (
                  <div className="absolute top-2 right-2 bg-black/60 rounded-full p-2">
                    <Lock className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2">
                  <Badge variant="secondary" className="bg-purple-600/80 text-white text-[10px] flex items-center gap-1 w-fit">
                    <Copy className="h-2.5 w-2.5" />
                    {(item.clickCount || 0) + (item.bonusClicks || 0)}
                  </Badge>
                </div>
              </div>
              <div className="p-3 sm:p-5 space-y-2 sm:space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm sm:text-lg text-white mb-1 sm:mb-2 line-clamp-2">{item.title}</h3>
                    {getBadgeContent(item)}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button onClick={() => canAccess ? copyToClipboard(item) : handleItemClick(item)} size="sm" className={`flex-1 text-xs ${canAccess ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-900/50 text-purple-300'}`}>
                      <Copy className="h-3 w-3 mr-1" />
                      {t('card.copyPrompt')}
                    </Button>
                    <Button onClick={() => handleItemClick(item)} variant="outline" size="sm" className="text-xs bg-purple-900/40 border-purple-400/50 text-purple-100 hover:bg-purple-500/20 hover:text-white">
                      {t('card.details')}
                    </Button>
                  </div>
                  {item.category === 'Fotos' && !isVideoUrl(item.imageUrl) && (
                    <Button
                      onClick={() => {
                        if (item.isPremium && !isPremium) {
                          setPremiumModalItem(item);
                          setShowPremiumModal(true);
                        } else {
                          trackPromptClick(String(item.id), item.title, !!item.isExclusive);
                          navigate('/arcano-cloner-tool', { state: { referenceImageUrl: item.imageUrl } });
                        }
                      }}
                      size="sm"
                      className={`w-full text-xs ${item.isPremium && !isPremium ? 'bg-purple-900/60 hover:bg-purple-900/80 text-purple-300' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white'}`}
                    >
                      {item.isPremium && !isPremium ? (
                        <><Lock className="h-3 w-3 mr-1" />Exclusivo Premium</>
                      ) : (
                        <><Sparkles className="h-3 w-3 mr-1" />Gerar sua foto</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>;
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="bg-purple-900/40 border-purple-400/50 text-purple-100 hover:bg-purple-500/20 hover:text-white disabled:opacity-50">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-purple-200">{currentPage} / {totalPages}</span>
            <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="bg-purple-900/40 border-purple-400/50 text-purple-100 hover:bg-purple-500/20 hover:text-white disabled:opacity-50">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
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
                {isVideoUrl(premiumModalItem.imageUrl) ? (
                  <SecureVideo src={premiumModalItem.imageUrl} isPremium={false} className="w-full h-48 object-cover opacity-50" autoPlay muted loop playsInline controls={false} />
                ) : (
                  <SecureImage src={premiumModalItem.imageUrl} alt={premiumModalItem.title} isPremium={false} className="w-full h-48 object-cover opacity-50" />
                )}
                <div className="p-3 bg-[#0D0221]">
                  <p className="font-semibold text-white">{premiumModalItem.title}</p>
                </div>
              </div>
            )}
            <Button onClick={() => navigate("/planos-2")} className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white py-6 text-lg">
              <Star className="h-5 w-5 mr-2" fill="currentColor" />
              {t('premiumModal.becomePremium')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <div className="rounded-lg overflow-hidden border border-purple-500/30">
                {isVideoUrl(selectedPrompt.imageUrl) ? (
                  <SecureVideo src={selectedPrompt.imageUrl} isPremium={selectedPrompt.isPremium} className="w-full" controls autoPlay muted loop playsInline />
                ) : (
                  <SecureImage src={selectedPrompt.imageUrl} alt={selectedPrompt.title} isPremium={selectedPrompt.isPremium} className="w-full" />
                )}
              </div>
              {selectedPrompt.referenceImages && selectedPrompt.referenceImages.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-purple-200">{t('modal.referenceImages')}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedPrompt.referenceImages.map((img, idx) => (
                      <SecureImage key={idx} src={img} alt={`Reference ${idx + 1}`} isPremium={selectedPrompt.isPremium} className="w-full h-24 object-cover rounded-lg border border-purple-500/30" />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="font-semibold mb-2 text-purple-200">{t('modal.prompt')}</h3>
                <div className="bg-[#0D0221] border border-purple-500/30 rounded-lg p-4 relative">
                  {revealedPrompts.has(String(selectedPrompt.id)) ? (
                    <p className="text-purple-100 whitespace-pre-wrap text-sm">{selectedPrompt.prompt}</p>
                  ) : (
                    <>
                      <p className="text-purple-100 whitespace-pre-wrap text-sm blur-md select-none pointer-events-none">{selectedPrompt.prompt}</p>
                      <div className="absolute inset-0 flex items-center justify-center bg-[#0D0221]/60 rounded-lg">
                        <div className="text-center">
                          <Lock className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                          <p className="text-purple-300 text-sm">{t('modal.clickToCopy')}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => copyToClipboard(selectedPrompt)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
                  <Copy className="h-4 w-4 mr-2" />
                  {t('modal.copyPrompt')}
                </Button>
                <Button onClick={() => downloadMedia(selectedPrompt.imageUrl, selectedPrompt.title, selectedPrompt.referenceImages, selectedPrompt.isPremium, selectedPrompt.thumbnailUrl)} variant="outline" className="bg-purple-900/40 border-purple-400/50 text-purple-100 hover:bg-purple-500/20 hover:text-white">
                  <Download className="h-4 w-4 mr-2" />
                  {t('modal.download')}
                </Button>
                {selectedPrompt.tutorialUrl && (
                  <Button onClick={() => openTutorial(selectedPrompt.tutorialUrl!)} className="bg-red-600 hover:bg-red-700 text-white">
                    <Play className="h-4 w-4 mr-2" />
                    {t('modal.watchTutorial')}
                  </Button>
                )}
                {selectedPrompt.category === 'Fotos' && !isVideoUrl(selectedPrompt.imageUrl) && (
                  <Button
                    onClick={() => {
                      if (selectedPrompt.isPremium && !isPremium) {
                        setPremiumModalItem(selectedPrompt);
                        setShowPremiumModal(true);
                      } else {
                        trackPromptClick(String(selectedPrompt.id), selectedPrompt.title, !!selectedPrompt.isExclusive);
                        navigate('/arcano-cloner-tool', { state: { referenceImageUrl: selectedPrompt.imageUrl } });
                      }
                    }}
                    className={`w-full ${selectedPrompt.isPremium && !isPremium ? 'bg-purple-900/60 hover:bg-purple-900/80 text-purple-300' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white'}`}
                  >
                    {selectedPrompt.isPremium && !isPremium ? (
                      <><Lock className="h-4 w-4 mr-2" />Exclusivo Premium</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" />Gerar sua foto</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showTutorialModal} onOpenChange={setShowTutorialModal}>
        <DialogContent className="max-w-4xl bg-[#1A0A2E] border-purple-500/30 p-0 overflow-hidden">
          <div className="aspect-video w-full">
            {tutorialUrl && (
              <iframe src={tutorialUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
            <Button onClick={() => { setShowLimitModal(false); navigate("/planos-2"); }} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white py-6">
              {t('limitModal.upgrade')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {collectionSlug && (
        <CollectionModal slug={collectionSlug} onClose={() => { setCollectionSlug(null); searchParams.delete("colecao"); setSearchParams(searchParams); }} />
      )}

      <ExpiredSubscriptionModal isOpen={showExpiredModal} onClose={() => setShowExpiredModal(false)} planType={expiredPlanType} />
      <ExpiringSubscriptionModal isOpen={showExpiringModal} onClose={() => setShowExpiringModal(false)} expiringStatus={expiringStatus} planType={planType} />
      
    </AppLayout>
  );
};

export default BibliotecaPrompts;
