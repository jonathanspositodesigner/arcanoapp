import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, ArrowLeft, Gift, Clock, Percent, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useYearEndPromo } from "@/hooks/useYearEndPromo";

interface Pack {
  id: string;
  name: string;
  slug: string;
  type: string;
  cover_url: string | null;
  is_visible: boolean;
  // Prices (in cents)
  price_6_meses: number | null;
  price_1_ano: number | null;
  price_vitalicio: number | null;
  // Enabled toggles
  enabled_6_meses: boolean;
  enabled_1_ano: boolean;
  enabled_vitalicio: boolean;
  // Normal checkout links
  checkout_link_6_meses: string | null;
  checkout_link_1_ano: string | null;
  checkout_link_vitalicio: string | null;
  // Renewal checkout links (30% OFF)
  checkout_link_renovacao_6_meses: string | null;
  checkout_link_renovacao_1_ano: string | null;
  checkout_link_renovacao_vitalicio: string | null;
  // Notification discount
  notification_discount_enabled: boolean;
  notification_discount_percent: number | null;
  checkout_link_notif_6_meses: string | null;
  checkout_link_notif_1_ano: string | null;
  checkout_link_notif_vitalicio: string | null;
}

const PlanosArtes = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const packSlug = searchParams.get("pack");
  const isRenewal = searchParams.get("renovacao") === "true";
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNotificationEligible, setIsNotificationEligible] = useState(false);
  
  const { isActive: isPromoActive, loading: promoLoading } = useYearEndPromo();

  // Redirect to promo page if year-end promo is active
  useEffect(() => {
    if (!promoLoading && isPromoActive) {
      const redirectUrl = packSlug 
        ? `/promos-natal?pack=${packSlug}${isRenewal ? '&renovacao=true' : ''}`
        : '/promos-natal';
      navigate(redirectUrl, { replace: true });
    }
  }, [promoLoading, isPromoActive, packSlug, isRenewal, navigate]);

  // Discount configuration for renewals
  const RENEWAL_DISCOUNT = 0.30; // 30% discount

  useEffect(() => {
    fetchPacks();
    checkNotificationEligibility();
  }, []);

  useEffect(() => {
    if (packSlug && packs.length > 0) {
      const pack = packs.find(p => p.slug === packSlug);
      if (pack) {
        setSelectedPack(pack);
      }
    }
  }, [packSlug, packs]);

  const checkNotificationEligibility = async () => {
    // Check localStorage first for quick response
    const localEligible = localStorage.getItem('push_discount_eligible') === 'true';
    if (localEligible) {
      setIsNotificationEligible(true);
      return;
    }

    // Verify with database using stored endpoint
    const storedEndpoint = localStorage.getItem('push_notification_endpoint');
    if (storedEndpoint) {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('discount_eligible')
        .eq('endpoint', storedEndpoint)
        .maybeSingle();

      if (data?.discount_eligible) {
        setIsNotificationEligible(true);
        localStorage.setItem('push_discount_eligible', 'true');
      }
    }
  };

  const fetchPacks = async () => {
    const { data, error } = await supabase
      .from("artes_packs")
      .select(`
        id, name, slug, cover_url, type, is_visible,
        price_6_meses, price_1_ano, price_vitalicio,
        enabled_6_meses, enabled_1_ano, enabled_vitalicio,
        checkout_link_6_meses, checkout_link_1_ano, checkout_link_vitalicio,
        checkout_link_renovacao_6_meses, checkout_link_renovacao_1_ano, checkout_link_renovacao_vitalicio,
        notification_discount_enabled, notification_discount_percent,
        checkout_link_notif_6_meses, checkout_link_notif_1_ano, checkout_link_notif_vitalicio
      `)
      .in("type", ["pack", "curso"])
      .eq("is_visible", true)
      .order("display_order", { ascending: true });

    if (!error && data) {
      setPacks(data as Pack[]);
    }
    setLoading(false);
  };

  // Check if user is eligible for notification discount on this pack
  const hasNotificationDiscount = selectedPack?.notification_discount_enabled && isNotificationEligible && !isRenewal;
  const notificationDiscountPercent = selectedPack?.notification_discount_percent || 20;

  // Separate packs and courses
  const packItems = packs.filter(p => p.type === "pack");
  const cursoItems = packs.filter(p => p.type === "curso");

  const getPrice = (type: string): number => {
    if (!selectedPack) return 0;
    switch (type) {
      case "6_meses": return selectedPack.price_6_meses || 2700;
      case "1_ano": return selectedPack.price_1_ano || 3700;
      case "vitalicio": return selectedPack.price_vitalicio || 4700;
      default: return 0;
    }
  };

  const calculatePrice = (type: string) => {
    const original = getPrice(type);
    if (isRenewal) {
      const discounted = original * (1 - RENEWAL_DISCOUNT);
      return discounted / 100;
    }
    if (hasNotificationDiscount) {
      const discounted = original * (1 - notificationDiscountPercent / 100);
      return discounted / 100;
    }
    return original / 100;
  };

  const formatPrice = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const formatOriginalPrice = (type: string) => {
    const cents = getPrice(type);
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
        label: "Acesso 6 Meses",
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

    // Filter only enabled options
    return allOptions.filter(opt => isEnabled(opt.type));
  };

  const handleSelectOption = (accessType: string) => {
    if (!selectedPack) return;
    
    let checkoutLink: string | null = null;
    
    if (isRenewal) {
      // Use renewal links (30% OFF)
      switch (accessType) {
        case "6_meses":
          checkoutLink = selectedPack.checkout_link_renovacao_6_meses;
          break;
        case "1_ano":
          checkoutLink = selectedPack.checkout_link_renovacao_1_ano;
          break;
        case "vitalicio":
          checkoutLink = selectedPack.checkout_link_renovacao_vitalicio;
          break;
      }
    } else if (hasNotificationDiscount) {
      // Use notification discount links (20% OFF)
      switch (accessType) {
        case "6_meses":
          checkoutLink = selectedPack.checkout_link_notif_6_meses;
          break;
        case "1_ano":
          checkoutLink = selectedPack.checkout_link_notif_1_ano;
          break;
        case "vitalicio":
          checkoutLink = selectedPack.checkout_link_notif_vitalicio;
          break;
      }
    } else {
      // Use normal links
      switch (accessType) {
        case "6_meses":
          checkoutLink = selectedPack.checkout_link_6_meses;
          break;
        case "1_ano":
          checkoutLink = selectedPack.checkout_link_1_ano;
          break;
        case "vitalicio":
          checkoutLink = selectedPack.checkout_link_vitalicio;
          break;
      }
    }
    
    if (checkoutLink) {
      window.open(checkoutLink, "_blank");
    } else {
      // Fallback se não houver link configurado
      window.open("https://voxvisual.com.br/linksbio/", "_blank");
    }
  };

  if (loading) {
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
          Voltar para Biblioteca
        </Button>

        <div className="text-center mb-8">
          {isRenewal && (
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg px-4 py-2 mb-4">
              <Percent className="h-5 w-5 mr-2" />
              30% OFF - Renovação Especial
            </Badge>
          )}
          {hasNotificationDiscount && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg px-4 py-2 mb-4 animate-pulse">
              <Bell className="h-5 w-5 mr-2" />
              {notificationDiscountPercent}% OFF - Desconto Exclusivo!
            </Badge>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {isRenewal 
              ? `Renove seu acesso ao ${selectedPack?.name || "Pack"}`
              : hasNotificationDiscount
                ? `Seu desconto exclusivo no ${selectedPack?.name || "Pack"}`
                : selectedPack 
                  ? `Adquira o ${selectedPack.name}` 
                  : "Escolha seu Pack"
            }
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            {isRenewal
              ? "Aproveite 30% de desconto na renovação do seu acesso!"
              : hasNotificationDiscount
                ? `Parabéns! Você ativou as notificações e ganhou ${notificationDiscountPercent}% de desconto!`
                : selectedPack 
                  ? "Escolha o tipo de acesso ideal para você"
                  : "Selecione um pack para ver as opções de compra"
            }
          </p>
        </div>

        {!selectedPack && !isRenewal ? (
          // Show pack selection only for normal pricing (not renewal)
          <div className="space-y-8">
            {/* Packs de Artes */}
            {packItems.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Packs de Artes</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {packItems.map((pack) => (
                    <Card
                      key={pack.id}
                      className="bg-[#1a1a2e]/80 border-[#2d4a5e]/30 cursor-pointer hover:ring-2 hover:ring-[#2d4a5e] transition-all relative"
                      onClick={() => setSelectedPack(pack)}
                    >
                      {pack.notification_discount_enabled && isNotificationEligible && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
                          <Bell className="h-3 w-3" />
                          {pack.notification_discount_percent || 20}% OFF
                        </div>
                      )}
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
              </div>
            )}

            {/* Cursos */}
            {cursoItems.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Cursos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {cursoItems.map((pack) => (
                    <Card
                      key={pack.id}
                      className="bg-[#1a1a2e]/80 border-[#2d4a5e]/30 cursor-pointer hover:ring-2 hover:ring-[#2d4a5e] transition-all relative"
                      onClick={() => setSelectedPack(pack)}
                    >
                      {pack.notification_discount_enabled && isNotificationEligible && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
                          <Bell className="h-3 w-3" />
                          {pack.notification_discount_percent || 20}% OFF
                        </div>
                      )}
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
              </div>
            )}
          </div>
        ) : (
          // Show access options for selected pack (or renewal pack)
          <>
            {/* Hide "Escolher outro pack" button for renewals */}
            {!isRenewal && (
              <div className="flex justify-center mb-6">
                <Button
                  variant="outline"
                  className="bg-[#2d4a5e]/30 border-[#2d4a5e] text-white hover:bg-[#2d4a5e]/50"
                  onClick={() => setSelectedPack(null)}
                >
                  Escolher outro pack
                </Button>
              </div>
            )}

            {selectedPack?.cover_url && (
              <div className="flex justify-center mb-8">
                <img
                  src={selectedPack.cover_url}
                  alt={selectedPack.name}
                  className="w-32 h-32 object-cover rounded-lg border-2 border-[#2d4a5e]/50"
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
                        {(isRenewal || hasNotificationDiscount) && (
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="text-white/40 line-through text-lg">{formatOriginalPrice(option.type)}</span>
                            <Badge className={`text-xs ${isRenewal ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              -{isRenewal ? '30' : notificationDiscountPercent}%
                            </Badge>
                          </div>
                        )}
                        <span className={`text-3xl font-bold ${isRenewal ? 'text-green-400' : hasNotificationDiscount ? 'text-amber-400' : 'text-white'}`}>
                          {formatPrice(calculatePrice(option.type))}
                        </span>
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
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-amber-500/30 animate-pulse"
                            : isRenewal
                              ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                              : hasNotificationDiscount
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                                : "bg-[#2d4a5e]/50 hover:bg-[#2d4a5e] text-white"
                        }`}
                        onClick={() => handleSelectOption(option.type)}
                      >
                        {hasNotificationDiscount && <Bell className="h-4 w-4 mr-2" />}
                        {!hasNotificationDiscount && <Star className="h-4 w-4 mr-2" />}
                        {isRenewal ? "Renovar Agora" : hasNotificationDiscount ? "Usar Meu Desconto" : option.buttonText}
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