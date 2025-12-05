import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const Planos = () => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<"mensal" | "anual">("mensal");

  const plans = {
    mensal: [
      {
        name: "ARCANO BÁSICO",
        price: "14,90",
        originalPrice: null,
        perMonth: true,
        features: [
          { text: "10 prompts premium por dia", included: true },
          { text: "Acesso a todo conteúdo premium", included: true },
          { text: "Arcano Academy - Mini curso de IA", included: true },
          { text: "Atualizações diárias", included: true },
          { text: "Liberação imediata", included: true },
          { text: "Suporte exclusivo via WhatsApp", included: true },
          { text: "IA que muda a roupa", included: false },
          { text: "IA que muda pose", included: false },
          { text: "Upscale Arcano", included: false },
          { text: "Forja de Selos 3D", included: false },
        ],
        popular: false,
        promo: false,
      },
      {
        name: "ARCANO PRO",
        price: "20,90",
        originalPrice: null,
        perMonth: true,
        features: [
          { text: "24 prompts premium por dia", included: true },
          { text: "Acesso a todo conteúdo premium", included: true },
          { text: "Arcano Academy - Mini curso de IA", included: true },
          { text: "Atualizações diárias", included: true },
          { text: "Liberação imediata", included: true },
          { text: "Suporte exclusivo via WhatsApp", included: true },
          { text: "IA que muda a roupa", included: true },
          { text: "IA que muda pose", included: true },
          { text: "Upscale Arcano", included: false },
          { text: "Forja de Selos 3D", included: false },
        ],
        popular: true,
        promo: false,
      },
      {
        name: "ARCANO IA UNLIMITED",
        price: "24,90",
        originalPrice: "29,90",
        perMonth: true,
        features: [
          { text: "Prompts premium ilimitados", included: true },
          { text: "Acesso a todo conteúdo premium", included: true },
          { text: "Arcano Academy - Mini curso de IA", included: true },
          { text: "Atualizações diárias", included: true },
          { text: "Liberação imediata", included: true },
          { text: "Suporte exclusivo via WhatsApp", included: true },
          { text: "IA que muda a roupa", included: true },
          { text: "IA que muda pose", included: true },
          { text: "Upscale Arcano", included: true },
          { text: "Forja de Selos 3D", included: true },
        ],
        popular: false,
        promo: true,
      },
    ],
    anual: [
      {
        name: "ARCANO BÁSICO",
        price: "9,90",
        originalPrice: null,
        perMonth: true,
        yearlyTotal: "118,80",
        features: [
          { text: "10 prompts premium por dia", included: true },
          { text: "Acesso a todo conteúdo premium", included: true },
          { text: "Arcano Academy - Mini curso de IA", included: true },
          { text: "Atualizações diárias", included: true },
          { text: "Liberação imediata", included: true },
          { text: "Suporte exclusivo via WhatsApp", included: true },
          { text: "IA que muda a roupa", included: false },
          { text: "IA que muda pose", included: false },
          { text: "Upscale Arcano", included: false },
          { text: "Forja de Selos 3D", included: false },
        ],
        popular: false,
        promo: false,
      },
      {
        name: "ARCANO PRO",
        price: "14,90",
        originalPrice: null,
        perMonth: true,
        yearlyTotal: "178,80",
        features: [
          { text: "24 prompts premium por dia", included: true },
          { text: "Acesso a todo conteúdo premium", included: true },
          { text: "Arcano Academy - Mini curso de IA", included: true },
          { text: "Atualizações diárias", included: true },
          { text: "Liberação imediata", included: true },
          { text: "Suporte exclusivo via WhatsApp", included: true },
          { text: "IA que muda a roupa", included: true },
          { text: "IA que muda pose", included: true },
          { text: "Upscale Arcano", included: false },
          { text: "Forja de Selos 3D", included: false },
        ],
        popular: true,
        promo: false,
      },
      {
        name: "ARCANO IA UNLIMITED",
        price: "19,90",
        originalPrice: "29,90",
        perMonth: true,
        yearlyTotal: "238,80",
        features: [
          { text: "Prompts premium ilimitados", included: true },
          { text: "Acesso a todo conteúdo premium", included: true },
          { text: "Arcano Academy - Mini curso de IA", included: true },
          { text: "Atualizações diárias", included: true },
          { text: "Liberação imediata", included: true },
          { text: "Suporte exclusivo via WhatsApp", included: true },
          { text: "IA que muda a roupa", included: true },
          { text: "IA que muda pose", included: true },
          { text: "Upscale Arcano", included: true },
          { text: "Forja de Selos 3D", included: true },
        ],
        popular: false,
        promo: true,
      },
    ],
  };

  const currentPlans = plans[billingPeriod];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            ESCOLHA O MELHOR PLANO PARA VOCÊ
          </h1>

          {/* Billing Toggle */}
          <Tabs
            value={billingPeriod}
            onValueChange={(v) => setBillingPeriod(v as "mensal" | "anual")}
            className="inline-flex"
          >
            <TabsList className="bg-muted/50 border border-border">
              <TabsTrigger
                value="mensal"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground px-6"
              >
                MENSAL
              </TabsTrigger>
              <TabsTrigger
                value="anual"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground px-6 relative"
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-green-500 font-medium whitespace-nowrap">
                  +Desconto
                </span>
                ANUAL PARCELADO
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Discount Banner */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-t-xl lg:rounded-t-xl rounded-xl lg:rounded-b-none py-3 text-center max-w-5xl mx-auto">
          <span className="text-primary-foreground font-semibold tracking-wide">
            ATÉ {billingPeriod === "anual" ? "33" : "25"}% DE DESCONTO
          </span>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-0 max-w-5xl mx-auto">
          {currentPlans.map((plan, index) => (
            <Card
              key={plan.name}
              className={`relative bg-card border-border p-6 flex flex-col rounded-xl lg:rounded-none ${
                index === 0 ? "lg:rounded-bl-xl" : ""
              } ${index === 2 ? "lg:rounded-br-xl" : ""} ${
                plan.popular ? "border-2 border-primary" : ""
              }`}
            >
              {/* Badge above card - Promo or Popular */}
              {(plan.promo || plan.popular) && (
                <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2 border-0 text-xs whitespace-nowrap ${
                  plan.promo 
                    ? "bg-orange-500 text-white" 
                    : "bg-emerald-500 text-white"
                }`}>
                  {plan.promo ? "PROMOÇÃO DE LANÇAMENTO" : "Popular"}
                </Badge>
              )}

              {/* Plan Name */}
              <div className="text-center mb-4 min-h-[40px] flex items-center justify-center">
                <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
              </div>

              {/* Price */}
              <div className="text-center mb-6 min-h-[80px]">
                {plan.originalPrice && (
                  <p className="text-muted-foreground line-through text-sm">
                    R${plan.originalPrice}/mês
                  </p>
                )}
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-muted-foreground text-lg">R$</span>
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                {billingPeriod === "anual" && (plan as any).yearlyTotal && (
                  <p className="text-primary text-sm mt-1">
                    R${(plan as any).yearlyTotal}/ano
                  </p>
                )}
              </div>

              {/* CTA Button */}
              <Button
                className={`w-full mb-6 ${
                  plan.popular
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                {plan.popular ? "Teste grátis por 7 dias" : "Assinar"}
              </Button>

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-start gap-2 text-sm">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    )}
                    <span
                      className={
                        feature.included
                          ? "text-foreground"
                          : "text-orange-500"
                      }
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Extra Benefits for Unlimited */}
              {plan.name === "ARCANO IA UNLIMITED" && (
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                    Benefícios extras do plano:
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-foreground">Todos os recursos de IA</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Planos;
