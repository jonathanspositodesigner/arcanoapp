import { Check, X, Star, Gift, Clock, CreditCard } from "lucide-react";
import { getSanitizedUtms } from "@/lib/utmUtils";
import { getMetaCookies } from "@/lib/metaCookies";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProcessingButton } from "@/hooks/useProcessingButton";
import PreCheckoutModal from "@/components/upscaler/PreCheckoutModal";
import PaymentMethodModal from "@/components/checkout/PaymentMethodModal";
import { toast } from "sonner";

interface PricingFeature {
  text: string;
  bold?: boolean;
  unavailable?: boolean;
}

interface PricingPlan {
  id: string;
  title: string;
  accessLabel: string;
  description: string;
  originalPrice: string;
  price: string;
  features: PricingFeature[];
  bonus?: string;
  highlight?: boolean;
  badge?: string;
  buttonText: string;
  productSlug: string;
}

const plans: PricingPlan[] = [
  {
    id: "6meses",
    title: "Pack Arcano Vol. 4",
    accessLabel: "ACESSO 6 MESES",
    description: "Para quem quer começar agora.",
    originalPrice: "47",
    price: "27,00",
    features: [
      { text: "Artes Editáveis PSD e Canva", bold: true },
      { text: "6 Meses de Acesso" },
      { text: "Atualizações Semanais" },
      { text: "Suporte via WhatsApp" },
      { text: "Área de Membros" },
      { text: "+20 Movies para Telão", unavailable: true },
      { text: "210 Motions Editáveis", unavailable: true },
      { text: "40 Selos 3D", unavailable: true },
    ],
    buttonText: "QUERO 6 MESES",
    productSlug: "pack4-6meses",
  },
  {
    id: "1ano",
    title: "Pack Arcano Vol. 4",
    accessLabel: "ACESSO 1 ANO",
    description: "Mais tempo, mais economia.",
    originalPrice: "47",
    price: "37,00",
    features: [
      { text: "Artes Editáveis PSD e Canva", bold: true },
      { text: "1 Ano de Acesso" },
      { text: "Atualizações Semanais" },
      { text: "Suporte via WhatsApp" },
      { text: "Área de Membros" },
      { text: "+20 Movies para Telão", unavailable: true },
      { text: "210 Motions Editáveis", unavailable: true },
      { text: "40 Selos 3D", unavailable: true },
    ],
    buttonText: "QUERO 1 ANO",
    productSlug: "pack4-1ano",
  },
  {
    id: "vitalicio",
    title: "Pack Arcano Vol. 4",
    accessLabel: "ACESSO VITALÍCIO",
    description: "O mais vendido! 🔥",
    originalPrice: "97",
    price: "47,00",
    features: [
      { text: "Artes Editáveis PSD e Canva", bold: true },
      { text: "Acesso Vitalício", bold: true },
      { text: "Atualizações Semanais" },
      { text: "Suporte via WhatsApp" },
      { text: "Área de Membros" },
      { text: "+20 Movies para Telão", bold: true },
      { text: "210 Motions Editáveis", bold: true },
      { text: "40 Selos 3D", bold: true },
    ],
    bonus: "+20 MOVIES PARA TELÃO",
    highlight: true,
    badge: "MAIS VENDIDO",
    buttonText: "QUERO ACESSO VITALÍCIO",
    productSlug: "pack4-vitalicio",
  },
];

