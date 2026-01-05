import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Crown, Zap, Box, Infinity, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { AnimatedSection, StaggeredAnimation, FadeIn } from "@/hooks/useScrollAnimation";

interface ToolData {
  id: string;
  name: string;
  slug: string;
  price_vitalicio: number | null;
  checkout_link_vitalicio: string | null;
  checkout_link_membro_vitalicio: string | null;
  cover_url: string | null;
}

const PlanosForjaSelos3D = () => {
  const navigate = useNavigate();
  const { user, isPremium, hasAccessToPack, isLoading: authLoading } = usePremiumArtesStatus();
  const [tool, setTool] = useState<ToolData | null>(null);
  const [loading, setLoading] = useState(true);

  const TOOL_SLUG = "forja-selos-3d";

  useEffect(() => {
    fetchToolData();
  }, []);

  const fetchToolData = async () => {
    const { data, error } = await supabase
      .from("artes_packs")
      .select(`
        id, name, slug, cover_url,
        price_vitalicio,
        checkout_link_vitalicio,
        checkout_link_membro_vitalicio
      `)
      .eq("slug", TOOL_SLUG)
      .single();

    if (!error && data) {
      setTool(data as ToolData);
    }
    setLoading(false);
  };

  const formatPrice = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  const handlePurchase = () => {
    if (!tool) return;

    const checkoutLink = isPremium && tool.checkout_link_membro_vitalicio
      ? tool.checkout_link_membro_vitalicio
      : tool.checkout_link_vitalicio;

    if (checkoutLink) {
      window.open(checkoutLink, "_blank");
    } else {
      window.open("https://voxvisual.com.br/linksbio/", "_blank");
    }
  };

  const hasAccess = hasAccessToPack(TOOL_SLUG);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2d4a5e]"></div>
      </div>
    );
  }

  const price = tool?.price_vitalicio || 2990;

  const features = [
    { icon: Box, text: "Crie selos 3D profissionais com IA" },
    { icon: Layers, text: "Múltiplos estilos e templates" },
    { icon: Infinity, text: "Acesso vitalício à ferramenta" },
    { icon: Zap, text: "Todas as atualizações futuras incluídas" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] p-4">
      <div className="max-w-lg mx-auto">
        <FadeIn delay={0}>
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white mb-6"
            onClick={() => navigate("/biblioteca-artes")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Biblioteca
          </Button>
        </FadeIn>

        <AnimatedSection animation="fade-up" delay={100} className="text-center mb-8" as="div">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Forja de Selos 3D
          </h1>
          <p className="text-white/60">
            Crie selos 3D incríveis com inteligência artificial
          </p>
        </AnimatedSection>

        {hasAccess ? (
          <AnimatedSection animation="scale" as="div">
            <Card className="bg-[#1a1a2e]/80 border-green-500/50">
              <CardContent className="p-6 text-center">
                <Badge className="bg-green-500 text-white text-lg px-4 py-2 mb-4">
                  <Check className="h-5 w-5 mr-2" />
                  Você já tem acesso!
                </Badge>
                <p className="text-white/70 mb-4">
                  Você já possui acesso à Forja de Selos 3D.
                </p>
                <Button
                  onClick={() => navigate("/biblioteca-artes")}
                  className="bg-gradient-to-r from-[#2d4a5e] to-[#3d5a6e]"
                >
                  Ir para Biblioteca
                </Button>
              </CardContent>
            </Card>
          </AnimatedSection>
        ) : (
          <AnimatedSection animation="scale" delay={200} as="div">
            <Card className="relative bg-[#1a1a2e]/80 border-2 border-purple-500/50 ring-2 ring-purple-500/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                Acesso Vitalício
              </div>

              {isPremium && (
                <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  Desconto de Membro
                </div>
              )}

              <CardHeader className="text-center pt-8">
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30">
                    <Box className="h-10 w-10 text-purple-400" />
                  </div>
                </div>
                <CardTitle className="text-white text-2xl">Forja de Selos 3D</CardTitle>
                <p className="text-white/60 text-sm">
                  Ferramenta de IA para criar selos 3D
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-1">
                    {formatPrice(price)}
                  </div>
                  <p className="text-white/50 text-sm">pagamento único</p>
                </div>

                <StaggeredAnimation className="space-y-3" staggerDelay={100} animation="fade-left">
                  {features.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <div key={index} className="flex items-center gap-3 text-white/80">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <IconComponent className="h-3.5 w-3.5 text-purple-400" />
                        </div>
                        <span className="text-sm">{feature.text}</span>
                      </div>
                    );
                  })}
                </StaggeredAnimation>

                <Button
                  onClick={handlePurchase}
                  className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25 hover-lift"
                >
                  Comprar Agora
                </Button>

                {!user && (
                  <p className="text-center text-white/50 text-xs">
                    Após a compra, você receberá acesso automático
                  </p>
                )}
              </CardContent>
            </Card>
          </AnimatedSection>
        )}
      </div>
    </div>
  );
};

export default PlanosForjaSelos3D;
