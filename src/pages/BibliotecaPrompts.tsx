import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExternalLink, Copy, Download, Zap, Sparkles, X, Play, ChevronLeft, ChevronRight, Video, Star, Lock, LogIn, Smartphone, Menu, Youtube, AlertTriangle, Users, Flame, Search, ChevronDown, Heart } from "lucide-react";
import { Instagram } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useDailyPromptLimit } from "@/hooks/useDailyPromptLimit";
import { usePremiumPromptLimit } from "@/hooks/usePremiumPromptLimit";
import { useCredits } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { trackPromptClick } from "@/hooks/usePromptClickTracker";
import CollectionModal from "@/components/CollectionModal";
import { SecureImage, SecureVideo, getSecureDownloadUrl } from "@/components/SecureMedia";
import LazyVideo from "@/components/LazyVideo";
import { useTranslation } from "react-i18next";
import ExpiredSubscriptionModal from "@/components/ExpiredSubscriptionModal";
import ExpiringSubscriptionModal from "@/components/ExpiringSubscriptionModal";
import Seedance2PromoBanner from "@/components/Seedance2PromoBanner";
import GptImagePromoBanner from "@/components/GptImagePromoBanner";
import arcanoClonerCover from "@/assets/arcano-cloner-cover.webp";
import removerFundoCover from "@/assets/removedor-fundo-capa.png";
import flyerMakerCover from "@/assets/flyer-maker-preview.webp";
import upscalerHeroCover from "@/assets/upscaler-hero-depois.webp";
import gerarImagemCover from "@/assets/gerar-imagem-cover.jpg";
import arcanoLogoAvatar from "@/assets/arcano-logo-avatar.png";

import { useOptimizedPrompts, PromptItem } from "@/hooks/useOptimizedPrompts";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAIToolSettings } from "@/hooks/useAIToolSettings";
import { useSmartSearch } from "@/hooks/useSmartSearch";
import { removeAccents } from "@/lib/synonyms";

const isVideoUrl = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

const ITEMS_PER_PAGE = 30;

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

