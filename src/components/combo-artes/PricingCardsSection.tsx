import { useState, useEffect } from "react";
import { Check, Star, Gift, Clock, CreditCard } from "lucide-react";
import { usePagarmeCheckout } from "@/hooks/usePagarmeCheckout";

interface PricingFeature {
  text: string;
  bold?: boolean;
}

interface PricingPlan {
  id: string;
  title: string;
  accessLabel: string;
  description: string;
  originalPrice: string;
  price: string;
  discount: string;
  features: PricingFeature[];
  bonus?: string;
  highlight?: boolean;
  badge?: string;
  buttonText: string;
  productSlug: string;
}

const plans: PricingPlan[] = [
  {
    id: "pack1",
    title: "Pack Arcano Vol.1",
    accessLabel: "ACESSO 1 ANO",
    description: "Para quem quer começar com qualidade.",
    originalPrice: "37",
    price: "27,90",
    discount: "24% OFF",
    features: [
      { text: "+55 Artes Editáveis", bold: true },
      { text: "1 Ano de Acesso" },
      { text: "210 Motions Editáveis" },
      { text: "40 Selos 3D" },
      { text: "Video Aulas Exclusivas" },
      { text: "Bônus Exclusivos" },
      { text: "Atualizações Semanais" },
      { text: "Suporte via WhatsApp" },
      { text: "Área de Membros" },
    ],
    buttonText: "QUERO SÓ O PACK VOL.1",
    productSlug: "combo-vol1-1ano",
  },
  {
    id: "pack1e2",
    title: "Packs Arcano 1 e 2",
    accessLabel: "ACESSO 1 ANO",
    description: "Para quem quer mais economia e mais vantagem.",
    originalPrice: "74",
    price: "49,90",
    discount: "33% OFF",
    features: [
      { text: "+110 Artes Editáveis", bold: true },
      { text: "1 Ano de Acesso" },
      { text: "210 Motions Editáveis" },
      { text: "40 Selos 3D" },
      { text: "Video Aulas Exclusivas" },
      { text: "Bônus Exclusivos" },
      { text: "Atualizações Semanais" },
      { text: "Suporte via WhatsApp" },
      { text: "Área de Membros" },
    ],
    buttonText: "QUERO OS PACKS VOL.1 E 2",
    productSlug: "combo-1e2-1ano",
  },
  {
    id: "pack1ao3",
    title: "Pack Arcano 1 ao 3",
    accessLabel: "ACESSO VITALÍCIO",
    description: "O mais vendido! 🔥",
    originalPrice: "141",
    price: "59,90",
    discount: "58% OFF",
    features: [
      { text: "+210 Artes Editáveis", bold: true },
      { text: "Acesso Vitalício", bold: true },
      { text: "210 Motions Editáveis" },
      { text: "40 Selos 3D" },
      { text: "Video Aulas Exclusivas" },
      { text: "Bônus Exclusivos" },
      { text: "Atualizações Semanais" },
      { text: "Suporte via WhatsApp" },
      { text: "Área de Membros" },
    ],
    bonus: "+20 MOVIES PARA TELÃO",
    highlight: true,
    badge: "MAIS VENDIDO",
    buttonText: "QUERO OS PACKS 1 AO 3",
    productSlug: "combo-1ao3-vitalicio",
  },
];

export const PricingCardsSection = () => {
  const [timeLeft, setTimeLeft] = useState(0);
  const { openCheckout, isLoading: isCheckoutSubmitting, PagarmeCheckoutModal } = usePagarmeCheckout({ source_page: "combo-artes" });

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
        <div className="flex flex-col md:grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan) => {
            const mobileOrder: Record<string, number> = { 'pack1ao3': 1, 'pack1e2': 2, 'pack1': 3 };
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
                  <li key={index} className="flex items-center gap-2.5 text-gray-300">
                    <Check className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-[#EF672C]" : "text-green-500"}`} />
                    <span className={`text-sm ${feature.bold ? 'font-bold text-white' : ''}`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => openCheckout(plan.productSlug)}
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
      </div>

      <PagarmeCheckoutModal />
    </section>
  );
};
