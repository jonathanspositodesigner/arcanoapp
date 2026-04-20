import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useSmartBackNavigation } from "@/hooks/useSmartBackNavigation";
import { usePromoClaimStatus } from "@/hooks/usePromoClaimStatus";
import { Sparkles, Loader2, Play, Users } from "lucide-react";
import arcanoClonerCover from "@/assets/arcano-cloner-cover.webp";
import removerFundoCover from "@/assets/removedor-fundo-capa.png";
import flyerMakerCover from "@/assets/flyer-maker-preview.webp";
import upscalerVideoCover from "@/assets/upscaler-video-cover.webp";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

import AppLayout from "@/components/layout/AppLayout";


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
  
  
  
  // Check promo claim status
  const { hasClaimed, isLoading: isCheckingClaim, refetch: refetchClaimStatus } = usePromoClaimStatus(user?.id);

  const toolDescriptions: Record<string, string> = {
    "upscaller-arcano": t('ferramentas.descriptions.upscaler'),
    "forja-selos-3d-ilimitada": t('ferramentas.descriptions.forja3D'),
    "ia-muda-pose": t('ferramentas.descriptions.mudaPose'),
    "ia-muda-roupa": t('ferramentas.descriptions.mudaRoupa'),
    "arcano-cloner": "Crie ensaios fotográficos ultra realistas com IA",
    "flyer-maker": "Crie flyers para eventos incríveis com IA",
    "remover-fundo": "Remova o fundo de qualquer imagem com IA",
    "upscaler-video": "Melhore a qualidade de vídeos curtos com IA",
    "movieled-maker": "Gere movies para telão de LED com um clique",
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
  const preferredOrder = ["arcano-cloner", "upscaller-arcano", "movieled-maker", "flyer-maker", "upscaler-video", "ia-muda-pose", "ia-muda-roupa", "remover-fundo", "forja-selos-3d-ilimitada"];

  useEffect(() => {
    const fetchTools = async () => {
      const { data, error } = await supabase
        .from("artes_packs")
        .select("id, name, slug, cover_url, price_vitalicio, checkout_link_vitalicio, checkout_link_membro_vitalicio")
        .eq("type", "ferramentas_ia")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      if (!error && data) {
        // Add static Arcano Cloner tool (not in database yet)
        const arcanoClonerTool: ToolData = {
          id: 'arcano-cloner-static',
          name: 'Arcano Cloner',
          slug: 'arcano-cloner',
          cover_url: arcanoClonerCover,
          price_vitalicio: null,
          checkout_link_vitalicio: null,
          checkout_link_membro_vitalicio: null,
        };

        const flyerMakerTool: ToolData = {
          id: 'flyer-maker-static',
          name: 'Flyer Maker',
          slug: 'flyer-maker',
          cover_url: flyerMakerCover,
          price_vitalicio: null,
          checkout_link_vitalicio: null,
          checkout_link_membro_vitalicio: null,
        };

        const removerFundoTool: ToolData = {
          id: 'remover-fundo-static',
          name: 'Remover Fundo',
          slug: 'remover-fundo',
          cover_url: removerFundoCover,
          price_vitalicio: null,
          checkout_link_vitalicio: null,
          checkout_link_membro_vitalicio: null,
        };

        const videoUpscalerTool: ToolData = {
          id: 'video-upscaler-static',
          name: 'Upscaler de Vídeo',
          slug: 'upscaler-video',
          cover_url: upscalerVideoCover,
          price_vitalicio: null,
          checkout_link_vitalicio: null,
          checkout_link_membro_vitalicio: null,
        };

        const movieledMakerTool: ToolData = {
          id: 'movieled-maker-static',
          name: 'MovieLed Maker',
          slug: 'movieled-maker',
          cover_url: 'https://jooojbaljrshgpaxdlou.supabase.co/storage/v1/object/public/prompts-cloudinary/prompts-cloudinary/references/BOTECO-DO-LUAN-ref.jpg',
          price_vitalicio: null,
          checkout_link_vitalicio: null,
          checkout_link_membro_vitalicio: null,
        };
        
        // Combine database tools with static tools
        const allTools = [...data, arcanoClonerTool, flyerMakerTool, removerFundoTool, videoUpscalerTool, movieledMakerTool];
        
        // Sort by preferred order
        const sorted = allTools.sort((a, b) => {
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
      return "/upscaler-arcano-tool";
    }
    if (slug === "upscaller-arcano-video" || slug === "upscaler-video") {
      return "/video-upscaler-tool";
    }
    if (slug === "ia-muda-pose") {
      return "/pose-changer-tool";
    }
    if (slug === "ia-muda-roupa") {
      return "/veste-ai-tool";
    }
    if (slug === "arcano-cloner") {
      return "/arcano-cloner-tool";
    }
    if (slug === "flyer-maker") {
      return "/flyer-maker";
    }
    if (slug === "remover-fundo") {
      return "/remover-fundo";
    }
    if (slug === "movieled-maker") {
      return "/movieled-maker";
    }
    return `/ferramenta-ia-artes/${slug}`;
  };

  // Override names for display
  const toolNameOverrides: Record<string, string> = {
    "upscaller-arcano": "Upscaler Arcano App",
    "upscaller-arcano-video": "Upscaler de Vídeo",
    "upscaler-video": "Upscaler de Vídeo",
    "ia-muda-pose": "Pose Changer",
    "ia-muda-roupa": "Veste AI",
    "arcano-cloner": "Arcano Cloner",
    "flyer-maker": "Flyer Maker",
    "remover-fundo": "Remover Fundo",
    "movieled-maker": "MovieLed Maker",
  };

  const getPurchaseRoute = (tool: ToolData) => {
    if (tool.slug === "upscaller-arcano") {
      const hostname = window.location.hostname;
      if (hostname.includes("arcanoappes")) {
        return "/planos-upscaler-arcano-69-es";
      }
      return "/upscalerarcanov3";
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
    if (slug === "arcano-cloner") return true;
    if (slug === "flyer-maker") return true;
    if (slug === "remover-fundo") return true;
    if (slug === "upscaller-arcano") return true;
    if (slug === "upscaler-video") return true;
    if (slug === "movieled-maker") return true;
    if (bonusTools.includes(slug)) {
      return isPremium;
    }
    return hasAccessToPack(slug);
  };

  const handleToolClick = (tool: ToolData) => {
    // Navigate directly to the tool route
    navigate(getAccessRoute(tool.slug));
  };

  // Handler for claiming promo and accessing app version
  const handleClaimAndAccess = async () => {
    // Guard: ensure email is available
    if (!user?.email) {
      toast.error('Erro: usuário não identificado. Tente recarregar a página.');
      throw new Error('User email not available');
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('claim-promo-credits', {
        body: { 
          email: user.email,
          promo_code: 'UPSCALER_1500'
        }
      });
      
      if (error) {
        console.error('Error claiming promo:', error);
        toast.error('Erro ao resgatar créditos. Tente novamente.');
        throw error;
      }
      
      // Check if the response indicates ineligibility
      if (data && !data.eligible) {
        toast.error(data.message || 'Não foi possível resgatar os créditos.');
        throw new Error(data.message);
      }
      
      await refetchClaimStatus();
      toast.success('1.500 créditos resgatados com sucesso!');
    } catch (error) {
      console.error('Error in handleClaimAndAccess:', error);
      throw error;
    }
  };

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
    const isComingSoon = tool.slug === "forja-selos-3d-ilimitada";
    const isNew = tool.slug === "movieled-maker" || tool.slug === "flyer-maker";
    const isUpscalerArcano = tool.slug === "upscaller-arcano";
    
    const handleCardClick = (e: React.MouseEvent) => {
      // Don't trigger card click if clicking on buttons
      if ((e.target as HTMLElement).closest('button')) return;
      if (!isComingSoon) handleToolClick(tool);
    };
    
    return (
      <Card 
        key={tool.id}
        className={`overflow-hidden transition-all group border border-border shadow-md bg-background/50 ${
          isComingSoon 
            ? "cursor-not-allowed opacity-70" 
            : "cursor-pointer hover:ring-2 hover:ring-white/20 hover:shadow-xl"
        }`}
        onClick={handleCardClick}
      >
        <div className="aspect-[16/9] sm:aspect-[3/4] relative overflow-hidden">
          {(tool.slug === "arcano-cloner" || isNew) && (
            <div className="absolute top-2 right-2 z-10 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
              <Sparkles className="w-3 h-3" />
              NOVO
            </div>
          )}
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
                : "bg-gradient-to-br from-purple-500 to-purple-600"
            }`}>
              {tool.slug === "arcano-cloner" || tool.slug === "flyer-maker" ? (
                <Users className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
              ) : (
                <Sparkles className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
              )}
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 via-50% to-transparent flex flex-col justify-end p-3 sm:p-4">
            <h3 className="font-bold text-sm sm:text-lg text-white text-center leading-tight drop-shadow-lg">
              {toolNameOverrides[tool.slug] || tool.name}
            </h3>
            <p className="text-[10px] sm:text-sm text-white text-center mt-1 line-clamp-2">
              {description}
            </p>
            
            {isComingSoon ? (
              <Button
                size="sm"
                disabled
                className="mt-2 sm:mt-3 w-full text-xs sm:text-sm font-medium bg-white/10 border border-white/20 text-white/80 cursor-not-allowed"
              >
                Em Breve
              </Button>
            ) : (
              <div className="flex flex-col gap-1 sm:gap-2 mt-2 sm:mt-3">
                {/* Main button */}
                <Button
                  size="sm"
                  className={`w-full text-[11px] sm:text-sm h-8 sm:h-9 font-medium ${
                    hasAccess
                      ? "bg-green-500 hover:bg-green-600" 
                      : "bg-gradient-to-r from-purple-500 to-purple-400 hover:opacity-90"
                  } text-white`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToolClick(tool);
                  }}
                >
                  <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                  {isUpscalerArcano ? (
                    <>
                      <span className="hidden sm:inline">Acessar Ferramenta</span>
                      <span className="sm:hidden">Acessar</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">{t('ferramentas.accessTool')}</span>
                      <span className="sm:hidden">Acessar</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <AppLayout>

      {/* Content - Single grid with all tools */}
      <main className="container mx-auto px-4 py-8">
        <p className="text-white text-center mb-8 max-w-2xl mx-auto hidden sm:block">
          {t('ferramentas.description')}
        </p>


        {/* Single grid - no separation by access */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map(renderToolCard)}
        </div>

        {tools.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-white mx-auto mb-4" />
            <p className="text-white">{t('ferramentas.noToolsAvailable')}</p>
          </div>
        )}
      </main>


      
    </AppLayout>
  );
};

export default FerramentasIAAplicativo;