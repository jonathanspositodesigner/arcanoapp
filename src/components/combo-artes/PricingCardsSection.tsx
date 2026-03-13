import { Check, Star, Gift, Clock, CreditCard, ShieldCheck, Award, Lock, X } from "lucide-react";
import { getMetaCookies } from "@/lib/metaCookies";
import { getSanitizedUtms } from "@/lib/utmUtils";
import { useState, useEffect } from "react";
import { useProcessingButton } from "@/hooks/useProcessingButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PreCheckoutModal from "@/components/upscaler/PreCheckoutModal";
import PaymentMethodModal from "@/components/checkout/PaymentMethodModal";

interface PricingFeature {
  text: string;
  disabled?: boolean;
}

interface PricingPlan {
  id: string;
  slug: string;
  title: string;
  accessLabel: string;
  originalPrice: string;
  price: string;
  discount: string;
  features: PricingFeature[];
  bonus?: string;
  highlight?: boolean;
  badge?: string;
  buttonText: string;
}

const plans: PricingPlan[] = [
  {
    id: "6meses",
    slug: "pack4-6meses",
    title: "Pack Arcano 4",
    accessLabel: "ACESSO 6 MESES",
    originalPrice: "49,90",
    price: "27,00",
    discount: "46% OFF",
    features: [
      { text: "+20 Movies para Telão", disabled: true },
      { text: "210 Motions Editáveis", disabled: true },
      { text: "40 Selos 3D", disabled: true },
      { text: "+40 Artes Inéditas" },
      { text: "Acesso por 6 Meses" },
      { text: "Video Aulas Exclusivas" },
      { text: "Atualizações Semanais" },
      { text: "Suporte via WhatsApp" },
      { text: "Área de Membros" },
    ],
    buttonText: "QUERO ACESSO DE 6 MESES",
  },
  {
    id: "1ano",
    slug: "pack4-1ano",
    title: "Pack Arcano 4",
    accessLabel: "ACESSO 1 ANO",
    originalPrice: "59,90",
    price: "37,00",
    discount: "38% OFF",
    features: [
      { text: "+20 Movies para Telão", disabled: true },
      { text: "210 Motions Editáveis" },
      { text: "40 Selos 3D" },
      { text: "+40 Artes Inéditas" },
      { text: "Acesso por 1 Ano" },
      { text: "Video Aulas Exclusivas" },
      { text: "Bônus Exclusivos" },
      { text: "Atualizações Semanais" },
      { text: "Suporte via WhatsApp" },
      { text: "Área de Membros" },
    ],
    buttonText: "QUERO ACESSO DE 1 ANO",
  },
    slug: "pack4lancamento",
    title: "Pack Arcano 4",
    accessLabel: "ACESSO VITALÍCIO",
    originalPrice: "119,90",
    price: "47,00",
    discount: "61% OFF",
    features: [
      { text: "210 Motions Editáveis" },
      { text: "40 Selos 3D" },
      { text: "+40 Artes Inéditas" },
      { text: "Acesso Vitalício" },
      { text: "Video Aulas Exclusivas" },
      { text: "Bônus Exclusivos" },
      { text: "Atualizações Semanais" },
      { text: "Suporte via WhatsApp" },
      { text: "Área de Membros" },
    ],
    bonus: "+20 MOVIES PARA TELÃO",
    highlight: true,
    badge: "MAIS POPULAR",
  },
];

