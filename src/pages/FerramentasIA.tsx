import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useSmartBackNavigation } from "@/hooks/useSmartBackNavigation";
import { ArrowLeft, Sparkles, CheckCircle, Loader2, Play, ShoppingCart, LogIn, UserCheck, AlertTriangle, ChevronRight, ChevronLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ToolData {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  price_vitalicio: number | null;
  checkout_link_vitalicio: string | null;
  checkout_link_membro_vitalicio: string | null;
}

const FerramentasIA = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from");

  const toolDescriptions: Record<string, string> = {
    "upscaller-arcano": t('ferramentas.descriptions.upscaler'),
    "forja-selos-3d-ilimitada": t('ferramentas.descriptions.forja3D'),
    "ia-muda-pose": t('ferramentas.descriptions.mudaPose'),
    "ia-muda-roupa": t('ferramentas.descriptions.mudaRoupa'),
  };

  // Smart back navigation: go to previous page, fallback to from param or /
  const getSmartFallback = () => {
    if (from === "prompts") return "/biblioteca-prompts";
    if (from === "artes") return "/biblioteca-artes";
    return "/";
  };
  const { goBack } = useSmartBackNavigation({ fallback: getSmartFallback() });

  const getBackLabel = () => {
    if (from === "prompts") return t('ferramentas.backToPrompts');
    if (from === "artes") return t('ferramentas.backToArtes');
    return t('ferramentas.back');
  };

  const { user, hasAccessToPack, isPremium, isLoading: isPremiumLoading } = usePremiumArtesStatus();
  const { planType: promptsPlanType, isLoading: isPromptsLoading } = usePremiumStatus();
  const [tools, setTools] = useState<ToolData[]>([]);
  const [loading, setLoading] = useState(true);

  // First access modal states
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(false);
  const [firstAccessEmail, setFirstAccessEmail] = useState("");
  const [firstAccessLoading, setFirstAccessLoading] = useState(false);
  const [showEmailNotFoundModal, setShowEmailNotFoundModal] = useState(false);

  // Preferred order for tools
  const preferredOrder = ["upscaller-arcano", "forja-selos-3d-ilimitada", "ia-muda-pose", "ia-muda-roupa"];

  useEffect(() => {
    const fetchTools = async () => {
      const { data, error } = await supabase
        .from("artes_packs")
        .select("id, name, slug, cover_url, price_vitalicio, checkout_link_vitalicio, checkout_link_membro_vitalicio")
        .eq("type", "ferramentas_ia")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      if (!error && data) {
        // Sort by preferred order
        const sorted = [...data].sort((a, b) => {
          const indexA = preferredOrder.indexOf(a.slug);
          const indexB = preferredOrder.indexOf(b.slug);
          return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });
        setTools(sorted);
      }
      setLoading(false);
    };

    fetchTools();
  }, []);

  const handleFirstAccessCheck = async () => {
    if (!firstAccessEmail.trim()) {
      toast.error(t('ferramentas.toast.enterEmail'));
      return;
    }
    setFirstAccessLoading(true);
    try {
      const { data: profileCheck, error: rpcError } = await supabase.rpc('check_profile_exists', {
        check_email: firstAccessEmail.trim()
      });
      
      if (rpcError) {
        toast.error(t('ferramentas.toast.errorVerifying'));
        setFirstAccessLoading(false);
        return;
      }
      
      const profileExists = profileCheck?.[0]?.exists_in_db || false;
      const passwordChanged = profileCheck?.[0]?.password_changed || false;
      
      if (!profileExists) {
        setShowFirstAccessModal(false);
        setShowEmailNotFoundModal(true);
        return;
      }
      
      if (profileExists && !passwordChanged) {
        // Primeiro acesso: login com email/email
        const { error } = await supabase.auth.signInWithPassword({
          email: firstAccessEmail.trim(),
          password: firstAccessEmail.trim()
        });
        if (!error) {
          setShowFirstAccessModal(false);
          setFirstAccessEmail("");
          toast.success(t('ferramentas.toast.welcome'));
          navigate('/change-password-artes');
        } else {
          toast.error(t('ferramentas.toast.errorAccessing'));
          setShowFirstAccessModal(false);
          navigate('/login-artes');
        }
        return;
      }
      
      if (profileExists && passwordChanged) {
        toast.info(t('ferramentas.toast.alreadySetPassword'));
        setShowFirstAccessModal(false);
        setFirstAccessEmail("");
        navigate('/login-artes');
      }
    } catch (error) {
      toast.error(t('ferramentas.toast.errorVerifyingEmail'));
    } finally {
      setFirstAccessLoading(false);
    }
  };

  const getAccessRoute = (slug: string) => {
    return `/ferramenta-ia-artes/${slug}`;
  };

  const getPurchaseRoute = (tool: ToolData) => {
    if (tool.slug === "upscaller-arcano") {
      // Se veio do domínio arcanoappes, abre página ES com preço em dólar
      const hostname = window.location.hostname;
      if (hostname.includes("arcanoappes")) {
        return "/planos-upscaler-arcano-69-es";
      }
      return "/planos-upscaler-arcano-69";
    }
    if (tool.slug === "forja-selos-3d-ilimitada") {
      return "/planos-forja-selos-3d";
    }
    
    if (isPremium && tool.checkout_link_membro_vitalicio) {
      return tool.checkout_link_membro_vitalicio;
    }
    
    return tool.checkout_link_vitalicio || "#";
  };

  const bonusTools = ["ia-muda-pose", "ia-muda-roupa"];
  const hasUnlimitedAccess = promptsPlanType === "arcano_unlimited";
  
  const checkToolAccess = (slug: string): boolean => {
    if (hasUnlimitedAccess) {
      return true;
    }
    if (bonusTools.includes(slug)) {
      return isPremium;
    }
    return hasAccessToPack(slug);
  };

  const handleToolClick = (tool: ToolData) => {
    const hasAccess = checkToolAccess(tool.slug);
    
    if (hasAccess) {
      navigate(getAccessRoute(tool.slug));
    } else {
      const route = getPurchaseRoute(tool);
      if (route.startsWith("http")) {
        window.open(route, "_blank");
      } else {
        navigate(route);
      }
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return t('ferramentas.contactPrice');
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price / 100);
  };

  // Separar ferramentas por acesso
  const toolsWithAccess = tools.filter(tool => checkToolAccess(tool.slug));
  const toolsWithoutAccess = tools.filter(tool => !checkToolAccess(tool.slug));

  if (loading || isPremiumLoading || isPromptsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const renderToolCard = (tool: ToolData) => {
    const hasAccess = checkToolAccess(tool.slug);
    const description = toolDescriptions[tool.slug] || "Ferramenta de IA";
    
    return (
      <Card 
        key={tool.id}
        className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all group border border-gray-200 shadow-md hover:shadow-xl bg-white"
        onClick={() => handleToolClick(tool)}
      >
        <div className="aspect-[16/9] sm:aspect-[3/4] relative overflow-hidden">
          {tool.cover_url ? (
            <img 
              src={tool.cover_url} 
              alt={tool.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
              <Sparkles className="h-12 w-12 sm:h-16 sm:w-16 text-white/80" />
            </div>
          )}
          
          {hasAccess && (
            <div className="absolute top-2 right-2 z-10">
              <Badge className="bg-green-500 text-white border-0 text-[10px] font-semibold shadow-lg px-2 py-0.5">
                <CheckCircle className="h-3 w-3 mr-1" />
                {t('ferramentas.released')}
              </Badge>
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 via-50% to-transparent flex flex-col justify-end p-4">
            <h3 className="font-bold text-base sm:text-lg text-white text-center leading-tight drop-shadow-lg">
              {tool.name}
            </h3>
            <p className="text-xs sm:text-sm text-white/80 text-center mt-1 line-clamp-2">
              {description}
            </p>
            
            <Button
              size="sm"
              className={`mt-3 w-full text-sm font-medium ${
                hasAccess 
                  ? "bg-green-500 hover:bg-green-600" 
                  : "bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:opacity-90"
              } text-white`}
            >
              {hasAccess ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {t('ferramentas.accessTool')}
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {t('ferramentas.seePlans')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-purple-200 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Lado Esquerdo - Voltar + Login */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
              title={getBackLabel()}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            {!user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/login-artes?redirect=/ferramentas-ia")}
                className="text-purple-600 border-purple-300 hover:bg-purple-50 text-xs sm:text-sm"
              >
                <LogIn className="w-4 h-4 mr-1 sm:mr-2" />
                {t('ferramentas.login')}
              </Button>
            )}
          </div>

          {/* Lado Direito - Logo + Título (fixo) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h1 className="text-base sm:text-xl font-bold text-gray-900 hidden sm:block">
              {t('ferramentas.title')}
            </h1>
          </div>
        </div>
      </header>

      {/* Primeiro Acesso Button - Below Header - Only for logged out users */}
      {!user && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
          <div className="container mx-auto px-4 py-3">
            <Button
              onClick={() => setShowFirstAccessModal(true)}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              size="sm"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {t('ferramentas.firstAccess')}
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <p className="text-gray-600 text-center mb-8 max-w-2xl mx-auto hidden sm:block">
          {t('ferramentas.description')}
        </p>

        {/* Suas Ferramentas */}
        {toolsWithAccess.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              {t('ferramentas.yourTools')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {toolsWithAccess.map(renderToolCard)}
            </div>
          </section>
        )}

        {/* Disponíveis para Aquisição */}
        {toolsWithoutAccess.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              {t('ferramentas.availableForPurchase')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {toolsWithoutAccess.map(renderToolCard)}
            </div>
          </section>
        )}

        {tools.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-purple-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('ferramentas.noToolsAvailable')}</p>
          </div>
        )}
      </main>

      {/* First Access Modal */}
      <Dialog open={showFirstAccessModal} onOpenChange={setShowFirstAccessModal}>
        <DialogContent className="max-w-[340px] sm:max-w-md">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto">
              <UserCheck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{t('ferramentas.modals.firstAccess.title')}</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                {t('ferramentas.modals.firstAccess.description')}
              </p>
            </div>
            <div className="space-y-3">
              <Input 
                type="email" 
                placeholder={t('ferramentas.modals.firstAccess.placeholder')}
                value={firstAccessEmail} 
                onChange={e => setFirstAccessEmail(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleFirstAccessCheck()} 
              />
              <Button 
                onClick={handleFirstAccessCheck} 
                disabled={firstAccessLoading} 
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                {firstAccessLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('ferramentas.modals.firstAccess.verifying')}
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-4 w-4 mr-2" />
                    {t('ferramentas.modals.firstAccess.verify')}
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('ferramentas.modals.firstAccess.notCustomer')}{" "}
              <button 
                onClick={() => {
                  setShowFirstAccessModal(false);
                }} 
                className="text-primary underline"
              >
                {t('ferramentas.modals.firstAccess.seeTools')}
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Not Found Modal */}
      <Dialog open={showEmailNotFoundModal} onOpenChange={setShowEmailNotFoundModal}>
        <DialogContent className="max-w-[340px] sm:max-w-md">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('ferramentas.modals.emailNotFound.title')}</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                {t('ferramentas.modals.emailNotFound.description', { email: firstAccessEmail })}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => {
                  setShowEmailNotFoundModal(false);
                  setShowFirstAccessModal(true);
                }} 
                variant="outline"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                {t('ferramentas.modals.emailNotFound.tryAnother')}
              </Button>
              <Button 
                onClick={() => {
                  setShowEmailNotFoundModal(false);
                  navigate('/login-artes');
                }} 
                className="bg-gradient-to-r from-yellow-500 to-orange-500"
              >
                <User className="h-4 w-4 mr-2" />
                {t('ferramentas.modals.emailNotFound.createAccount')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FerramentasIA;