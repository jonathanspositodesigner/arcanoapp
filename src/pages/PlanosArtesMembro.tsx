import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, ArrowLeft, Gift, Clock, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { useYearEndPromo } from "@/hooks/useYearEndPromo";
import { appendUtmToUrl } from "@/lib/utmUtils";
import { useLocale } from "@/contexts/LocaleContext";

interface Pack {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  // Prices BRL (in cents)
  price_6_meses: number | null;
  price_1_ano: number | null;
  price_vitalicio: number | null;
  // Prices USD (in cents)
  price_6_meses_usd: number | null;
  price_1_ano_usd: number | null;
  price_vitalicio_usd: number | null;
  // Enabled toggles
  enabled_6_meses: boolean;
  enabled_1_ano: boolean;
  enabled_vitalicio: boolean;
  // Member checkout links (20% OFF) BR
  checkout_link_membro_6_meses: string | null;
  checkout_link_membro_1_ano: string | null;
  checkout_link_membro_vitalicio: string | null;
  // Member checkout links LATAM
  checkout_link_latam_membro_6_meses: string | null;
  checkout_link_latam_membro_1_ano: string | null;
  checkout_link_latam_membro_vitalicio: string | null;
}

const PlanosArtesMembro = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('plans');
  const { isLatam, getCheckoutLink } = useLocale();
  
  const packSlug = searchParams.get("pack");
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isPremium, userPacks, isLoading: authLoading } = usePremiumArtesStatus();
  
  const { isActive: isPromoActive, loading: promoLoading } = useYearEndPromo();

  // Redirect to promo page if year-end promo is active
  useEffect(() => {
    if (!promoLoading && isPromoActive) {
      const redirectUrl = packSlug 
        ? `/promos-natal?pack=${packSlug}`
        : '/promos-natal';
      navigate(redirectUrl, { replace: true });
    }
  }, [promoLoading, isPromoActive, packSlug, navigate]);

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
      .select(`
        id, name, slug, cover_url, type,
        price_6_meses, price_1_ano, price_vitalicio,
        price_6_meses_usd, price_1_ano_usd, price_vitalicio_usd,
        enabled_6_meses, enabled_1_ano, enabled_vitalicio,
        checkout_link_membro_6_meses, checkout_link_membro_1_ano, checkout_link_membro_vitalicio,
        checkout_link_latam_membro_6_meses, checkout_link_latam_membro_1_ano, checkout_link_latam_membro_vitalicio
      `)
      .in("type", ["pack", "curso"])
      .order("display_order", { ascending: true });

    if (!error && data) {
      setPacks(data as Pack[]);
    }
    setLoading(false);
  };

  // Filter out packs user already owns
  const availablePacks = packs.filter(pack => 
    !userPacks.some(up => up.pack_slug === pack.slug)
  );

  const getPrice = (type: string): number => {
    if (!selectedPack) return 0;
    
    if (isLatam) {
      switch (type) {
        case "6_meses": return selectedPack.price_6_meses_usd || selectedPack.price_6_meses || 2700;
        case "1_ano": return selectedPack.price_1_ano_usd || selectedPack.price_1_ano || 3700;
        case "vitalicio": return selectedPack.price_vitalicio_usd || selectedPack.price_vitalicio || 4700;
        default: return 0;
      }
    }
    
    switch (type) {
      case "6_meses": return selectedPack.price_6_meses || 2700;
      case "1_ano": return selectedPack.price_1_ano || 3700;
      case "vitalicio": return selectedPack.price_vitalicio || 4700;
      default: return 0;
    }
  };

  const calculatePrice = (type: string) => {
    const original = getPrice(type);
    const discounted = original * (1 - MEMBER_DISCOUNT);
    return discounted / 100;
  };

  const formatPrice = (value: number) => {
    if (isLatam) return `$${value.toFixed(2)}`;
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const formatOriginalPrice = (type: string) => {
    const cents = getPrice(type);
    if (isLatam) return `$${(cents / 100).toFixed(2)}`;
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  const isEnabled = (type: string): boolean => {
    if (!selectedPack) return true;
    switch (type) {
      case "6_meses": return selectedPack.enabled_6_meses ?? true;
      case "1_ano": return selectedPack.enabled_1_ano ?? true;
      case "vitalicio": return selectedPack.enabled_vitalicio ?? true;
      default: return true;
    }
  };

  const getAccessOptions = () => {
    const allOptions = [
      {
        type: "6_meses",
        label: t('access6Months'),
        icon: Clock,
        buttonText: isLatam ? "Desbloquear 6 Meses" : "Desbloquear 6 Meses",
        features: isLatam ? [
          "Acceso completo al pack seleccionado",
          "Descarga ilimitada de artes",
          "Archivos editables (PSD y Canva)",
          "Actualizaciones del pack por 6 meses"
        ] : [
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
        label: t('access1Year'),
        icon: Star,
        buttonText: isLatam ? "Desbloquear 1 Año" : "Desbloquear 1 Ano",
        features: isLatam ? [
          "Todo lo del acceso de 6 meses",
          "Acceso por 12 meses",
          "Acceso al contenido bonus exclusivo",
          "Novedades y actualizaciones premium"
        ] : [
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
        label: t('accessLifetime'),
        icon: Gift,
        buttonText: isLatam ? "Desbloquear Acceso Vitalicio" : "Desbloquear Acesso Vitalício",
        features: isLatam ? [
          "Todo lo del acceso de 1 año",
          "Acceso permanente al pack",
          "Todas las actualizaciones futuras",
          "Contenido bonus exclusivo para siempre"
        ] : [
          "Tudo do acesso de 1 ano",
          "Acesso permanente ao pack",
          "Todas as atualizações futuras",
          "Conteúdo bônus exclusivo para sempre"
        ],
        hasBonus: true,
        highlighted: true
      }
    ];

    return allOptions.filter(opt => isEnabled(opt.type));
  };

  const handleSelectOption = (accessType: string) => {
    if (!selectedPack) return;
    
    let checkoutLinkBR: string | null = null;
    let checkoutLinkLatam: string | null = null;
    
    // Use member links (20% OFF)
    switch (accessType) {
      case "6_meses":
        checkoutLinkBR = selectedPack.checkout_link_membro_6_meses;
        checkoutLinkLatam = selectedPack.checkout_link_latam_membro_6_meses;
        break;
      case "1_ano":
        checkoutLinkBR = selectedPack.checkout_link_membro_1_ano;
        checkoutLinkLatam = selectedPack.checkout_link_latam_membro_1_ano;
        break;
      case "vitalicio":
        checkoutLinkBR = selectedPack.checkout_link_membro_vitalicio;
        checkoutLinkLatam = selectedPack.checkout_link_latam_membro_vitalicio;
        break;
    }
    
    const checkoutLink = getCheckoutLink(checkoutLinkBR, checkoutLinkLatam);
    
    if (checkoutLink) {
      window.open(appendUtmToUrl(checkoutLink), "_blank");
    } else {
      window.open(appendUtmToUrl("https://voxvisual.com.br/linksbio/"), "_blank");
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2d4a5e]"></div>
      </div>
    );
  }

  const accessOptions = getAccessOptions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] p-4">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          className="text-white/70 hover:text-white mb-6"
          onClick={() => navigate("/biblioteca-artes")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToLibrary')}
        </Button>

        <div className="text-center mb-8">
          <Badge className="bg-gradient-to-r from-purple-500 to-violet-500 text-white text-lg px-4 py-2 mb-4">
            <Crown className="h-5 w-5 mr-2" />
            {isLatam ? '20% OFF - Descuento Exclusivo para Miembros' : '20% OFF - Desconto Exclusivo para Membros'}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {selectedPack 
              ? (isLatam ? `Adquiere el ${selectedPack.name}` : `Adquira o ${selectedPack.name}`)
              : (isLatam ? "Elige un nuevo Pack" : "Escolha um novo Pack")
            }
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            {selectedPack 
              ? (isLatam 
                  ? "¡Como miembro, tienes 20% de descuento en todos los nuevos packs!"
                  : "Como membro, você tem 20% de desconto em todos os novos packs!")
              : (isLatam 
                  ? "Selecciona un pack para ver las opciones de compra con descuento de miembro"
                  : "Selecione um pack para ver as opções de compra com desconto de membro")
            }
          </p>
        </div>

        {!selectedPack ? (
          // Show pack selection (only packs user doesn't own)
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {availablePacks.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Crown className="h-16 w-16 text-purple-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  {isLatam ? '¡Ya tienes todos los packs!' : 'Você já possui todos os packs!'}
                </h3>
                <p className="text-white/60 mb-4">
                  {isLatam ? 'Felicidades, tienes acceso completo a la biblioteca.' : 'Parabéns, você tem acesso completo à biblioteca.'}
                </p>
                <Button onClick={() => navigate("/biblioteca-artes")}>
                  {t('backToLibrary')}
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
                {isLatam ? 'Elegir otro pack' : 'Escolher outro pack'}
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

            <div className={`grid gap-6 ${accessOptions.length === 1 ? 'max-w-md mx-auto' : accessOptions.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' : 'md:grid-cols-3'}`}>
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
                        {t('bestValue')}
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
                          <span className="text-white/40 line-through text-lg">{formatOriginalPrice(option.type)}</span>
                          <Badge className="bg-purple-500/20 text-purple-400 text-xs">-20%</Badge>
                        </div>
                        <span className="text-3xl font-bold text-purple-400">
                          {formatPrice(calculatePrice(option.type))}
                        </span>
                        <span className="text-white/60 text-sm block mt-1">{t('oneTimePayment')}</span>
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
                        {isLatam ? 'Comprar con Descuento' : 'Comprar com Desconto'}
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