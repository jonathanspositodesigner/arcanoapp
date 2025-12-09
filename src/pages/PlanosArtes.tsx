import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, ArrowLeft, Gift, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Pack {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
}

const PlanosArtes = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const packSlug = searchParams.get("pack");
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchPacks = async () => {
    const { data, error } = await supabase
      .from("artes_packs")
      .select("id, name, slug, cover_url")
      .order("display_order", { ascending: true });

    if (!error && data) {
      setPacks(data);
    }
    setLoading(false);
  };

  const accessOptions = [
    {
      type: "6_meses",
      label: "Acesso 6 Meses",
      price: "R$ 27,00",
      icon: Clock,
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
      price: "R$ 37,00",
      icon: Star,
      features: [
        "Tudo do acesso de 6 meses",
        "Acesso por 12 meses",
        "Acesso ao conteúdo bônus exclusivo",
        "Novidades e atualizações premium"
      ],
      hasBonus: true,
      highlighted: true
    },
    {
      type: "vitalicio",
      label: "Acesso Vitalício",
      price: "R$ 47,00",
      icon: Gift,
      features: [
        "Tudo do acesso de 1 ano",
        "Acesso permanente ao pack",
        "Todas as atualizações futuras",
        "Conteúdo bônus exclusivo para sempre"
      ],
      hasBonus: true,
      highlighted: false
    }
  ];

  const handleSelectOption = (accessType: string) => {
    // TODO: Integrate with Greenn payment for specific pack and access type
    // The product name in Greenn should follow pattern: "Pack {PackName} - {AccessType}"
    // E.g.: "Pack Arcano Vol.1 - 6 meses", "Pack Halloween - 1 ano", "Pack Carnaval - vitalício"
    window.open("https://voxvisual.com.br/linksbio/", "_blank");
  };

  if (loading) {
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
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {selectedPack ? `Adquira o ${selectedPack.name}` : "Escolha seu Pack"}
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            {selectedPack 
              ? "Escolha o tipo de acesso ideal para você"
              : "Selecione um pack para ver as opções de compra"
            }
          </p>
        </div>

        {!selectedPack ? (
          // Show pack selection
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {packs.map((pack) => (
              <Card
                key={pack.id}
                className="bg-[#1a1a2e]/80 border-[#2d4a5e]/30 cursor-pointer hover:ring-2 hover:ring-[#2d4a5e] transition-all"
                onClick={() => setSelectedPack(pack)}
              >
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
            ))}
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
                  className="w-32 h-32 object-cover rounded-lg border-2 border-[#2d4a5e]/50"
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
                      option.highlighted ? "ring-2 ring-[#2d4a5e] scale-105" : ""
                    }`}
                  >
                    {option.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2d4a5e] text-white px-4 py-1 rounded-full text-sm font-medium text-center whitespace-nowrap">
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
                      <div className="mx-auto w-12 h-12 bg-[#2d4a5e]/30 rounded-full flex items-center justify-center mb-3">
                        <IconComponent className="h-6 w-6 text-[#2d4a5e]" />
                      </div>
                      <CardTitle className="text-lg text-white">{option.label}</CardTitle>
                      <div className="mt-4">
                        <span className="text-3xl font-bold text-white">{option.price}</span>
                        <span className="text-white/60 text-sm block mt-1">pagamento único</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {option.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-white/80">
                            <Check className="h-4 w-4 text-[#2d4a5e] mt-0.5 shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full ${
                          option.highlighted
                            ? "bg-[#2d4a5e] hover:bg-[#3d5a6e]"
                            : "bg-[#2d4a5e]/50 hover:bg-[#2d4a5e]"
                        } text-white`}
                        onClick={() => handleSelectOption(option.type)}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Comprar Agora
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        <div className="text-center mt-8">
          <Button
            variant="link"
            className="text-[#2d4a5e] hover:text-[#3d5a6e]"
            onClick={() => navigate("/login-artes")}
          >
            Já comprei um pack
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlanosArtes;
