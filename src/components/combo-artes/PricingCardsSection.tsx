import { Check, Star, Gift, Clock, CreditCard, ShieldCheck, Award, Lock, QrCode } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PreCheckoutModal from "@/components/upscaler/PreCheckoutModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const PRODUCT_SLUG = "pack4lancamento";

const plan = {
  id: "vitalicio",
  title: "Pack Arcano 4\nACESSO VITALÍCIO",
  subtitle: "Lançamento! 🔥",
  originalPrice: "79,90",
  price: "37,00",
  discount: "54% OFF",
  features: [
    "+40 Artes Inéditas",
    "Acesso Vitalício",
    "210 Motions Editáveis",
    "40 Selos 3D",
    "Video Aulas Exclusivas",
    "Bônus Exclusivos",
    "Atualizações Semanais",
    "Suporte via WhatsApp",
    "Área de Membros",
  ],
  bonus: "+40 ARTES DE SÃO JOÃO",
  buttonText: "QUERO ESSAS ARTES INÉDITAS",
};

export const PricingCardsSection = () => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showPreCheckout, setShowPreCheckout] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handlePurchase = async () => {
    // Fire Meta Pixel
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
      return;
    }

    // Check if profile is complete
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
  };

  const handlePaymentMethodSelected = async (method: 'PIX' | 'CREDIT_CARD') => {
    if (!pendingProfile) return;

    setShowPaymentMethodModal(false);
    setIsLoading(true);

    try {
      let utmData: Record<string, string> | null = null;
      try {
        const raw = sessionStorage.getItem('captured_utms');
        if (raw) utmData = JSON.parse(raw);
      } catch { /* ignore */ }

      const body: any = {
        product_slug: PRODUCT_SLUG,
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
        setIsLoading(false);
        return;
      }

      const { checkout_url } = response.data;
      if (checkout_url) {
        window.location.href = checkout_url;
      } else {
        toast.error('Erro ao gerar link de pagamento.');
      }
    } catch (error) {
      console.error('Erro checkout direto:', error);
      toast.error('Erro ao processar. Tente novamente.');
    }
    setIsLoading(false);
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

        {/* Two cards side by side */}
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6 max-w-4xl mx-auto items-stretch">
          {/* Pricing Card */}
          <div className="relative rounded-3xl p-6 md:p-8 flex flex-col bg-gradient-to-br from-[#EF672C]/20 to-[#EF672C]/5 border-2 border-[#EF672C]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[#EF672C] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                <Star className="w-3 h-3 fill-white" />
                LANÇAMENTO
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2 text-center whitespace-pre-line">
              {plan.title}
            </h3>
            <p className="text-gray-400 text-sm text-center mb-6">
              {plan.subtitle}
            </p>
            
            <div className="flex justify-center mb-3">
              <span className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                -{plan.discount}
              </span>
            </div>
            
            <div className="text-center mb-6">
              <p className="text-gray-500 text-sm line-through mb-1">
                De R$ {plan.originalPrice}
              </p>
              <div className="flex items-center justify-center gap-1">
                <span className="text-gray-400 text-lg">R$</span>
                <span className="text-5xl font-black text-white">{plan.price}</span>
              </div>
              <span className="text-gray-500 text-sm">à vista</span>
            </div>
            
            <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-amber-400 text-black text-sm font-bold px-4 py-2 rounded-lg mb-6 flex items-center justify-center gap-2">
              <Gift className="w-4 h-4" />
              {plan.bonus}
            </div>
            
            <ul className="space-y-3 mb-8 flex-grow">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-[#EF672C] flex-shrink-0" />
                  <span className={`text-sm ${index === 0 || index === 1 ? 'font-bold text-white' : ''}`}>{feature}</span>
                </li>
              ))}
            </ul>
            
            <button
              onClick={handlePurchase}
              disabled={isLoading}
              className="w-full font-bold text-lg py-4 rounded-xl transition-all duration-300 bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white shadow-lg shadow-orange-500/30 hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
            >
              {isLoading ? 'Processando...' : plan.buttonText}
            </button>

            {/* Urgency Countdown */}
            <div className="mt-4 flex flex-col items-center gap-1">
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
          </div>

          {/* Guarantee Card */}
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

            <div className="flex-grow space-y-4">
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
      <Dialog open={showPaymentMethodModal} onOpenChange={setShowPaymentMethodModal}>
        <DialogContent className="sm:max-w-md bg-[#1a0a0a] border-[#EF672C]/30">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-bold text-center text-white">
              Escolha a forma de pagamento
            </DialogTitle>
            <DialogDescription className="text-center text-orange-300/70">
              Selecione como deseja pagar
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <button
              onClick={() => handlePaymentMethodSelected('PIX')}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-[#EF672C]/30 bg-[#EF672C]/10 hover:border-green-400/60 hover:bg-green-900/20 transition-all duration-200 group"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <QrCode className="w-7 h-7 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">PIX</span>
              <span className="text-orange-300/50 text-[10px]">Aprovação instantânea</span>
            </button>
            <button
              onClick={() => handlePaymentMethodSelected('CREDIT_CARD')}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-[#EF672C]/30 bg-[#EF672C]/10 hover:border-[#EF672C]/60 hover:bg-[#EF672C]/20 transition-all duration-200 group"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#EF672C] to-[#f65928] flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">Cartão de Crédito</span>
              <span className="text-orange-300/50 text-[10px]">Aprovação instantânea</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PreCheckout Modal */}
      <PreCheckoutModal
        isOpen={showPreCheckout}
        onClose={() => setShowPreCheckout(false)}
        userEmail={userEmail}
        userId={userId}
        productSlug={PRODUCT_SLUG}
      />
    </section>
  );
};
