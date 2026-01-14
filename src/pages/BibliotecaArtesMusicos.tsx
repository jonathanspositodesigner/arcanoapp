import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumMusicosStatus } from "@/hooks/usePremiumMusicosStatus";
import { useDailyMusicosLimit } from "@/hooks/useDailyMusicosLimit";
import { useIsAppInstalled } from "@/hooks/useIsAppInstalled";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { 
  ArrowLeft, LogIn, Settings, LogOut, Loader2, Lock, Play, UserPlus, ExternalLink, Download,
  Smartphone, Bell, User, Sparkles, Video, ChevronDown, MessageCircle, Menu, X, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ai_reference_image_url: string | null;
}

const BibliotecaArtesMusicos = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('library');
  const { user, isPremium, planType, isLoading: authLoading, logout } = usePremiumMusicosStatus();
  const { downloadCount, dailyLimit, canDownload, recordDownload } = useDailyMusicosLimit();
  const isAppInstalled = useIsAppInstalled();
  const { isSubscribed, subscribe, isSupported } = usePushNotifications();
  
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [artes, setArtes] = useState<Arte[]>([]);
  const [loadingArtes, setLoadingArtes] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedArte, setSelectedArte] = useState<Arte | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);

  const hasLedAccess = isPremium && planType !== 'basico';
  
  const isLedArte = (arte: Arte) => {
    return arte.category === 'telao-led' || arte.category === 'Telão de LED';
  };

  const aiTools = [
    { name: t('musicos.aiTools.chatgpt'), url: "https://chatgpt.com/", icon: Sparkles },
    { name: t('musicos.aiTools.nanoBanana'), url: "https://aistudio.google.com/prompts/new_chat?model=gemini-2.5-flash-image", icon: Sparkles },
    { name: t('musicos.aiTools.whisk'), url: "https://labs.google/fx/pt/tools/whisk", icon: Sparkles },
    { name: t('musicos.aiTools.flux2'), url: "https://www.runninghub.ai/workflow/1995538803421020162", icon: Sparkles },
    { name: t('musicos.aiTools.veo3'), url: "https://labs.google/fx/pt/tools/flow", icon: Video }
  ];

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
        .select('id, title, image_url, category, is_premium, canva_link, drive_link, is_ai_generated, ai_prompt, ai_reference_image_url')
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
    toast.success(t('musicos.toast.logoutSuccess'));
  };

  const handleArteClick = (arte: Arte) => {
    if (isLedArte(arte) && !hasLedAccess) {
      toast.error(t('musicos.toast.ledExclusive'), {
        description: t('musicos.toast.ledExclusiveDescription')
      });
      navigate("/planos-artes-musicos");
      return;
    }
    
    if (isPremium || !arte.is_premium) {
      setSelectedArte(arte);
    } else {
      navigate("/planos-artes-musicos");
    }
  };

  const handleActivateNotifications = async () => {
    const success = await subscribe();
    if (success) {
      toast.success(t('musicos.toast.notificationsSuccess'));
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

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <img src={baaLogo} alt="BAA" className="h-10 mx-auto" />
      </div>

      <div className="flex-1 p-4 space-y-2">
        {!isAppInstalled && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-amber-500/20 hover:to-yellow-500/20 border border-transparent hover:border-amber-500/30"
            onClick={() => { navigate("/instalar-app"); onClose?.(); }}
          >
            <Smartphone className="w-5 h-5 text-amber-400" />
            <span>{t('musicos.sidebar.installApp')}</span>
          </Button>
        )}

        {isSupported && !isSubscribed && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20 border border-transparent hover:border-purple-500/30"
            onClick={() => { handleActivateNotifications(); onClose?.(); }}
          >
            <Bell className="w-5 h-5 text-purple-400" />
            <span>{t('musicos.sidebar.activateNotifications')}</span>
          </Button>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-gray-300 hover:text-white hover:bg-white/10"
          onClick={() => { navigate("/perfil-artes", { state: { from: 'musicos' } }); onClose?.(); }}
        >
          <User className="w-5 h-5" />
          <span>{t('musicos.sidebar.myAccount')}</span>
        </Button>

        <Collapsible open={aiMenuOpen} onOpenChange={setAiMenuOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between gap-3 text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 border border-transparent hover:border-cyan-500/30"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>{t('musicos.sidebar.generateWithAI')}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${aiMenuOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 ml-4 space-y-1">
            {aiTools.map((tool) => (
              <Button
                key={tool.name}
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-gray-400 hover:text-white hover:bg-white/10 text-sm"
                onClick={() => { window.open(tool.url, '_blank'); onClose?.(); }}
              >
                <tool.icon className="w-4 h-4" />
                <span>{tool.name}</span>
              </Button>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="p-4 border-t border-white/10">
        <Button
          className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white gap-2"
          onClick={() => { window.open("https://chat.whatsapp.com/SEU_LINK_AQUI", '_blank'); onClose?.(); }}
        >
          <MessageCircle className="w-5 h-5" />
          <span>{t('musicos.sidebar.vipGroup')}</span>
        </Button>
      </div>
    </div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#161b22] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#161b22] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-500/15 to-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 rounded-full blur-3xl" />
      </div>

      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0a0a0a]/90 backdrop-blur-xl border-r border-white/10 z-40">
        <SidebarContent />
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-white/10">
          <SidebarContent onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden text-gray-400 hover:text-white hover:bg-white/10" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/biblioteca-artes-hub")} className="text-gray-400 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img src={baaLogo} alt="BAA" className="h-8" />
              <span className="hidden md:inline text-gray-300 font-medium">{t('musicos.platformTitle')}</span>
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <div className="flex items-center gap-1 sm:gap-2">
                    {isPremium ? (
                      <span className="text-xs bg-gradient-to-r from-pink-500 to-purple-500 text-white px-2 sm:px-3 py-1 rounded-full font-medium">Premium</span>
                    ) : (
                      <span className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm border border-white/10">
                        <Download className="w-3 h-3" />
                        <span className="font-medium">{downloadCount}/{dailyLimit}</span>
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/perfil-artes", { state: { from: 'musicos' } })} className="text-gray-400 hover:text-white hover:bg-white/10">
                    <Settings className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">{t('musicos.header.profile')}</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white hover:bg-white/10">
                    <LogOut className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">{t('musicos.header.logout')}</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => navigate("/planos-artes-musicos")} className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white gap-2 border-0" size="sm">
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('musicos.header.becomeMember')}</span>
                    <span className="sm:hidden">{t('musicos.header.becomeMember')}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("/login-artes-musicos")} className="border-white/20 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/30">
                    <LogIn className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">{t('musicos.header.login')}</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 relative z-10">
          {(!isAppInstalled || (isAppInstalled && isSupported && !isSubscribed)) && (
            <div className="text-center mb-6">
              {!isAppInstalled ? (
                <Button onClick={() => navigate('/install')} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-3 text-base font-semibold shadow-lg shadow-amber-500/25 animate-pulse">
                  <Smartphone className="w-5 h-5 mr-2" />
                  {t('musicos.sidebar.installApp')}
                </Button>
              ) : isSupported && !isSubscribed ? (
                <Button onClick={subscribe} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 text-base font-semibold shadow-lg shadow-purple-500/25 animate-pulse">
                  <Bell className="w-5 h-5 mr-2" />
                  {t('musicos.sidebar.activateNotifications')}
                </Button>
              ) : null}
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-2">{t('musicos.content.title')}</h1>
            <p className="text-gray-400">{t('musicos.content.subtitle')}</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-2 mb-8 px-4 sm:px-0">
            <div className="grid grid-cols-2 gap-2 sm:contents">
              <Button
                variant={selectedCategory === "todos" ? "default" : "outline"}
                onClick={() => setSelectedCategory("todos")}
                className={`h-auto min-h-[44px] px-4 py-2.5 text-sm whitespace-normal text-center leading-tight ${selectedCategory === "todos" ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0" : "border-white/20 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/30 bg-transparent"}`}
              >
                {t('musicos.content.all')}
              </Button>
              {categories.map((cat) => {
                const isLedCategory = cat.slug === 'telao-led';
                return (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.slug ? "default" : "outline"}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`h-auto min-h-[44px] px-4 py-2.5 text-sm whitespace-normal text-center leading-tight flex-col sm:flex-row gap-1 ${selectedCategory === cat.slug ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0" : "border-white/20 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/30 bg-transparent"}`}
                  >
                    <span>{cat.name}</span>
                    {isLedCategory && <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-medium">Pro+</span>}
                  </Button>
                );
              })}
            </div>
          </div>

          {loadingArtes ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
          ) : filteredArtes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredArtes.map((arte) => {
                const isLed = isLedArte(arte);
                const ledRestricted = isLed && !hasLedAccess;
                const canAccess = (isPremium || !arte.is_premium) && !ledRestricted;
                return (
                  <div key={arte.id} className="group relative bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
                    {arte.is_premium && !ledRestricted && (
                      <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Lock className="w-3 h-3" />{t('musicos.badges.premium')}
                      </div>
                    )}
                    {ledRestricted && (
                      <div className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Lock className="w-3 h-3" />{t('musicos.badges.proPlus')}
                      </div>
                    )}
                    <div className="aspect-square relative overflow-hidden">
                      {isVideo(arte.image_url) ? (
                        <div className="relative w-full h-full">
                          <video src={arte.image_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><Play className="w-6 h-6 text-white fill-white" /></div>
                          </div>
                        </div>
                      ) : (
                        <img src={arte.image_url} alt={arte.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      )}
                    </div>
                    <div className="p-3">
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded">{categories.find(c => c.slug === arte.category)?.name || arte.category}</span>
                        {isLed && <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-medium">Pro+</span>}
                      </div>
                      <h3 className="text-white font-medium text-sm line-clamp-2 mb-3 min-h-[2.5rem]">{arte.title}</h3>
                      <Button
                        className={`w-full text-xs sm:text-sm whitespace-nowrap ${canAccess ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0" : ledRestricted ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30" : "bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10"}`}
                        size="sm"
                        onClick={() => handleArteClick(arte)}
                      >
                        {canAccess ? (<><ExternalLink className="w-3 h-3 mr-1 flex-shrink-0" /><span>{t('musicos.content.editModel')}</span></>) : ledRestricted ? (<><Lock className="w-3 h-3 mr-1 flex-shrink-0" /><span>Pro+</span></>) : (<><Lock className="w-3 h-3 mr-1 flex-shrink-0" /><span>{t('musicos.content.unlock')}</span></>)}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center"><Loader2 className="w-10 h-10 text-cyan-400" /></div>
              <h2 className="text-2xl font-bold text-white mb-2">{t('musicos.empty.title')}</h2>
              <p className="text-gray-400 max-w-md mx-auto mb-6">{t('musicos.empty.description')}</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {categories.map((cat) => (<span key={cat.id} className="bg-white/10 text-gray-300 px-3 py-1.5 rounded-full text-sm">{cat.name}</span>))}
              </div>
            </div>
          )}
        </main>

        <Dialog open={!!selectedArte} onOpenChange={() => setSelectedArte(null)}>
          <DialogContent className="max-w-md bg-[#161b22] border-white/10">
            <DialogHeader><DialogTitle className="text-white">{selectedArte?.title}</DialogTitle></DialogHeader>
            {selectedArte && (
              <div className="space-y-4">
                <div className="aspect-square rounded-lg overflow-hidden">
                  {isVideo(selectedArte.image_url) ? (<video src={selectedArte.image_url} className="w-full h-full object-cover" controls preload="metadata" />) : (<img src={selectedArte.image_url} alt={selectedArte.title} className="w-full h-full object-cover" />)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded">{categories.find(c => c.slug === selectedArte.category)?.name || selectedArte.category}</span>
                  {selectedArte.is_ai_generated && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">IA</span>}
                </div>
                {selectedArte.is_ai_generated && selectedArte.ai_prompt && (
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-xs text-gray-400 mb-1">{t('musicos.modal.promptUsed')}</p>
                    <p className="text-sm text-gray-200 mb-3">{selectedArte.ai_prompt}</p>
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white" size="sm" disabled={!canDownload && dailyLimit !== Infinity} onClick={async () => { const success = await recordDownload(selectedArte.id); if (success) { navigator.clipboard.writeText(selectedArte.ai_prompt!); toast.success(t('musicos.toast.promptCopied')); } }}>
                      <Copy className="w-4 h-4 mr-2" />{t('musicos.modal.copyPrompt')}
                    </Button>
                  </div>
                )}
                {selectedArte.is_ai_generated && selectedArte.ai_reference_image_url && (
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <p className="text-xs text-purple-300 mb-2">{t('musicos.modal.referenceImage')}</p>
                    <img src={selectedArte.ai_reference_image_url} alt="Referência para IA" className="w-full max-h-40 object-contain rounded-lg mb-2 bg-black/20" />
                    <Button className="w-full bg-purple-500 hover:bg-purple-600 text-white" size="sm" disabled={!canDownload && dailyLimit !== Infinity} onClick={async () => { const success = await recordDownload(selectedArte.id); if (success) { window.open(selectedArte.ai_reference_image_url!, '_blank'); } }}>
                      <Download className="w-4 h-4 mr-2" />{t('musicos.modal.downloadReference')}
                    </Button>
                  </div>
                )}
                {isPremium && dailyLimit !== Infinity && (
                  <div className="text-center text-sm text-gray-300 bg-white/5 rounded-lg py-2 px-3 border border-white/10">{t('musicos.modal.downloadsToday')} <span className="font-bold">{downloadCount}/{dailyLimit}</span></div>
                )}
                <div className="flex gap-2">
                  {selectedArte.canva_link && (<Button className="flex-1 bg-[#00C4CC] hover:bg-[#00b3b8] text-white" disabled={!canDownload && dailyLimit !== Infinity} onClick={async () => { const success = await recordDownload(selectedArte.id); if (success) { window.open(selectedArte.canva_link!, '_blank'); } }}>{t('musicos.modal.openInCanva')}</Button>)}
                  {selectedArte.drive_link && (<Button className="flex-1 bg-[#31A8FF] hover:bg-[#2997e6] text-white" disabled={!canDownload && dailyLimit !== Infinity} onClick={async () => { const success = await recordDownload(selectedArte.id); if (success) { window.open(selectedArte.drive_link!, '_blank'); } }}>{t('musicos.modal.downloadPsd')}</Button>)}
                </div>
                {!selectedArte.canva_link && !selectedArte.drive_link && (<p className="text-center text-gray-400 text-sm">{t('musicos.modal.noEditLinks')}</p>)}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default BibliotecaArtesMusicos;