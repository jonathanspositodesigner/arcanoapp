import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, ArrowLeft, Gift, Clock, Percent, Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useYearEndPromo } from "@/hooks/useYearEndPromo";
import { AnimatedSection, StaggeredAnimation, FadeIn, AnimatedGrid } from "@/hooks/useScrollAnimation";
import { appendUtmToUrl } from "@/lib/utmUtils";
import { useLocale } from "@/contexts/LocaleContext";
import { useProcessingButton } from "@/hooks/useProcessingButton";
import PreCheckoutModal from "@/components/upscaler/PreCheckoutModal";
import PaymentMethodModal from "@/components/checkout/PaymentMethodModal";
import { toast } from "sonner";

// Packs que usam checkout Pagar.me em vez de links Greenn
const PAGARME_PACK_SLUGS: Record<string, Record<string, string>> = {
  'pack-arcano-vol-4': {
    '6_meses': 'pack4-6meses',
    '1_ano': 'pack4-1ano',
    'vitalicio': 'pack4-vitalicio',
  },
};

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
  price_6_meses_usd: number | null;
  price_1_ano_usd: number | null;
  price_vitalicio_usd: number | null;
  enabled_6_meses: boolean;
  enabled_1_ano: boolean;
  enabled_vitalicio: boolean;
  checkout_link_6_meses: string | null;
  checkout_link_1_ano: string | null;
  checkout_link_vitalicio: string | null;
  checkout_link_latam_6_meses: string | null;
  checkout_link_latam_1_ano: string | null;
  checkout_link_latam_vitalicio: string | null;
  checkout_link_renovacao_6_meses: string | null;
  checkout_link_renovacao_1_ano: string | null;
  checkout_link_renovacao_vitalicio: string | null;
  checkout_link_latam_renovacao_6_meses: string | null;
  checkout_link_latam_renovacao_1_ano: string | null;
  checkout_link_latam_renovacao_vitalicio: string | null;
  notification_discount_enabled: boolean;
  notification_discount_percent: number | null;
  checkout_link_notif_6_meses: string | null;
  checkout_link_notif_1_ano: string | null;
  checkout_link_notif_vitalicio: string | null;
}

