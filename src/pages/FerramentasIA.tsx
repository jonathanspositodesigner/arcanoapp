import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { ArrowLeft, Sparkles, Lock, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const { user, hasAccessToPack, isPremium, isLoading: isPremiumLoading } = usePremiumArtesStatus();
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
  
  const checkToolAccess = (slug: string): boolean => {
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

  if (loading || isPremiumLoading) {
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
            onClick={() => navigate("/")}
            className="text-fuchsia-300 hover:text-fuchsia-100 hover:bg-fuchsia-500/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {tools.map((tool) => {
            const hasAccess = checkToolAccess(tool.slug);
            
            return (
              <div
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                className="group cursor-pointer bg-[#1a0f25]/50 border-2 border-fuchsia-500/30 rounded-2xl overflow-hidden transition-all duration-300 hover:border-fuchsia-500/60 hover:shadow-[0_0_30px_rgba(217,70,239,0.2)]"
              >
                {/* Cover Image */}
                <div className="relative aspect-video overflow-hidden">
                  {tool.cover_url ? (
                    <img
                      src={tool.cover_url}
                      alt={tool.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-fuchsia-600/30 to-purple-600/30 flex items-center justify-center">
                      <Sparkles className="w-16 h-16 text-fuchsia-300/50" />
                    </div>
                  )}
                  
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a15] via-transparent to-transparent" />
                  
                  {/* Access Badge */}
                  <div className="absolute top-3 right-3">
                    {hasAccess ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/90 text-white text-xs font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Você tem acesso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fuchsia-500/90 text-white text-xs font-medium">
                        <Lock className="w-3.5 h-3.5" />
                        {formatPrice(tool.price_vitalicio)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white mb-3 group-hover:text-fuchsia-300 transition-colors">
                    {tool.name}
                  </h3>
                  
                  <Button
                    className={`w-full font-semibold ${
                      hasAccess
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                        : "bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white"
                    }`}
                  >
                    {hasAccess ? "Acessar Ferramenta" : "Adquirir Agora"}
                  </Button>
                </div>
              </div>
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
