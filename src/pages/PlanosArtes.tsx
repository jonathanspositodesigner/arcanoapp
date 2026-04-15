import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, Star, ArrowLeft, Gift, Clock, Percent, Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useYearEndPromo } from "@/hooks/useYearEndPromo";
import { AnimatedSection, FadeIn } from "@/hooks/useScrollAnimation";
import { useLocale } from "@/contexts/LocaleContext";
import { usePagarmeCheckout } from "@/hooks/usePagarmeCheckout";

// Slugs MP para preço normal
const MP_PACK_SLUGS: Record<string, Record<string, string>> = {
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

// Slugs MP para desconto de renovação (30% OFF)
const MP_RENEWAL_SLUGS: Record<string, Record<string, string>> = {
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
  notification_discount_enabled: boolean;
  notification_discount_percent: number | null;
}

const PlanosArtes = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('plans');
  const { isLatam } = useLocale();
  
  const packSlug = searchParams.get("pack");
  const isRenewal = searchParams.get("renovacao") === "true";
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNotificationEligible, setIsNotificationEligible] = useState(false);
  
  const { isActive: isPromoActive, loading: promoLoading } = useYearEndPromo();

  const { openCheckout, isLoading: isCheckoutSubmitting, PagarmeCheckoutModal } = usePagarmeCheckout({ source_page: "planos-artes" });
  const [selectedAccessType, setSelectedAccessType] = useState('vitalicio');
  const [arteCount, setArteCount] = useState<number | null>(null);

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
      if (pack) setSelectedPack(pack);
    }
  }, [packSlug, packs]);

  const checkNotificationEligibility = async () => {
    const localEligible = localStorage.getItem('push_discount_eligible') === 'true';
    if (localEligible) { setIsNotificationEligible(true); return; }
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
        notification_discount_enabled, notification_discount_percent
      `)
      .in("type", ["pack", "curso"])
      .eq("is_visible", true)
      .order("display_order", { ascending: true });

    if (!error && data) setPacks(data as Pack[]);
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
    if (isRenewal) return (original * (1 - RENEWAL_DISCOUNT)) / 100;
    if (hasNotificationDiscount) return (original * (1 - notificationDiscountPercent / 100)) / 100;
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
    const sharedFeatures = [artesLabel, 'Editável PSD e Canva', t('feature.unlimitedDownload')];

    const allOptions = [
      {
        type: "vitalicio",
        label: t('accessLifetime'),
        icon: Gift,
        buttonText: t('unlockLifetime'),
        features: [...sharedFeatures, t('feature.permanentAccess') || 'Acesso permanente', t('feature.allFutureUpdates') || 'Todas as atualizações futuras'],
        hasBonus: true,
        highlighted: true
      },
      {
        type: "1_ano",
        label: t('access1Year'),
        icon: Star,
        buttonText: t('unlock1Year'),
        features: [...sharedFeatures, t('feature.access12Months'), t('feature.premiumUpdates')],
        hasBonus: true,
        highlighted: false
      },
      {
        type: "6_meses",
        label: t('access6Months'),
        icon: Clock,
        buttonText: t('unlock6Months'),
        features: [...sharedFeatures, t('feature.updates6Months')],
        hasBonus: false,
        highlighted: false
      }
    ];
    return allOptions.filter(opt => isEnabled(opt.type));
  };

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

  const handleSelectOption = (accessType: string) => {
    if (!selectedPack) return;
    let slug: string | undefined;
    if (isRenewal) slug = MP_RENEWAL_SLUGS[selectedPack.slug]?.[accessType];
    if (!slug) slug = MP_PACK_SLUGS[selectedPack.slug]?.[accessType];
    if (slug) openCheckout(slug);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const accessOptions = getAccessOptions();
  const selectedOption = accessOptions.find(o => o.type === selectedAccessType) || accessOptions[0];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pb-12">
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <FadeIn delay={0}>
          <button
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
            onClick={() => navigate("/biblioteca-artes")}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToLibrary')}
          </button>
        </FadeIn>

        {/* Header */}
        <AnimatedSection animation="fade-up" className="text-center mb-8" as="div">
          {isRenewal && (
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-sm px-4 py-1.5 mb-4">
              <Percent className="h-4 w-4 mr-2" />
              {t('renewal30Off')}
            </Badge>
          )}
          {hasNotificationDiscount && (
            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm px-4 py-1.5 mb-4 animate-pulse">
              <Bell className="h-4 w-4 mr-2" />
              {notificationDiscountPercent}% OFF - {t('exclusiveDiscount')}
            </Badge>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {isRenewal 
              ? t('renewAccessTo', { pack: selectedPack?.name || "Pack" })
              : hasNotificationDiscount
                ? t('exclusiveDiscountOn', { pack: selectedPack?.name || "Pack" })
                : selectedPack 
                  ? t('acquirePack', { pack: selectedPack.name })
                  : t('choosePack')
            }
          </h1>
          <p className="text-muted-foreground text-sm">
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

        {/* Pack selection grid */}
        {!selectedPack && !isRenewal ? (
          <div className="space-y-8">
            {packItems.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-4">{t('packsOfArts')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[...packItems].sort((a, b) => a.slug === 'pack-arcano-vol-4' ? -1 : b.slug === 'pack-arcano-vol-4' ? 1 : 0).map((pack) => (
                    <button
                      key={pack.id}
                      className={`relative bg-card border border-border rounded-xl p-3 text-left hover:border-[#EF672C]/50 hover:bg-card/80 transition-all ${pack.slug === 'pack-arcano-vol-4' ? 'border-[#EF672C]/40 ring-1 ring-[#EF672C]/20' : ''}`}
                      onClick={() => setSelectedPack(pack)}
                    >
                      {pack.slug === 'pack-arcano-vol-4' && (
                        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                          <span className="bg-[#EF672C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">Novo</span>
                        </div>
                      )}
                      {pack.notification_discount_enabled && isNotificationEligible && (
                        <div className="absolute top-2 right-2 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded z-10">
                          {pack.notification_discount_percent || 20}% OFF
                        </div>
                      )}
                      {pack.cover_url ? (
                        <img src={pack.cover_url} alt={pack.name} className="w-full aspect-square object-cover rounded-lg mb-2" />
                      ) : (
                        <div className="w-full aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                          <Star className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <h3 className="text-foreground font-medium text-sm text-center">{pack.name}</h3>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cursoItems.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-4">{t('courses')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {cursoItems.map((pack) => (
                    <button
                      key={pack.id}
                      className="relative bg-card border border-border rounded-xl p-3 text-left hover:border-[#EF672C]/50 hover:bg-card/80 transition-all"
                      onClick={() => setSelectedPack(pack)}
                    >
                      {pack.notification_discount_enabled && isNotificationEligible && (
                        <div className="absolute top-2 right-2 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded z-10">
                          {pack.notification_discount_percent || 20}% OFF
                        </div>
                      )}
                      {pack.cover_url ? (
                        <img src={pack.cover_url} alt={pack.name} className="w-full aspect-square object-cover rounded-lg mb-2" />
                      ) : (
                        <div className="w-full aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                          <Star className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <h3 className="text-foreground font-medium text-sm text-center">{pack.name}</h3>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Selected pack — purchase card */
          <div className="max-w-md mx-auto">
            <div className="relative bg-card border border-border rounded-2xl overflow-hidden">
              {/* Best value badge */}
              {selectedAccessType === 'vitalicio' && accessOptions.length > 1 && (
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-[#EF672C] text-white px-4 py-1 rounded-b-lg text-xs font-bold">
                    {t('bestValue')}
                  </span>
                </div>
              )}

              <div className="p-6 pt-8 text-center">
                {/* Cover + name */}
                {selectedPack?.cover_url && (
                  <img
                    src={selectedPack.cover_url}
                    alt={selectedPack.name}
                    className="w-20 h-20 object-cover rounded-xl border border-border mx-auto mb-3"
                  />
                )}
                <h2 className="text-xl font-bold text-foreground">{selectedPack?.name}</h2>
                {!isRenewal && (
                  <button
                    onClick={() => setSelectedPack(null)}
                    className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2 transition-colors mt-1"
                  >
                    {t('buttons.chooseAnotherPack', { ns: 'library' })}
                  </button>
                )}

                {/* Price */}
                <div className="mt-5">
                  {(isRenewal || hasNotificationDiscount) && (
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-muted-foreground line-through text-base">{formatOriginalPrice(selectedAccessType)}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${isRenewal ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        -{isRenewal ? '30' : notificationDiscountPercent}%
                      </span>
                    </div>
                  )}
                  <span className={`text-4xl font-black ${isRenewal ? 'text-green-400' : hasNotificationDiscount ? 'text-amber-400' : 'text-foreground'}`}>
                    {formatPrice(calculatePrice(selectedAccessType))}
                  </span>
                  <span className="text-muted-foreground text-sm block mt-1">{t('oneTimePayment')}</span>
                </div>
              </div>

              {/* Access type selector */}
              {accessOptions.length > 1 && (
                <div className="px-6">
                  <RadioGroup
                    value={selectedAccessType}
                    onValueChange={setSelectedAccessType}
                    className="space-y-2 mb-5"
                  >
                    {accessOptions.map((option) => {
                      const isSelected = selectedAccessType === option.type;
                      return (
                        <label
                          key={option.type}
                          className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#EF672C] bg-[#EF672C]/10'
                              : 'border-border hover:border-border/80 hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={option.type} className="border-muted-foreground data-[state=checked]:border-[#EF672C] data-[state=checked]:text-[#EF672C]" />
                            <span className="text-foreground font-medium text-sm">{option.label}</span>
                          </div>
                          <span className={`font-bold text-sm ${isSelected ? 'text-[#EF672C]' : 'text-muted-foreground'}`}>
                            {formatPrice(calculatePrice(option.type))}
                          </span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>
              )}

              {/* Features */}
              {selectedOption && (
                <div className="px-6 pb-6">
                  <ul className="space-y-2.5 mb-6">
                    {selectedOption.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-[#EF672C] mt-0.5 shrink-0" />
                        <span className="text-foreground text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA button */}
                  <Button
                    className={`w-full py-3 font-bold text-sm rounded-xl transition-all ${
                      isRenewal
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20"
                        : "bg-gradient-to-r from-[#EF672C] to-[#f65928] hover:from-[#d95a25] hover:to-[#e04e20] text-white shadow-lg shadow-[#EF672C]/20"
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
                </div>
              )}
            </div>
          </div>
        )}

        {/* Already purchased link */}
        <div className="text-center mt-8">
          <button
            className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-2 transition-colors"
            onClick={() => navigate("/login-artes")}
          >
            {t('buttons.alreadyBoughtPack', { ns: 'library' })}
          </button>
        </div>
      </div>

      <PagarmeCheckoutModal />
    </div>
  );
};

export default PlanosArtes;
