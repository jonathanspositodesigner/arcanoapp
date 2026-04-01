import { Check, X, Star, Gift, Clock, CreditCard } from "lucide-react";
import { usePagarmeCheckout } from "@/hooks/usePagarmeCheckout";

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
  const { openCheckout, isLoading: isCheckoutSubmitting, MPCheckoutModal } = useMPCheckout({ source_page: "prevenda-pack4" });

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
      </div>

      <MPCheckoutModal />
    </section>
  );
};
