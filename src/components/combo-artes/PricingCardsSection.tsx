import { Check, Star, Gift, Clock, CreditCard, ShieldCheck, Award, Lock } from "lucide-react";
import { appendUtmToUrl } from "@/lib/utmUtils";
import { useState, useEffect } from "react";

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
  checkoutUrl: "https://payfast.greenn.com.br/135338/offer/0r2gUj?ch_id=23924&b_id_1=103023&b_offer_1=fMHdgE",
  buttonText: "QUERO ESSAS ARTES INÉDITAS",
};

export const PricingCardsSection = () => {
  const [timeLeft, setTimeLeft] = useState(0);

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

  const handlePurchase = (checkoutUrl: string) => {
    const urlWithUtm = appendUtmToUrl(checkoutUrl);
    
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "InitiateCheckout", {
        content_name: "Combo Artes Arcanas",
        content_category: "Digital Product",
        content_type: "product",
        currency: "BRL",
      });
    }
    
    window.open(urlWithUtm, "_blank");
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
              onClick={() => handlePurchase(plan.checkoutUrl)}
              className="w-full font-bold text-lg py-4 rounded-xl transition-all duration-300 bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white shadow-lg shadow-orange-500/30 hover:scale-105"
            >
              {plan.buttonText}
            </button>
          </div>

          {/* Guarantee Card */}
          <div className="relative rounded-3xl p-6 md:p-8 flex flex-col bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-gray-300">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[#EF672C] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                <ShieldCheck className="w-3 h-3" />
                GARANTIA
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 text-center">
              Qual a minha garantia?
            </h3>
            <p className="text-gray-400 text-sm text-center mb-6">
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

            <div className="flex-grow space-y-4 mb-8">
              <p className="text-gray-300 text-sm leading-relaxed text-center">
                Você tem <span className="font-bold text-white">7 dias de garantia incondicional</span>
              </p>
              
              <p className="text-gray-400 text-sm leading-relaxed text-center">
                Garantimos sua segurança com a Greenn, uma plataforma de pagamento altamente segura.
              </p>
              
              <p className="text-gray-400 text-sm leading-relaxed text-center">
                Você também conta com <span className="font-semibold text-gray-300">7 dias de garantia para reembolso</span>
              </p>

              <div className="flex justify-center gap-6 pt-4">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-6 h-6 text-[#EF672C]" />
                  <p className="text-[10px] font-bold text-gray-300">Compra</p>
                  <p className="text-[10px] text-gray-400">Segura</p>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                  <Award className="w-6 h-6 text-[#EF672C]" />
                  <p className="text-[10px] font-bold text-gray-300">Satisfação</p>
                  <p className="text-[10px] text-gray-400">Garantida</p>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                  <Lock className="w-6 h-6 text-[#EF672C]" />
                  <p className="text-[10px] font-bold text-gray-300">Privacidade</p>
                  <p className="text-[10px] text-gray-400">Protegida</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => handlePurchase(plan.checkoutUrl)}
              className="w-full font-bold text-lg py-4 rounded-xl transition-all duration-300 bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 hover:scale-105 flex items-center justify-center gap-2"
            >
              <Lock className="w-5 h-5" />
              COMPRAR COM SEGURANÇA
            </button>
          </div>
        </div>

        {/* Urgency Countdown Section */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-white text-base md:text-lg font-medium">
            <span className="animate-pulse">🚨</span>
            <span>Últimas horas da promoção</span>
            <span className="animate-pulse">🚨</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Clock className="w-4 h-4" />
            <span>Oferta expira em</span>
            <span className="text-[#EF672C] font-semibold font-mono">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};