const PlanosArtes = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('plans');
  const { t: tc } = useTranslation('common');
  const { isLatam, formatPrice: formatLocalizedPrice, getCheckoutLink, locale } = useLocale();
  
  const packSlug = searchParams.get("pack");
  const isRenewal = searchParams.get("renovacao") === "true";
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNotificationEligible, setIsNotificationEligible] = useState(false);
  
  const { isActive: isPromoActive, loading: promoLoading } = useYearEndPromo();

  // Pagar.me checkout state
  const [showPreCheckout, setShowPreCheckout] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [pendingProfile, setPendingProfile] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { isSubmitting: isCheckoutSubmitting, startSubmit: startCheckout, endSubmit: endCheckout } = useProcessingButton();

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || null);
      }
    };
    checkAuth();
  }, []);

  // Redirect to promo page if year-end promo is active
  useEffect(() => {
    if (!promoLoading && isPromoActive) {
      const redirectUrl = packSlug 
        ? `/promos-natal?pack=${packSlug}${isRenewal ? '&renovacao=true' : ''}`
        : '/promos-natal';
      navigate(redirectUrl, { replace: true });
    }
  }, [promoLoading, isPromoActive, packSlug, isRenewal, navigate]);

  const RENEWAL_DISCOUNT = 0.30;

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
    const localEligible = localStorage.getItem('push_discount_eligible') === 'true';
    if (localEligible) {
      setIsNotificationEligible(true);
      return;
    }
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
        price_6_meses_usd, price_1_ano_usd, price_vitalicio_usd,
        enabled_6_meses, enabled_1_ano, enabled_vitalicio,
        checkout_link_6_meses, checkout_link_1_ano, checkout_link_vitalicio,
        checkout_link_latam_6_meses, checkout_link_latam_1_ano, checkout_link_latam_vitalicio,
        checkout_link_renovacao_6_meses, checkout_link_renovacao_1_ano, checkout_link_renovacao_vitalicio,
        checkout_link_latam_renovacao_6_meses, checkout_link_latam_renovacao_1_ano, checkout_link_latam_renovacao_vitalicio,
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

  const hasNotificationDiscount = selectedPack?.notification_discount_enabled && isNotificationEligible && !isRenewal;
  const notificationDiscountPercent = selectedPack?.notification_discount_percent || 20;

  const packItems = packs.filter(p => p.type === "pack");
  const cursoItems = packs.filter(p => p.type === "curso");

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
    if (isRenewal) {
      return (original * (1 - RENEWAL_DISCOUNT)) / 100;
    }
    if (hasNotificationDiscount) {
      return (original * (1 - notificationDiscountPercent / 100)) / 100;
    }
    return original / 100;
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
        buttonText: t('unlock6Months'),
        features: [
          t('feature.fullAccess'),
          t('feature.unlimitedDownload'),
          t('feature.editableFiles'),
          t('feature.updates6Months')
        ],
        hasBonus: false,
        highlighted: false
      },
      {
        type: "1_ano",
        label: t('access1Year'),
        icon: Star,
        buttonText: t('unlock1Year'),
        features: [
          t('feature.everything6Months'),
          t('feature.access12Months'),
          t('feature.bonusContent'),
          t('feature.premiumUpdates')
        ],
        hasBonus: true,
        highlighted: false
      },
      {
        type: "vitalicio",
        label: t('accessLifetime'),
        icon: Gift,
        buttonText: t('unlockLifetime'),
        features: [
          t('feature.everything1Year'),
          t('feature.permanentAccess'),
          t('feature.allFutureUpdates'),
          t('feature.bonusForever')
        ],
        hasBonus: true,
        highlighted: true
      }
    ];
    return allOptions.filter(opt => isEnabled(opt.type));
  };

  // Check if this pack uses Pagar.me checkout
  const isPagarmePackSlug = selectedPack ? PAGARME_PACK_SLUGS[selectedPack.slug] : null;

  const handlePagarmeCheckout = async (accessType: string) => {
    if (!selectedPack || !isPagarmePackSlug) return;
    const productSlug = isPagarmePackSlug[accessType];
    if (!productSlug) return;

    if (!startCheckout()) return;

    if (!userId) {
      // Not logged in — open PreCheckout to collect data
      setPendingSlug(productSlug);
      setShowPreCheckout(true);
      endCheckout();
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, phone, cpf, address_line, address_zip, address_city, address_state, address_country')
        .eq('id', userId)
        .single();

      const isProfileComplete = profile?.name && profile?.phone && profile?.cpf
        && profile?.address_line && profile?.address_zip && profile?.address_city && profile?.address_state;

      if (isProfileComplete) {
        setPendingSlug(productSlug);
        setPendingProfile(profile);
        setShowPaymentMethodModal(true);
        endCheckout();
      } else {
        setPendingSlug(productSlug);
        setShowPreCheckout(true);
        endCheckout();
      }
    } catch {
      endCheckout();
    }
  };

  const handlePaymentMethodSelected = async (method: 'PIX' | 'CREDIT_CARD') => {
    if (!pendingSlug || !pendingProfile) return;
    if (!startCheckout()) return;

    try {
      let utmData: Record<string, string> | null = null;
      try {
        const raw = sessionStorage.getItem('captured_utms');
        if (raw) utmData = JSON.parse(raw);
      } catch { /* ignore */ }

      const body: any = {
        product_slug: pendingSlug,
        user_email: userEmail,
        user_phone: pendingProfile.phone,
        user_name: pendingProfile.name,
        user_cpf: pendingProfile.cpf,
        billing_type: method,
        utm_data: utmData,
      };

      if (method === 'PIX') {
        body.user_address = {
          line_1: pendingProfile.address_line,
          zip_code: pendingProfile.address_zip,
          city: pendingProfile.address_city,
          state: pendingProfile.address_state,
          country: pendingProfile.address_country || 'BR'
        };
      }

      const response = await supabase.functions.invoke('create-pagarme-checkout', { body });

      if (response.error) {
        console.error('Erro checkout direto:', response.error);
        toast.error('Erro ao gerar pagamento. Tente novamente.');
        setShowPaymentMethodModal(false);
        endCheckout();
        return;
      }

      const { checkout_url } = response.data;
      if (checkout_url) {
        window.location.href = checkout_url;
        return; // Keep modal open during redirect
      } else {
        toast.error('Erro ao gerar link de pagamento.');
      }
    } catch (error) {
      console.error('Erro checkout direto:', error);
      toast.error('Erro ao processar. Tente novamente.');
    }
    endCheckout();
    setShowPaymentMethodModal(false);
  };

  const handleSelectOption = (accessType: string) => {
    if (!selectedPack) return;

    // If this pack uses Pagar.me, route through that flow
    if (isPagarmePackSlug) {
      handlePagarmeCheckout(accessType);
      return;
    }
    
    let checkoutLinkBR: string | null = null;
    let checkoutLinkLatam: string | null = null;
    
    if (isRenewal) {
      switch (accessType) {
        case "6_meses":
          checkoutLinkBR = selectedPack.checkout_link_renovacao_6_meses;
          checkoutLinkLatam = selectedPack.checkout_link_latam_renovacao_6_meses;
          break;
        case "1_ano":
          checkoutLinkBR = selectedPack.checkout_link_renovacao_1_ano;
          checkoutLinkLatam = selectedPack.checkout_link_latam_renovacao_1_ano;
          break;
        case "vitalicio":
          checkoutLinkBR = selectedPack.checkout_link_renovacao_vitalicio;
          checkoutLinkLatam = selectedPack.checkout_link_latam_renovacao_vitalicio;
          break;
      }
    } else if (hasNotificationDiscount) {
      switch (accessType) {
        case "6_meses":
          checkoutLinkBR = selectedPack.checkout_link_notif_6_meses;
          break;
        case "1_ano":
          checkoutLinkBR = selectedPack.checkout_link_notif_1_ano;
          break;
        case "vitalicio":
          checkoutLinkBR = selectedPack.checkout_link_notif_vitalicio;
          break;
      }
    } else {
      switch (accessType) {
        case "6_meses":
          checkoutLinkBR = selectedPack.checkout_link_6_meses;
          checkoutLinkLatam = selectedPack.checkout_link_latam_6_meses;
          break;
        case "1_ano":
          checkoutLinkBR = selectedPack.checkout_link_1_ano;
          checkoutLinkLatam = selectedPack.checkout_link_latam_1_ano;
          break;
        case "vitalicio":
          checkoutLinkBR = selectedPack.checkout_link_vitalicio;
          checkoutLinkLatam = selectedPack.checkout_link_latam_vitalicio;
          break;
      }
    }
    
    const checkoutLink = getCheckoutLink(checkoutLinkBR, checkoutLinkLatam);
    
    if (checkoutLink) {
      window.open(appendUtmToUrl(checkoutLink, locale), "_blank");
    } else {
      window.open(appendUtmToUrl("https://voxvisual.com.br/linksbio/", locale), "_blank");
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
        <FadeIn delay={0}>
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white mb-6"
            onClick={() => navigate("/biblioteca-artes")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToLibrary')}
          </Button>
        </FadeIn>

        <AnimatedSection animation="fade-up" className="text-center mb-8" as="div">
          {isRenewal && (
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg px-4 py-2 mb-4">
              <Percent className="h-5 w-5 mr-2" />
              {t('renewal30Off')}
            </Badge>
          )}
          {hasNotificationDiscount && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg px-4 py-2 mb-4 animate-pulse">
              <Bell className="h-5 w-5 mr-2" />
              {notificationDiscountPercent}% OFF - {t('exclusiveDiscount')}
            </Badge>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {isRenewal 
              ? t('renewAccessTo', { pack: selectedPack?.name || "Pack" })
              : hasNotificationDiscount
                ? t('exclusiveDiscountOn', { pack: selectedPack?.name || "Pack" })
                : selectedPack 
                  ? t('acquirePack', { pack: selectedPack.name })
                  : t('choosePack')
            }
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            {isRenewal
              ? t('enjoy30Discount')
              : hasNotificationDiscount
                ? t('congratsNotifications', { percent: notificationDiscountPercent })
                : selectedPack 
                  ? t('selectAccessType')
                  : t('selectPackToPurchase')
            }
          </p>
        </AnimatedSection>

        {!selectedPack && !isRenewal ? (
          <div className="space-y-8">
            {packItems.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">{t('packsOfArts')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {packItems.map((pack) => (
                    <Card
                      key={pack.id}
                      className="bg-[#1a1a2e]/80 border-[#2d4a5e]/30 cursor-pointer hover:ring-2 hover:ring-[#2d4a5e] transition-all relative"
                      onClick={() => setSelectedPack(pack)}
                    >
                      {pack.notification_discount_enabled && isNotificationEligible && (
                        <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
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

            {cursoItems.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">{t('courses')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {cursoItems.map((pack) => (
                    <Card
                      key={pack.id}
                      className="bg-[#1a1a2e]/80 border-[#2d4a5e]/30 cursor-pointer hover:ring-2 hover:ring-[#2d4a5e] transition-all relative"
                      onClick={() => setSelectedPack(pack)}
                    >
                      {pack.notification_discount_enabled && isNotificationEligible && (
                        <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
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
          <>
            {!isRenewal && (
              <div className="flex justify-center mb-6">
                <Button
                  variant="outline"
                  className="bg-[#2d4a5e]/30 border-[#2d4a5e] text-white hover:bg-[#2d4a5e]/50"
                  onClick={() => setSelectedPack(null)}
                >
                  {t('buttons.chooseAnotherPack', { ns: 'library' })}
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
                        {t('bestValue')}
                      </div>
                    )}
                    {option.hasBonus && (
                      <div className="absolute top-3 right-3 bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                        <Gift className="h-3 w-3" />
                        {t('plusBonus')}
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
                        <span className="text-white/60 text-sm block mt-1">{t('oneTimePayment')}</span>
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
                        disabled={isCheckoutSubmitting}
                      >
                        {isCheckoutSubmitting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : hasNotificationDiscount ? (
                          <Bell className="h-4 w-4 mr-2" />
                        ) : (
                          <Star className="h-4 w-4 mr-2" />
                        )}
                        {isRenewal 
                          ? t('buttons.renewNow', { ns: 'library' }) 
                          : hasNotificationDiscount 
                            ? t('buttons.useMyDiscount', { ns: 'library' }) 
                            : option.buttonText}
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
            {t('buttons.alreadyBoughtPack', { ns: 'library' })}
          </Button>
        </div>
      </div>

      {/* PreCheckout Modal for Pagar.me packs */}
      <PreCheckoutModal
        isOpen={showPreCheckout}
        onClose={() => setShowPreCheckout(false)}
        productSlug={pendingSlug || 'pack4-vitalicio'}
      />

      {/* Payment Method Modal */}
      <PaymentMethodModal
        open={showPaymentMethodModal}
        onOpenChange={setShowPaymentMethodModal}
        onSelect={handlePaymentMethodSelected}
        isProcessing={isCheckoutSubmitting}
      />
    </div>
  );
};

export default PlanosArtes;
