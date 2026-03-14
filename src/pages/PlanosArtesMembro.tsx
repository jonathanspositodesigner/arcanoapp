import { useState, useEffect } from "react";
import { getSanitizedUtms } from "@/lib/utmUtils";
import { getMetaCookies } from "@/lib/metaCookies";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, Star, ArrowLeft, Gift, Clock, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { useYearEndPromo } from "@/hooks/useYearEndPromo";
import { appendUtmToUrl } from "@/lib/utmUtils";
import { useLocale } from "@/contexts/LocaleContext";
import { useProcessingButton } from "@/hooks/useProcessingButton";
import PreCheckoutModal from "@/components/upscaler/PreCheckoutModal";
import PaymentMethodModal from "@/components/checkout/PaymentMethodModal";
import { toast } from "sonner";

// Mapeamento de slugs Pagar.me para desconto de membro (20% OFF)
const PAGARME_MEMBER_SLUGS: Record<string, Record<string, string>> = {
  'pack-arcano-vol-1': { '6_meses': 'vol1-membro-6meses', '1_ano': 'vol1-membro-1ano', 'vitalicio': 'vol1-membro-vitalicio' },
  'pack-arcano-vol-2': { '6_meses': 'vol2-membro-6meses', '1_ano': 'vol2-membro-1ano', 'vitalicio': 'vol2-membro-vitalicio' },
  'pack-arcano-vol-3': { '6_meses': 'vol3-membro-6meses', '1_ano': 'vol3-membro-1ano', 'vitalicio': 'vol3-membro-vitalicio' },
  'pack-arcano-vol-4': { '6_meses': 'pack4-membro-6meses', '1_ano': 'pack4-membro-1ano', 'vitalicio': 'pack4-membro-vitalicio' },
  'pack-fim-de-ano': { '6_meses': 'fimdeano-membro-6meses', '1_ano': 'fimdeano-membro-1ano', 'vitalicio': 'fimdeano-membro-vitalicio' },
  'pack-agendas': { '6_meses': 'agendas-membro-6meses', '1_ano': 'agendas-membro-1ano', 'vitalicio': 'agendas-membro-vitalicio' },
  'pack-de-halloween': { '6_meses': 'halloween-membro-6meses', '1_ano': 'halloween-membro-1ano', 'vitalicio': 'halloween-membro-vitalicio' },
  'pack-de-carnaval': { '6_meses': 'carnaval-membro-6meses', '1_ano': 'carnaval-membro-1ano', 'vitalicio': 'carnaval-membro-vitalicio' },
  'pack-de-sao-joao': { '6_meses': 'saojoao-membro-6meses', '1_ano': 'saojoao-membro-1ano', 'vitalicio': 'saojoao-membro-vitalicio' },
};

