import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Download, ChevronLeft, ChevronRight, Star, Lock, LogIn, Menu, Flame, User, LogOut, Users, Settings, Shield, Package, ChevronDown, Gift, GraduationCap, X, RefreshCw, Sparkles, LayoutGrid, BookOpen, Cpu, MessageCircle, Send, Play, AlertTriangle, RotateCcw, Smartphone, Eye, Crown, ShoppingCart, Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import logoHorizontal from "@/assets/logo_horizontal.png";
import { SecureImage, SecureVideo, getSecureDownloadUrl } from "@/components/SecureMedia";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import BannerCarousel from "@/components/BannerCarousel";
import { toPackSlug } from "@/lib/utils";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import { useIsAppInstalled } from "@/hooks/useIsAppInstalled";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";


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
const BibliotecaArtes = () => {
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
  const [activeSection, setActiveSection] = useState<SidebarSection>('packs');
  const [showCursoModal, setShowCursoModal] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<PackItem | null>(null);
  const isAppInstalled = useIsAppInstalled();
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
    const [adminResult, partnerResult, clicksResult] = await Promise.all([supabase.from('admin_artes').select('*').order('created_at', {
      ascending: false
    }), supabase.from('partner_artes').select('*').eq('approved', true).order('created_at', {
      ascending: false
    }), supabase.from('arte_clicks').select('arte_id')]);
    const clickCounts: Record<string, number> = {};
    (clicksResult.data || []).forEach(d => {
      clickCounts[d.arte_id] = (clickCounts[d.arte_id] || 0) + 1;
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
      driveLink: (item as any).drive_link || null
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
      driveLink: (item as any).drive_link || null
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
  const trackArteClick = async (arteId: string, arteTitle: string, isAdmin: boolean) => {
    const sessionKey = `arte_clicked_${arteId}`;
    if (sessionStorage.getItem(sessionKey)) {
      return false;
    }
    try {
      await supabase.from('arte_clicks').insert({
        arte_id: arteId,
        arte_title: arteTitle,
        is_admin_arte: isAdmin
      });
      sessionStorage.setItem(sessionKey, 'true');
      return true;
    } catch (error) {
      console.error('Error tracking arte click:', error);
      return false;
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
      toast.success(`"${filename}" baixado com sucesso!`);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Erro ao baixar arquivo");
    }
  };
  const handleDownload = async (arteItem: ArteItem) => {
    const arteId = String(arteItem.id);
    const wasTracked = await trackArteClick(arteId, arteItem.title, !!arteItem.isExclusive);
    if (wasTracked) {
      setClickIncrements(prev => ({
        ...prev,
        [arteId]: (prev[arteId] || 0) + 1
      }));
      setAnimatingClicks(prev => new Set(prev).add(arteId));
      setTimeout(() => {
        setAnimatingClicks(prev => {
          const next = new Set(prev);
          next.delete(arteId);
          return next;
        });
      }, 300);
    }
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
        {item.isPremium ? <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-[10px] sm:text-xs">
            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" fill="currentColor" />
            Premium
          </Badge> : <Badge variant="outline" className="border-green-500 text-green-600 text-[10px] sm:text-xs">
            Grátis
          </Badge>}
        {item.pack && <Badge className="bg-primary/80 text-white border-0 text-[10px] sm:text-xs">
            {item.pack}
          </Badge>}
      </div>;
  };
  const SidebarContent = () => <div className="flex flex-col h-full py-4">
      <div className="px-4 mb-6 flex justify-center">
        <img alt="ArcanoApp" onClick={() => navigate('/')} src="/lovable-uploads/67562963-438f-4677-8000-81acb1886f7c.png" className="h-10 cursor-pointer hover:opacity-80 transition-opacity" />
      </div>
      
      <nav className="flex-1 px-2 space-y-1">
        {!isAppInstalled && (
          <div className="mb-6">
            <button onClick={() => {
              navigate('/install-app');
              setSidebarOpen(false);
            }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:from-yellow-600 hover:to-amber-700 shadow-md">
              <Smartphone className="h-5 w-5" />
              <span className="font-medium">Instalar App</span>
            </button>
          </div>
        )}

        <button onClick={() => {
        setActiveSection('tutorial');
        setSelectedPack(null);
        setSidebarOpen(false);
      }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeSection === 'tutorial' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
          <BookOpen className="h-5 w-5" />
          <span className="font-medium">Tutoriais</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {getPacksByType('tutorial').length}
          </Badge>
        </button>

        <button onClick={() => {
        setActiveSection('packs');
        setSelectedPack(null);
        setSidebarOpen(false);
      }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeSection === 'packs' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
          <Package className="h-5 w-5" />
          <span className="font-medium">Packs</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {getPacksByType('pack').length}
          </Badge>
        </button>

        <button onClick={() => {
        setActiveSection('bonus');
        setSelectedPack(null);
        setSidebarOpen(false);
      }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeSection === 'bonus' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
          <Gift className="h-5 w-5" />
          <span className="font-medium">Bônus</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {getPacksByType('bonus').length}
          </Badge>
        </button>

        <button onClick={() => {
        setActiveSection('cursos');
        setSelectedPack(null);
        setSidebarOpen(false);
      }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeSection === 'cursos' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
          <GraduationCap className="h-5 w-5" />
          <span className="font-medium">Cursos</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {getPacksByType('curso').length}
          </Badge>
        </button>

        <button onClick={() => {
        setActiveSection('updates');
        setSelectedPack(null);
        setSidebarOpen(false);
      }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeSection === 'updates' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
          <RefreshCw className="h-5 w-5" />
          <span className="font-medium">Atualizações</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {getPacksByType('updates').length}
          </Badge>
        </button>

        <button onClick={() => {
        setActiveSection('free-sample');
        setSelectedPack(null);
        setSidebarOpen(false);
      }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeSection === 'free-sample' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">Amostras Grátis</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {getPacksByType('free-sample').length}
          </Badge>
        </button>

        <button onClick={() => {
        setActiveSection('ferramentas_ia');
        setSelectedPack(null);
        setSidebarOpen(false);
      }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeSection === 'ferramentas_ia' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
          <Cpu className="h-5 w-5" />
          <span className="font-medium">Ferramentas de IA</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {getPacksByType('ferramentas_ia').length}
          </Badge>
        </button>

        <button onClick={() => {
        setActiveSection('all-artes');
        setSelectedPack(null);
        setSelectedCategory("Todos");
        setSidebarOpen(false);
      }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeSection === 'all-artes' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
          <LayoutGrid className="h-5 w-5" />
          <span className="font-medium">Ver Todas as Artes</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {allArtes.length}
          </Badge>
        </button>
      </nav>

      {/* WhatsApp Group Buttons */}
      <div className="px-4 pt-4 border-t border-border space-y-3">
        {userPacks.length > 0 ? <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Faça parte do nosso grupo exclusivo para membros</p>
            <Button onClick={() => window.open("https://chat.whatsapp.com/JOUGeS21VHq92hJWyxpOJC", "_blank")} size="sm" className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white">
              <MessageCircle className="h-4 w-4 mr-2" />
              Entrar no grupo
            </Button>
          </div> : <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Entre para os nossos grupos gratuitos</p>
            <Button onClick={() => window.open("https://chat.whatsapp.com/DJz6BbLDbbK9MBX8YiTsbw", "_blank")} size="sm" className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white">
              <MessageCircle className="h-4 w-4 mr-2" />
              Grupo Free WhatsApp
            </Button>
            <Button onClick={() => window.open("https://t.me/+8NKj2KNvLPswZTIx", "_blank")} size="sm" className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white">
              <Send className="h-4 w-4 mr-2" />
              Grupo de Avisos Telegram
            </Button>
          </div>}
      </div>

      <div className="px-4 pt-4 border-t border-border mt-auto space-y-2">
        <Button onClick={() => navigate("/parceiro-login-artes")} variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
          <Users className="h-4 w-4 mr-2" />
          Área do Colaborador
        </Button>
      </div>
    </div>;
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'packs':
        return 'Packs';
      case 'bonus':
        return 'Bônus';
      case 'cursos':
        return 'Cursos';
      case 'updates':
        return 'Atualizações de Artes Exclusivas para Membros';
      case 'free-sample':
        return 'Amostras Grátis';
      case 'all-artes':
        return 'Todas as Artes';
      case 'tutorial':
        return 'Tutoriais';
      case 'ferramentas_ia':
        return 'Ferramentas de IA';
    }
  };
  const getCurrentItems = () => {
    switch (activeSection) {
      case 'packs':
        return getPacksByType('pack');
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
  return <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-card border-r border-border">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64">
        {/* Top Bar - Desktop */}
        <header className="hidden lg:flex bg-card border-b border-border px-6 py-3 items-center justify-end sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {userPacks.length === 0 && <>
              <Button onClick={() => navigate("/login-artes")} variant="ghost" size="sm">
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </Button>
              <Button onClick={() => navigate("/planos-artes")} size="sm" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white">
                <Star className="h-3 w-3 mr-2" fill="currentColor" />
                Comprar Pack
              </Button>
            </>}
            {userPacks.length > 0 && <>
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                <Star className="h-3 w-3 mr-1" fill="currentColor" />
                {userPacks.length} {userPacks.length === 1 ? 'Pack' : 'Packs'}
              </Badge>
              {hasBonusAccess && <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                  <Gift className="h-3 w-3 mr-1" />
                  Bônus
                </Badge>}
              <Button onClick={() => navigate("/perfil-artes")} variant="ghost" size="sm">
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
        <header className="lg:hidden bg-primary px-4 py-3 flex items-center justify-between shadow-lg sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 p-1.5" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <img alt="ArcanoApp" onClick={() => navigate('/')} src="/lovable-uploads/1cac2857-c174-4597-98d6-7b2fa2011a9d.png" className="h-9" />
          </div>
          <div className="flex items-center gap-2">
            {userPacks.length === 0 && <>
              <Button onClick={() => navigate("/login-artes")} size="sm" variant="ghost" className="text-white hover:bg-white/20 text-xs">
                <LogIn className="h-4 w-4 mr-1" />
                Login
              </Button>
              <Button onClick={() => navigate("/planos-artes")} size="sm" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white text-xs">
                <Star className="h-3 w-3 mr-1" fill="currentColor" />
                Comprar
              </Button>
            </>}
            {userPacks.length > 0 && <>
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
                <Star className="h-3 w-3 mr-1" fill="currentColor" />
                {userPacks.length} Pack{userPacks.length > 1 ? 's' : ''}
              </Badge>
              <Button onClick={() => navigate("/perfil-artes")} size="sm" variant="ghost" className="text-white hover:bg-white/20 p-1.5">
                <Settings className="h-4 w-4" />
              </Button>
              <Button onClick={logout} size="sm" variant="ghost" className="text-white hover:bg-white/20 p-1.5">
                <LogOut className="h-4 w-4" />
              </Button>
            </>}
          </div>
        </header>

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

            {/* Install App Button - Below Banner, Mobile Only */}
            {!selectedPack && !isAppInstalled && (
              <button 
                onClick={() => navigate('/install-app')}
                className="lg:hidden w-full my-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-[length:200%_100%] animate-pulse text-white py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-3 font-semibold text-lg hover:shadow-xl transition-shadow"
              >
                <Smartphone className="h-6 w-6" />
                <span>Instalar App no Celular</span>
              </button>
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
                } else {
                  navigate('/planos-artes');
                }
              };
              
              return <Card key={pack.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group" onClick={() => {
                // For ferramentas_ia type: navigate to video lessons page
                if (isToolType) {
                  if (isPremium) {
                    navigate(`/ferramenta-ia-artes/${pack.slug}`);
                  } else {
                    navigate('/planos-artes');
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
                            {activeSection === 'bonus' ? <Gift className="h-12 w-12 sm:h-16 sm:w-16 text-white/80" /> : <Package className="h-12 w-12 sm:h-16 sm:w-16 text-white/80" />}
                          </div>}
                        
                        {/* Access Tag - Priority: Active > Expired > None */}
                        {hasPackAccess && !isBonusType && <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-green-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                              DISPONÍVEL
                            </Badge>
                          </div>}
                        
                        {/* Bonus access badge */}
                        {isBonusType && isPremium && <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-green-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                              <Download className="h-3 w-3 mr-1" />
                              DISPONÍVEL
                            </Badge>
                          </div>}
                        
                        {!hasPackAccess && isExpired && <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-red-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              ACESSO EXPIRADO
                            </Badge>
                          </div>}
                        
                        {showToolAvailableBadge && <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                              <Sparkles className="h-3 w-3 mr-1" />
                              DISPONÍVEL
                            </Badge>
                          </div>}
                        
                        {/* Exclusive for members badge - Updates section */}
                        {pack.type === 'updates' && <div className="absolute top-2 left-2 z-10">
                            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                              <Crown className="h-3 w-3 mr-1" />
                              Exclusivo para Membros
                            </Badge>
                          </div>}
                        
                        {/* Overlay with pack info */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 sm:p-4">
                          <h3 className="font-bold text-sm sm:text-lg text-white text-center leading-tight drop-shadow-lg">
                            {pack.name}
                          </h3>
                          
                          {/* For bonus type: show action button instead of arte count */}
                          {isBonusType ? (
                            <Button 
                              size="sm" 
                              className={`mt-2 text-xs ${isPremium ? 'bg-green-500 hover:bg-green-600' : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90'} text-white`}
                              onClick={handleBonusAction}
                            >
                              {isPremium ? (
                                <>
                                  <Download className="h-3 w-3 mr-1" />
                                  Baixar Bônus
                                </>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] text-white/80 text-center">Compre qualquer pack para desbloquear</span>
                                  <span className="flex items-center">
                                    <Package className="h-3 w-3 mr-1" />
                                    Ver packs
                                  </span>
                                </div>
                              )}
                            </Button>
                          ) : isToolType ? (
                            isPremium ? (
                              <Badge className="mt-2 bg-green-500/80 text-white border-0 text-xs self-center backdrop-blur-sm">
                                <Play className="h-3 w-3 mr-1" />
                                Vídeo Aulas
                              </Badge>
                            ) : (
                              <Button 
                                size="sm" 
                                className="mt-2 text-xs bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/planos-artes');
                                }}
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Comprar Ferramenta
                              </Button>
                            )
                          ) : (
                            <Badge className="mt-2 bg-white/20 text-white border-0 text-xs self-center backdrop-blur-sm">
                              {arteCount} {arteCount === 1 ? 'arte' : 'artes'}
                            </Badge>
                          )}
                          
                          {/* Renewal Button for expired packs */}
                          {!hasPackAccess && isExpired && !isBonusType && <Button size="sm" className="mt-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white text-xs" onClick={e => {
                      e.stopPropagation();
                      navigate(`/planos-artes?pack=${packSlug}&renovacao=true`);
                    }}>
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Renovar com Desconto
                            </Button>}
                        </div>
                      </div>
                    </Card>;
            })}
                {getCurrentItems().length === 0 && <div className="col-span-full text-center py-12">
                    <p className="text-muted-foreground">Nenhum {activeSection === 'bonus' ? 'bônus' : 'pack'} disponível</p>
                  </div>}
              </div>}

            {/* Tutoriais View - Free for everyone, navigates to lesson page */}
            {activeSection === 'tutorial' && !selectedPack && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {getPacksByType('tutorial').map(tutorial => {
              // Use the actual slug from database
              return <Card key={tutorial.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group" onClick={() => navigate(`/tutorial-artes/${tutorial.slug}`)}>
                      <div className="aspect-[3/4] relative overflow-hidden">
                        {tutorial.cover_url ? <img src={tutorial.cover_url} alt={tutorial.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full bg-gradient-to-br from-emerald-500/60 to-emerald-600 flex items-center justify-center">
                            <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 text-white/80" />
                          </div>}
                        
                        {/* Free for everyone Tag */}
                        <div className="absolute top-2 right-2 z-10">
                          <Badge className="bg-green-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                            DISPONÍVEL
                          </Badge>
                        </div>
                        
                        {/* Overlay with tutorial info */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 sm:p-4">
                          <h3 className="font-bold text-sm sm:text-lg text-white text-center leading-tight drop-shadow-lg">
                            {tutorial.name}
                          </h3>
                          <Badge className="mt-2 bg-white/20 text-white border-0 text-xs self-center backdrop-blur-sm">
                            <Play className="h-3 w-3 mr-1" />
                            Vídeo Aulas
                          </Badge>
                        </div>
                      </div>
                    </Card>;
            })}
                {getPacksByType('tutorial').length === 0 && <div className="col-span-full text-center py-12">
                    <p className="text-muted-foreground">Nenhum tutorial disponível</p>
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
                            <GraduationCap className="h-12 w-12 sm:h-16 sm:w-16 text-white/80" />
                          </div>}
                        
                        {/* Access Tag */}
                        {hasCursoAccess && <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-green-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                              DISPONÍVEL
                            </Badge>
                          </div>}
                        
                        {/* Overlay with curso info */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 sm:p-4">
                          <h3 className="font-bold text-sm sm:text-lg text-white text-center leading-tight drop-shadow-lg">
                            {curso.name}
                          </h3>
                        </div>
                      </div>
                    </Card>;
            })}
                {getPacksByType('curso').length === 0 && <div className="col-span-full text-center py-12">
                    <p className="text-muted-foreground">Nenhum curso disponível</p>
                  </div>}
              </div>}

            {/* All Artes View */}
            {activeSection === 'all-artes' && <>
                {/* Category Filter */}
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => <Button key={category} variant={selectedCategory === category ? "default" : "outline"} size="sm" onClick={() => {
                  setSelectedCategory(category);
                  setCurrentPage(1);
                }} className={`text-xs sm:text-sm ${selectedCategory === category ? 'bg-primary' : ''}`}>
                        {category}
                      </Button>)}
                  </div>
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
                          {isVideo ? <SecureVideo src={arte.imageUrl} className="w-full h-full object-cover" isPremium={arte.isPremium || false} autoPlay muted loop playsInline /> : <SecureImage src={arte.imageUrl} alt={arte.title} className="w-full h-full object-cover" isPremium={arte.isPremium || false} />}
                          
                          {!hasAccess && <div className="absolute top-2 right-2">
                              <Lock className="h-5 w-5 text-white drop-shadow-lg" />
                            </div>}
                          
                          <div className="absolute bottom-2 left-2 right-2">
                            <Badge variant="secondary" className={`bg-primary/80 text-white text-[10px] flex items-center gap-1 w-fit transition-transform ${isAnimating ? 'scale-110' : ''}`}>
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
                              Ver detalhes
                            </Button> : hasExpiredPack(packSlug) ? <Button size="sm" className="w-full mt-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white text-xs" onClick={e => {
                      e.stopPropagation();
                      navigate(`/planos-artes?pack=${packSlug}&renovacao=true`);
                    }}>
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Renovar com Desconto
                            </Button> : isPremium ? <Button size="sm" className="w-full mt-2 bg-gradient-to-r from-purple-500 to-violet-500 hover:opacity-90 text-white text-xs" onClick={e => {
                      e.stopPropagation();
                      navigate(`/planos-artes-membro?pack=${packSlug}`);
                    }}>
                              <Star className="h-3 w-3 mr-1" fill="currentColor" />
                              20% OFF Membro
                            </Button> : <Button size="sm" className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white text-xs" onClick={e => {
                      e.stopPropagation();
                      navigate(`/planos-artes?pack=${packSlug}`);
                    }}>
                              <Star className="h-3 w-3 mr-1" fill="currentColor" />
                              Comprar Pack
                            </Button>}
                        </div>
                      </Card>;
              })}
                </div>

                {/* Empty state */}
                {paginatedArtes.length === 0 && <div className="text-center py-12">
                    <p className="text-muted-foreground">Nenhuma arte encontrada</p>
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

            {/* Free Sample View - show artes directly without pack selection */}
            {activeSection === 'free-sample' && !selectedPack && <>
                {/* Category Filter */}
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => <Button key={category} variant={selectedCategory === category ? "default" : "outline"} size="sm" onClick={() => {
                  setSelectedCategory(category);
                  setCurrentPage(1);
                }} className={`text-xs sm:text-sm ${selectedCategory === category ? 'bg-primary' : ''}`}>
                        {category}
                      </Button>)}
                  </div>
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
                          {isVideo ? <SecureVideo src={arte.imageUrl} className="w-full h-full object-cover" isPremium={false} autoPlay muted loop playsInline /> : <SecureImage src={arte.imageUrl} alt={arte.title} className="w-full h-full object-cover" isPremium={false} />}
                          
                          <div className="absolute bottom-2 left-2 right-2">
                            <Badge variant="secondary" className={`bg-primary/80 text-white text-[10px] flex items-center gap-1 w-fit transition-transform ${isAnimating ? 'scale-110' : ''}`}>
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
                    <div className="flex flex-wrap gap-2">
                      {categories.map(category => <Button key={category} variant={selectedCategory === category ? "default" : "outline"} size="sm" onClick={() => {
                  setSelectedCategory(category);
                  setCurrentPage(1);
                }} className={`text-xs sm:text-sm ${selectedCategory === category ? 'bg-primary' : ''}`}>
                          {category}
                        </Button>)}
                    </div>
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
                          {isVideo ? <SecureVideo src={arte.imageUrl} className="w-full h-full object-cover" isPremium={arte.isPremium || false} autoPlay muted loop playsInline /> : <SecureImage src={arte.imageUrl} alt={arte.title} className="w-full h-full object-cover" isPremium={arte.isPremium || false} />}
                          
                          {!hasAccess && <div className="absolute top-2 right-2">
                              <Lock className="h-5 w-5 text-white drop-shadow-lg" />
                            </div>}
                          
                          <div className="absolute bottom-2 left-2 right-2">
                            <Badge variant="secondary" className={`bg-primary/80 text-white text-[10px] flex items-center gap-1 w-fit transition-transform ${isAnimating ? 'scale-110' : ''}`}>
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
                              Renovar com Desconto
                            </Button> : isPremium ? <Button size="sm" className="w-full mt-2 bg-gradient-to-r from-purple-500 to-violet-500 hover:opacity-90 text-white text-xs" onClick={e => {
                      e.stopPropagation();
                      navigate(`/planos-artes-membro?pack=${packSlug}`);
                    }}>
                              <Star className="h-3 w-3 mr-1" fill="currentColor" />
                              20% OFF Membro
                            </Button> : <Button size="sm" className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white text-xs" onClick={e => {
                      e.stopPropagation();
                      navigate(`/planos-artes?pack=${packSlug}`);
                    }}>
                              <Star className="h-3 w-3 mr-1" fill="currentColor" />
                              Comprar Pack
                            </Button>}
                        </div>
                      </Card>;
              })}
                </div>

                {/* Empty state */}
                {paginatedArtes.length === 0 && <div className="text-center py-12">
                    <p className="text-muted-foreground">Nenhuma arte encontrada neste pack</p>
                  </div>}
              </>}

            {/* Pagination - only when pack is selected and has multiple pages */}
            {selectedPack && totalPages > 1 && <div className="flex justify-center items-center gap-4 mt-8">
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
          </div>
        </div>
      </div>

      {/* Arte Detail Modal */}
      <Dialog open={!!selectedArte} onOpenChange={() => handleCloseModal()}>
        <DialogContent className="max-w-[95vw] sm:max-w-fit max-h-[95vh] overflow-y-auto p-4">
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
          return <div className="space-y-3">
                <div className="flex justify-center">
                  {isVideoUrl(selectedArte.imageUrl) ? <SecureVideo src={selectedArte.imageUrl} className="max-w-full max-h-[50vh] w-auto h-auto rounded-lg object-contain" isPremium={selectedArte.isPremium || false} controls /> : <SecureImage src={selectedArte.imageUrl} alt={selectedArte.title} className="max-w-full max-h-[50vh] w-auto h-auto rounded-lg object-contain" isPremium={selectedArte.isPremium || false} />}
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
                    {selectedArte.canvaLink && <Button onClick={() => window.open(selectedArte.canvaLink, '_blank')} className="w-full bg-[#00C4CC] hover:bg-[#00a8b0] text-white">
                        <Download className="h-4 w-4 mr-2" />
                        Abrir no Canva
                      </Button>}
                    {selectedArte.driveLink && <Button onClick={() => window.open(selectedArte.driveLink, '_blank')} className="w-full bg-[#31A8FF] hover:bg-[#2196F3] text-white">
                        <Download className="h-4 w-4 mr-2" />
                        Baixar PSD
                      </Button>}
                    {selectedArte.downloadUrl && <Button onClick={() => handleDownload(selectedArte)} className="w-full" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Baixar Arquivo
                      </Button>}
                    {!selectedArte.canvaLink && !selectedArte.driveLink && !selectedArte.downloadUrl && <Button onClick={() => handleDownload(selectedArte)} className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Baixar Imagem
                      </Button>}
                    {/* Ver mais Artes button - only for free arts */}
                    {!selectedArte.isPremium && <Button onClick={() => {
                        handleCloseModal();
                        setSelectedPack(null);
                        setActiveSection('all-artes');
                      }} variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
                        <Eye className="h-4 w-4 mr-2" />
                        Ver mais Artes
                      </Button>}
                  </div> : <div className="flex flex-col gap-2">
                    <p className="text-center text-muted-foreground text-sm">
                      Adquira o pack "{selectedArte.pack}" para ter acesso completo a esta arte.
                    </p>
                    {!user && <Button onClick={() => navigate('/login-artes')} variant="outline" className="w-full">
                        <LogIn className="h-4 w-4 mr-2" />
                        Fazer Login
                      </Button>}
                    <Button onClick={() => navigate(`/planos-artes?pack=${packSlug}`)} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white">
                      <Star className="h-4 w-4 mr-2" fill="currentColor" />
                      Comprar Pack
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
                      {isBonusOrUpdates ? "Este conteúdo é exclusivo para membros. Adquira qualquer pack para ter acesso a todos os bônus e atualizações." : premiumModalItem.pack ? `Esta arte faz parte do pack "${premiumModalItem.pack}". Adquira o pack para ter acesso completo.` : "Esta arte é exclusiva. Adquira um pack para ter acesso."}
                    </p>;
            })()}
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate('/login-artes')} variant="outline">
                  <LogIn className="h-4 w-4 mr-2" />
                  Fazer Login
                </Button>
                <Button onClick={() => {
              const packSlug = toPackSlug(premiumModalItem.pack);
              navigate(`/planos-artes${packSlug ? `?pack=${packSlug}` : ''}`);
            }} className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white">
                  <Star className="h-4 w-4 mr-2" fill="currentColor" />
                  Comprar Pack
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
                      <GraduationCap className="h-16 w-16 text-white/80" />
                    </div>}
                  
                  {/* Access Badge */}
                  {hasCursoAccess && <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500 text-white border-0 text-xs font-semibold shadow-lg">
                        DISPONÍVEL
                      </Badge>
                    </div>}
                </div>
                
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedCurso.name}</h2>
                  <p className="text-muted-foreground mt-2">
                    {hasCursoAccess ? "Acesse o conteúdo exclusivo deste curso" : "Adquira este curso para ter acesso ao conteúdo exclusivo"}
                  </p>
                </div>

                {hasCursoAccess ? <div className="flex flex-col gap-2">
                    <Button onClick={() => {
                // Navegar para página do curso baseado no slug
                if (cursoSlug === 'forja-selos-3d-ilimitada') {
                  navigate('/forja-selos-3d-artes');
                } else {
                  toast.info("Link será configurado em breve");
                }
              }} className="w-full">
                      <User className="h-4 w-4 mr-2" />
                      Acessar Curso
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
                      Comprar Curso
                    </Button>
                    <Button 
                      onClick={() => window.open('https://voxvisual.com.br/eventoia3/?utm_source=aplicativo&utm_medium=aplicativo&utm_campaign=aplicativo&utm_id=aplicativo', '_blank')} 
                      variant="outline" 
                      className="w-full"
                    >
                      Saiba mais
                    </Button>
                  </div>}
              </div>;
        })()}
        </DialogContent>
      </Dialog>


      {/* Push Notification Prompt */}
      <PushNotificationPrompt />
    </div>;
};
export default BibliotecaArtes;