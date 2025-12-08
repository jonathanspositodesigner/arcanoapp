import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExternalLink, Copy, Download, X, Play, ChevronLeft, ChevronRight, Star, Lock, LogIn, Menu, Flame, User, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
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
  isCommunity?: boolean;
  isExclusive?: boolean;
  isPremium?: boolean;
  tutorialUrl?: string;
  createdAt?: string;
  arteType?: 'admin' | 'community' | 'partner';
  clickCount?: number;
  bonusClicks?: number;
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

  const { user, isPremium, logout } = usePremiumStatus();

  const [contentType, setContentType] = useState<"exclusive" | "community">("exclusive");
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

  useEffect(() => {
    fetchArtes();
  }, []);

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
    const verTudoItems = allArtes;
    setShuffledVerTudo(shuffleArray(verTudoItems));
  }, [allArtes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, contentType]);

  const fetchArtes = async () => {
    const [communityResult, adminResult, partnerResult, clicksResult] = await Promise.all([
      supabase.from('community_artes').select('*').eq('approved', true).order('created_at', { ascending: false }),
      supabase.from('admin_artes').select('*').order('created_at', { ascending: false }),
      supabase.from('partner_artes').select('*').eq('approved', true).order('created_at', { ascending: false }),
      supabase.from('arte_clicks').select('arte_id')
    ]);

    const clickCounts: Record<string, number> = {};
    (clicksResult.data || []).forEach(d => {
      clickCounts[d.arte_id] = (clickCounts[d.arte_id] || 0) + 1;
    });

    const communityArtes: ArteItem[] = (communityResult.data || []).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      imageUrl: item.image_url,
      downloadUrl: item.download_url,
      category: item.category,
      isCommunity: true,
      isPremium: false,
      createdAt: item.created_at || undefined,
      arteType: 'community' as const,
      clickCount: clickCounts[item.id] || 0,
      bonusClicks: item.bonus_clicks || 0
    }));

    const adminArtes: ArteItem[] = (adminResult.data || []).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      imageUrl: item.image_url,
      downloadUrl: item.download_url,
      category: item.category,
      isExclusive: true,
      isPremium: (item as any).is_premium || false,
      tutorialUrl: item.tutorial_url || null,
      createdAt: item.created_at || undefined,
      arteType: 'admin' as const,
      clickCount: clickCounts[item.id] || 0,
      bonusClicks: item.bonus_clicks || 0
    }));

    const partnerArtes: ArteItem[] = (partnerResult.data || []).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      imageUrl: item.image_url,
      downloadUrl: item.download_url,
      category: item.category,
      isExclusive: true,
      isPremium: (item as any).is_premium ?? true,
      tutorialUrl: item.tutorial_url || null,
      createdAt: item.created_at || undefined,
      arteType: 'partner' as const,
      clickCount: clickCounts[item.id] || 0,
      bonusClicks: item.bonus_clicks || 0
    }));

    const allCombined = [...adminArtes, ...partnerArtes, ...communityArtes].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    setAllArtes(allCombined);
  };

  const contentTypeArtes = contentType === "exclusive" 
    ? allArtes.filter(a => a.isExclusive) 
    : allArtes.filter(a => a.isCommunity);

  const shuffledContentType = contentType === "exclusive" 
    ? shuffledVerTudo.filter(a => a.isExclusive) 
    : shuffledVerTudo.filter(a => a.isCommunity);

  const sortByClicks = (a: ArteItem, b: ArteItem) => {
    const clicksA = (a.clickCount || 0) + (a.bonusClicks || 0);
    const clicksB = (b.clickCount || 0) + (b.bonusClicks || 0);
    return clicksB - clicksA;
  };

  const getFilteredAndSortedArtes = () => {
    if (selectedCategory === "Ver Tudo") {
      return shuffledContentType;
    }

    const sortByDate = (a: ArteItem, b: ArteItem) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    };

    if (selectedCategory === "Populares") {
      return contentTypeArtes.sort(sortByClicks);
    }
    if (selectedCategory === "Novos") {
      return contentTypeArtes.sort(sortByDate).slice(0, 16);
    }
    if (selectedCategory === "Grátis") {
      return contentTypeArtes.filter(a => !a.isPremium).sort(sortByDate);
    }

    return contentTypeArtes.filter(a => a.category === selectedCategory).sort(sortByDate);
  };

  const filteredArtes = getFilteredAndSortedArtes();
  const totalPages = Math.ceil(filteredArtes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedArtes = filteredArtes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Categories by event type
  const categories = contentType === "exclusive" 
    ? ["Populares", "Ver Tudo", "Novos", "Grátis", "Aniversário", "Casamento", "Formatura", "15 Anos", "Batizado", "Chá de Bebê", "Corporativo", "Outros"]
    : ["Populares", "Ver Tudo", "Novos", "Aniversário", "Casamento", "Formatura", "15 Anos", "Batizado", "Chá de Bebê", "Corporativo", "Outros"];

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
        {item.isExclusive && (
          <Badge className="bg-gradient-primary text-white border-0 text-[10px] sm:text-xs">
            Arte Exclusiva
          </Badge>
        )}
        {item.isCommunity && (
          <Badge variant="outline" className="border-blue-500 text-blue-600 text-[10px] sm:text-xs">
            Comunidade
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Menu className="h-5 w-5" />
              </Button>
              <img 
                src={logoHorizontal} 
                alt="Arcano Lab" 
                className="h-6 sm:h-8 cursor-pointer" 
                onClick={() => navigate('/')}
              />
            </div>
            <div className="flex items-center gap-2">
              {user && isPremium ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/profile-settings')} className="gap-1">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Meu Perfil</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={logout} className="gap-1">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Sair</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                    <LogIn className="h-4 w-4 mr-1" />
                    Login
                  </Button>
                  <Button size="sm" onClick={() => navigate('/planos')} className="bg-gradient-primary">
                    <Star className="h-4 w-4 mr-1" fill="currentColor" />
                    Torne-se Premium
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

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

            <div className="mt-8">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Tipo de Conteúdo</h3>
              <div className="space-y-1">
                <Button
                  variant={contentType === "exclusive" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setContentType("exclusive")}
                >
                  Artes Exclusivas
                </Button>
                <Button
                  variant={contentType === "community" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setContentType("community")}
                >
                  Enviados pela Comunidade
                </Button>
              </div>
            </div>

            <div className="mt-8">
              <Button
                variant="outline"
                className="w-full border-primary text-primary"
                onClick={() => navigate('/contribuir-artes')}
              >
                Envie sua Arte
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Biblioteca de Artes Arcanas
            </h1>
            <p className="text-muted-foreground">
              {filteredArtes.length} artes disponíveis
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {paginatedArtes.map(arte => {
              const isVideo = isVideoUrl(arte.imageUrl);
              const totalClicks = (arte.clickCount || 0) + (arte.bonusClicks || 0) + (clickIncrements[String(arte.id)] || 0);
              const isAnimating = animatingClicks.has(String(arte.id));

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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedArte && (
            <div className="space-y-4">
              <div className="relative">
                {isVideoUrl(selectedArte.imageUrl) ? (
                  <SecureVideo
                    src={selectedArte.imageUrl}
                    className="w-full rounded-lg"
                    isPremium={selectedArte.isPremium || false}
                    controls
                  />
                ) : (
                  <SecureImage
                    src={selectedArte.imageUrl}
                    alt={selectedArte.title}
                    className="w-full rounded-lg"
                    isPremium={selectedArte.isPremium || false}
                  />
                )}
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-foreground">{selectedArte.title}</h2>
                <div className="mt-2">{getBadgeContent(selectedArte)}</div>
              </div>

              {selectedArte.description && (
                <p className="text-muted-foreground">{selectedArte.description}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleDownload(selectedArte)} className="flex-1 sm:flex-none">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Arte
                </Button>
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