interface PromptCategory {
  name: string;
  is_admin_only: boolean;
}

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
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits } = useCredits();
  const { planos2Subscription: planos2Sub } = useAuth();
  const {
    copiesUsed,
    remainingCopies,
    hasReachedLimit,
    recordCopy
  } = useDailyPromptLimit(user, planType, planos2Sub?.daily_prompt_limit);
  const {
    remainingUnlocks,
    dailyLimit: premiumDailyLimit,
    hasReachedLimit: premiumLimitReached,
    isUnlimited: isPremiumUnlimited,
    isPromptUnlocked,
    unlockPrompt,
  } = usePremiumPromptLimit(user, isPremium, planType);
  const [contentType, setContentType] = useState<"exclusive" | "community">("exclusive");
  const [selectedCategory, setSelectedCategory] = useState<string>("Ver Tudo");
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [dbCategories, setDbCategories] = useState<PromptCategory[]>([]);
  const [premiumModalItem, setPremiumModalItem] = useState<PromptItem | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [tutorialUrl, setTutorialUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [collectionSlug, setCollectionSlug] = useState<string | null>(colecaoParam);
  const [revealedPrompts, setRevealedPrompts] = useState<Set<string>>(new Set());
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [showExpiringModal, setShowExpiringModal] = useState(false);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

  const toolsScrollRef = useRef<HTMLDivElement>(null);
  const { getCreditCost } = useAIToolSettings();
  const { allPrompts, getFilteredPrompts } = useOptimizedPrompts();
  const { searchTerm, setSearchTerm, expandedTerms, isSearching } = useSmartSearch();

  useEffect(() => {
    const fetchPromptCategories = async () => {
      const { data, error } = await supabase
        .from('prompts_categories')
        .select('name, is_admin_only')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error loading prompt categories:', error);
        return;
      }

      setDbCategories((data ?? []).map((category) => ({
        name: category.name,
        is_admin_only: category.is_admin_only ?? false,
      })));
    };

    fetchPromptCategories();
  }, []);

  // Fetch like counts and user's likes
  useEffect(() => {
    const fetchLikes = async () => {
      const { data: counts } = await supabase.rpc("get_prompt_like_counts");
      if (counts) {
        const map: Record<string, number> = {};
        counts.forEach((r: any) => { map[r.prompt_id] = Number(r.like_count); });
        setLikeCounts(map);
      }
      if (user) {
        const { data: myLikes } = await supabase
          .from("prompt_likes")
          .select("prompt_id")
          .eq("user_id", user.id);
        if (myLikes) {
          setUserLikes(new Set(myLikes.map((l: any) => l.prompt_id)));
        }
      }
    };
    fetchLikes();
  }, [user]);

  const toggleLike = useCallback(async (e: React.MouseEvent, promptId: string) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Faça login para curtir");
      return;
    }
    const liked = userLikes.has(promptId);
    if (liked) {
      setUserLikes(prev => { const s = new Set(prev); s.delete(promptId); return s; });
      setLikeCounts(prev => ({ ...prev, [promptId]: Math.max(0, (prev[promptId] || 0) - 1) }));
      await supabase.from("prompt_likes").delete().eq("user_id", user.id).eq("prompt_id", promptId);
    } else {
      setUserLikes(prev => new Set(prev).add(promptId));
      setLikeCounts(prev => ({ ...prev, [promptId]: (prev[promptId] || 0) + 1 }));
      await supabase.from("prompt_likes").insert({ user_id: user.id, prompt_id: promptId });
    }
  }, [user, userLikes]);

  const categories = useMemo(() => {
    const baseCategories = contentType === "exclusive"
      ? ["Populares", "Ver Tudo", "Novos", "Grátis"]
      : ["Populares", "Ver Tudo", "Novos"];

    const availablePromptCategories = new Set(
      allPrompts
        .filter(prompt => contentType === "exclusive" ? prompt.isExclusive : prompt.isCommunity)
        .map(prompt => prompt.category)
        .filter((category): category is string => Boolean(category))
    );

    const orderedDynamicCategories = dbCategories
      .filter(category => contentType === "exclusive" || !category.is_admin_only)
      .map(category => category.name)
      .filter(categoryName => availablePromptCategories.has(categoryName));

    const fallbackDynamicCategories = Array.from(availablePromptCategories).filter(
      categoryName => !orderedDynamicCategories.includes(categoryName)
    );

    return [...baseCategories, ...orderedDynamicCategories, ...fallbackDynamicCategories];
  }, [allPrompts, contentType, dbCategories]);

  useEffect(() => {
    const itemId = searchParams.get("item");
    if (itemId && allPrompts.length > 0) {
      const item = allPrompts.find(p => p.id === itemId);
      if (item) {
        setSelectedPrompt(item);
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
  }, [selectedCategory, contentType, expandedTerms]);

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
      "Logos": t('categories.logo'),
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
  }, [searchParams, categories, selectedCategory]);

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
    let results = getFilteredPrompts(contentType, selectedCategory);
    
    // Apply smart search filter client-side
    if (isSearching && expandedTerms.length > 0) {
      results = results.filter(prompt => {
        const titleNorm = removeAccents(prompt.title.toLowerCase());
        const categoryNorm = removeAccents((prompt.category || '').toLowerCase());
        return expandedTerms.some(term => {
          const termNorm = removeAccents(term.toLowerCase());
          return titleNorm.includes(termNorm) || categoryNorm.includes(termNorm);
        });
      });
    }
    
    return results;
  }, [contentType, selectedCategory, getFilteredPrompts, isSearching, expandedTerms]);

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
    // Block non-subscribers from copying premium prompts
    if (promptItem.isPremium && !isPremium) {
      setPremiumModalItem(promptItem);
      setShowPremiumModal(true);
      return;
    }

    // Block premium prompts that haven't been unlocked today
    if (promptItem.isPremium && !isPromptUnlocked(String(promptItem.id))) {
      toast.error('Libere o prompt primeiro antes de copiar.');
      return;
    }

    if (!promptItem.isPremium && hasLimitPlan) {
      if (hasReachedLimit) {
        setShowLimitModal(true);
        return;
      }
    }

    // Copy to clipboard FIRST (must be synchronous with user gesture on mobile Safari)
    let clipboardSuccess = false;
    try {
      await navigator.clipboard.writeText(promptItem.prompt);
      clipboardSuccess = true;
    } catch {
      // Fallback for mobile browsers that block async clipboard
      try {
        const textArea = document.createElement('textarea');
        textArea.value = promptItem.prompt;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        clipboardSuccess = true;
      } catch (fallbackError) {
        console.error("Failed to copy:", fallbackError);
        toast.error(t('toast.copyError'));
        return;
      }
    }

    // Record the copy for daily limit tracking AFTER clipboard succeeds
    if (!promptItem.isPremium && hasLimitPlan) {
      const recorded = await recordCopy(String(promptItem.id));
      if (!recorded) {
        setShowLimitModal(true);
        return;
      }
    }

    if (clipboardSuccess) {
      toast.success(t('toast.promptCopied', { title: promptItem.title }));
      const promptId = String(promptItem.id);
      setRevealedPrompts(prev => new Set(prev).add(promptId));
      await trackPromptClick(promptId, promptItem.title, !!promptItem.isExclusive);
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
    setSelectedPrompt(item);
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
      {item.isCommunity && <Badge variant="secondary" className="bg-accent text-muted-foreground text-[10px] sm:text-xs">
        {t('badges.community')}
      </Badge>}
      {item.category && <Badge variant="outline" className="text-[10px] sm:text-xs text-muted-foreground">
        {getCategoryDisplayName(item.category)}
      </Badge>}
    </div>;
  };

  return (
    <AppLayout>
      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8 bg-background pb-24 lg:pb-8 overflow-x-hidden max-w-full">
        {/* Mobile Install App Button */}
        <Button onClick={() => navigate("/install-app")} variant="outline" className="w-full bg-accent border-border text-foreground hover:bg-accent0/30 font-semibold mb-4 lg:hidden">
          <Smartphone className="h-4 w-4 mr-2" />
          {t('sidebar.installApp')}
        </Button>

        {/* Banner GPT Image Promo */}
        <GptImagePromoBanner />

        {/* Banner Seedance 2 com Vídeo */}
        <Seedance2PromoBanner />

        {/* ===== AI Tools Quick Access Strip ===== */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              {t('library.aiTools', 'Ferramentas IA')}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/ferramentas-ia-aplicativo')}
              className="text-xs text-primary hover:text-primary/80 font-semibold"
            >
              {t('library.seeAll', 'Ver todas')} →
            </Button>
          </div>
          <div className="relative group/carousel">
            <div ref={toolsScrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[
              { name: 'Upscaler Arcano', desc: 'Melhorar qualidade de imagens com IA', cost: getCreditCost('Upscaler Arcano', 60), path: '/upscaler-arcano-tool', cover: upscalerHeroCover },
              { name: 'Arcano Cloner', desc: 'Crie ensaios fotográficos ultra realistas com IA', cost: getCreditCost('Arcano Cloner', 100), path: '/arcano-cloner-tool', cover: arcanoClonerCover },
              { name: 'Seedance 2.0', desc: 'Gerar vídeos IA', cost: getCreditCost('Seedance 2.0', 148), path: '/seedance2', video: '/videos/seedance2-promo.mp4', highlight: true },
              { name: 'Gerar Imagem', desc: 'Crie imagens do zero com IA', cost: getCreditCost('gerar_imagem', 60), path: '/gerar-imagem', cover: gerarImagemCover },
              { name: 'Gerar Vídeo', desc: 'Gere vídeos com Veo 3.1 e WAN 2.2', cost: getCreditCost('gerar_video', 700), path: '/gerar-video', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4' },
              { name: 'Veste AI', desc: 'Troque a roupa de qualquer foto com IA', cost: getCreditCost('Veste AI', 60), path: '/veste-ai-tool', cover: 'https://jooojbaljrshgpaxdlou.supabase.co/storage/v1/object/public/pack-covers/7c9f1816-d495-4e42-a618-ac5b948a7f9a.jpg' },
              { name: 'Pose Changer', desc: 'Mude a pose de qualquer foto com IA', cost: getCreditCost('Pose Changer', 60), path: '/pose-changer-tool', cover: 'https://jooojbaljrshgpaxdlou.supabase.co/storage/v1/object/public/pack-covers/45b9a004-d682-4d86-89d0-09a736040fa9.jpg' },
              { name: 'MovieLed Maker', desc: 'Gere movies para telão de LED com um clique', cost: getCreditCost('MovieLed Maker', 500), path: '/movieled-maker', cover: 'https://jooojbaljrshgpaxdlou.supabase.co/storage/v1/object/public/prompts-cloudinary/prompts-cloudinary/references/BOTECO-DO-LUAN-ref.jpg' },
              { name: 'Remover Fundo', desc: 'Remova o fundo de qualquer imagem com IA', cost: getCreditCost('Remover Fundo', 5), path: '/remover-fundo', cover: removerFundoCover },
              { name: 'Flyer Maker', desc: 'Crie flyers para eventos incríveis com IA', cost: getCreditCost('Flyer Maker', 100), path: '/flyer-maker', cover: flyerMakerCover },
              
            ].map((tool) => (
              <div
                key={tool.name}
                onClick={() => navigate(tool.path)}
                className={`flex-shrink-0 w-[200px] sm:w-[220px] rounded-xl overflow-hidden border bg-card cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group ${
                  tool.highlight
                    ? 'border-green-400 dark:border-green-600 hover:shadow-green-500/20'
                    : 'border-border hover:border-primary/30 hover:shadow-primary/10'
                }`}
              >
                <div className="aspect-[16/9] relative overflow-hidden">
                  {'video' in tool && tool.video ? (
                    <video className="w-full h-full object-cover" autoPlay loop muted playsInline>
                      <source src={tool.video} type="video/mp4" />
                    </video>
                  ) : 'cover' in tool && tool.cover ? (
                    <img src={tool.cover} alt={tool.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-primary/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-2.5">
                    <h3 className="font-bold text-xs sm:text-sm text-white leading-tight drop-shadow-lg">{tool.name}</h3>
                  </div>
                  <span className="absolute top-1.5 right-1.5 text-[9px] sm:text-[10px] font-bold text-white bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                    🪙 {tool.cost}
                  </span>
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-2 leading-snug">{tool.desc}</p>
                </div>
              </div>
            ))}
            </div>
            {/* Carousel arrows */}
            <button
              onClick={() => { if (toolsScrollRef.current) toolsScrollRef.current.scrollBy({ left: -440, behavior: 'smooth' }); }}
              className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 rounded-full bg-card border border-border shadow-lg items-center justify-center text-foreground hover:bg-accent transition-colors opacity-0 group-hover/carousel:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => { if (toolsScrollRef.current) toolsScrollRef.current.scrollBy({ left: 440, behavior: 'smooth' }); }}
              className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 rounded-full bg-card border border-border shadow-lg items-center justify-center text-foreground hover:bg-accent transition-colors opacity-0 group-hover/carousel:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Page Title and Content Type Tabs */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r dark:from-gray-200 dark:to-gray-400 from-purple-700 to-purple-500 bg-clip-text text-transparent">{t('library.title')}</h2>
          <p className="text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 text-muted-foreground">{t('library.description')}</p>

          {/* Content Type Tabs */}
          <div className="flex gap-2 mb-3">
            <Button variant={contentType === "exclusive" ? "default" : "outline"} onClick={() => { setContentType("exclusive"); handleCategorySelect("Ver Tudo"); }} size="sm" className={`text-xs font-semibold ${contentType === "exclusive" ? "bg-secondary hover:bg-secondary text-foreground" : "bg-accent hover:bg-accent0/20 border-border text-muted-foreground"}`}>
              <Star className="h-3.5 w-3.5 mr-1.5" />
              {t('library.exclusiveFiles')}
            </Button>
            <Button variant={contentType === "community" ? "default" : "outline"} onClick={() => { setContentType("community"); handleCategorySelect("Ver Tudo"); }} size="sm" className={`text-xs font-semibold ${contentType === "community" ? "bg-secondary hover:bg-secondary text-foreground" : "bg-accent hover:bg-accent0/20 border-border text-muted-foreground"}`}>
              <Users className="h-3.5 w-3.5 mr-1.5" />
              {t('library.community')}
            </Button>
          </div>

          {/* Category Dropdown + Seedance 2 Button */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs bg-accent hover:bg-accent0/20 border-border text-muted-foreground">
                  {getCategoryDisplayName(selectedCategory)}
                  <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-card border-border min-w-[160px]">
                {categories.map(cat => (
                  <DropdownMenuItem
                    key={cat}
                    onClick={() => handleCategorySelect(cat)}
                    className={`text-xs cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-accent0/20"
                    }`}
                  >
                    {getCategoryDisplayName(cat)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCategorySelect("Seedance 2")}
              className={`text-xs font-bold border-0 text-white ${
                selectedCategory === "Seedance 2"
                  ? "bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30"
                  : "bg-gradient-to-r from-green-700 to-green-500 hover:from-green-600 hover:to-green-400"
              }`}
            >
              <Video className="h-3.5 w-3.5 mr-1.5" />
              Prompts Seedance 2
              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-yellow-400 rounded-full animate-pulse leading-none text-secondary-foreground">
                NOVO
              </span>
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por palavra-chave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 text-sm bg-accent0/10 border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        </div>

        {/* Prompts Masonry Grid */}
        <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-2 sm:gap-3">
          {paginatedPrompts.map(item => {
            const isVideo = isVideoUrl(item.imageUrl);
            const canAccess = !item.isPremium || isPremium;
            return (
              <div
                key={item.id}
                className="group relative break-inside-avoid mb-2 sm:mb-3 rounded-lg sm:rounded-xl overflow-hidden cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                {/* Image / Video */}
                {isVideo ? (
                  <LazyVideo
                    src={item.imageUrl}
                    className="w-full block"
                    poster={item.thumbnailUrl || undefined}
                  />
                ) : (
                  <SecureImage
                    src={item.imageUrl}
                    alt={item.title}
                    isPremium={false}
                    loading="lazy"
                    className="w-full block"
                  />
                )}

                {/* Premium lock icon (always visible) */}
                {item.isPremium && !isPremium && (
                  <div className="absolute top-8 right-1.5 bg-black/60 rounded-full p-1.5 z-10">
                    <Lock className="h-3.5 w-3.5 text-foreground" />
                  </div>
                )}

                {/* Like button - top right */}
                <button
                  onClick={(e) => toggleLike(e, String(item.id))}
                  className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full backdrop-blur-sm px-1.5 py-0.5 z-10 transition-colors bg-destructive"
                >
                  <Heart
                    className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-colors ${userLikes.has(String(item.id)) ? 'text-red-500 fill-red-500' : 'text-primary-foreground'}`}
                  />
                  <span className="text-[9px] sm:text-[10px] font-medium text-white/90">
                    {likeCounts[String(item.id)] || 0}
                  </span>
                </button>

                {/* Author avatar + instagram badge - top left */}
                {item.partnerInstagram && (
                  <a
                    href={`https://www.instagram.com/${item.partnerInstagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-1.5 py-0.5 hover:bg-black/80 transition-colors"
                  >
                    {(item.partnerAvatarUrl || item.promptType === 'admin') ? (
                      <img src={item.promptType === 'admin' ? arcanoLogoAvatar : item.partnerAvatarUrl} alt={item.partnerName || ''} className="w-4 h-4 rounded-full object-cover" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-primary/30 flex items-center justify-center">
                        <span className="text-[7px] font-bold text-white">{(item.partnerName || '?').charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <Instagram className="h-2.5 w-2.5 text-white/80" />
                    <span className="text-[8px] sm:text-[9px] text-white/80 font-medium">@{item.partnerInstagram.replace('@', '')}</span>
                  </a>
                )}

                {/* Hover/Touch overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-1.5 sm:p-3
                  max-sm:active:opacity-100">
                  {/* Title + badges */}
                  <h3 className="font-bold text-[9px] sm:text-sm text-white line-clamp-1 sm:line-clamp-2 mb-1">{item.title}</h3>
                  {/* Action buttons */}
                  <div className="flex gap-1">
                    <Button
                      onClick={(e) => { e.stopPropagation(); canAccess ? copyToClipboard(item) : handleItemClick(item); }}
                      size="sm"
                      className="flex-1 h-5 sm:h-7 text-[8px] sm:text-xs px-1.5 sm:px-3 bg-secondary hover:bg-secondary text-foreground min-w-0"
                    >
                      <Copy className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 shrink-0" />
                      <span className="truncate">Copiar</span>
                    </Button>
                    <Button
                      onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                      variant="outline"
                      size="sm"
                      className="h-5 sm:h-7 text-[8px] sm:text-xs px-1.5 sm:px-3 bg-accent border-border text-foreground hover:bg-white/20 min-w-0"
                    >
                      <span className="truncate">Ver</span>
                    </Button>
                  </div>
                  {item.category === 'Fotos' && !isVideo && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.isPremium && !isPremium) {
                          setPremiumModalItem(item);
                          setShowPremiumModal(true);
                        } else {
                          trackPromptClick(String(item.id), item.title, !!item.isExclusive);
                          navigate('/arcano-cloner-tool', { state: { referenceImageUrl: item.imageUrl } });
                        }
                      }}
                      size="sm"
                      className="w-full h-5 sm:h-7 mt-1 text-[8px] sm:text-xs px-1 sm:px-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-pink-700 hover:to-slate-600 text-white min-w-0"
                    >
                      <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 shrink-0" />
                      <span className="truncate">Gerar foto</span>
                    </Button>
                  )}
                  {item.category === 'Movies para Telão' && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.isPremium && !isPremium) {
                          setPremiumModalItem(item);
                          setShowPremiumModal(true);
                        } else {
                          trackPromptClick(String(item.id), item.title, !!item.isExclusive);
                          navigate('/movieled-maker', {
                            state: {
                              preSelectedItem: {
                                id: String(item.id),
                                title: item.title,
                                image_url: item.imageUrl,
                                thumbnail_url: item.thumbnailUrl || null,
                                reference_images: item.referenceImages || null,
                                prompt: item.prompt,
                              }
                            }
                          });
                        }
                      }}
                      size="sm"
                      className="w-full h-5 sm:h-7 mt-1 text-[8px] sm:text-xs px-1.5 sm:px-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white min-w-0"
                    >
                      <Video className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 shrink-0" />
                      <span className="truncate">Gerar movie</span>
                    </Button>
                  )}
                  {item.category === 'Seedance 2' && (
                    <Button
                      size="sm"
                      className="w-full h-5 sm:h-7 mt-1 text-[8px] sm:text-xs px-1.5 sm:px-3 bg-gradient-to-r from-green-700 to-green-500 hover:from-green-600 hover:to-green-400 text-white min-w-0 shadow-lg shadow-green-500/30 font-bold border-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/seedance2', { state: { 
                          prefillPrompt: item.prompt, 
                          prefillRefImages: item.referenceImages || [],
                          prefillTitle: item.title,
                          prefillThumbnail: item.thumbnailUrl || item.imageUrl
                        } });
                      }}
                    >
                      <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 shrink-0" />
                      <span className="truncate">Gerar sua versão</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="bg-accent border-border text-foreground hover:bg-accent0/20 hover:text-foreground disabled:opacity-50">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-muted-foreground">{currentPage} / {totalPages}</span>
            <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="bg-accent border-border text-foreground hover:bg-accent0/20 hover:text-foreground disabled:opacity-50">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <Dialog open={showPremiumModal} onOpenChange={handleClosePremiumModal}>
        <DialogContent className="max-w-lg bg-background border-border text-foreground">
          <div className="text-center p-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-purple-600 to-purple-500 rounded-full flex items-center justify-center mb-4">
              <Star className="h-10 w-10 text-foreground" fill="currentColor" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t('premiumModal.title')}</h2>
            <p className="text-muted-foreground mb-6">{t('premiumModal.description')}</p>
            {premiumModalItem && (
              <div className="mb-6 rounded-lg overflow-hidden border border-border">
                {isVideoUrl(premiumModalItem.imageUrl) ? (
                  <SecureVideo src={premiumModalItem.imageUrl} isPremium={false} className="w-full h-48 object-cover opacity-50" autoPlay muted loop playsInline controls={false} poster={premiumModalItem.thumbnailUrl || undefined} />
                ) : (
                  <SecureImage src={premiumModalItem.imageUrl} alt={premiumModalItem.title} isPremium={false} className="w-full h-48 object-cover opacity-50" />
                )}
                <div className="p-3 bg-background">
                  <p className="font-semibold text-foreground">{premiumModalItem.title}</p>
                </div>
              </div>
            )}
            <Button onClick={() => navigate("/planos-2")} className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white py-6 text-lg">
              <Star className="h-5 w-5 mr-2" fill="currentColor" />
              {t('premiumModal.becomePremium')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPrompt} onOpenChange={() => handleCloseModal()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border text-foreground">
          {selectedPrompt && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{selectedPrompt.title}</h2>
                  <div className="mt-2">{getBadgeContent(selectedPrompt)}</div>
                  {/* Author info - removed, now shown above image */}
                </div>
                <Button variant="ghost" size="icon" onClick={handleCloseModal} className="text-muted-foreground hover:text-foreground hover:bg-accent0/20">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {/* Author header above image */}
              {selectedPrompt.partnerInstagram && (
                <a
                  href={`https://www.instagram.com/${selectedPrompt.partnerInstagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  {(selectedPrompt.partnerAvatarUrl || selectedPrompt.promptType === 'admin') ? (
                    <img src={selectedPrompt.promptType === 'admin' ? arcanoLogoAvatar : selectedPrompt.partnerAvatarUrl} alt={selectedPrompt.partnerName || ''} className="w-10 h-10 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-border">
                      <span className="text-base font-bold text-foreground">{(selectedPrompt.partnerName || '?').charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">@{selectedPrompt.partnerInstagram.replace('@', '')}</span>
                  </div>
                </a>
              )}
              <div className="rounded-lg overflow-hidden border border-border">
                {isVideoUrl(selectedPrompt.imageUrl) ? (
                  <SecureVideo src={selectedPrompt.imageUrl} isPremium={false} className="w-full" controls autoPlay muted loop playsInline poster={selectedPrompt.thumbnailUrl || undefined} />
                ) : (
                  <SecureImage src={selectedPrompt.imageUrl} alt={selectedPrompt.title} isPremium={false} className="w-full" />
                )}
              </div>
              {selectedPrompt.referenceImages && selectedPrompt.referenceImages.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-muted-foreground">{t('modal.referenceImages')}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedPrompt.referenceImages.map((img, idx) => (
                      <SecureImage key={idx} src={img} alt={`Reference ${idx + 1}`} isPremium={false} className="w-full h-24 object-cover rounded-lg border border-border" />
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => copyToClipboard(selectedPrompt)} 
                  className={`flex-1 ${(selectedPrompt.isPremium && !isPremium) || (selectedPrompt.isPremium && !isPromptUnlocked(String(selectedPrompt.id))) ? 'bg-accent hover:bg-accent text-muted-foreground' : 'bg-secondary hover:bg-secondary text-foreground'}`}
                >
                  {(selectedPrompt.isPremium && !isPremium) || (selectedPrompt.isPremium && !isPromptUnlocked(String(selectedPrompt.id))) ? (
                    <><Lock className="h-4 w-4 mr-2" />{selectedPrompt.isPremium && isPremium ? 'Libere o prompt primeiro' : 'Exclusivo Assinantes'}</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-2" />{t('modal.copyPrompt')}</>
                  )}
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedPrompt.isPremium && !isPremium) {
                      setPremiumModalItem(selectedPrompt);
                      setShowPremiumModal(true);
                    } else if (selectedPrompt.isPremium && !isPromptUnlocked(String(selectedPrompt.id))) {
                      toast.error('Libere o prompt primeiro antes de baixar.');
                    } else {
                      downloadMedia(selectedPrompt.imageUrl, selectedPrompt.title, selectedPrompt.referenceImages, selectedPrompt.isPremium, selectedPrompt.thumbnailUrl);
                    }
                  }} 
                  variant="outline" 
                  className={`${(selectedPrompt.isPremium && !isPremium) || (selectedPrompt.isPremium && !isPromptUnlocked(String(selectedPrompt.id))) ? 'bg-accent border-border text-muted-foreground hover:bg-accent' : 'bg-accent border-border text-foreground hover:bg-accent0/20 hover:text-foreground'}`}
                >
                  {(selectedPrompt.isPremium && !isPremium) || (selectedPrompt.isPremium && !isPromptUnlocked(String(selectedPrompt.id))) ? (
                    <><Lock className="h-4 w-4 mr-2" />{t('modal.download')}</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" />{t('modal.download')}</>
                  )}
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
                    className={`w-full ${selectedPrompt.isPremium && !isPremium ? 'bg-accent hover:bg-accent text-muted-foreground' : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-pink-700 hover:to-slate-600 text-white'}`}
                  >
                    {selectedPrompt.isPremium && !isPremium ? (
                      <><Lock className="h-4 w-4 mr-2" />Exclusivo Premium</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" />Gerar sua foto</>
                    )}
                  </Button>
                )}
                {selectedPrompt.category === 'Seedance 2' && (
                  <Button
                    onClick={() => {
                      navigate('/seedance2', { state: { 
                        prefillPrompt: selectedPrompt.prompt, 
                        prefillRefImages: selectedPrompt.referenceImages || [],
                        prefillTitle: selectedPrompt.title,
                        prefillThumbnail: selectedPrompt.thumbnailUrl || selectedPrompt.imageUrl
                      } });
                    }}
                    className="w-full bg-gradient-to-r from-green-700 to-green-500 hover:from-green-600 hover:to-green-400 text-white shadow-lg shadow-green-500/30 font-bold border-0"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar sua versão
                  </Button>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-muted-foreground">{t('modal.prompt')}</h3>
                <div className="bg-background border border-border rounded-lg p-4 relative">
                  {selectedPrompt.isPremium && !isPremium ? (
                    <>
                      <p className="text-foreground whitespace-pre-wrap text-sm blur-md select-none pointer-events-none">{selectedPrompt.prompt}</p>
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                        <div className="text-center">
                          <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">Assine um plano para acessar</p>
                          <Button 
                            onClick={() => navigate("/planos-2")} 
                            size="sm" 
                            className="mt-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white"
                          >
                            <Star className="h-3 w-3 mr-1" fill="currentColor" />
                            Ver planos
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : selectedPrompt.isPremium && !isPromptUnlocked(String(selectedPrompt.id)) ? (
                    <>
                      <p className="text-foreground whitespace-pre-wrap text-sm blur-md select-none pointer-events-none">{selectedPrompt.prompt}</p>
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                        <div className="text-center">
                          <Lock className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm mb-2">
                            {premiumLimitReached 
                              ? 'Você atingiu seu limite diário de prompts premium' 
                              : 'Libere este prompt para visualizar'}
                          </p>
                          <Button
                            onClick={async () => {
                              if (premiumLimitReached) {
                                toast.error('Limite diário de prompts premium atingido. Volte amanhã!');
                                return;
                              }
                              const success = await unlockPrompt(String(selectedPrompt.id));
                              if (success) {
                                toast.success('Prompt liberado!');
                              } else {
                                toast.error('Não foi possível liberar o prompt.');
                              }
                            }}
                            size="sm"
                            disabled={premiumLimitReached}
                            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white"
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            Liberar Prompt {!isPremiumUnlimited && `(${remainingUnlocks} restantes)`}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : revealedPrompts.has(String(selectedPrompt.id)) || isPromptUnlocked(String(selectedPrompt.id)) ? (
                    <p className="text-foreground whitespace-pre-wrap text-sm">{selectedPrompt.prompt}</p>
                  ) : (
                    <>
                      <p className="text-foreground whitespace-pre-wrap text-sm blur-md select-none pointer-events-none">{selectedPrompt.prompt}</p>
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                        <div className="text-center">
                          <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">{t('modal.clickToCopy')}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div>
                <div className="bg-background border border-border rounded-lg p-4 relative">
                  {selectedPrompt.isPremium && !isPremium ? (
                    <>
                      <p className="text-foreground whitespace-pre-wrap text-sm blur-md select-none pointer-events-none">{selectedPrompt.prompt}</p>
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                        <div className="text-center">
                          <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">Assine um plano para acessar</p>
                          <Button 
                            onClick={() => navigate("/planos-2")} 
                            size="sm" 
                            className="mt-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white"
                          >
                            <Star className="h-3 w-3 mr-1" fill="currentColor" />
                            Ver planos
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : selectedPrompt.isPremium && !isPromptUnlocked(String(selectedPrompt.id)) ? (
                    <>
                      <p className="text-foreground whitespace-pre-wrap text-sm blur-md select-none pointer-events-none">{selectedPrompt.prompt}</p>
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                        <div className="text-center">
                          <Lock className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm mb-2">
                            {premiumLimitReached 
                              ? 'Você atingiu seu limite diário de prompts premium' 
                              : 'Libere este prompt para visualizar'}
                          </p>
                          <Button
                            onClick={async () => {
                              if (premiumLimitReached) {
                                toast.error('Limite diário de prompts premium atingido. Volte amanhã!');
                                return;
                              }
                              const success = await unlockPrompt(String(selectedPrompt.id));
                              if (success) {
                                toast.success('Prompt liberado!');
                              } else {
                                toast.error('Não foi possível liberar o prompt.');
                              }
                            }}
                            size="sm"
                            disabled={premiumLimitReached}
                            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white"
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            Liberar Prompt {!isPremiumUnlimited && `(${remainingUnlocks} restantes)`}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : revealedPrompts.has(String(selectedPrompt.id)) || isPromptUnlocked(String(selectedPrompt.id)) ? (
                    <p className="text-foreground whitespace-pre-wrap text-sm">{selectedPrompt.prompt}</p>
                  ) : (
                    <>
                      <p className="text-foreground whitespace-pre-wrap text-sm blur-md select-none pointer-events-none">{selectedPrompt.prompt}</p>
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                        <div className="text-center">
                          <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">{t('modal.clickToCopy')}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showTutorialModal} onOpenChange={setShowTutorialModal}>
        <DialogContent className="max-w-4xl bg-background border-border p-0 overflow-hidden">
          <div className="aspect-video w-full">
            {tutorialUrl && (
              <iframe src={tutorialUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <DialogContent className="max-w-md bg-background border-border text-foreground">
          <div className="text-center p-6">
            <div className="w-20 h-20 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-10 w-10 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t('limitModal.title')}</h2>
            <p className="text-muted-foreground mb-6">
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