export const PricingCardsSection = () => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showPreCheckout, setShowPreCheckout] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState("pack4lancamento");
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();

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

  useEffect(() => {
    const calculateTimeLeft = () => {
      const deadline = new Date('2026-03-13T15:00:00Z').getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((deadline - now) / 1000));
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePurchase = async (slug: string) => {
    if (!startSubmit()) return;
    setSelectedSlug(slug);

    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "InitiateCheckout", {
        content_name: "Prevenda Pack 4",
        content_category: "Digital Product",
        content_type: "product",
        currency: "BRL",
      });
    }

    if (!userId) {
      setShowPreCheckout(true);
      endSubmit();
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
        setPendingProfile(profile);
        setShowPaymentMethodModal(true);
      } else {
        setShowPreCheckout(true);
      }
    } catch {
      setShowPreCheckout(true);
    }
    endSubmit();
  };

  const handlePaymentMethodSelected = async (method: 'PIX' | 'CREDIT_CARD') => {
    if (!pendingProfile) return;
    if (!startSubmit()) return;

    setIsLoading(true);

    try {
      const utmData = getSanitizedUtms();
      const { fbp, fbc } = getMetaCookies();
      const body: any = {
        product_slug: selectedSlug,
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
        setIsLoading(false);
        setShowPaymentMethodModal(false);
        endSubmit();
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
    setIsLoading(false);
    setShowPaymentMethodModal(false);
    endSubmit();
  };

  return (
    <section id="pricing" className="py-16 px-2 md:px-4 bg-gradient-to-b from-black to-[#0a0505]">
      <div className="max-w-6xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 bg-[#EF672C]/20 text-[#EF672C] text-sm font-medium px-4 py-2 rounded-full border border-[#EF672C]/30">
            <CreditCard className="w-4 h-4" />
            Planos
          </div>
        </div>

        {/* Section title */}
        <h2 className="text-2xl md:text-4xl font-black text-center text-white mb-4">
          Seu bloqueio criativo acaba aqui!
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          Selecione o seu plano e comece a criar artes profissionais hoje mesmo!
        </p>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-6 md:p-8 flex flex-col ${
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
              <p className={`text-sm font-bold text-center mb-4 ${plan.highlight ? "text-[#EF672C]" : "text-gray-400"}`}>
                {plan.accessLabel}
              </p>

              <div className="flex justify-center mb-2">
                <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  -{plan.discount}
                </span>
              </div>

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
                  <li key={index} className={`flex items-center gap-2.5 ${feature.disabled ? 'text-gray-600' : 'text-gray-300'}`}>
                    {feature.disabled ? (
                      <X className="w-4 h-4 flex-shrink-0 text-red-500/70" />
                    ) : (
                      <Check className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-[#EF672C]" : "text-green-500"}`} />
                    )}
                    <span className={`text-sm ${feature.disabled ? 'line-through' : ''} ${!feature.disabled && (index === 0 || index === 1) ? 'font-bold text-white' : ''}`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePurchase(plan.slug)}
                disabled={isLoading || isSubmitting}
                className={`w-full font-bold text-sm py-3.5 rounded-xl transition-all duration-300 disabled:opacity-70 disabled:hover:scale-100 ${
                  plan.highlight
                    ? "bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white shadow-lg shadow-orange-500/30 hover:scale-105"
                    : "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105"
                }`}
              >
                {isLoading && selectedSlug === plan.slug ? 'Processando...' : 'QUERO ESSAS ARTES'}
              </button>
            </div>
          ))}
        </div>

        {/* Countdown - shared */}
        <div className="mt-8 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            <span className="animate-pulse">🚨</span>
            <span>Últimas horas da promoção</span>
            <span className="animate-pulse">🚨</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Clock className="w-3 h-3" />
            <span>Oferta expira em</span>
            <span className="text-[#EF672C] font-semibold font-mono">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Guarantee Card - full width below */}
        <div className="max-w-2xl mx-auto mt-12">
          <div className="relative rounded-3xl p-6 md:p-8 flex flex-col bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-gray-300">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-gray-700 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                <ShieldCheck className="w-3 h-3" />
                GARANTIA
              </span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
              Qual a minha garantia?
            </h3>
            <p className="text-gray-600 text-sm text-center mb-6">
              Sua compra 100% segura
            </p>

            <div className="flex justify-center mb-6">
              <img
                src="https://lp.voxvisual.com.br/wp-content/uploads/2025/09/SELO-GARANTIA.png"
                alt="Garantia de 7 Dias Incondicional"
                className="w-36 md:w-44 h-auto"
                loading="lazy"
              />
            </div>

            <div className="space-y-4">
              <p className="text-gray-700 text-sm leading-relaxed text-center">
                Você tem <span className="font-bold text-gray-900">7 dias de garantia incondicional</span>
              </p>
              <p className="text-gray-600 text-sm leading-relaxed text-center">
                Garantimos sua segurança com uma plataforma de pagamento altamente segura.
              </p>
              <p className="text-gray-600 text-sm leading-relaxed text-center">
                Você também conta com <span className="font-semibold text-gray-700">7 dias de garantia para reembolso</span>
              </p>

              <div className="flex justify-center gap-6 pt-4">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-6 h-6 text-gray-600" />
                  <p className="text-[10px] font-bold text-gray-700">Compra</p>
                  <p className="text-[10px] text-gray-500">Segura</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Award className="w-6 h-6 text-gray-600" />
                  <p className="text-[10px] font-bold text-gray-700">Satisfação</p>
                  <p className="text-[10px] text-gray-500">Garantida</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Lock className="w-6 h-6 text-gray-600" />
                  <p className="text-[10px] font-bold text-gray-700">Privacidade</p>
                  <p className="text-[10px] text-gray-500">Protegida</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Modal */}
      <PaymentMethodModal
        open={showPaymentMethodModal}
        onOpenChange={setShowPaymentMethodModal}
        onSelect={handlePaymentMethodSelected}
        isProcessing={isSubmitting}
        colorScheme="orange"
      />

      {/* PreCheckout Modal */}
      <PreCheckoutModal
        isOpen={showPreCheckout}
        onClose={() => setShowPreCheckout(false)}
        userEmail={userEmail}
        userId={userId}
        productSlug={selectedSlug}
        modalTitle="Já é quase seu!"
        colorScheme="orange"
      />
    </section>
  );
};
