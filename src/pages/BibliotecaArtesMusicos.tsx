import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumMusicosStatus } from "@/hooks/usePremiumMusicosStatus";
import { useDailyMusicosLimit } from "@/hooks/useDailyMusicosLimit";
import { ArrowLeft, LogIn, Settings, LogOut, Loader2, Lock, Play, UserPlus, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import baaLogo from "@/assets/BAA.png";

interface Category {
  id: string;
  slug: string;
  name: string;
}

interface Arte {
  id: string;
  title: string;
  image_url: string;
  category: string;
  is_premium: boolean;
  canva_link: string | null;
  drive_link: string | null;
  is_ai_generated: boolean | null;
  ai_prompt: string | null;
}

const BibliotecaArtesMusicos = () => {
  const navigate = useNavigate();
  const { user, isPremium, planType, isLoading: authLoading, logout } = usePremiumMusicosStatus();
  const { downloadCount, dailyLimit, canDownload, recordDownload } = useDailyMusicosLimit();
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [artes, setArtes] = useState<Arte[]>([]);
  const [loadingArtes, setLoadingArtes] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedArte, setSelectedArte] = useState<Arte | null>(null);

  // Check if user has access to LED screen content (only Pro and Unlimited plans)
  const hasLedAccess = isPremium && planType !== 'basico';
  
  // Check if arte is a LED screen arte
  const isLedArte = (arte: Arte) => {
    return arte.category === 'telao-led' || arte.category === 'Telão de LED';
  };

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('artes_categories_musicos')
        .select('id, name, slug')
        .order('display_order', { ascending: true });
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchArtes = async () => {
      setLoadingArtes(true);
      const { data, error } = await supabase
        .from('admin_artes')
        .select('id, title, image_url, category, is_premium, canva_link, drive_link, is_ai_generated, ai_prompt')
        .eq('platform', 'musicos')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching artes:', error);
        setArtes([]);
      } else {
        setArtes((data || []) as Arte[]);
      }
      setLoadingArtes(false);
    };
    fetchArtes();
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("Logout realizado com sucesso!");
  };

  const handleArteClick = (arte: Arte) => {
    // Check LED access restriction for basic plan
    if (isLedArte(arte) && !hasLedAccess) {
      toast.error("Telões de LED são exclusivos para planos Pro e Unlimited", {
        description: "Faça upgrade do seu plano para acessar este conteúdo"
      });
      navigate("/planos-artes-musicos");
      return;
    }
    
    // If user is premium or arte is free, show modal with links
    if (isPremium || !arte.is_premium) {
      setSelectedArte(arte);
    } else {
      // Non-premium user trying to access premium content
      navigate("/planos-artes-musicos");
    }
  };

  const filteredArtes = selectedCategory === "todos" 
    ? artes 
    : artes.filter(a => {
        const cat = categories.find(c => c.slug === selectedCategory);
        return cat ? (a.category === cat.name || a.category === cat.slug) : a.category === selectedCategory;
      });

  const isVideo = (url: string) => {
    return url?.includes('.mp4') || url?.includes('.webm') || url?.includes('.mov');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1a2e] to-[#16213e]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f]/80 backdrop-blur-md border-b border-violet-500/20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left - Back + Logo */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/biblioteca-artes-hub")}
              className="text-violet-300 hover:text-violet-100 hover:bg-violet-500/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={baaLogo} alt="BAA" className="h-8" />
            <span className="hidden md:inline text-violet-300 font-medium">Músicos & Artistas</span>
          </div>

          {/* Right - Auth buttons */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {isPremium && (
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-xs bg-violet-600 text-white px-2 py-1 rounded-full">
                      Premium
                    </span>
                    <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-1 rounded-full flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {dailyLimit === Infinity ? '∞' : `${downloadCount}/${dailyLimit}`}
                    </span>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/perfil-artes")}
                  className="text-violet-300 hover:text-violet-100 hover:bg-violet-500/20"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Perfil</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-violet-300 hover:text-violet-100 hover:bg-violet-500/20"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => navigate("/planos-artes-musicos")}
                  className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
                  size="sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Torne-se Membro</span>
                  <span className="sm:hidden">Membro</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/login-artes-musicos")}
                  className="border-violet-500/30 text-violet-300 hover:bg-violet-500/20 hover:text-violet-100"
                >
                  <LogIn className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Entrar</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Modelos
          </h1>
          <p className="text-violet-200/70">
            Encontre o visual perfeito para sua carreira
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <Button
            variant={selectedCategory === "todos" ? "default" : "outline"}
            onClick={() => setSelectedCategory("todos")}
            className={
              selectedCategory === "todos"
                ? "bg-violet-600 hover:bg-violet-500 text-white border-violet-600"
                : "border-violet-500/30 text-violet-300 hover:bg-violet-500/20 hover:text-violet-100"
            }
          >
            Todos
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.slug ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.slug)}
              className={
                selectedCategory === cat.slug
                  ? "bg-violet-600 hover:bg-violet-500 text-white border-violet-600"
                  : "border-violet-500/30 text-violet-300 hover:bg-violet-500/20 hover:text-violet-100"
              }
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Content Grid */}
        {loadingArtes ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : filteredArtes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredArtes.map((arte) => {
              const isLed = isLedArte(arte);
              const ledRestricted = isLed && !hasLedAccess;
              const canAccess = (isPremium || !arte.is_premium) && !ledRestricted;
              return (
                <div
                  key={arte.id}
                  className="group relative bg-[#1a1a2e] rounded-xl overflow-hidden border border-violet-500/20 hover:border-violet-500/50 transition-all duration-300"
                >
                  {/* Premium Badge */}
                  {arte.is_premium && !ledRestricted && (
                    <div className="absolute top-2 left-2 z-10 bg-violet-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Premium
                    </div>
                  )}
                  
                  {/* LED Restricted Badge */}
                  {ledRestricted && (
                    <div className="absolute top-2 left-2 z-10 bg-amber-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Pro+
                    </div>
                  )}

                  {/* Media Preview */}
                  <div className="aspect-square relative overflow-hidden">
                    {isVideo(arte.image_url) ? (
                      <div className="relative w-full h-full">
                        <video
                          src={arte.image_url}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          autoPlay
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Play className="w-6 h-6 text-white fill-white" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={arte.image_url}
                        alt={arte.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                  </div>

                  {/* Card Info */}
                  <div className="p-3">
                    {/* Category Badge */}
                    <div className="mb-2">
                      <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-1 rounded">
                        {categories.find(c => c.slug === arte.category)?.name || arte.category}
                      </span>
                    </div>
                    
                    <h3 className="text-white font-medium text-sm truncate mb-3">
                      {arte.title}
                    </h3>

                    {/* Action Button */}
                    <Button
                      className={`w-full text-sm ${
                        canAccess 
                          ? "bg-violet-600 hover:bg-violet-500 text-white" 
                          : ledRestricted
                            ? "bg-amber-900/50 hover:bg-amber-800/50 text-amber-300"
                            : "bg-violet-900/50 hover:bg-violet-800/50 text-violet-300"
                      }`}
                      size="sm"
                      onClick={() => handleArteClick(arte)}
                    >
                      {canAccess ? (
                        <>
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Liberar Modelo
                        </>
                      ) : ledRestricted ? (
                        <>
                          <Lock className="w-3 h-3 mr-1" />
                          Plano Pro+
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 mr-1" />
                          Liberar Modelo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-violet-100 mb-2">
              Em Breve!
            </h2>
            <p className="text-violet-200/70 max-w-md mx-auto mb-6">
              Estamos preparando uma biblioteca incrível de artes para músicos e artistas.
              Em breve você terá acesso a modelos incríveis para:
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {categories.map((cat) => (
                <span
                  key={cat.id}
                  className="bg-violet-500/20 text-violet-300 px-3 py-1.5 rounded-full text-sm"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Arte Detail Modal */}
      <Dialog open={!!selectedArte} onOpenChange={() => setSelectedArte(null)}>
        <DialogContent className="max-w-md bg-[#1a1a2e] border-violet-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedArte?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedArte && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="aspect-square rounded-lg overflow-hidden">
                {isVideo(selectedArte.image_url) ? (
                  <video
                    src={selectedArte.image_url}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    muted
                  />
                ) : (
                  <img
                    src={selectedArte.image_url}
                    alt={selectedArte.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Category */}
              <div className="flex items-center gap-2">
                <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-1 rounded">
                  {categories.find(c => c.slug === selectedArte.category)?.name || selectedArte.category}
                </span>
                {selectedArte.is_ai_generated && (
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                    IA
                  </span>
                )}
              </div>

              {/* AI Prompt */}
              {selectedArte.is_ai_generated && selectedArte.ai_prompt && (
                <div className="p-3 bg-violet-900/30 rounded-lg">
                  <p className="text-xs text-violet-400 mb-1">Prompt utilizado:</p>
                  <p className="text-sm text-violet-200">{selectedArte.ai_prompt}</p>
                </div>
              )}

              {/* Download Counter */}
              {isPremium && dailyLimit !== Infinity && (
                <div className="text-center text-sm text-violet-300 bg-violet-500/10 rounded-lg py-2 px-3">
                  Downloads hoje: <span className="font-bold">{downloadCount}/{dailyLimit}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {selectedArte.canva_link && (
                  <Button
                    className="flex-1 bg-[#00C4CC] hover:bg-[#00b3b8] text-white"
                    disabled={!canDownload && dailyLimit !== Infinity}
                    onClick={async () => {
                      const success = await recordDownload(selectedArte.id);
                      if (success) {
                        window.open(selectedArte.canva_link!, '_blank');
                      }
                    }}
                  >
                    Abrir no Canva
                  </Button>
                )}
                {selectedArte.drive_link && (
                  <Button
                    className="flex-1 bg-[#31A8FF] hover:bg-[#2997e6] text-white"
                    disabled={!canDownload && dailyLimit !== Infinity}
                    onClick={async () => {
                      const success = await recordDownload(selectedArte.id);
                      if (success) {
                        window.open(selectedArte.drive_link!, '_blank');
                      }
                    }}
                  >
                    Baixar PSD
                  </Button>
                )}
              </div>

              {!selectedArte.canva_link && !selectedArte.drive_link && (
                <p className="text-center text-violet-400 text-sm">
                  Nenhum link de edição disponível
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BibliotecaArtesMusicos;
