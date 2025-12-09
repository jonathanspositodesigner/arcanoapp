import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Copy, Download, ChevronLeft, ChevronRight, Star, Lock, LogIn, Menu, Flame, User, LogOut, Users, Settings, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import logoHorizontal from "@/assets/logo_horizontal.png";
import { SecureImage, SecureVideo, getSecureDownloadUrl } from "@/components/SecureMedia";
import { useSessionTracker } from "@/hooks/useSessionTracker";

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

const BibliotecaArtes = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useSessionTracker("/biblioteca-artes");

  const { user, isPremium, logout } = usePremiumArtesStatus();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
        setIsAdmin(data === true);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  const [selectedCategory, setSelectedCategory] = useState<string>("Ver Tudo");
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

  useEffect(() => {
    fetchArtes();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('artes_categories')
      .select('name')
      .order('display_order', { ascending: true });
    setDbCategories((data || []).map(c => c.name));
  };

  useEffect(() => {
    const itemId = searchParams.get("item");
    if (itemId && allArtes.length > 0) {
      const item = allArtes.find(a => a.id === itemId);
      if (item) {
        if (item.isPremium && !isPremium) {
          setPremiumModalItem(item);
          setShowPremiumModal(true);
        } else {
          setSelectedArte(item);
        }
      }
    }
  }, [searchParams, allArtes, isPremium]);

  useEffect(() => {
    setShuffledVerTudo(shuffleArray(allArtes));
  }, [allArtes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  const fetchArtes = async () => {
    const [adminResult, partnerResult, clicksResult] = await Promise.all([
      supabase.from('admin_artes').select('*').order('created_at', { ascending: false }),
      supabase.from('partner_artes').select('*').eq('approved', true).order('created_at', { ascending: false }),
      supabase.from('arte_clicks').select('arte_id')
    ]);

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
    if (selectedCategory === "Ver Tudo") {
      return shuffledVerTudo;
    }

    const sortByDate = (a: ArteItem, b: ArteItem) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    };

    if (selectedCategory === "Populares") {
      return [...allArtes].sort(sortByClicks);
    }
    if (selectedCategory === "Novos") {
      return [...allArtes].sort(sortByDate).slice(0, 16);
    }
    if (selectedCategory === "Grátis") {
      return allArtes.filter(a => !a.isPremium).sort(sortByDate);
    }

    return allArtes.filter(a => a.category === selectedCategory).sort(sortByDate);
  };

  const filteredArtes = getFilteredAndSortedArtes();
  const totalPages = Math.ceil(filteredArtes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedArtes = filteredArtes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Categories: fixed ones + dynamic from database
  const categories = ["Populares", "Ver Tudo", "Novos", "Grátis", ...dbCategories];

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
      setClickIncrements(prev => ({ ...prev, [arteId]: (prev[arteId] || 0) + 1 }));
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
    setSearchParams({ item: String(item.id) });
    if (item.isPremium && !isPremium) {
      setPremiumModalItem(item);
      setShowPremiumModal(true);
    } else {
      setSelectedArte(item);
    }
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

  const getBadgeContent = (item: ArteItem) => {
    return (
      <div className="flex flex-wrap gap-1">
        {item.isPremium ? (
          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-[10px] sm:text-xs">
            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" fill="currentColor" />
            Premium
          </Badge>
        ) : (
          <Badge variant="outline" className="border-green-500 text-green-600 text-[10px] sm:text-xs">
            Grátis
          </Badge>
        )}
        {item.pack && (
          <Badge className="bg-primary/80 text-white border-0 text-[10px] sm:text-xs">
            {item.pack}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar - Desktop */}
      <header className="hidden lg:flex bg-card border-b border-border px-6 py-3 items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            alt="Arcano Lab" 
            onClick={() => navigate('/')} 
            src={logoHorizontal}
            className="h-8 cursor-pointer hover:opacity-80 transition-opacity" 
          />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate("/parceiro-login-artes")} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Users className="h-4 w-4 mr-2" />
            Área do Colaborador
          </Button>
          {isAdmin && (
            <Button onClick={() => navigate("/admin-artes-review")} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Shield className="h-4 w-4 mr-2" />
              Admin Artes
            </Button>
          )}
          {!isPremium && <>
            <Button onClick={() => navigate("/login-artes")} variant="ghost" size="sm">
              <LogIn className="h-4 w-4 mr-2" />
              Login
            </Button>
            <Button onClick={() => navigate("/planos-artes")} size="sm" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white">
              <Star className="h-3 w-3 mr-2" fill="currentColor" />
              Torne-se Premium
            </Button>
          </>}
          {isPremium && <>
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
              <Star className="h-3 w-3 mr-1" fill="currentColor" />
              Premium Ativo
            </Badge>
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
      <header className="lg:hidden bg-primary px-4 py-3 flex items-center justify-between shadow-lg">
        <img alt="Arcano Lab" src="/lovable-uploads/87022a3f-e907-4bc8-83b0-3c6ef7ab69da.png" className="h-6" onClick={() => navigate('/')} />
        {!isPremium && <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/login-artes")} size="sm" variant="ghost" className="text-white hover:bg-white/20 text-xs">
              <LogIn className="h-4 w-4 mr-1" />
              Login
            </Button>
            <Button onClick={() => navigate("/planos-artes")} size="sm" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white text-xs">
              <Star className="h-3 w-3 mr-1" fill="currentColor" />
              Premium
            </Button>
          </div>}
        {isPremium && <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
              <Star className="h-3 w-3 mr-1" fill="currentColor" />
              Premium
            </Badge>
            <Button onClick={() => navigate("/perfil-artes")} size="sm" variant="ghost" className="text-white hover:bg-white/20 p-1.5">
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={logout} size="sm" variant="ghost" className="text-white hover:bg-white/20 p-1.5">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>}
      </header>

      {/* Mobile Bottom Menu Button */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Button onClick={() => setSidebarOpen(!sidebarOpen)} className="bg-primary hover:bg-primary/90 text-white shadow-xl px-6 py-6 rounded-full">
          <Menu className="h-6 w-6 mr-2" />
          <span className="font-semibold">Categorias</span>
        </Button>
      </div>

      {/* Overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:block pt-4 overflow-y-auto
        `}>
          <div className="p-4">
            <h2 className="text-lg font-bold text-foreground mb-4">Categorias</h2>
            <div className="space-y-1">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedCategory(category);
                    setSidebarOpen(false);
                  }}
                >
                  {getCategoryIcon(category)}
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Biblioteca de Artes Arcanas
            </h1>
            <p className="text-muted-foreground mt-1">
              Artes editáveis PSD e Canva para eventos
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {paginatedArtes.map(arte => {
              const isVideo = isVideoUrl(arte.imageUrl);
              const arteId = String(arte.id);
              const totalClicks = (arte.clickCount || 0) + (arte.bonusClicks || 0) + (clickIncrements[arteId] || 0);
              const isAnimating = animatingClicks.has(arteId);

              return (
                <Card 
                  key={arte.id} 
                  className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group"
                  onClick={() => handleItemClick(arte)}
                >
                  <div className="relative aspect-square">
                    {isVideo ? (
                      <SecureVideo
                        src={arte.imageUrl}
                        className="w-full h-full object-cover"
                        isPremium={arte.isPremium || false}
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <SecureImage
                        src={arte.imageUrl}
                        alt={arte.title}
                        className="w-full h-full object-cover"
                        isPremium={arte.isPremium || false}
                      />
                    )}
                    
                    {arte.isPremium && !isPremium && (
                      <div className="absolute top-2 right-2">
                        <Lock className="h-5 w-5 text-white drop-shadow-lg" />
                      </div>
                    )}
                    
                    <div className="absolute bottom-2 left-2 right-2">
                      <Badge 
                        variant="secondary" 
                        className={`bg-primary/80 text-white text-[10px] flex items-center gap-1 w-fit transition-transform ${isAnimating ? 'scale-110' : ''}`}
                      >
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
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Arte Detail Modal */}
      <Dialog open={!!selectedArte} onOpenChange={() => handleCloseModal()}>
        <DialogContent className="max-w-[340px] sm:max-w-[540px]">
          {selectedArte && (
            <div className="space-y-4">
              <div className="w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] mx-auto">
                {isVideoUrl(selectedArte.imageUrl) ? (
                  <SecureVideo
                    src={selectedArte.imageUrl}
                    className="w-full h-full object-cover rounded-lg"
                    isPremium={selectedArte.isPremium || false}
                    controls
                  />
                ) : (
                  <SecureImage
                    src={selectedArte.imageUrl}
                    alt={selectedArte.title}
                    className="w-full h-full object-cover rounded-lg"
                    isPremium={selectedArte.isPremium || false}
                  />
                )}
              </div>
              
              <div className="text-center">
                <h2 className="text-lg font-bold text-foreground">{selectedArte.title}</h2>
                <div className="mt-1 flex justify-center">{getBadgeContent(selectedArte)}</div>
                {selectedArte.description && (
                  <p className="text-muted-foreground text-sm mt-1">{selectedArte.description}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {selectedArte.canvaLink && (
                  <Button 
                    onClick={() => window.open(selectedArte.canvaLink, '_blank')} 
                    className="w-full bg-[#00C4CC] hover:bg-[#00a8b0] text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Abrir no Canva
                  </Button>
                )}
                {selectedArte.driveLink && (
                  <Button 
                    onClick={() => window.open(selectedArte.driveLink, '_blank')} 
                    className="w-full bg-[#31A8FF] hover:bg-[#2196F3] text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar PSD
                  </Button>
                )}
                {selectedArte.downloadUrl && (
                  <Button onClick={() => handleDownload(selectedArte)} className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Arquivo
                  </Button>
                )}
                {!selectedArte.canvaLink && !selectedArte.driveLink && !selectedArte.downloadUrl && (
                  <Button onClick={() => handleDownload(selectedArte)} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Imagem
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Premium Modal */}
      <Dialog open={showPremiumModal} onOpenChange={handleClosePremiumModal}>
        <DialogContent className="max-w-md">
          {premiumModalItem && (
            <div className="space-y-4 text-center">
              <div className="relative">
                {isVideoUrl(premiumModalItem.imageUrl) ? (
                  <SecureVideo
                    src={premiumModalItem.imageUrl}
                    className="w-full rounded-lg"
                    isPremium={true}
                    controls
                  />
                ) : (
                  <SecureImage
                    src={premiumModalItem.imageUrl}
                    alt={premiumModalItem.title}
                    className="w-full rounded-lg"
                    isPremium={true}
                  />
                )}
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-foreground">{premiumModalItem.title}</h2>
                <p className="text-muted-foreground mt-2">
                  Esta arte é exclusiva para assinantes Premium
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate('/login')} variant="outline">
                  <LogIn className="h-4 w-4 mr-2" />
                  Fazer Login
                </Button>
                <Button onClick={() => navigate('/planos')} className="bg-gradient-primary">
                  <Star className="h-4 w-4 mr-2" fill="currentColor" />
                  Torne-se Premium
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BibliotecaArtes;
