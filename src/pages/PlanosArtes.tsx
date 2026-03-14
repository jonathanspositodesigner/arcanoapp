import { useState, useEffect } from "react";
import { getSanitizedUtms } from "@/lib/utmUtils";
import { getMetaCookies } from "@/lib/metaCookies";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  'pack-arcano-vol-4': { '6_meses': 'pack4-6meses', '1_ano': 'pack4-1ano', 'vitalicio': 'pack4-vitalicio' },
  'pack-arcano-vol-1': { '6_meses': 'vol1-6meses', '1_ano': 'vol1-1ano', 'vitalicio': 'vol1-vitalicio' },
  'pack-arcano-vol-2': { '6_meses': 'vol2-6meses', '1_ano': 'vol2-1ano', 'vitalicio': 'vol2-vitalicio' },
  'pack-arcano-vol-3': { '6_meses': 'vol3-6meses', '1_ano': 'vol3-1ano', 'vitalicio': 'vol3-vitalicio' },
  'pack-fim-de-ano': { '6_meses': 'fimdeano-6meses', '1_ano': 'fimdeano-1ano', 'vitalicio': 'fimdeano-vitalicio' },
  'pack-agendas': { '6_meses': 'agendas-6meses', '1_ano': 'agendas-1ano', 'vitalicio': 'agendas-vitalicio' },
  'pack-de-halloween': { '6_meses': 'halloween-6meses', '1_ano': 'halloween-1ano', 'vitalicio': 'halloween-vitalicio' },
  'pack-de-carnaval': { '6_meses': 'carnaval-6meses', '1_ano': 'carnaval-1ano', 'vitalicio': 'carnaval-vitalicio' },
  'pack-de-sao-joao': { '6_meses': 'saojoao-6meses', '1_ano': 'saojoao-1ano', 'vitalicio': 'saojoao-vitalicio' },
};

