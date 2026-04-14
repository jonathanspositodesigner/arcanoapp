import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Sparkles, CheckCircle, Loader2, Play, ShoppingCart, UserCheck, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ToolData {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  price_vitalicio: number | null;
  checkout_link_vitalicio: string | null;
  checkout_link_membro_vitalicio: string | null;
}

const FerramentasIAES = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');

  const toolDescriptions: Record<string, string> = {
    "upscaller-arcano": t('ferramentas.descriptions.upscaler'),
  };

  const { user, hasAccessToPack, isPremium, isLoading: isPremiumLoading } = usePremiumArtesStatus();
  const { planType: promptsPlanType, isLoading: isPromptsLoading } = usePremiumStatus();
  const [tools, setTools] = useState<ToolData[]>([]);
  const [loading, setLoading] = useState(true);


  // Apenas Upscaler Arcano
  const allowedSlugs = ["upscaller-arcano"];


  useEffect(() => {
    const fetchTools = async () => {
      const { data, error } = await supabase
        .from("artes_packs")
        .select("id, name, slug, cover_url, price_vitalicio, checkout_link_vitalicio, checkout_link_membro_vitalicio")
        .eq("type", "ferramentas_ia")
        .eq("is_visible", true)
        .in("slug", allowedSlugs);

      if (!error && data) {
        setTools(data);
      }
      setLoading(false);
    };

    fetchTools();
  }, []);


  const getAccessRoute = (slug: string) => {
    return `/ferramenta-ia-artes/${slug}`;
  };

  const getPurchaseRoute = () => {
    // Sempre redireciona para página ES com preço em dólar
    return "/planos-upscaler-arcano-69-es";
  };

  const hasUnlimitedAccess = promptsPlanType === "arcano_unlimited";
  
  const checkToolAccess = (slug: string): boolean => {
    if (hasUnlimitedAccess) {
      return true;
    }
    // V3 buyers also get access to upscaller-arcano via bônus pack
    if (slug === 'upscaller-arcano') {
      return hasAccessToPack('upscaller-arcano') || hasAccessToPack('upscaller-arcano-v3');
    }
    return hasAccessToPack(slug);
  };

  const handleToolClick = (tool: ToolData) => {
    const hasAccess = checkToolAccess(tool.slug);
    
    if (hasAccess) {
      navigate(getAccessRoute(tool.slug));
    } else {
      navigate(getPurchaseRoute());
    }
  };

  // Separar ferramentas por acesso
  const toolsWithAccess = tools.filter(tool => checkToolAccess(tool.slug));
  const toolsWithoutAccess = tools.filter(tool => !checkToolAccess(tool.slug));

  if (loading || isPremiumLoading || isPromptsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderToolCard = (tool: ToolData) => {
    const hasAccess = checkToolAccess(tool.slug);
    const description = toolDescriptions[tool.slug] || "Ferramenta de IA";
    
    return (
      <Card 
        key={tool.id}
        className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/20 transition-all group border border-border shadow-md hover:shadow-xl bg-background/50"
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
            <div className="w-full h-full bg-gradient-to-br from-slate-500 to-slate-500 flex items-center justify-center">
              <Sparkles className="h-12 w-12 sm:h-16 sm:w-16 text-foreground" />
            </div>
          )}
          
          {hasAccess && (
            <div className="absolute top-2 right-2 z-10">
              <Badge className="bg-green-500/30 text-green-300 border-0 text-[10px] font-semibold shadow-lg px-2 py-0.5">
                <CheckCircle className="h-3 w-3 mr-1" />
                {t('ferramentas.released')}
              </Badge>
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 via-50% to-transparent flex flex-col justify-end p-4">
            <h3 className="font-bold text-base sm:text-lg text-foreground text-center leading-tight drop-shadow-lg">
              {tool.name}
            </h3>
            <p className="text-xs sm:text-sm text-foreground text-center mt-1 line-clamp-2">
              {description}
            </p>
            
            <Button
              size="sm"
              className={`mt-3 w-full text-sm font-medium ${
                hasAccess 
                  ? "bg-green-500 hover:bg-green-600" 
                  : "bg-gradient-to-r from-slate-500 to-slate-400 hover:opacity-90"
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
    <div className="min-h-screen bg-background">
      {/* Header - Simplificado sem botões de navegação */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
            </div>
            <h1 className="text-base sm:text-xl font-bold text-foreground">
              {t('ferramentas.title')}
            </h1>
          </div>
        </div>
      </header>

      {/* Primeiro Acesso + Login Buttons - Only show when NOT logged in */}
      {!user && (
        <div className="bg-background border-b border-border">
          <div className="container mx-auto px-4 py-3">
            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/login-artes?redirect=/ferramentas-ia-es')}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-foreground"
                size="sm"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                {t('ferramentas.firstAccess')}
              </Button>
              <Button
                onClick={() => navigate('/login-artes?redirect=/ferramentas-ia-es')}
                variant="outline"
                className="flex-1 border-border text-muted-foreground hover:bg-accent0/20"
                size="sm"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto hidden sm:block">
          {t('ferramentas.description')}
        </p>

        {/* Suas Ferramentas */}
        {toolsWithAccess.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
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
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-muted-foreground" />
              {t('ferramentas.availableForPurchase')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {toolsWithoutAccess.map(renderToolCard)}
            </div>
          </section>
        )}

        {tools.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('ferramentas.noToolsAvailable')}</p>
          </div>
        )}
      </main>

    </div>
  );
};

export default FerramentasIAES;
