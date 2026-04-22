import { useState, useEffect } from "react"; 
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Download, ChevronLeft, ChevronRight, Star, Lock, LogIn, Menu, Flame, User, LogOut, Users, Settings, Shield, Package, ChevronDown, Gift, GraduationCap, X, RefreshCw, Sparkles, LayoutGrid, BookOpen, Cpu, MessageCircle, Send, Play, AlertTriangle, RotateCcw, Smartphone, Eye, Crown, ShoppingCart, Bell, Loader2, Home, Zap, Wand2, Palette, ImagePlus, Shirt, MonitorPlay, Film } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import AppTopBar from "@/components/layout/AppTopBar";

import { SecureImage, SecureVideo, getSecureDownloadUrl } from "@/components/SecureMedia";
import LazyVideo from "@/components/LazyVideo";

import BannerCarousel from "@/components/BannerCarousel";
import { toPackSlug } from "@/lib/utils";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import { useIsAppInstalled } from "@/hooks/useIsAppInstalled";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";
import PromoNatalBanner from "@/components/PromoNatalBanner";
import { useYearEndPromo } from "@/hooks/useYearEndPromo";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileFilterDropdown from "@/components/MobileFilterDropdown";
interface ArteItem {
  id: string | number;
  title: string;
  description?: string;
  imageUrl: string;
  downloadUrl?: string;
  category?: string;
  pack?: string;
  isExclusive?: boolean;
  isPremium?: boolean;
  tutorialUrl?: string;
  createdAt?: string;
  arteType?: 'admin' | 'partner';
  clickCount?: number;
  bonusClicks?: number;
  canvaLink?: string;
  driveLink?: string;
  motionType?: 'canva' | 'after_effects' | null;
  flyerSubcategory?: string | null;
}
interface PackItem {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  display_order: number;
  type: 'pack' | 'bonus' | 'curso' | 'updates' | 'free-sample' | 'tutorial' | 'ferramentas_ia' | 'ferramenta';
  is_visible: boolean;
  download_url?: string | null;
}
const isVideoUrl = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};
const ITEMS_PER_PAGE = 16;
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
type SidebarSection = 'packs' | 'bonus' | 'cursos' | 'updates' | 'free-sample' | 'all-artes' | 'tutorial' | 'ferramentas_ia';