// Slugs Pagar.me para desconto de renovação (30% OFF)
const PAGARME_RENEWAL_SLUGS: Record<string, Record<string, string>> = {
  'pack-arcano-vol-1': { '6_meses': 'vol1-renov-6meses', '1_ano': 'vol1-renov-1ano', 'vitalicio': 'vol1-renov-vitalicio' },
  'pack-arcano-vol-2': { '6_meses': 'vol2-renov-6meses', '1_ano': 'vol2-renov-1ano', 'vitalicio': 'vol2-renov-vitalicio' },
  'pack-arcano-vol-3': { '6_meses': 'vol3-renov-6meses', '1_ano': 'vol3-renov-1ano', 'vitalicio': 'vol3-renov-vitalicio' },
  'pack-arcano-vol-4': { '6_meses': 'pack4-renov-6meses', '1_ano': 'pack4-renov-1ano', 'vitalicio': 'pack4-renov-vitalicio' },
  'pack-fim-de-ano': { '6_meses': 'fimdeano-renov-6meses', '1_ano': 'fimdeano-renov-1ano', 'vitalicio': 'fimdeano-renov-vitalicio' },
  'pack-agendas': { '6_meses': 'agendas-renov-6meses', '1_ano': 'agendas-renov-1ano', 'vitalicio': 'agendas-renov-vitalicio' },
  'pack-de-halloween': { '6_meses': 'halloween-renov-6meses', '1_ano': 'halloween-renov-1ano', 'vitalicio': 'halloween-renov-vitalicio' },
  'pack-de-carnaval': { '6_meses': 'carnaval-renov-6meses', '1_ano': 'carnaval-renov-1ano', 'vitalicio': 'carnaval-renov-vitalicio' },
  'pack-de-sao-joao': { '6_meses': 'saojoao-renov-6meses', '1_ano': 'saojoao-renov-1ano', 'vitalicio': 'saojoao-renov-vitalicio' },
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
  const [selectedAccessType, setSelectedAccessType] = useState('vitalicio');
  const [arteCount, setArteCount] = useState<number | null>(null);

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
    const artesLabel = arteCount ? `+${arteCount} artes profissionais` : 'Acesso completo ao pack';
    const sharedFeatures = [
      artesLabel,
      'Editável PSD e Canva',
      t('feature.unlimitedDownload'),
    ];

    const allOptions = [
      {
        type: "vitalicio",
        label: t('accessLifetime'),
        icon: Gift,
        buttonText: t('unlockLifetime'),
        features: [
          ...sharedFeatures,
          t('feature.permanentAccess') || 'Acesso permanente',
          t('feature.allFutureUpdates') || 'Todas as atualizações futuras',
        ],
        hasBonus: true,
        highlighted: true
      },
      {
        type: "1_ano",
        label: t('access1Year'),
        icon: Star,
        buttonText: t('unlock1Year'),
        features: [
          ...sharedFeatures,
          t('feature.access12Months'),
          t('feature.premiumUpdates'),
        ],
        hasBonus: true,
        highlighted: false
      },
      {
        type: "6_meses",
        label: t('access6Months'),
        icon: Clock,
        buttonText: t('unlock6Months'),
        features: [
          ...sharedFeatures,
          t('feature.updates6Months'),
        ],
        hasBonus: false,
        highlighted: false
      }
    ];
    return allOptions.filter(opt => isEnabled(opt.type));
  };

  // Keep selectedAccessType in sync when pack changes + fetch arte count
  useEffect(() => {
    const opts = getAccessOptions();
    const vit = opts.find(o => o.type === 'vitalicio');
    setSelectedAccessType(vit ? vit.type : opts[0]?.type || 'vitalicio');

    if (selectedPack) {
      supabase
        .from('admin_artes')
        .select('*', { count: 'exact', head: true })
        .eq('pack', selectedPack.name)
        .then(({ count }) => setArteCount(count ?? null));
    } else {
      setArteCount(null);
    }
  }, [selectedPack]);

  // Check if this pack uses Pagar.me checkout
  const isPagarmePackSlug = selectedPack ? PAGARME_PACK_SLUGS[selectedPack.slug] : null;
  const isPagarmeRenewalSlug = selectedPack ? PAGARME_RENEWAL_SLUGS[selectedPack.slug] : null;

  const handlePagarmeCheckoutWithSlug = async (productSlug: string) => {
    if (!startCheckout()) return;

    if (!userId) {
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

  const handlePagarmeCheckout = async (accessType: string) => {
    if (!selectedPack || !isPagarmePackSlug) return;
    const productSlug = isPagarmePackSlug[accessType];
    if (!productSlug) return;
    handlePagarmeCheckoutWithSlug(productSlug);
  };

  const handlePaymentMethodSelected = async (method: 'PIX' | 'CREDIT_CARD') => {
    if (!pendingSlug || !pendingProfile) return;
    if (!startCheckout()) return;

    try {
      const utmData = getSanitizedUtms();

      const { fbp, fbc } = getMetaCookies();
      const body: any = {
        product_slug: pendingSlug,
        user_email: userEmail,
        user_phone: pendingProfile.phone,
        user_name: pendingProfile.name,
        user_cpf: pendingProfile.cpf,
        billing_type: method,
        utm_data: utmData,
        fbp,
        fbc,
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

      const { checkout_url, event_id } = response.data;
      // Fire InitiateCheckout with event_id for deduplication with server-side CAPI
      if (typeof window !== 'undefined' && (window as any).fbq && event_id) {
        (window as any).fbq('track', 'InitiateCheckout', {}, { eventID: event_id });
      }
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

    // If renewal and this pack has Pagar.me renewal slugs, use Pagar.me
    if (isRenewal && isPagarmeRenewalSlug) {
      const productSlug = isPagarmeRenewalSlug[accessType];
      if (productSlug) {
        handlePagarmeCheckoutWithSlug(productSlug);
        return;
      }
    }

    // If this pack uses Pagar.me (normal price), route through that flow
    if (!isRenewal && isPagarmePackSlug) {
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
  const selectedOption = accessOptions.find(o => o.type === selectedAccessType) || accessOptions[0];

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

            <div className="max-w-lg mx-auto">
              <Card className="relative bg-[#1a1a2e]/80 border-[#2d4a5e]/30">
                {selectedAccessType === 'vitalicio' && accessOptions.length > 1 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2d4a5e] text-white px-4 py-1 rounded-full text-sm font-medium text-center whitespace-nowrap">
                    {t('bestValue')}
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  {selectedPack?.cover_url && (
                    <img
                      src={selectedPack.cover_url}
                      alt={selectedPack.name}
                      className="w-24 h-24 object-cover rounded-lg border-2 border-[#2d4a5e]/50 mx-auto mb-3"
                    />
                  )}
                  <CardTitle className="text-xl text-white">{selectedPack?.name}</CardTitle>
                  <div className="mt-4">
                    {(isRenewal || hasNotificationDiscount) && (
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-white/40 line-through text-lg">{formatOriginalPrice(selectedAccessType)}</span>
                        <Badge className={`text-xs ${isRenewal ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          -{isRenewal ? '30' : notificationDiscountPercent}%
                        </Badge>
                      </div>
                    )}
                    <span className={`text-3xl font-bold ${isRenewal ? 'text-green-400' : hasNotificationDiscount ? 'text-amber-400' : 'text-white'}`}>
                      {formatPrice(calculatePrice(selectedAccessType))}
                    </span>
                    <span className="text-white/60 text-sm block mt-1">{t('oneTimePayment')}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {accessOptions.length > 1 && (
                    <RadioGroup
                      value={selectedAccessType}
                      onValueChange={setSelectedAccessType}
                      className="space-y-3 mb-6"
                    >
                      {accessOptions.map((option) => (
                        <label
                          key={option.type}
                          className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedAccessType === option.type
                              ? `border-[#2d4a5e] ${isRenewal ? 'bg-green-500/10' : hasNotificationDiscount ? 'bg-amber-500/10' : 'bg-[#2d4a5e]/10'}`
                              : 'border-[#2d4a5e]/30 hover:border-[#2d4a5e]/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={option.type} className="border-[#2d4a5e] text-[#2d4a5e]" />
                            <span className="text-white font-medium">{option.label}</span>
                          </div>
                          <span className={`font-semibold ${isRenewal ? 'text-green-400' : hasNotificationDiscount ? 'text-amber-400' : 'text-white'}`}>
                            {formatPrice(calculatePrice(option.type))}
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  )}

                  {selectedOption && (
                    <>
                      <ul className="space-y-3 mb-6">
                        {selectedOption.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-white/80">
                            <Check className="h-4 w-4 text-[#2d4a5e] mt-0.5 shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full ${
                          isRenewal
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold shadow-lg shadow-green-500/30"
                            : hasNotificationDiscount
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-amber-500/30"
                              : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-amber-500/30"
                        }`}
                        onClick={() => handleSelectOption(selectedAccessType)}
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
                            : selectedOption.buttonText}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
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
