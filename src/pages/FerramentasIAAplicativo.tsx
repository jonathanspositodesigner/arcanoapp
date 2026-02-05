import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useSmartBackNavigation } from "@/hooks/useSmartBackNavigation";
import { Sparkles, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import ToolsHeader from "@/components/ToolsHeader";
import PromoToolsBanner from "@/components/PromoToolsBanner";

interface ToolData {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  price_vitalicio: number | null;
  checkout_link_vitalicio: string | null;
  checkout_link_membro_vitalicio: string | null;
}

const FerramentasIAAplicativo = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from");
  
  const { user, hasAccessToPack, isPremium, isLoading: isPremiumLoading } = usePremiumArtesStatus();
  const { planType: promptsPlanType, isLoading: isPromptsLoading } = usePremiumStatus();

  const toolDescriptions: Record<string, string> = {
    "upscaller-arcano": t('ferramentas.descriptions.upscaler'),
    "forja-selos-3d-ilimitada": t('ferramentas.descriptions.forja3D'),
    "ia-muda-pose": t('ferramentas.descriptions.mudaPose'),
    "ia-muda-roupa": t('ferramentas.descriptions.mudaRoupa'),
  };

  // Smart back navigation
  const getSmartFallback = () => {
    if (from === "prompts") return "/biblioteca-prompts";
    if (from === "artes") return "/biblioteca-artes";
    return "/";
  };
  const { goBack } = useSmartBackNavigation({ fallback: getSmartFallback() });

  const [tools, setTools] = useState<ToolData[]>([]);
  const [loading, setLoading] = useState(true);

  // Preferred order for tools
  const preferredOrder = ["upscaller-arcano", "upscaller-arcano-video", "forja-selos-3d-ilimitada", "ia-muda-pose", "ia-muda-roupa"];

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

  const getAccessRoute = (slug: string) => {
    if (slug === "upscaller-arcano") {
      // Navigate to selection page instead of directly to image upscaler
      return "/upscaler-selection";
    }
    if (slug === "upscaller-arcano-video") {
      return "/video-upscaler-tool";
    }
    if (slug === "ia-muda-pose") {
      return "/pose-changer-tool";
    }
    if (slug === "ia-muda-roupa") {
      return "/veste-ai-tool";
    }
    return `/ferramenta-ia-artes/${slug}`;
  };

  // Override names for display
  const toolNameOverrides: Record<string, string> = {
    "upscaller-arcano": "Upscaler Arcano V3",
    "upscaller-arcano-video": "Upscaler Arcano V3 (vídeo)",
    "ia-muda-pose": "Pose Changer",
    "ia-muda-roupa": "Veste AI",
  };

  const getPurchaseRoute = (tool: ToolData) => {
    if (tool.slug === "upscaller-arcano") {
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
    // Always navigate to the tool
    navigate(getAccessRoute(tool.slug));
  };

  if (loading || isPremiumLoading || isPromptsLoading) {
    return (
      <div className="min-h-screen bg-[#0D0221] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const renderToolCard = (tool: ToolData) => {
    const hasAccess = checkToolAccess(tool.slug);
    const description = toolDescriptions[tool.slug] || "Ferramenta de IA";
    const isComingSoon = tool.slug === "forja-selos-3d-ilimitada";
    
    return (
      <Card 
        key={tool.id}
        className={`overflow-hidden transition-all group border border-purple-500/20 shadow-md bg-[#1A0A2E]/50 ${
          isComingSoon 
            ? "cursor-not-allowed opacity-70" 
            : "cursor-pointer hover:ring-2 hover:ring-purple-400 hover:shadow-xl"
        }`}
        onClick={() => !isComingSoon && handleToolClick(tool)}
      >
        <div className="aspect-[4/5] sm:aspect-[3/4] relative overflow-hidden">
          {tool.cover_url ? (
            <img 
              src={tool.cover_url} 
              alt={tool.name}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isComingSoon ? "grayscale" : "group-hover:scale-105"
              }`}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${
              isComingSoon 
                ? "bg-gradient-to-br from-gray-500 to-gray-600" 
                : "bg-gradient-to-br from-purple-500 to-fuchsia-600"
            }`}>
              <Sparkles className="h-12 w-12 sm:h-16 sm:w-16 text-white/80" />
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 via-50% to-transparent flex flex-col justify-end p-3 sm:p-4">
            <h3 className="font-bold text-sm sm:text-lg text-white text-center leading-tight drop-shadow-lg">
              {toolNameOverrides[tool.slug] || tool.name}
            </h3>
            <p className="text-[10px] sm:text-sm text-white/80 text-center mt-1 line-clamp-2">
              {description}
            </p>
            
            {isComingSoon ? (
              <Button
                size="sm"
                disabled
                className="mt-2 sm:mt-3 w-full text-xs sm:text-sm font-medium bg-gray-600 text-gray-300 cursor-not-allowed"
              >
                Em Breve
              </Button>
            ) : (
              <Button
                size="sm"
                className={`mt-2 sm:mt-3 w-full text-xs sm:text-sm font-medium ${
                  hasAccess 
                    ? "bg-green-500 hover:bg-green-600" 
                    : "bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:opacity-90"
                } text-white`}
              >
                <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('ferramentas.accessTool')}</span>
                <span className="sm:hidden">Acessar</span>
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-[#0D0221]">
      {/* Header with profile and credits */}
      <ToolsHeader 
        title={t('ferramentas.title')}
        onBack={goBack}
        showLogo={true}
      />
      
      {/* Promo Banner */}
      <PromoToolsBanner />

      {/* Content - Single grid with all tools */}
      <main className="container mx-auto px-4 py-8">
        <p className="text-purple-300 text-center mb-8 max-w-2xl mx-auto hidden sm:block">
          {t('ferramentas.description')}
        </p>

        {/* Button for unlimited upscaler owners - ONLY shows for pack owners */}
        {hasAccessToPack('upscaller-arcano') && (
          <div className="text-center mb-6">
            <Button
              variant="outline"
              onClick={() => navigate("/ferramentas-ia")}
              className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300 text-sm sm:text-base"
            >
              COMPROU O UPSCALER ILIMITADO? CLIQUE AQUI
            </Button>
          </div>
        )}

        {/* Single grid - no separation by access */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {tools.map(renderToolCard)}
        </div>

        {tools.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <p className="text-purple-300">{t('ferramentas.noToolsAvailable')}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default FerramentasIAAplicativo;
