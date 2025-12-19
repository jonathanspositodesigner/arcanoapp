import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, ArrowLeft, Gift, Clock, Percent, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useYearEndPromo } from "@/hooks/useYearEndPromo";

interface Pack {
  id: string;
  name: string;
  slug: string;
  type: string;
  cover_url: string | null;
  is_visible: boolean;
  price_6_meses: number | null;
  price_1_ano: number | null;
  price_vitalicio: number | null;
  enabled_6_meses: boolean;
  enabled_1_ano: boolean;
  enabled_vitalicio: boolean;
  checkout_link_membro_6_meses: string | null;
  checkout_link_membro_1_ano: string | null;
  checkout_link_membro_vitalicio: string | null;
  checkout_link_renovacao_6_meses: string | null;
  checkout_link_renovacao_1_ano: string | null;
  checkout_link_renovacao_vitalicio: string | null;
}

const PromosNatal = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const packSlug = searchParams.get("pack");
  const isRenewal = searchParams.get("renovacao") === "true";
  
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  const { isActive, promoName, discountPercent, endDate, loading: promoLoading } = useYearEndPromo();

  // Redirect if promo is not active
  useEffect(() => {
    if (!promoLoading && !isActive) {
      const redirectUrl = packSlug 
        ? `/planos-artes?pack=${packSlug}${isRenewal ? '&renovacao=true' : ''}`
        : '/biblioteca-artes';
      navigate(redirectUrl, { replace: true });
    }
  }, [promoLoading, isActive, packSlug, isRenewal, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!endDate) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  useEffect(() => {
    fetchPacks();
  }, []);

  useEffect(() => {
    if (packSlug && packs.length > 0) {
      const pack = packs.find(p => p.slug === packSlug);
      if (pack) setSelectedPack(pack);
    }
  }, [packSlug, packs]);

  const fetchPacks = async () => {
    const { data, error } = await supabase
      .from("artes_packs")
      .select(`
        id, name, slug, cover_url, type, is_visible,
        price_6_meses, price_1_ano, price_vitalicio,
        enabled_6_meses, enabled_1_ano, enabled_vitalicio,
        checkout_link_membro_6_meses, checkout_link_membro_1_ano, checkout_link_membro_vitalicio,
        checkout_link_renovacao_6_meses, checkout_link_renovacao_1_ano, checkout_link_renovacao_vitalicio
      `)
      .in("type", ["pack", "curso"])
      .eq("is_visible", true)
      .order("display_order", { ascending: true });

    if (!error && data) {
      setPacks(data as Pack[]);
    }
    setLoading(false);
  };

  const RENEWAL_DISCOUNT = 0.30;
  const PROMO_DISCOUNT = discountPercent / 100;

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
      return (original * (1 - RENEWAL_DISCOUNT)) / 100;
    }
    return (original * (1 - PROMO_DISCOUNT)) / 100;
  };

  const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
  const formatOriginalPrice = (type: string) => `R$ ${(getPrice(type) / 100).toFixed(2).replace('.', ',')}`;

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
    return allOptions.filter(opt => isEnabled(opt.type));
  };

  const handleSelectOption = (accessType: string) => {
    if (!selectedPack) return;
    
    let checkoutLink: string | null = null;
    
    if (isRenewal) {
      switch (accessType) {
        case "6_meses": checkoutLink = selectedPack.checkout_link_renovacao_6_meses; break;
        case "1_ano": checkoutLink = selectedPack.checkout_link_renovacao_1_ano; break;
        case "vitalicio": checkoutLink = selectedPack.checkout_link_renovacao_vitalicio; break;
      }
    } else {
      // Use member links (with promo discount applied via coupon)
      switch (accessType) {
        case "6_meses": checkoutLink = selectedPack.checkout_link_membro_6_meses; break;
        case "1_ano": checkoutLink = selectedPack.checkout_link_membro_1_ano; break;
        case "vitalicio": checkoutLink = selectedPack.checkout_link_membro_vitalicio; break;
      }
    }
    
    if (checkoutLink) {
      window.open(checkoutLink, "_blank");
    } else {
      window.open("https://voxvisual.com.br/linksbio/", "_blank");
    }
  };

  if (loading || promoLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-red-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const accessOptions = getAccessOptions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-white p-4 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-red-300/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-40 h-40 bg-rose-300/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-1/4 w-36 h-36 bg-red-200/40 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <Button
          variant="ghost"
          className="text-gray-700 hover:text-gray-900 hover:bg-white/50 mb-6"
          onClick={() => navigate("/biblioteca-artes")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Biblioteca
        </Button>

        {/* Promo Banner */}
        <div className="text-center mb-8">
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white px-6 py-3 rounded-full text-lg font-bold shadow-lg shadow-red-200 whitespace-nowrap">
              <Sparkles className="h-5 w-5" />
              {promoName}
              <Sparkles className="h-5 w-5" />
            </div>

            <Badge className="bg-gradient-to-r from-red-600 to-red-500 text-white text-xl px-6 py-2 shadow-lg whitespace-nowrap">
              <Percent className="h-5 w-5 mr-2" />
              {discountPercent}% OFF EM TODOS OS PACKS!
            </Badge>

            {isRenewal && (
              <Badge className="bg-gradient-to-r from-red-700 to-red-600 text-white text-lg px-4 py-2 shadow-lg whitespace-nowrap">
                + 30% OFF Renovação
              </Badge>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 mt-4">
            {selectedPack 
              ? `${discountPercent}% OFF no ${selectedPack.name}` 
              : "Escolha seu Pack com 50% OFF"
            }
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Aproveite esta oferta especial de fim de ano! Preços exclusivos por tempo limitado.
          </p>
        </div>

        {!selectedPack ? (
          <div className="space-y-8">
            {packItems.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Packs de Artes</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {packItems.map((pack) => (
                    <Card
                      key={pack.id}
                      className="bg-white border-2 border-red-100 cursor-pointer hover:ring-2 hover:ring-red-500 hover:shadow-xl transition-all relative overflow-hidden group shadow-md"
                      onClick={() => setSelectedPack(pack)}
                    >
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs px-2 py-1 rounded-full z-10 font-bold shadow-lg">
                        -{discountPercent}%
                      </div>
                      <CardContent className="p-4">
                        {pack.cover_url ? (
                          <img
                            src={pack.cover_url}
                            alt={pack.name}
                            className="w-full aspect-square object-cover rounded-lg mb-3 group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-red-100 rounded-lg mb-3 flex items-center justify-center">
                            <Gift className="h-8 w-8 text-red-500" />
                          </div>
                        )}
                        <h3 className="text-gray-900 font-semibold text-center">{pack.name}</h3>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {cursoItems.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Cursos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {cursoItems.map((pack) => (
                    <Card
                      key={pack.id}
                      className="bg-white border-2 border-red-100 cursor-pointer hover:ring-2 hover:ring-red-500 hover:shadow-xl transition-all relative overflow-hidden group shadow-md"
                      onClick={() => setSelectedPack(pack)}
                    >
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs px-2 py-1 rounded-full z-10 font-bold shadow-lg">
                        -{discountPercent}%
                      </div>
                      <CardContent className="p-4">
                        {pack.cover_url ? (
                          <img
                            src={pack.cover_url}
                            alt={pack.name}
                            className="w-full aspect-square object-cover rounded-lg mb-3 group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-red-100 rounded-lg mb-3 flex items-center justify-center">
                            <Star className="h-8 w-8 text-red-500" />
                          </div>
                        )}
                        <h3 className="text-gray-900 font-semibold text-center">{pack.name}</h3>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <Button
                variant="outline"
                className="bg-white border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setSelectedPack(null)}
              >
                Escolher outro pack
              </Button>
            </div>

            {selectedPack?.cover_url && (
              <div className="flex justify-center mb-8">
                <img
                  src={selectedPack.cover_url}
                  alt={selectedPack.name}
                  className="w-32 h-32 object-cover rounded-lg border-2 border-red-200 shadow-md"
                />
              </div>
            )}

            <div className={`grid gap-6 ${accessOptions.length === 1 ? 'max-w-md mx-auto' : accessOptions.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' : 'md:grid-cols-3'}`}>
              {accessOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Card
                    key={option.type}
                    className={`relative bg-white border-2 border-red-100 shadow-md ${
                      option.highlighted ? "ring-2 ring-red-500 scale-105 shadow-xl border-red-300" : ""
                    }`}
                  >
                    {option.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-1 rounded-full text-sm font-medium text-center whitespace-nowrap shadow-lg">
                        🔥 Melhor Oferta!
                      </div>
                    )}
                    {option.hasBonus && (
                      <div className="absolute top-3 right-3 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 border border-amber-200">
                        <Gift className="h-3 w-3" />
                        + Bônus
                      </div>
                    )}
                    <CardHeader className="text-center pt-8">
                      <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3 border border-red-200">
                        <IconComponent className="h-6 w-6 text-red-600" />
                      </div>
                      <CardTitle className="text-lg text-gray-900 font-bold">{option.label}</CardTitle>
                      <div className="mt-4">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <span className="text-gray-500 line-through text-lg">
                            {formatOriginalPrice(option.type)}
                          </span>
                          <Badge className="bg-red-600 text-white text-xs font-bold">
                            -{isRenewal ? '30' : discountPercent}%
                          </Badge>
                        </div>
                        <span className="text-3xl font-bold text-green-600">
                          {formatPrice(calculatePrice(option.type))}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {option.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                            <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full ${
                          option.highlighted
                            ? "bg-gradient-to-r from-red-700 via-red-600 to-red-700 hover:from-red-600 hover:to-red-500"
                            : "bg-red-500 hover:bg-red-600"
                        } text-white`}
                        onClick={() => handleSelectOption(option.type)}
                      >
                        {option.buttonText}
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

export default PromosNatal;
