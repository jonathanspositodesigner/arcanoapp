import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { ArrowLeft, Sparkles, Lock, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    // Ferramentas com página de planos dedicada
    if (tool.slug === "upscaller-arcano") {
      return "/planos-upscaler-arcano";
    }
    if (tool.slug === "forja-selos-3d-ilimitada") {
      return "/planos-forja-selos-3d";
    }
    
    // Para outras ferramentas, usar checkout direto
    // Se o usuário for membro, usa o link de membro
    if (isPremium && tool.checkout_link_membro_vitalicio) {
      return tool.checkout_link_membro_vitalicio;
    }
    
    return tool.checkout_link_vitalicio || "#";
  };

  // Ferramentas que são bônus (qualquer pack ativo dá acesso)
  const bonusTools = ["ia-muda-pose", "ia-muda-roupa"];
  
  // Usuários com arcano_unlimited (plano de prompts) têm acesso a TODAS as ferramentas
  const hasUnlimitedAccess = promptsPlanType === "arcano_unlimited";
  
  const checkToolAccess = (slug: string): boolean => {
    // Arcano Unlimited tem acesso a tudo
    if (hasUnlimitedAccess) {
      return true;
    }
    // Ferramentas bônus: qualquer pack de artes ativo dá acesso
    if (bonusTools.includes(slug)) {
      return isPremium;
    }
    // Outras ferramentas: precisa comprar diretamente
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

  if (loading || isPremiumLoading || isPromptsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0a15] via-[#1a0f25] to-[#0a0510] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0a15] via-[#1a0f25] to-[#0a0510]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f0a15]/80 backdrop-blur-md border-b border-fuchsia-500/20">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(getBackRoute())}
            className="text-fuchsia-300 hover:text-fuchsia-100 hover:bg-fuchsia-500/20"
            title={getBackLabel()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-fuchsia-300/70 text-sm hidden sm:inline">
            {getBackLabel()}
          </span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Ferramentas de IA</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <p className="text-fuchsia-200/70 text-center mb-8 max-w-2xl mx-auto">
          Acesse nossas ferramentas de inteligência artificial para criar artes incríveis, 
          melhorar a qualidade de imagens, gerar selos 3D e muito mais.
        </p>

        {/* Tools Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {tools.map((tool) => {
              const hasAccess = checkToolAccess(tool.slug);
              
              return (
                <Card 
                  key={tool.id}
                  className={`p-4 border-fuchsia-500/30 bg-[#1a0f25]/50 transition-all duration-300 ${
                    hasAccess 
                      ? "hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:border-fuchsia-500/60" 
                      : "opacity-90 cursor-pointer hover:border-fuchsia-500/60"
                  }`}
                  onClick={() => handleToolClick(tool)}
                >
                  <div className="flex flex-col h-full">
                    {/* Header com ícone e badge */}
                    <div className="flex items-start justify-between mb-3">
                      {tool.cover_url ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          <img 
                            src={tool.cover_url} 
                            alt={tool.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="bg-fuchsia-500/10 p-2 rounded-lg">
                          <Sparkles className="h-6 w-6 text-fuchsia-400" />
                        </div>
                      )}
                      
                      {hasAccess ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Acesso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white text-xs font-medium">
                          <Lock className="w-3 h-3" />
                          {formatPrice(tool.price_vitalicio)}
                        </span>
                      )}
                    </div>
                    
                    {/* Título */}
                    <h3 className="font-bold text-white mb-3">{tool.name}</h3>
                    
                    {/* Botão */}
                    <Button
                      className={`w-full mt-auto font-semibold text-xs ${
                        hasAccess
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                          : "bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white"
                      }`}
                      size="sm"
                    >
                      {hasAccess ? "Acessar Ferramenta" : "Adquirir Agora"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

        {tools.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-fuchsia-500/30 mx-auto mb-4" />
            <p className="text-fuchsia-200/50">Nenhuma ferramenta disponível no momento.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default FerramentasIA;