// Mapeamento de seções para slugs de URL
const sectionToSlug: Record<SidebarSection, string> = {
  'packs': 'packs',
  'bonus': 'bonus',
  'cursos': 'cursos',
  'updates': 'atualizacoes',
  'free-sample': 'amostras-gratis',
  'all-artes': 'todas-as-artes',
  'tutorial': 'tutoriais',
  'ferramentas_ia': 'ferramentas-ia'
};
const slugToSection: Record<string, SidebarSection> = {
  'packs': 'packs',
  'bonus': 'bonus',
  'cursos': 'cursos',
  'atualizacoes': 'updates',
  'amostras-gratis': 'free-sample',
  'todas-as-artes': 'all-artes',
  'tutoriais': 'tutorial',
  'ferramentas-ia': 'ferramentas_ia'
};
const BibliotecaArtes = () => {
  const { t } = useTranslation('library');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    isPremium,
    userPacks,
    expiredPacks,
    hasBonusAccess,
    hasAccessToPack,
    hasExpiredPack,
    getExpiredPackInfo,
    logout
  } = usePremiumArtesStatus();
  const { user: topBarUser, isPremium: topBarIsPremium, planType: topBarPlanType, logout: topBarLogout } = usePremiumStatus();
  const [topBarProfile, setTopBarProfile] = useState<{ name?: string; phone?: string } | null>(null);
  useEffect(() => {
    const fetchProfile = async () => {
      if (!topBarUser) return;
      const { data } = await supabase.from('profiles').select('name, phone').eq('id', topBarUser.id).single();
      if (data) setTopBarProfile(data);
    };
    fetchProfile();
  }, [topBarUser]);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const {
          data
        } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        setIsAdmin(data === true);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [allArtes, setAllArtes] = useState<ArteItem[]>([]);
  const [shuffledVerTudo, setShuffledVerTudo] = useState<ArteItem[]>([]);
  const [selectedArte, setSelectedArte] = useState<ArteItem | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumModalItem, setPremiumModalItem] = useState<ArteItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clickIncrements, setClickIncrements] = useState<Record<string, number>>({});
  const [animatingClicks, setAnimatingClicks] = useState<Set<string>>(new Set());
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [dbPacks, setDbPacks] = useState<PackItem[]>([]);
  // Inicializa seção a partir da URL se existir
  const getInitialSection = (): SidebarSection => {
    const secaoParam = searchParams.get('secao');
    if (secaoParam && slugToSection[secaoParam]) {
      return slugToSection[secaoParam];
    }
    return 'packs';
  };
  const [activeSection, setActiveSection] = useState<SidebarSection>(getInitialSection);

  // Função para mudar de seção e atualizar URL
  const changeSection = (section: SidebarSection) => {
    setActiveSection(section);
    setSelectedPack(null);
    if (section === 'all-artes') {
      setSelectedCategory("Todos");
    }
    // Atualiza URL com o slug da seção
    const newParams = new URLSearchParams(searchParams);
    newParams.set('secao', sectionToSlug[section]);
    newParams.delete('item'); // Remove item param quando muda de seção
    setSearchParams(newParams);
  };
  const [showCursoModal, setShowCursoModal] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<PackItem | null>(null);
  const isAppInstalled = useIsAppInstalled();
  const {
    isActive: isPromoActive
  } = useYearEndPromo();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchArtes();
    fetchCategories();
    fetchPacks();
  }, []);
  const fetchPacks = async () => {
    const {
      data
    } = await supabase.from("artes_packs").select("*").eq("is_visible", true).order("display_order", {
      ascending: true
    });
    setDbPacks((data || []) as PackItem[]);
  };

  const fetchCategories = async () => {
    const {
      data
    } = await supabase.from('artes_categories').select('name').order('display_order', {
      ascending: true
    });
    setDbCategories((data || []).map(c => c.name));
  };
  useEffect(() => {
    const itemId = searchParams.get("item");
    if (itemId && allArtes.length > 0) {
      const item = allArtes.find(a => a.id === itemId);
      if (item) {
        // Always open detail modal - access control handled inside modal
        setSelectedArte(item);
      }
    }
  }, [searchParams, allArtes]);
  useEffect(() => {
    setShuffledVerTudo(shuffleArray(allArtes));
  }, [allArtes]);
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedPack]);
  const fetchArtes = async () => {
    const [adminResult, partnerResult, clicksResult] = await Promise.all([supabase.from('admin_artes').select('*').or('platform.is.null,platform.eq.eventos').order('created_at', {
      ascending: false
    }), supabase.from('partner_artes').select('*').eq('approved', true).order('created_at', {
      ascending: false
    }), supabase.rpc('get_arte_click_counts')]);
    const clickCounts: Record<string, number> = {};
    (clicksResult.data || []).forEach((d: any) => {
      clickCounts[d.arte_id] = Number(d.click_count);
    });
    const adminArtes: ArteItem[] = (adminResult.data || []).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      imageUrl: item.image_url,
      downloadUrl: item.download_url,
      category: item.category,
      pack: (item as any).pack || null,
      isExclusive: true,
      isPremium: (item as any).is_premium || false,
      tutorialUrl: item.tutorial_url || null,
      createdAt: item.created_at || undefined,
      arteType: 'admin' as const,
      clickCount: clickCounts[item.id] || 0,
      bonusClicks: item.bonus_clicks || 0,
      canvaLink: (item as any).canva_link || null,
      driveLink: (item as any).drive_link || null,
      motionType: (item as any).motion_type || null,
      flyerSubcategory: (item as any).flyer_subcategory || null
    }));
    const partnerArtes: ArteItem[] = (partnerResult.data || []).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      imageUrl: item.image_url,
      downloadUrl: item.download_url,
      category: item.category,
      pack: (item as any).pack || null,
      isExclusive: true,
      isPremium: (item as any).is_premium ?? true,
      tutorialUrl: item.tutorial_url || null,
      createdAt: item.created_at || undefined,
      arteType: 'partner' as const,
      clickCount: clickCounts[item.id] || 0,
      bonusClicks: item.bonus_clicks || 0,
      canvaLink: (item as any).canva_link || null,
      driveLink: (item as any).drive_link || null,
      flyerSubcategory: (item as any).flyer_subcategory || null
    }));
    const allCombined = [...adminArtes, ...partnerArtes].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    setAllArtes(allCombined);
  };
  const sortByClicks = (a: ArteItem, b: ArteItem) => {
    const clicksA = (a.clickCount || 0) + (a.bonusClicks || 0);
    const clicksB = (b.clickCount || 0) + (b.bonusClicks || 0);
    return clicksB - clicksA;
  };
  const getFilteredAndSortedArtes = () => {
    const sortByDate = (a: ArteItem, b: ArteItem) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    };

    // "Ver todas as artes" section - show all artes with category filter
    if (activeSection === 'all-artes') {
      if (selectedCategory === "Todos") {
        return [...allArtes].sort(sortByDate);
      }
      return allArtes.filter(a => a.category === selectedCategory).sort(sortByDate);
    }

    // "Amostras Grátis" section - show all free-sample artes directly without pack selection
    if (activeSection === 'free-sample' && !selectedPack) {
      const freeSamplePacks = dbPacks.filter(p => p.type === 'free-sample').map(p => p.name);
      const freeSampleArtes = allArtes.filter(a => freeSamplePacks.includes(a.pack || ''));
      if (selectedCategory === "Todos") {
        return freeSampleArtes.sort(sortByDate);
      }
      return freeSampleArtes.filter(a => a.category === selectedCategory).sort(sortByDate);
    }

    // Must have a pack selected to show artes for other sections
    if (!selectedPack) return [];

    // Filter by selected pack
    const packFiltered = allArtes.filter(a => a.pack === selectedPack);

    // Apply category filter
    if (selectedCategory === "Todos") {
      return packFiltered.sort(sortByDate);
    }
    return packFiltered.filter(a => a.category === selectedCategory).sort(sortByDate);
  };

  // Count artes per pack
  const getPackArteCount = (packName: string) => {
    return allArtes.filter(a => a.pack === packName).length;
  };

  // Get packs filtered by type
  const getPacksByType = (type: 'pack' | 'bonus' | 'curso' | 'updates' | 'free-sample' | 'tutorial' | 'ferramentas_ia') => {
    // Include 'ferramenta' type when filtering for 'ferramentas_ia'
    if (type === 'ferramentas_ia') {
      return dbPacks.filter(p => p.type === 'ferramentas_ia' || p.type === 'ferramenta');
    }
    return dbPacks.filter(p => p.type === type);
  };
  const filteredArtes = getFilteredAndSortedArtes();
  const totalPages = Math.ceil(filteredArtes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedArtes = filteredArtes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Preload next pages of images for faster loading
  useImagePreloader(filteredArtes, currentPage, ITEMS_PER_PAGE, 2);

  // Categories for filtering within a pack (style categories from database)
  const categories = ["Todos", ...dbCategories];
  const getCategoryIcon = (category: string) => {
    if (category === "Populares") {
      return <Flame className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />;
    }
    return null;
  };
  // Arte click tracking removed - no longer needed
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
      toast.success(`"${filename}" ${t('messages.downloadSuccess')}`);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(t('messages.downloadError'));
    }
  };
  const handleDownload = async (arteItem: ArteItem) => {
    const downloadUrl = arteItem.downloadUrl || arteItem.imageUrl;
    const extension = downloadUrl.split('.').pop() || 'file';
    const filename = `${arteItem.title.toLowerCase().replace(/\s+/g, "-")}.${extension}`;
    await downloadFile(downloadUrl, filename, arteItem.isPremium);
  };
  const handleItemClick = (item: ArteItem) => {
    setSearchParams({
      item: String(item.id)
    });
    // Always open the detail modal - access control will be handled inside
    setSelectedArte(item);
  };
  const handleCloseModal = () => {
    setSelectedArte(null);
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
  const handleCursoClick = (curso: PackItem) => {
    setSelectedCurso(curso);
    setShowCursoModal(true);
  };
  const getBadgeContent = (item: ArteItem) => {
    return <div className="flex flex-wrap gap-1">
        {item.motionType && (
          <Badge className={item.motionType === 'canva' 
            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 text-[10px] sm:text-xs' 
            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-[10px] sm:text-xs'
          }>
            {item.motionType === 'canva' ? '🎨 Canva' : '🎬 After Effects'}
          </Badge>
        )}
        {item.isPremium ? <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-[10px] sm:text-xs">
            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" fill="currentColor" />
            {t('badges.premium')}
          </Badge> : <Badge variant="outline" className="border-green-500 dark:text-green-400 text-green-600 text-[10px] sm:text-xs">
            {t('badges.free')}
          </Badge>}
        {item.pack && <Badge className="bg-primary/80 text-white border-0 text-[10px] sm:text-xs">
            {item.pack}
          </Badge>}
      </div>;
  };
  const sidebarNavClass = (section: SidebarSection) =>
    `w-full flex items-center text-left text-[13px] font-medium py-2.5 px-3 rounded-lg transition-colors ${
      activeSection === section
        ? 'bg-primary/10 text-primary font-semibold'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
    }`;

  const InternalSidebarContent = () => (
    <div className="flex flex-col h-full p-4 pt-4">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-3 mb-1">Navegação</p>

        {!isAppInstalled && (
          <button onClick={() => { navigate('/install-app'); setSidebarOpen(false); }}
            className="w-full flex items-center text-left text-[13px] font-bold text-foreground py-2.5 px-3 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-all mb-2">
            <Smartphone className="h-4 w-4 mr-2.5 text-primary flex-shrink-0" />
            {t('sidebar.installApp')}
          </button>
        )}

        <button onClick={() => { changeSection('tutorial'); setSidebarOpen(false); }} className={sidebarNavClass('tutorial')}>
          <BookOpen className="h-4 w-4 mr-2.5 flex-shrink-0" />
          {t('sidebar.tutorials')}
          <span className="ml-auto text-[10px] text-muted-foreground">{getPacksByType('tutorial').length}</span>
        </button>

        <button onClick={() => { changeSection('packs'); setSidebarOpen(false); }} className={sidebarNavClass('packs')}>
          <Package className="h-4 w-4 mr-2.5 flex-shrink-0" />
          {t('sidebar.packs')}
          <span className="ml-auto text-[10px] text-muted-foreground">{getPacksByType('pack').length}</span>
        </button>

        <button onClick={() => { changeSection('updates'); setSidebarOpen(false); }} className={sidebarNavClass('updates')}>
          <RefreshCw className="h-4 w-4 mr-2.5 flex-shrink-0" />
          {t('sidebar.updates')}
          <span className="ml-auto text-[10px] text-muted-foreground">{getPacksByType('updates').length}</span>
        </button>

        <button onClick={() => { changeSection('bonus'); setSidebarOpen(false); }} className={sidebarNavClass('bonus')}>
          <Gift className="h-4 w-4 mr-2.5 flex-shrink-0" />
          {t('sidebar.bonus')}
          <span className="ml-auto text-[10px] text-muted-foreground">{getPacksByType('bonus').length}</span>
        </button>

        <button onClick={() => { changeSection('cursos'); setSidebarOpen(false); }} className={sidebarNavClass('cursos')}>
          <GraduationCap className="h-4 w-4 mr-2.5 flex-shrink-0" />
          {t('sidebar.courses')}
          <span className="ml-auto text-[10px] text-muted-foreground">{getPacksByType('curso').length}</span>
        </button>

        <button onClick={() => { changeSection('free-sample'); setSidebarOpen(false); }} className={sidebarNavClass('free-sample')}>
          <Sparkles className="h-4 w-4 mr-2.5 flex-shrink-0" />
          {t('sidebar.freeSamples')}
          <span className="ml-auto text-[10px] text-muted-foreground">{getPacksByType('free-sample').length}</span>
        </button>

        <button onClick={() => { changeSection('all-artes'); setSidebarOpen(false); }} className={sidebarNavClass('all-artes')}>
          <LayoutGrid className="h-4 w-4 mr-2.5 flex-shrink-0" />
          {t('sidebar.viewAllArts')}
          <span className="ml-auto text-[10px] text-muted-foreground">{allArtes.length}</span>
        </button>

        {/* Ferramentas IA */}
        <div className="my-3 border-t border-border" />
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-3 mb-1">Ferramentas IA</p>

        <button onClick={() => { navigate('/upscaler-arcano-tool'); setSidebarOpen(false); }} className="w-full flex items-center text-left text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent py-2.5 px-3 rounded-lg transition-colors">
          <Wand2 className="h-4 w-4 mr-2.5 flex-shrink-0" />
          Upscaler Arcano
        </button>

        <button onClick={() => { navigate('/arcano-cloner-tool'); setSidebarOpen(false); }} className="w-full flex items-center text-left text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent py-2.5 px-3 rounded-lg transition-colors">
          <Palette className="h-4 w-4 mr-2.5 flex-shrink-0" />
          Arcano Cloner
        </button>

        <button onClick={() => { navigate('/seedance2'); setSidebarOpen(false); }} className="w-full flex items-center text-left text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent py-2.5 px-3 rounded-lg transition-colors">
          <Film className="h-4 w-4 mr-2.5 flex-shrink-0" />
          Seedance 2.0
          <span className="ml-auto text-[9px] font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white px-1.5 py-0.5 rounded-full leading-none">Novo</span>
        </button>

        <button onClick={() => { navigate('/pose-changer-tool'); setSidebarOpen(false); }} className="w-full flex items-center text-left text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent py-2.5 px-3 rounded-lg transition-colors">
          <ImagePlus className="h-4 w-4 mr-2.5 flex-shrink-0" />
          Pose Changer
        </button>

        <button onClick={() => { navigate('/veste-ai-tool'); setSidebarOpen(false); }} className="w-full flex items-center text-left text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent py-2.5 px-3 rounded-lg transition-colors">
          <Shirt className="h-4 w-4 mr-2.5 flex-shrink-0" />
          Veste AI
        </button>

        <button onClick={() => { navigate('/movieled-maker'); setSidebarOpen(false); }} className="w-full flex items-center text-left text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent py-2.5 px-3 rounded-lg transition-colors">
          <MonitorPlay className="h-4 w-4 mr-2.5 flex-shrink-0" />
          MovieLed Maker
        </button>

        {/* Divider */}
        <div className="my-3 border-t border-border" />

        {/* WhatsApp Group */}
        {userPacks.length > 0 ? (
          <a href="https://chat.whatsapp.com/JOUGeS21VHq92hJWyxpOJC" target="_blank" rel="noopener noreferrer" className="block">
            <button className="w-full flex items-center text-left text-[13px] font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 py-2.5 px-3 rounded-lg hover:bg-emerald-500/15 transition-colors">
              <MessageCircle className="h-4 w-4 mr-2.5 flex-shrink-0" />
              {t('messages.exclusiveGroup')}
            </button>
          </a>
        ) : (
          <>
            <a href="https://chat.whatsapp.com/DJz6BbLDbbK9MBX8YiTsbw" target="_blank" rel="noopener noreferrer" className="block">
              <button className="w-full flex items-center text-left text-[13px] font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 py-2.5 px-3 rounded-lg hover:bg-emerald-500/15 transition-colors">
                <MessageCircle className="h-4 w-4 mr-2.5 flex-shrink-0" />
                {t('messages.freeWhatsApp')}
              </button>
            </a>
            <a href="https://t.me/+8NKj2KNvLPswZTIx" target="_blank" rel="noopener noreferrer" className="block">
              <button className="w-full flex items-center text-left text-[13px] font-medium text-blue-600 dark:text-blue-400 py-2.5 px-3 rounded-lg hover:bg-blue-500/15 transition-colors">
                <Send className="h-4 w-4 mr-2.5 flex-shrink-0" />
                {t('messages.telegramAlerts')}
              </button>
            </a>
          </>
        )}

        <button onClick={() => navigate("/parceiro-login-artes")} className="w-full flex items-center text-left text-[13px] font-medium text-muted-foreground hover:text-foreground py-2.5 px-3 rounded-lg hover:bg-accent transition-colors">
          <Users className="h-4 w-4 mr-2.5 flex-shrink-0" />
          {t('sidebar.collaboratorArea')}
        </button>
      </div>

      {/* Logout */}
      {user && (
        <div className="pt-3 border-t border-border mt-3">
          <button onClick={logout} className="w-full flex items-center text-left text-[12px] font-medium text-red-400 hover:text-red-300 py-2 px-3 rounded-lg hover:bg-red-500/10 transition-colors">
            <LogOut className="h-3.5 w-3.5 mr-2" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'packs':
        return t('sections.packs');
      case 'bonus':
        return t('sections.bonus');
      case 'cursos':
        return t('sections.courses');
      case 'updates':
        return t('sections.updates');
      case 'free-sample':
        return t('sections.freeSamples');
      case 'all-artes':
        return t('sections.allArts');
      case 'tutorial':
        return t('sections.tutorials');
      case 'ferramentas_ia':
        return t('sections.aiTools');
    }
  };
  const getCurrentItems = () => {
    switch (activeSection) {
      case 'packs': {
        const items = getPacksByType('pack');
        return [...items].sort((a, b) => a.slug === 'pack-arcano-vol-4' ? -1 : b.slug === 'pack-arcano-vol-4' ? 1 : 0);
      }
      case 'bonus':
        return getPacksByType('bonus');
      case 'cursos':
        return getPacksByType('curso');
      case 'updates':
        return getPacksByType('updates');
      case 'free-sample':
        return getPacksByType('free-sample');
      case 'tutorial':
        return getPacksByType('tutorial');
      case 'ferramentas_ia':
        return getPacksByType('ferramentas_ia');
      case 'all-artes':
        return [];
      // Will show artes directly, not packs
    }
  };
  return (
    <>
      {/* Promo Natal Banner */}
      <PromoNatalBanner />

      <div className={`min-h-screen bg-background ${isPromoActive ? 'pt-11' : ''}`}>
        {/* Top Bar - same as BibliotecaPrompts */}
        <AppTopBar
          user={topBarUser}
          isPremium={topBarIsPremium}
          planType={topBarPlanType}
          userProfile={topBarProfile}
          onLogout={topBarLogout}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        />

        <div className="flex">
          {/* Overlay for mobile sidebar */}
          {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-muted/70 z-[55]" onClick={() => setSidebarOpen(false)} />}

          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:top-[57px] lg:bottom-0 bg-sidebar-background border-r border-border">
            <InternalSidebarContent />
          </aside>

          {/* Mobile Sidebar */}
          {sidebarOpen && (
            <aside className="lg:hidden fixed inset-y-0 left-0 z-[60] w-64 bg-background border-r border-border pt-16">
              <InternalSidebarContent />
            </aside>
          )}

          {/* Main Content Area */}
          <div className="flex-1 lg:pl-64">
            {/* Main Content */}
            <div className="p-4 lg:p-6">
              <div className="max-w-7xl mx-auto">

            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {selectedPack ? selectedPack : `Biblioteca de Artes - ${getSectionTitle()}`}
              </h1>
              <p className="text-muted-foreground mt-1">
                {selectedPack ? `Conteúdo do ${activeSection === 'bonus' ? 'bônus' : 'pack'} ${selectedPack}` : activeSection === 'cursos' ? 'Cursos exclusivos para membros' : activeSection === 'bonus' ? 'Conteúdo extra exclusivo para membros' : 'Artes editáveis PSD e Canva para eventos'}
              </p>
            </div>

            {/* Banner Carousel - Only show when no pack is selected */}
            {!selectedPack && <BannerCarousel />}


            {/* Install App Button */}
            {!selectedPack && !isAppInstalled && (
              <div className="flex flex-col sm:flex-row gap-2 my-4">
                <button 
                  onClick={() => navigate('/install-app')} 
                  className="lg:hidden flex-1 bg-amber-500 hover:bg-amber-600 text-foreground py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Instalar App</span>
                </button>
              </div>
            )}

            {/* Pack/Bonus Selection View - excludes tutorial, cursos, all-artes, and free-sample sections */}
            {!selectedPack && activeSection !== 'cursos' && activeSection !== 'tutorial' && activeSection !== 'all-artes' && activeSection !== 'free-sample' && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {getCurrentItems().map(pack => {
                const arteCount = getPackArteCount(pack.name);
                const packSlug = toPackSlug(pack.name);
                // For bonus/updates/ferramentas_ia: any active pack = access. For regular packs: need specific pack
                const isBonusOrUpdatesOrToolType = pack.type === 'bonus' || pack.type === 'updates' || pack.type === 'ferramentas_ia' || pack.type === 'ferramenta';
                const isToolType = pack.type === 'ferramentas_ia' || pack.type === 'ferramenta';
                const isBonusType = pack.type === 'bonus';
                const hasPackAccess = isBonusOrUpdatesOrToolType ? isPremium : hasAccessToPack(packSlug);
                const isExpired = !isBonusOrUpdatesOrToolType && hasExpiredPack(packSlug);
                const expiredInfo = isExpired ? getExpiredPackInfo(packSlug) : null;
                const showToolAvailableBadge = isToolType && isPremium;

                // For bonus: show download button if has access, otherwise show buy pack button
                const handleBonusAction = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (isPremium && pack.download_url) {
                    window.open(pack.download_url, '_blank');
                  } else if (isPremium && !pack.download_url) {
                    setSelectedPack(pack.name);
                    setSelectedCategory("Todos");
                    setCurrentPage(1);
                  } else {
                    navigate('/planos-artes');
                  }
                };
                return <Card key={pack.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group" onClick={() => {
                  // For ferramentas_ia type: navigate to video lessons page or specific tool page
                  if (isToolType) {
                    if (isPremium) {
                      navigate(`/ferramenta-ia-artes/${pack.slug}`);
                    } else {
                      // Navigate to specific tool page based on slug
                      if (pack.slug === 'upscaller-arcano') {
                        navigate('/upscalerarcanov3');
                      } else if (pack.slug === 'forja-selos-3d') {
                        navigate('/planos-forja-selos-3d');
                      } else {
                        navigate('/planos-artes');
                      }
                    }
                    return;
                  }
                  // For bonus type: don't navigate to pack view, handle action directly
                  if (isBonusType) {
                    if (isPremium && pack.download_url) {
                      window.open(pack.download_url, '_blank');
                    } else if (!isPremium) {
                      navigate('/planos-artes');
                    } else {
                      // Has access but no download URL - go to pack view
                      setSelectedPack(pack.name);
                      setSelectedCategory("Todos");
                      setCurrentPage(1);
                    }
                  } else {
                    setSelectedPack(pack.name);
                    setSelectedCategory("Todos");
                    setCurrentPage(1);
                  }
                }}>
                      <div className="aspect-[3/4] relative overflow-hidden">
                        {pack.cover_url ? <img src={pack.cover_url} alt={pack.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center">
                            {activeSection === 'bonus' ? <Gift className="h-12 w-12 sm:h-16 sm:w-16 text-foreground" /> : <Package className="h-12 w-12 sm:h-16 sm:w-16 text-foreground" />}
                          </div>}
                        
                        {/* Promo 50% OFF Tag - show on packs when promo is active and user doesn't have access */}
                        {isPromoActive && !hasPackAccess && !isBonusType && !isToolType && <div className="absolute top-2 left-2 z-10">
                            <Badge className="bg-gradient-to-r from-red-600 to-red-500 text-white border-0 text-[10px] sm:text-xs font-bold shadow-lg animate-pulse">
                              🔥 50% OFF
                            </Badge>
                          </div>}
                        
                        {/* Vol 4 highlight badges */}
                        {pack.slug === 'pack-arcano-vol-4' && !isPromoActive && <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                            <Badge className="bg-primary text-foreground border-0 text-[10px] sm:text-xs font-bold shadow-lg">
                              Novo
                            </Badge>
                            <Badge className="bg-amber-500 text-foreground border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                              Atualizando
                            </Badge>
                          </div>}
                        
                        {/* Access Tag - Priority: Active > Expired > None */}
                        {hasPackAccess && !isBonusType && <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-green-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                              {t('badges.available')}
                            </Badge>
                          </div>}
                        
                        {/* Bonus access badge */}
                        {isBonusType && isPremium && <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-green-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                              <Download className="h-3 w-3 mr-1" />
                              {t('badges.available')}
                            </Badge>
                          </div>}
                        
                        {!hasPackAccess && isExpired && <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-red-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {t('badges.expired')}
                            </Badge>
                          </div>}
                        
                        {showToolAvailableBadge && <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                              <Sparkles className="h-3 w-3 mr-1" />
                              {t('badges.available')}
                            </Badge>
                          </div>}
                        
                        {/* Exclusive for members badge - Updates section */}
                        {pack.type === 'updates' && <div className="absolute top-2 left-2 z-10">
                            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                              <Crown className="h-3 w-3 mr-1" />
                              {t('badges.exclusiveMembers')}
                            </Badge>
                          </div>}
                        
                        {/* Overlay with pack info */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 sm:p-4">
                          <h3 className="font-bold text-sm sm:text-lg text-white text-center leading-tight drop-shadow-lg">
                            {pack.name}
                          </h3>
                          
                          {/* For bonus type: show action button instead of arte count */}
                          {isBonusType ? <Button size="sm" className={`mt-2 text-xs ${isPremium ? 'bg-green-500 hover:bg-green-600' : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90'} text-white`} onClick={handleBonusAction}>
                              {isPremium ? (pack.download_url ? <>
                                  <Download className="h-3 w-3 mr-1" />
                                  {t('buttons.downloadBonus')}
                                </> : <>
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver conteúdo
                                </>) : <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] text-foreground text-center">{t('messages.unlockToPurchase')}</span>
                                  <span className="flex items-center">
                                    <Package className="h-3 w-3 mr-1" />
                                    {t('buttons.viewPacks')}
                                  </span>
                                </div>}
                            </Button> : isToolType ? isPremium ? <Badge className="mt-2 bg-green-500/80 text-white border-0 text-xs self-center backdrop-blur-sm">
                                <Play className="h-3 w-3 mr-1" />
                                {t('buttons.videoLessons')}
                              </Badge> : <Button size="sm" className="mt-2 text-xs bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white" onClick={e => {
                        e.stopPropagation();
                        // Navigate to specific tool page based on slug
                        if (pack.slug === 'upscaller-arcano') {
                          navigate('/upscalerarcanov3');
                        } else if (pack.slug === 'forja-selos-3d') {
                          navigate('/planos-forja-selos-3d');
                        } else {
                          navigate('/planos-artes');
                        }
                      }}>
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                {t('buttons.buyTool')}
                              </Button> : <Badge className="mt-2 bg-white/20 text-foreground border-0 text-xs self-center backdrop-blur-sm">
                              {arteCount} {arteCount === 1 ? t('art') : t('arts')}
                            </Badge>}
                          
                          {/* Renewal Button for expired packs */}
                          {!hasPackAccess && isExpired && !isBonusType && <Button size="sm" className="mt-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white text-xs" onClick={e => {
                        e.stopPropagation();
                        navigate(`/planos-artes?pack=${packSlug}&renovacao=true`);
                      }}>
                              <RotateCcw className="h-3 w-3 mr-1" />
                              {t('buttons.renewWithDiscount')}
                            </Button>}
                        </div>
                      </div>
                    </Card>;
              })}
                {getCurrentItems().length === 0 && <div className="col-span-full text-center py-12">
                    <p className="text-muted-foreground">{activeSection === 'bonus' ? t('empty.noBonus') : t('empty.noPacks')}</p>
                  </div>}
              </div>}

            {/* Mobile Button to open sidebar for Bonus and Updates - Only show in packs section */}
            {!selectedPack && activeSection === 'packs' && <Button className="lg:hidden w-full mt-6 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white py-6 text-base font-semibold" onClick={() => setSidebarOpen(true)}>
                <Gift className="h-5 w-5 mr-2" />
                {t('buttons.bonusAndUpdates')}
              </Button>}

            {/* Tutoriais View - Free for everyone, navigates to lesson page */}
            {activeSection === 'tutorial' && !selectedPack && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {getPacksByType('tutorial').map(tutorial => {
                // Use the actual slug from database
                return <Card key={tutorial.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group" onClick={() => navigate(`/tutorial-artes/${tutorial.slug}`)}>
                      <div className="aspect-[3/4] relative overflow-hidden">
                        {tutorial.cover_url ? <img src={tutorial.cover_url} alt={tutorial.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full bg-gradient-to-br from-emerald-500/60 to-emerald-600 flex items-center justify-center">
                            <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
                          </div>}
                        
                        {/* Free for everyone Tag */}
                        <div className="absolute top-2 right-2 z-10">
                          <Badge className="bg-green-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                            {t('badges.available')}
                          </Badge>
                        </div>
                        
                        {/* Overlay with tutorial info */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 sm:p-4">
                          <h3 className="font-bold text-sm sm:text-lg text-foreground text-center leading-tight drop-shadow-lg">
                            {tutorial.name}
                          </h3>
                          <Badge className="mt-2 bg-white/20 text-foreground border-0 text-xs self-center backdrop-blur-sm">
                            <Play className="h-3 w-3 mr-1" />
                            {t('buttons.videoLessons')}
                          </Badge>
                        </div>
                      </div>
                    </Card>;
              })}
                {getPacksByType('tutorial').length === 0 && <div className="col-span-full text-center py-12">
                    <p className="text-muted-foreground">{t('empty.noTutorials')}</p>
                  </div>}
              </div>}

            {/* Cursos View */}
            {activeSection === 'cursos' && !selectedPack && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {getPacksByType('curso').map(curso => {
                const cursoSlug = toPackSlug(curso.name);
                // For cursos: user must purchase the specific course (not just any pack)
                const hasCursoAccess = hasAccessToPack(cursoSlug);
                return <Card key={curso.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group" onClick={() => handleCursoClick(curso)}>
                      <div className="aspect-[3/4] relative overflow-hidden">
                        {curso.cover_url ? <img src={curso.cover_url} alt={curso.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center">
                            <GraduationCap className="h-12 w-12 sm:h-16 sm:w-16 text-foreground" />
                          </div>}
                        
                        {/* Access Tag */}
                        {hasCursoAccess && <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-green-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                              {t('badges.available')}
                            </Badge>
                          </div>}
                        
                        {/* Overlay with curso info */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 sm:p-4">
                          <h3 className="font-bold text-sm sm:text-lg text-foreground text-center leading-tight drop-shadow-lg">
                            {curso.name}
                          </h3>
                        </div>
                      </div>
                    </Card>;
              })}
                {getPacksByType('curso').length === 0 && <div className="col-span-full text-center py-12">
                    <p className="text-muted-foreground">{t('empty.noCourses')}</p>
                  </div>}
              </div>}

            {/* All Artes View */}
            {activeSection === 'all-artes' && <>
                {/* Category Filter */}
                <div className="mb-6">
                  {isMobile ? (
                    <MobileFilterDropdown
                      categories={categories}
                      selectedCategory={selectedCategory}
                      onSelectCategory={(cat) => {
                        setSelectedCategory(cat);
                        setCurrentPage(1);
                      }}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {categories.map(category => <Button key={category} variant={selectedCategory === category ? "default" : "outline"} size="sm" onClick={() => {
                      setSelectedCategory(category);
                      setCurrentPage(1);
                    }} className={`text-xs sm:text-sm ${selectedCategory === category ? 'bg-primary' : ''}`}>
                          {category}
                        </Button>)}
                    </div>
                  )}
                </div>

                {/* Artes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {paginatedArtes.map(arte => {
                  const isVideo = isVideoUrl(arte.imageUrl);
                  const arteId = String(arte.id);
                  const totalClicks = (arte.clickCount || 0) + (arte.bonusClicks || 0) + (clickIncrements[arteId] || 0);
                  const isAnimating = animatingClicks.has(arteId);
                  const packSlug = toPackSlug(arte.pack);
                  // Check if arte belongs to a tutorial pack - tutorials are free for everyone
                  const artePackInfo = dbPacks.find(p => p.name === arte.pack);
                  const isTutorialType = artePackInfo?.type === 'tutorial';
                  const hasAccess = isTutorialType || !arte.isPremium || hasAccessToPack(packSlug);
                  return <Card key={arte.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group" onClick={() => handleItemClick(arte)}>
                        <div className="relative aspect-square">
                      {isVideo ? (
                              <LazyVideo 
                                src={arte.imageUrl}
                                className="w-full h-full"
                                onClick={() => handleItemClick(arte)}
                              />
                            ) : <SecureImage src={arte.imageUrl} alt={arte.title} className="w-full h-full object-cover" isPremium={arte.isPremium || false} />}
                          
                          {!hasAccess && <div className="absolute top-2 right-2">
                              <Lock className="h-5 w-5 text-foreground drop-shadow-lg" />
                            </div>}
                          
                          <div className="absolute bottom-2 left-2 right-2">
                            <Badge variant="secondary" className={`bg-primary/80 text-foreground text-[10px] flex items-center gap-1 w-fit transition-transform ${isAnimating ? 'scale-110' : ''}`}>
                              <Copy className="h-2.5 w-2.5" />
                              {totalClicks}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-2 sm:p-3">
                          <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                            {arte.title}
                          </h3>
                          <div className="mt-1">
                            {getBadgeContent(arte)}
                          </div>
                          {hasAccess ? <Button size="sm" variant="outline" className="w-full mt-2 text-xs" onClick={e => {
                        e.stopPropagation();
                        handleItemClick(arte);
                      }}>
                              {t('buttons.viewDetails')}
                            </Button> : hasExpiredPack(packSlug) ? <Button size="sm" className="w-full mt-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white text-xs" onClick={e => {
                        e.stopPropagation();
                        navigate(`/planos-artes?pack=${packSlug}&renovacao=true`);
                      }}>
                              <RotateCcw className="h-3 w-3 mr-1" />
                              {t('buttons.renewWithDiscount')}
                            </Button> : isPremium ? <Button size="sm" className="w-full mt-2 bg-gradient-to-r from-purple-500 to-purple-400 hover:opacity-90 text-white text-xs" onClick={e => {
                        e.stopPropagation();
                        navigate(`/planos-artes-membro?pack=${packSlug}`);
                      }}>
                              <Star className="h-3 w-3 mr-1" fill="currentColor" />
                              {t('buttons.memberDiscount')}
                            </Button> : isPromoActive ? <Button size="sm" className="w-full mt-2 bg-gradient-to-r from-red-600 to-red-500 hover:opacity-90 text-white text-xs animate-pulse" onClick={e => {
                        e.stopPropagation();
                        navigate(`/promos-natal?pack=${packSlug}`);
                      }}>
                              <Star className="h-3 w-3 mr-1" fill="currentColor" />
                              {t('buttons.buyWith50Off')}
                            </Button> : <Button size="sm" className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white text-xs" onClick={e => {
                        e.stopPropagation();
                        navigate(`/planos-artes?pack=${packSlug}`);
                      }}>
                              <Star className="h-3 w-3 mr-1" fill="currentColor" />
                              {t('buttons.buyPack')}
                            </Button>}
                        </div>
                      </Card>;
                })}
                </div>

                {/* Empty state */}
                {paginatedArtes.length === 0 && <div className="text-center py-12">
                    <p className="text-muted-foreground">{t('empty.noArts')}</p>
                  </div>}

                {/* Pagination */}
                {totalPages > 1 && <div className="flex justify-center items-center gap-4 mt-8">
                    <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-muted-foreground">
                      {t('pagination.page')} {currentPage} {t('pagination.of')} {totalPages}
                    </span>
                    <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>}
              </>}

            {/* Free Sample View - show artes directly without pack selection */}
            {activeSection === 'free-sample' && !selectedPack && <>
                {/* Category Filter */}
                <div className="mb-6">
                  {isMobile ? (
                    <MobileFilterDropdown
                      categories={categories}
                      selectedCategory={selectedCategory}
                      onSelectCategory={(cat) => {
                        setSelectedCategory(cat);
                        setCurrentPage(1);
                      }}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {categories.map(category => <Button key={category} variant={selectedCategory === category ? "default" : "outline"} size="sm" onClick={() => {
                      setSelectedCategory(category);
                      setCurrentPage(1);
                    }} className={`text-xs sm:text-sm ${selectedCategory === category ? 'bg-primary' : ''}`}>
                          {category}
                        </Button>)}
                    </div>
                  )}
                </div>

                {/* Artes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {paginatedArtes.map(arte => {
                  const isVideo = isVideoUrl(arte.imageUrl);
                  const arteId = String(arte.id);
                  const totalClicks = (arte.clickCount || 0) + (arte.bonusClicks || 0) + (clickIncrements[arteId] || 0);
                  const isAnimating = animatingClicks.has(arteId);
                  // Free sample artes are always accessible
                  const hasAccess = true;
                  return <Card key={arte.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group" onClick={() => handleItemClick(arte)}>
                        <div className="relative aspect-square">
                      {isVideo ? (
                              <LazyVideo 
                                src={arte.imageUrl}
                                className="w-full h-full"
                                onClick={() => handleItemClick(arte)}
                              />
                            ) : <SecureImage src={arte.imageUrl} alt={arte.title} className="w-full h-full object-cover" isPremium={false} />}
                          
                          <div className="absolute bottom-2 left-2 right-2">
                            <Badge variant="secondary" className={`bg-primary/80 text-foreground text-[10px] flex items-center gap-1 w-fit transition-transform ${isAnimating ? 'scale-110' : ''}`}>
                              <Copy className="h-2.5 w-2.5" />
                              {totalClicks}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-2 sm:p-3">
                          <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                            {arte.title}
                          </h3>
                          <div className="mt-1">
                            {getBadgeContent(arte)}
                          </div>
                          <Button size="sm" variant="outline" className="w-full mt-2 text-xs" onClick={e => {
                        e.stopPropagation();
                        handleItemClick(arte);
                      }}>
                              Editar Agora 
                            </Button>
                        </div>
                      </Card>;
                })}
                </div>

                {/* Empty state */}
                {paginatedArtes.length === 0 && <div className="text-center py-12">
                    <p className="text-muted-foreground">Nenhuma arte grátis encontrada</p>
                  </div>}

                {/* Pagination */}
                {totalPages > 1 && <div className="flex justify-center items-center gap-4 mt-8">
                    <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>}
              </>}

            {/* Artes View (when a pack is selected) */}
            {selectedPack && <>
                {/* Back button and Pack title */}
                <div className="mb-4 flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => {
                  setSelectedPack(null);
                  setCurrentPage(1);
                }}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Voltar
                  </Button>
                </div>

                {/* Category Filter - Only for packs, not for bonus */}
                {activeSection === 'packs' && <div className="mb-6">
                    {isMobile ? (
                      <MobileFilterDropdown
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={(cat) => {
                          setSelectedCategory(cat);
                          setCurrentPage(1);
                        }}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {categories.map(category => <Button key={category} variant={selectedCategory === category ? "default" : "outline"} size="sm" onClick={() => {
                      setSelectedCategory(category);
                      setCurrentPage(1);
                    }} className={`text-xs sm:text-sm ${selectedCategory === category ? 'bg-primary' : ''}`}>
                            {category}
                          </Button>)}
                      </div>
                    )}
                  </div>}

                {/* Artes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {paginatedArtes.map(arte => {
                  const isVideo = isVideoUrl(arte.imageUrl);
                  const arteId = String(arte.id);
                  const totalClicks = (arte.clickCount || 0) + (arte.bonusClicks || 0) + (clickIncrements[arteId] || 0);
                  const isAnimating = animatingClicks.has(arteId);
                  const packSlug = toPackSlug(arte.pack);
                  // Check if arte belongs to a tutorial pack - tutorials are free for everyone
                  const artePackInfo = dbPacks.find(p => p.name === arte.pack);
                  const isTutorialType = artePackInfo?.type === 'tutorial';
                  // For tutorials: always free for everyone
                  // For bonus/updates: any active pack grants access
                  // For regular packs: need specific pack access
                  const isBonusOrUpdatesSection = activeSection === 'bonus' || activeSection === 'updates';
                  const hasAccess = isTutorialType || !arte.isPremium || (isBonusOrUpdatesSection ? isPremium : hasAccessToPack(packSlug));
                  return <Card key={arte.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group" onClick={() => handleItemClick(arte)}>
                        <div className="relative aspect-square">
                      {isVideo ? (
                              <LazyVideo 
                                src={arte.imageUrl}
                                className="w-full h-full"
                                onClick={() => handleItemClick(arte)}
                              />
                            ) : <SecureImage src={arte.imageUrl} alt={arte.title} className="w-full h-full object-cover" isPremium={arte.isPremium || false} />}
                          
                          {!hasAccess && <div className="absolute top-2 right-2">
                              <Lock className="h-5 w-5 text-foreground drop-shadow-lg" />
                            </div>}
                          
                          <div className="absolute bottom-2 left-2 right-2">
                            <Badge variant="secondary" className={`bg-primary/80 text-foreground text-[10px] flex items-center gap-1 w-fit transition-transform ${isAnimating ? 'scale-110' : ''}`}>
                              <Copy className="h-2.5 w-2.5" />
                              {totalClicks}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-2 sm:p-3">
                          <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                            {arte.title}
                          </h3>
                          <div className="mt-1">
                            {getBadgeContent(arte)}
                          </div>
                          {hasAccess ? <Button size="sm" variant="outline" className="w-full mt-2 text-xs" onClick={e => {
                        e.stopPropagation();
                        handleItemClick(arte);
                      }}>
                              Editar Agora 
                            </Button> : hasExpiredPack(packSlug) ? <Button size="sm" className="w-full mt-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white text-xs" onClick={e => {
                        e.stopPropagation();
                        navigate(`/planos-artes?pack=${packSlug}&renovacao=true`);
                      }}>
                              <RotateCcw className="h-3 w-3 mr-1" />
                              {t('buttons.renewWithDiscount')}
                            </Button> : isPremium ? <Button size="sm" className="w-full mt-2 bg-gradient-to-r from-purple-500 to-purple-400 hover:opacity-90 text-white text-xs" onClick={e => {
                        e.stopPropagation();
                        navigate(`/planos-artes-membro?pack=${packSlug}`);
                      }}>
                              <Star className="h-3 w-3 mr-1" fill="currentColor" />
                              {t('buttons.memberDiscount')}
                            </Button> : isPromoActive ? <Button size="sm" className="w-full mt-2 bg-gradient-to-r from-red-600 to-red-500 hover:opacity-90 text-white text-xs animate-pulse" onClick={e => {
                        e.stopPropagation();
                        navigate(`/promos-natal?pack=${packSlug}`);
                      }}>
                              <Star className="h-3 w-3 mr-1" fill="currentColor" />
                              {t('buttons.buyWith50Off')}
                            </Button> : <Button size="sm" className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white text-xs" onClick={e => {
                        e.stopPropagation();
                        navigate(`/planos-artes?pack=${packSlug}`);
                      }}>
                              <Star className="h-3 w-3 mr-1" fill="currentColor" />
                              {t('buttons.buyPack')}
                            </Button>}
                        </div>
                      </Card>;
                })}
                </div>

                {/* Empty state */}
                {paginatedArtes.length === 0 && <div className="text-center py-12">
                    <p className="text-muted-foreground">{t('empty.noArtsInPack')}</p>
                  </div>}
              </>}

            {/* Pagination - only when pack is selected and has multiple pages */}
            {selectedPack && totalPages > 1 && <div className="flex justify-center items-center gap-4 mt-8">
                <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-muted-foreground">
                  {t('pagination.page')} {currentPage} {t('pagination.of')} {totalPages}
                </span>
                <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>}
          </div>
        </div>
      </div>

      {/* Arte Detail Modal */}
      <Dialog open={!!selectedArte} onOpenChange={() => handleCloseModal()}>
        <DialogContent className="max-w-[95vw] sm:max-w-fit max-h-[95vh] overflow-y-auto">
          {selectedArte && (() => {
            const packSlug = toPackSlug(selectedArte.pack);
            // Check if arte belongs to bonus, updates, or tutorial pack type
            const selectedPackInfo = dbPacks.find(p => p.name === selectedArte.pack);
            const isBonusOrUpdatesType = selectedPackInfo?.type === 'bonus' || selectedPackInfo?.type === 'updates';
            const isTutorialType = selectedPackInfo?.type === 'tutorial';
            // For tutorials: always free for everyone (logged in or not)
            // For bonus/updates: any active pack grants access
            // For regular packs: need specific pack access
            const hasAccess = isTutorialType || !selectedArte.isPremium || (isBonusOrUpdatesType ? isPremium : hasAccessToPack(packSlug));
            return <div className="space-y-4">
                <div className="flex justify-center">
                  {isVideoUrl(selectedArte.imageUrl) ? <SecureVideo src={selectedArte.imageUrl} className="max-w-full max-h-[70vh] w-auto h-auto rounded-lg" isPremium={selectedArte.isPremium || false} controls /> : <SecureImage src={selectedArte.imageUrl} alt={selectedArte.title} className="max-w-full max-h-[70vh] w-auto h-auto rounded-lg" isPremium={selectedArte.isPremium || false} />}
                </div>
                
                <div className="text-center">
                  <h2 className="text-lg font-bold text-foreground">{selectedArte.title}</h2>
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {getBadgeContent(selectedArte)}
                    {selectedArte.category && <Badge variant="secondary" className="text-xs">
                        {selectedArte.category}
                      </Badge>}
                  </div>
                  {selectedArte.description && <p className="text-muted-foreground text-sm mt-2">{selectedArte.description}</p>}
                </div>

                {hasAccess ? <div className="flex flex-col gap-2">
                    {selectedArte.canvaLink && <Button onClick={() => {
                  window.open(selectedArte.canvaLink, '_blank');
                }} className="w-full bg-[#00C4CC] hover:bg-[#00a8b0] text-white">
                        <Download className="h-4 w-4 mr-2" />
                        {t('buttons.openInCanva')}
                      </Button>}
                    {selectedArte.driveLink && <Button onClick={() => {
                  window.open(selectedArte.driveLink, '_blank');
                }} className="w-full bg-[#31A8FF] hover:bg-[#2196F3] text-white">
                        <Download className="h-4 w-4 mr-2" />
                        {selectedArte.motionType === 'after_effects' 
                          ? 'Arquivo PSD e After' 
                          : t('buttons.downloadPsd')}
                      </Button>}
                    {selectedArte.downloadUrl && <Button onClick={() => handleDownload(selectedArte)} className="w-full" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        {t('buttons.downloadFile')}
                      </Button>}
                    {!selectedArte.canvaLink && !selectedArte.driveLink && !selectedArte.downloadUrl && <Button onClick={() => handleDownload(selectedArte)} className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        {t('buttons.downloadImage')}
                      </Button>}
                    {/* Ver mais Artes button - only for free arts */}
                    {!selectedArte.isPremium && <Button onClick={() => {
                  handleCloseModal();
                  setSelectedPack(null);
                  setActiveSection('all-artes');
                }} variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
                        <Eye className="h-4 w-4 mr-2" />
                        {t('buttons.viewMoreArts')}
                      </Button>}
                    <Button onClick={() => handleCloseModal()} variant="outline" className="w-full">
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      {t('buttons.back')}
                    </Button>
                  </div> : <div className="flex flex-col gap-2">
                    <p className="text-center text-muted-foreground text-sm">
                      {t('messages.acquirePackForAccess', { pack: selectedArte.pack })}
                    </p>
                    {!user && <Button onClick={() => navigate('/login-artes')} variant="outline" className="w-full">
                        <LogIn className="h-4 w-4 mr-2" />
                        {t('buttons.doLogin')}
                      </Button>}
                    {isPromoActive ? <Button onClick={() => navigate(`/promos-natal?pack=${packSlug}`)} className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:opacity-90 text-white animate-pulse">
                        <Star className="h-4 w-4 mr-2" fill="currentColor" />
                        {t('buttons.buyWith50Off')}
                      </Button> : <Button onClick={() => navigate(`/planos-artes?pack=${packSlug}`)} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white">
                        <Star className="h-4 w-4 mr-2" fill="currentColor" />
                        {t('buttons.buyPack')}
                      </Button>}
                    <Button onClick={() => handleCloseModal()} variant="outline" className="w-full">
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      {t('buttons.back')}
                    </Button>
                  </div>}
              </div>;
          })()}
        </DialogContent>
      </Dialog>

      {/* Premium Modal */}
      <Dialog open={showPremiumModal} onOpenChange={handleClosePremiumModal}>
        <DialogContent className="max-w-md">
          {premiumModalItem && <div className="space-y-4 text-center">
              <div className="relative">
                {isVideoUrl(premiumModalItem.imageUrl) ? <SecureVideo src={premiumModalItem.imageUrl} className="w-full rounded-lg" isPremium={true} controls /> : <SecureImage src={premiumModalItem.imageUrl} alt={premiumModalItem.title} className="w-full rounded-lg" isPremium={true} />}
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-foreground">{premiumModalItem.title}</h2>
                {(() => {
                const packInfo = dbPacks.find(p => p.name === premiumModalItem.pack);
                const isBonusOrUpdates = packInfo?.type === 'bonus' || packInfo?.type === 'updates';
                return <p className="text-muted-foreground mt-2">
                      {isBonusOrUpdates 
                        ? t('messages.exclusiveForMembers')
                        : premiumModalItem.pack 
                          ? t('messages.artBelongsToPack', { pack: premiumModalItem.pack })
                          : t('messages.exclusiveArt')}
                    </p>;
              })()}
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate('/login-artes')} variant="outline">
                  <LogIn className="h-4 w-4 mr-2" />
                  {t('buttons.doLogin')}
                </Button>
                {isPromoActive ? <Button onClick={() => {
                const packSlug = toPackSlug(premiumModalItem.pack);
                navigate(`/promos-natal${packSlug ? `?pack=${packSlug}` : ''}`);
              }} className="bg-gradient-to-r from-red-600 to-red-500 hover:opacity-90 text-white animate-pulse">
                    <Star className="h-4 w-4 mr-2" fill="currentColor" />
                    {t('buttons.buyWith50Off')}
                  </Button> : <Button onClick={() => {
                const packSlug = toPackSlug(premiumModalItem.pack);
                navigate(`/planos-artes${packSlug ? `?pack=${packSlug}` : ''}`);
              }} className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white">
                    <Star className="h-4 w-4 mr-2" fill="currentColor" />
                    {t('buttons.buyPack')}
                  </Button>}
                <Button onClick={() => handleClosePremiumModal(false)} variant="outline">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  {t('buttons.back')}
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      {/* Curso Modal */}
      <Dialog open={showCursoModal} onOpenChange={setShowCursoModal}>
        <DialogContent className="max-w-md">
          {selectedCurso && (() => {
            const cursoSlug = toPackSlug(selectedCurso.name);
            const hasCursoAccess = hasAccessToPack(cursoSlug);
            return <div className="space-y-4 text-center">
                <div className="relative">
                  {selectedCurso.cover_url ? <img src={selectedCurso.cover_url} alt={selectedCurso.name} className="w-full h-48 object-cover rounded-lg" /> : <div className="w-full h-48 bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center rounded-lg">
                      <GraduationCap className="h-16 w-16 text-foreground" />
                    </div>}
                  
                  {/* Access Badge */}
                  {hasCursoAccess && <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500 text-white border-0 text-xs font-semibold shadow-lg">
                        {t('badges.available')}
                      </Badge>
                    </div>}
                </div>
                
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedCurso.name}</h2>
                  <p className="text-muted-foreground mt-2">
                    {hasCursoAccess 
                      ? t('messages.accessExclusiveContent')
                      : t('messages.buyCourseForAccess')}
                  </p>
                </div>

                {hasCursoAccess ? <div className="flex flex-col gap-2">
                    <Button onClick={() => {
                  // Navegar para página do curso baseado no slug
                  if (cursoSlug === 'forja-selos-3d-ilimitada') {
                    navigate('/forja-selos-3d-artes');
                  } else if (cursoSlug === 'eventoia-como-criar-selos-3d-animados') {
                    window.open('https://blibliotecadeartesarcanas.greenn.club/home', '_blank');
                  } else {
                    toast.info(t('messages.linkComingSoon'));
                  }
                }} className="w-full">
                      <User className="h-4 w-4 mr-2" />
                      {t('buttons.accessCourse')}
                    </Button>
                    <Button onClick={() => setShowCursoModal(false)} variant="outline" className="w-full">
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      {t('buttons.back')}
                    </Button>
                  </div> : <div className="flex flex-col gap-2">
                    <Button onClick={() => {
                  // Se for membro (tem algum pack ativo), abre com desconto de membro
                  // Se não for membro ou não estiver logado, abre preço normal
                  if (isPremium) {
                    navigate(`/planos-artes-membro?pack=${cursoSlug}`);
                  } else {
                    navigate(`/planos-artes?pack=${cursoSlug}`);
                  }
                }} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                      <Star className="h-4 w-4 mr-2" fill="currentColor" />
                      {t('buttons.buyCourse')}
                    </Button>
                    <Button onClick={() => window.open('https://voxvisual.com.br/eventoia3/', '_blank')} variant="outline" className="w-full">
                      {t('buttons.learnMore')}
                    </Button>
                    <Button onClick={() => setShowCursoModal(false)} variant="outline" className="w-full">
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      {t('buttons.back')}
                    </Button>
                  </div>}
              </div>;
           })()}
        </DialogContent>
      </Dialog>

        </div>{/* flex */}
      </div>{/* min-h-screen */}
    </>
  );
};
export default BibliotecaArtes;