export const PricingCardsSectionPack4 = () => {
  const [showPreCheckout, setShowPreCheckout] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [pendingProfile, setPendingProfile] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { isSubmitting: isCheckoutSubmitting, startSubmit: startCheckout, endSubmit: endCheckout } = useProcessingButton();

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

  const handlePurchase = async (productSlug: string) => {
    if (!startCheckout()) return;

    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "InitiateCheckout", {
        content_name: "Prevenda Pack 4",
        content_category: "Digital Product",
        content_type: "product",
        currency: "BRL",
      });
    }

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
      if (typeof window !== 'undefined' && (window as any).fbq && event_id) {
        (window as any).fbq('track', 'InitiateCheckout', {}, { eventID: event_id });
      }
      if (checkout_url) {
        window.location.href = checkout_url;
        return;
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

  return (
    <section id="pricing" className="py-16 px-2 md:px-4 bg-gradient-to-b from-black to-[#0a0505]">
      <div className="max-w-6xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 bg-[#EF672C]/20 text-[#EF672C] text-sm font-medium px-4 py-2 rounded-full border border-[#EF672C]/30">
            <CreditCard className="w-4 h-4" />
            Planos de Lançamento
          </div>
        </div>

        {/* Section title */}
        <h2 className="text-2xl md:text-4xl font-black text-center text-white mb-4">
          Garanta o Pack Arcano Vol. 4 com preço de lançamento!
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          Selecione o seu plano e comece a criar artes profissionais hoje mesmo!
        </p>

        {/* 3 Pricing Cards */}
        <div className="flex flex-col md:grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan) => {
            const mobileOrder: Record<string, number> = { 'vitalicio': 1, '1ano': 2, '6meses': 3 };
            return (
              <div
                key={plan.id}
                style={{ order: mobileOrder[plan.id] ?? 99 }}
                className={`relative rounded-3xl p-6 md:p-8 flex flex-col md:!order-none ${
                  plan.highlight
                    ? "bg-gradient-to-br from-[#EF672C]/20 to-[#EF672C]/5 border-2 border-[#EF672C] scale-[1.02] md:scale-105"
                    : "bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#EF672C] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                      <Star className="w-3 h-3 fill-white" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                <h3 className="text-lg font-bold text-white mb-0.5 text-center">
                  {plan.title}
                </h3>
                <p className={`text-sm font-bold text-center mb-1 ${plan.highlight ? "text-[#EF672C]" : "text-gray-400"}`}>
                  {plan.accessLabel}
                </p>
                <p className="text-xs text-gray-500 text-center mb-4">
                  {plan.description}
                </p>

                <div className="text-center mb-5">
                  <p className="text-gray-500 text-xs line-through mb-0.5">
                    De R$ {plan.originalPrice}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-gray-400 text-base">R$</span>
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                  </div>
                  <span className="text-gray-500 text-xs">à vista</span>
                </div>

                {plan.bonus && (
                  <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-amber-400 text-black text-xs font-bold px-3 py-2 rounded-lg mb-4 flex items-center justify-center gap-2">
                    <Gift className="w-3.5 h-3.5" />
                    {plan.bonus}
                  </div>
                )}

                <ul className="space-y-2.5 mb-6 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className={`flex items-center gap-2.5 ${feature.unavailable ? 'text-gray-600 line-through' : 'text-gray-300'}`}>
                      {feature.unavailable ? (
                        <X className="w-4 h-4 flex-shrink-0 text-red-500" />
                      ) : (
                        <Check className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-[#EF672C]" : "text-green-500"}`} />
                      )}
                      <span className={`text-sm ${feature.bold && !feature.unavailable ? 'font-bold text-white' : ''}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePurchase(plan.productSlug)}
                  disabled={isCheckoutSubmitting}
                  className={`w-full font-bold text-sm py-3.5 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                    plan.highlight
                      ? "bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white shadow-lg shadow-orange-500/30 hover:scale-105"
                      : "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105"
                  }`}
                >
                  {isCheckoutSubmitting ? "Processando..." : plan.buttonText}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* PreCheckout Modal */}
      <PreCheckoutModal
        isOpen={showPreCheckout}
        onClose={() => setShowPreCheckout(false)}
        productSlug={pendingSlug || undefined}
        colorScheme="orange"
      />

      {/* Payment Method Modal */}
      <PaymentMethodModal
        open={showPaymentMethodModal}
        onOpenChange={setShowPaymentMethodModal}
        onSelect={handlePaymentMethodSelected}
        isProcessing={isCheckoutSubmitting}
      />
    </section>
  );
};
