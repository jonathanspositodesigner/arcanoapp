import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { ArrowLeft, Sparkles, Lock, CheckCircle, Loader2, Play, ShoppingCart } from "lucide-react";
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

const toolDescriptions: Record<string, string> = {
  "upscaller-arcano": "Aumente a resolução de suas imagens com IA",
  "forja-selos-3d-ilimitada": "Crie selos 3D personalizados ilimitados",
  "ia-muda-pose": "Altere a pose de pessoas em fotos",
  "ia-muda-roupa": "Troque roupas em fotos com IA",
};

const FerramentasIA = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from");

  const getBackRoute = () => {
    if (from === "prompts") return "/biblioteca-prompts";
    if (from === "artes") return "/biblioteca-artes";
    return "/biblioteca-artes";
  };

  const getBackLabel = () => {
    if (from === "prompts") return "Voltar para Biblioteca de Prompts";
    if (from === "artes") return "Voltar para Biblioteca de Artes";
    return "Voltar";
  };

  const { user, hasAccessToPack, isPremium, isLoading: isPremiumLoading } = usePremiumArtesStatus();
  const { planType: promptsPlanType, isLoading: isPromptsLoading } = usePremiumStatus();
  const [tools, setTools] = useState<ToolData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTools = async () => {
      const { data, error } = await supabase
        .from("artes_packs")
        .select("id, name, slug, cover_url, price_vitalicio, checkout_link_vitalicio, checkout_link_membro_vitalicio")
        .eq("type", "ferramentas_ia")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

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

  const getPurchaseRoute = (tool: ToolData) => {
    if (tool.slug === "upscaller-arcano") {
      return "/planos-upscaler-arcano";
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
    if (!price) return "Consultar";
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
        <div className="aspect-[3/4] relative overflow-hidden">
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
          
          <div className="absolute top-2 right-2 z-10">
            {hasAccess ? (
              <Badge className="bg-green-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                <CheckCircle className="h-3 w-3 mr-1" />
                DISPONÍVEL
              </Badge>
            ) : (
              <Badge className="bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white border-0 text-[10px] sm:text-xs font-semibold shadow-lg">
                <Lock className="h-3 w-3 mr-1" />
                {formatPrice(tool.price_vitalicio)}
              </Badge>
            )}
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 sm:p-4">
            <h3 className="font-bold text-sm sm:text-lg text-white text-center leading-tight drop-shadow-lg">
              {tool.name}
            </h3>
            <p className="text-xs text-white/80 text-center mt-1 line-clamp-2">
              {description}
            </p>
            
            <Button
              size="sm"
              className={`mt-2 text-xs ${
                hasAccess 
                  ? "bg-green-500 hover:bg-green-600" 
                  : "bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:opacity-90"
              } text-white`}
            >
              {hasAccess ? (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Acessar
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Ver Planos
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
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(getBackRoute())}
            className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
            title={getBackLabel()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-purple-600/70 text-sm hidden sm:inline">
            {getBackLabel()}
          </span>
          <div className="flex items-center gap-3 ml-auto sm:ml-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Ferramentas de IA</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <p className="text-gray-600 text-center mb-8 max-w-2xl mx-auto">
          Acesse nossas ferramentas de inteligência artificial para criar artes incríveis, 
          melhorar a qualidade de imagens, gerar selos 3D e muito mais.
        </p>

        {/* Suas Ferramentas */}
        {toolsWithAccess.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Suas Ferramentas
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {toolsWithAccess.map(renderToolCard)}
            </div>
          </section>
        )}

        {/* Disponíveis para Aquisição */}
        {toolsWithoutAccess.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Disponíveis para Aquisição
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {toolsWithoutAccess.map(renderToolCard)}
            </div>
          </section>
        )}

        {tools.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-purple-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma ferramenta disponível no momento.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default FerramentasIA;
