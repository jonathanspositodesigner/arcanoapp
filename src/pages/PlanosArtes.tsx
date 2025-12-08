import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PlanosArtes = () => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const plans = [
    {
      name: "Artes Básico",
      monthlyPrice: "R$ 19,90",
      yearlyPrice: "R$ 159,00",
      yearlyMonthly: "R$ 13,25/mês",
      features: [
        "Acesso a todas as artes",
        "10 downloads por dia",
        "Artes para eventos",
        "Suporte por email"
      ],
      highlighted: false,
      planType: "artes_basico"
    },
    {
      name: "Artes Pro",
      monthlyPrice: "R$ 39,90",
      yearlyPrice: "R$ 319,00",
      yearlyMonthly: "R$ 26,58/mês",
      features: [
        "Tudo do Básico",
        "24 downloads por dia",
        "Artes exclusivas",
        "Arquivos editáveis (PSD)",
        "Suporte prioritário"
      ],
      highlighted: true,
      planType: "artes_pro"
    },
    {
      name: "Artes Unlimited",
      monthlyPrice: "R$ 69,90",
      yearlyPrice: "R$ 559,00",
      yearlyMonthly: "R$ 46,58/mês",
      features: [
        "Tudo do Pro",
        "Downloads ilimitados",
        "Artes em alta resolução",
        "Templates Canva",
        "Acesso antecipado",
        "Suporte VIP"
      ],
      highlighted: false,
      planType: "artes_unlimited"
    }
  ];

  const handleSelectPlan = (planType: string) => {
    // TODO: Integrate with Greenn payment for artes
    window.open("https://voxvisual.com.br/linksbio/", "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] p-4">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          className="text-white/70 hover:text-white mb-6"
          onClick={() => navigate("/biblioteca-artes")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Biblioteca
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Planos Biblioteca de Artes Arcanas
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Escolha o plano ideal para acessar nossa biblioteca completa de artes para eventos
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <Tabs value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as "monthly" | "yearly")}>
            <TabsList className="bg-[#1a1a2e] border border-[#2d4a5e]/30">
              <TabsTrigger value="monthly" className="data-[state=active]:bg-[#2d4a5e]">
                Mensal
              </TabsTrigger>
              <TabsTrigger value="yearly" className="data-[state=active]:bg-[#2d4a5e]">
                Anual (25% OFF)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative bg-[#1a1a2e]/80 border-[#2d4a5e]/30 ${
                plan.highlighted ? "ring-2 ring-[#2d4a5e] scale-105" : ""
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2d4a5e] text-white px-4 py-1 rounded-full text-sm font-medium">
                  Mais Popular
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-white">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-white">
                    {billingPeriod === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                  </span>
                  <span className="text-white/60 text-sm">
                    /{billingPeriod === "monthly" ? "mês" : "ano"}
                  </span>
                  {billingPeriod === "yearly" && (
                    <p className="text-[#2d4a5e] text-sm mt-1">{plan.yearlyMonthly}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-white/80">
                      <Check className="h-4 w-4 text-[#2d4a5e]" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.highlighted
                      ? "bg-[#2d4a5e] hover:bg-[#3d5a6e]"
                      : "bg-[#2d4a5e]/50 hover:bg-[#2d4a5e]"
                  } text-white`}
                  onClick={() => handleSelectPlan(plan.planType)}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Assinar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button
            variant="link"
            className="text-[#2d4a5e] hover:text-[#3d5a6e]"
            onClick={() => navigate("/login-artes")}
          >
            Já sou premium
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlanosArtes;
