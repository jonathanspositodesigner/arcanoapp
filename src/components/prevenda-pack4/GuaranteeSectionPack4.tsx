import { useState, useEffect } from "react";
import { ShieldCheck, Award, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProcessingButton } from "@/hooks/useProcessingButton";
import PreCheckoutModal from "@/components/upscaler/PreCheckoutModal";
import PaymentMethodModal from "@/components/checkout/PaymentMethodModal";
import { getSanitizedUtms } from "@/lib/utmUtils";
import { getMetaCookies } from "@/lib/metaCookies";
import { toast } from "sonner";

const PRODUCT_SLUG = "pack4-vitalicio";

export const GuaranteeSectionPack4 = () => {
  const [showPreCheckout, setShowPreCheckout] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
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

  const handlePurchase = async () => {
    if (!startCheckout()) return;

    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "InitiateCheckout", {
        content_name: "Pack Arcano Vol. 4 - Garantia",
        content_category: "Digital Product",
        content_type: "product",
        currency: "BRL",
      });
    }

    if (!userId) {
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
        setPendingProfile(profile);
        setShowPaymentMethodModal(true);
      } else {
        setShowPreCheckout(true);
      }
    } catch {
      // fallback
    }
    endCheckout();
  };

  const handlePaymentMethodSelected = async (method: 'PIX' | 'CREDIT_CARD') => {
    if (!pendingProfile) return;
    if (!startCheckout()) return;

    try {
      const utmData = getSanitizedUtms();
      const { fbp, fbc } = getMetaCookies();
      const body: any = {
        product_slug: PRODUCT_SLUG,
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

      const response = await invokeCheckout(body);

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
    <section className="py-16 px-4 bg-gradient-to-b from-black to-[#0a0505]">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl p-6 md:p-12 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-shrink-0">
              <img 
                src="https://lp.voxvisual.com.br/wp-content/uploads/2025/09/SELO-GARANTIA.png" 
                alt="Garantia de 7 Dias Incondicional" 
                className="w-48 md:w-72 h-auto"
                loading="lazy"
              />
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-4xl font-black text-gray-900 mb-4">
                Qual a minha garantia?
              </h2>
              
              <p className="text-lg md:text-xl text-gray-700 font-medium mb-4">
                Você tem <span className="font-bold">7 dias de garantia incondicional</span>
              </p>
              
              <p className="text-gray-600 mb-3 leading-relaxed">
                Garantimos sua segurança com uma plataforma de pagamento altamente segura.
              </p>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                Você também conta com <span className="font-semibold">7 dias de garantia para reembolso</span>
              </p>
              
              <button
                onClick={handlePurchase}
                disabled={isCheckoutSubmitting}
                className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white font-bold text-base md:text-lg px-6 md:px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 mx-auto md:mx-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lock className="w-5 h-5 flex-shrink-0" />
                {isCheckoutSubmitting ? "PROCESSANDO..." : "COMPRAR COM SEGURANÇA"}
              </button>
              
              <div className="flex justify-center md:justify-start gap-3 md:gap-6 mt-6">
                <div className="flex items-center gap-1 md:gap-2 text-gray-700">
                  <ShieldCheck className="w-4 h-4 md:w-6 md:h-6 text-gray-600 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] md:text-xs font-bold leading-tight">Compra</p>
                    <p className="text-[10px] md:text-xs leading-tight">Segura</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 md:gap-2 text-gray-700">
                  <Award className="w-4 h-4 md:w-6 md:h-6 text-gray-600 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] md:text-xs font-bold leading-tight">Satisfação</p>
                    <p className="text-[10px] md:text-xs leading-tight">Garantida</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 md:gap-2 text-gray-700">
                  <Lock className="w-4 h-4 md:w-6 md:h-6 text-gray-600 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] md:text-xs font-bold leading-tight">Privacidade</p>
                    <p className="text-[10px] md:text-xs leading-tight">Protegida</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PreCheckoutModal
        isOpen={showPreCheckout}
        onClose={() => setShowPreCheckout(false)}
        productSlug={PRODUCT_SLUG}
      />

      <PaymentMethodModal
        open={showPaymentMethodModal}
        onOpenChange={setShowPaymentMethodModal}
        onSelect={handlePaymentMethodSelected}
        isProcessing={isCheckoutSubmitting}
        colorScheme="orange"
      />
    </section>
  );
};