interface Pack {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  price_6_meses: number | null;
  price_1_ano: number | null;
  price_vitalicio: number | null;
  price_6_meses_usd: number | null;
  price_1_ano_usd: number | null;
  price_vitalicio_usd: number | null;
  enabled_6_meses: boolean;
  enabled_1_ano: boolean;
  enabled_vitalicio: boolean;
  checkout_link_membro_6_meses: string | null;
  checkout_link_membro_1_ano: string | null;
  checkout_link_membro_vitalicio: string | null;
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
        type: "vitalicio",
        label: t('accessLifetime'),
        icon: Gift,
        buttonText: t('unlockLifetime'),
        features: [
          t('features.all1YearFeatures'),
          t('features.permanentAccess'),
          t('features.allFutureUpdates'),
          t('features.foreverBonus')
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
          t('features.all6MonthsFeatures'),
          t('features.access12Months'),
          t('features.bonusAccess'),
          t('features.premiumUpdates')
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
          t('features.fullAccess'),
          t('features.unlimitedDownload'),
          t('features.editableFiles'),
          t('features.updates6Months')
        ],
        hasBonus: false,
        highlighted: false
      }
    ];

    return allOptions.filter(opt => isEnabled(opt.type));
  };

  // Check if this pack uses Pagar.me checkout
  const isPagarmeMemberSlug = selectedPack ? PAGARME_MEMBER_SLUGS[selectedPack.slug] : null;

  const handlePagarmeCheckout = async (accessType: string) => {
    if (!selectedPack || !isPagarmeMemberSlug) return;
    const productSlug = isPagarmeMemberSlug[accessType];
    if (!productSlug) return;

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

    // If this pack has a Pagar.me member slug, use that flow
    if (isPagarmeMemberSlug) {
      handlePagarmeCheckout(accessType);
      return;
    }
    
    // Fallback to Greenn links
    let checkoutLinkBR: string | null = null;
    let checkoutLinkLatam: string | null = null;
    
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
  const defaultAccess = accessOptions.find(o => o.type === 'vitalicio')?.type || accessOptions[0]?.type || 'vitalicio';
  const [selectedAccessType, setSelectedAccessType] = useState(defaultAccess);

  // Keep selectedAccessType in sync when pack changes
  useEffect(() => {
    const opts = getAccessOptions();
    const vit = opts.find(o => o.type === 'vitalicio');
    setSelectedAccessType(vit ? vit.type : opts[0]?.type || 'vitalicio');
  }, [selectedPack]);

  const selectedOption = accessOptions.find(o => o.type === selectedAccessType) || accessOptions[0];

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
            {t('memberDiscountLabel')}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {selectedPack 
              ? t('acquirePack', { pack: selectedPack.name })
              : t('chooseNewPack')
            }
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            {selectedPack 
              ? t('memberDiscountInfo')
              : t('selectPackMemberDiscount')
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
                  {t('youOwnAllPacks')}
                </h3>
                <p className="text-white/60 mb-4">
                  {t('congratsFullAccess')}
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
                {t('buttons.chooseAnotherPack', { ns: 'library' })}
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

            <div className="max-w-lg mx-auto">
              <Card className="relative bg-[#1a1a2e]/80 border-[#2d4a5e]/30">
                {selectedAccessType === 'vitalicio' && accessOptions.length > 1 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium text-center whitespace-nowrap">
                    {t('bestValue')}
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  {selectedPack.cover_url && (
                    <img
                      src={selectedPack.cover_url}
                      alt={selectedPack.name}
                      className="w-24 h-24 object-cover rounded-lg border-2 border-purple-500/50 mx-auto mb-3"
                    />
                  )}
                  <CardTitle className="text-xl text-white">{selectedPack.name}</CardTitle>
                  <div className="mt-4">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-white/40 line-through text-lg">{formatOriginalPrice(selectedAccessType)}</span>
                      <Badge className="bg-purple-500/20 text-purple-400 text-xs">-20%</Badge>
                    </div>
                    <span className="text-3xl font-bold text-purple-400">
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
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-[#2d4a5e]/30 hover:border-[#2d4a5e]/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={option.type} className="border-purple-400 text-purple-400" />
                            <span className="text-white font-medium">{option.label}</span>
                          </div>
                          <span className="text-purple-400 font-semibold">
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
                            <Check className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-bold shadow-lg shadow-purple-500/30"
                        onClick={() => handleSelectOption(selectedAccessType)}
                        disabled={isCheckoutSubmitting}
                      >
                        {isCheckoutSubmitting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Crown className="h-4 w-4 mr-2" />
                        )}
                        {t('buttons.buyWithDiscount', { ns: 'library' })}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* PreCheckout Modal for Pagar.me member discount */}
      <PreCheckoutModal
        isOpen={showPreCheckout}
        onClose={() => setShowPreCheckout(false)}
        productSlug={pendingSlug || 'vol1-membro-vitalicio'}
      />

      {/* Payment Method Modal */}
      <PaymentMethodModal
        open={showPaymentMethodModal}
        onOpenChange={setShowPaymentMethodModal}
        onSelect={handlePaymentMethodSelected}
        isProcessing={isCheckoutSubmitting}
        colorScheme="purple"
      />
    </div>
  );
};

export default PlanosArtesMembro;
