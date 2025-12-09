import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, ArrowLeft, Gift, Clock, Percent, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";

interface Pack {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
}

const PlanosArtesMembro = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const packSlug = searchParams.get("pack");
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isPremium, userPacks, isLoading: authLoading } = usePremiumArtesStatus();

  // Member discount configuration
  const MEMBER_DISCOUNT = 0.20; // 20% discount

  useEffect(() => {
    fetchPacks();
  }, []);

  useEffect(() => {
    if (packSlug && packs.length > 0) {
      const pack = packs.find(p => p.slug === packSlug);
      if (pack) {
        setSelectedPack(pack);
      }
    }
  }, [packSlug, packs]);

  // Redirect non-members to normal pricing page
  useEffect(() => {
    if (!authLoading && !isPremium) {
      navigate(packSlug ? `/planos-artes?pack=${packSlug}` : "/planos-artes");
    }
  }, [authLoading, isPremium, packSlug, navigate]);

  const fetchPacks = async () => {
    const { data, error } = await supabase
      .from("artes_packs")
      .select("id, name, slug, cover_url, type")
      .eq("type", "pack")
      .order("display_order", { ascending: true });

    if (!error && data) {
      setPacks(data);
    }
    setLoading(false);
  };

  // Filter out packs user already owns
  const availablePacks = packs.filter(pack => 
    !userPacks.some(up => up.pack_slug === pack.slug)
  );

  // Original prices in centavos
  const originalPrices = {
    "6_meses": 2700,
    "1_ano": 3700,
    "vitalicio": 4700
  };

  const calculatePrice = (type: string) => {
    const original = originalPrices[type as keyof typeof originalPrices];
    const discounted = original * (1 - MEMBER_DISCOUNT);
    return discounted / 100;
  };

  const formatPrice = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const accessOptions = [
    {
      type: "6_meses",
      label: "Acesso 6 Meses",
      originalPrice: "R$ 27,00",
      price: formatPrice(calculatePrice("6_meses")),
      icon: Clock,
      buttonText: "Desbloquear 6 Meses",
      features: [
        "Acesso completo ao pack selecionado",
        "Download ilimitado das artes",
        "Arquivos editáveis (PSD e Canva)",
        "Atualizações do pack por 6 meses"
      ],
      hasBonus: false,
      highlighted: false
    },
    {
      type: "1_ano",
      label: "Acesso 1 Ano",
      originalPrice: "R$ 37,00",
      price: formatPrice(calculatePrice("1_ano")),
      icon: Star,
      buttonText: "Desbloquear 1 Ano",
      features: [
        "Tudo do acesso de 6 meses",
        "Acesso por 12 meses",
        "Acesso ao conteúdo bônus exclusivo",
        "Novidades e atualizações premium"
      ],
      hasBonus: true,
      highlighted: false
    },
    {
      type: "vitalicio",
      label: "Acesso Vitalício",
      originalPrice: "R$ 47,00",
      price: formatPrice(calculatePrice("vitalicio")),
      icon: Gift,
      buttonText: "Desbloquear Acesso Vitalício",
      features: [
        "Tudo do acesso de 1 ano",
        "Acesso permanente ao pack",
        "Todas as atualizações futuras",
        "Conteúdo bônus exclusivo para sempre"
      ],
      hasBonus: true,
      highlighted: true
    }
  ];

  const handleSelectOption = (accessType: string) => {
    // TODO: Integrate with Greenn payment for member discount checkout
    // Use specific checkout links for 20% OFF member pricing
    window.open("https://voxvisual.com.br/linksbio/", "_blank");
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2d4a5e]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] p-4">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          className="text-white/70 hover:text-white mb-6"
          onClick={() => navigate("/biblioteca-artes")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Biblioteca
        </Button>

        <div className="text-center mb-8">
          <Badge className="bg-gradient-to-r from-purple-500 to-violet-500 text-white text-lg px-4 py-2 mb-4">
            <Crown className="h-5 w-5 mr-2" />
            20% OFF - Desconto Exclusivo para Membros
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {selectedPack 
              ? `Adquira o ${selectedPack.name}` 
              : "Escolha um novo Pack"
            }
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            {selectedPack 
              ? "Como membro, você tem 20% de desconto em todos os novos packs!"
              : "Selecione um pack para ver as opções de compra com desconto de membro"
            }
          </p>
        </div>

        {!selectedPack ? (
          // Show pack selection (only packs user doesn't own)
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {availablePacks.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Crown className="h-16 w-16 text-purple-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Você já possui todos os packs!</h3>
                <p className="text-white/60 mb-4">Parabéns, você tem acesso completo à biblioteca.</p>
                <Button onClick={() => navigate("/biblioteca-artes")}>
                  Voltar para Biblioteca
                </Button>
              </div>
            ) : (
              availablePacks.map((pack) => (
                <Card
                  key={pack.id}
                  className="bg-[#1a1a2e]/80 border-[#2d4a5e]/30 cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all relative"
                  onClick={() => setSelectedPack(pack)}
                >
                  <Badge className="absolute top-2 right-2 bg-purple-500/20 text-purple-400 text-xs">
                    -20%
                  </Badge>
                  <CardContent className="p-4">
                    {pack.cover_url ? (
                      <img
                        src={pack.cover_url}
                        alt={pack.name}
                        className="w-full aspect-square object-cover rounded-lg mb-3"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-[#2d4a5e]/30 rounded-lg mb-3 flex items-center justify-center">
                        <Star className="h-8 w-8 text-[#2d4a5e]" />
                      </div>
                    )}
                    <h3 className="text-white font-medium text-center">{pack.name}</h3>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          // Show access options for selected pack
          <>
            <div className="flex justify-center mb-6">
              <Button
                variant="outline"
                className="bg-[#2d4a5e]/30 border-[#2d4a5e] text-white hover:bg-[#2d4a5e]/50"
                onClick={() => setSelectedPack(null)}
              >
                Escolher outro pack
              </Button>
            </div>

            {selectedPack.cover_url && (
              <div className="flex justify-center mb-8">
                <img
                  src={selectedPack.cover_url}
                  alt={selectedPack.name}
                  className="w-32 h-32 object-cover rounded-lg border-2 border-purple-500/50"
                />
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              {accessOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Card
                    key={option.type}
                    className={`relative bg-[#1a1a2e]/80 border-[#2d4a5e]/30 ${
                      option.highlighted ? "ring-2 ring-purple-500 scale-105" : ""
                    }`}
                  >
                    {option.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium text-center whitespace-nowrap">
                        Melhor Custo-Benefício
                      </div>
                    )}
                    {option.hasBonus && (
                      <div className="absolute top-3 right-3 bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                        <Gift className="h-3 w-3" />
                        + Bônus
                      </div>
                    )}
                    <CardHeader className="text-center pt-8">
                      <div className="mx-auto w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center mb-3">
                        <IconComponent className="h-6 w-6 text-purple-400" />
                      </div>
                      <CardTitle className="text-lg text-white">{option.label}</CardTitle>
                      <div className="mt-4">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <span className="text-white/40 line-through text-lg">{option.originalPrice}</span>
                          <Badge className="bg-purple-500/20 text-purple-400 text-xs">-20%</Badge>
                        </div>
                        <span className="text-3xl font-bold text-purple-400">
                          {option.price}
                        </span>
                        <span className="text-white/60 text-sm block mt-1">pagamento único</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {option.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-white/80">
                            <Check className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full ${
                          option.highlighted
                            ? "bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-bold shadow-lg shadow-purple-500/30 animate-pulse"
                            : "bg-gradient-to-r from-purple-500/80 to-violet-500/80 hover:from-purple-500 hover:to-violet-500 text-white"
                        }`}
                        onClick={() => handleSelectOption(option.type)}
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Comprar com Desconto
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlanosArtesMembro;
