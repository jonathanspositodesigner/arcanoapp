import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Sparkles, Clock, LogIn, UserPlus, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import baaLogo from "@/assets/BAA.png";

const PlanosArtesMusicos = () => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<"mensal" | "anual">("mensal");
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  
  const plans = {
    mensal: [{
      name: "Básico",
      price: "19,90",
      originalPrice: null,
      perMonth: true,
      paymentUrl: "https://payfast.greenn.com.br/redirect/250806?utm_source=aplicativo&utm_medium=aplicativo&utm_campaign=aplicativo&utm_id=aplicativo",
      features: [{
        text: "5 downloads por dia",
        included: true,
        bold: true
      }, {
        text: "Acesso as artes editáveis",
        included: true
      }, {
        text: "Atualizações semanais",
        included: true
      }, {
        text: "Suporte via WhatsApp",
        included: true
      }, {
        text: "Modelos de Telões de LED",
        included: false
      }, {
        text: "Ferramentas de IA",
        included: false
      }],
      popular: false,
      promo: false
    }, {
      name: "Pro",
      price: "29,90",
      originalPrice: null,
      perMonth: true,
      paymentUrl: "https://payfast.greenn.com.br/redirect/250834?utm_source=aplicativo&utm_medium=aplicativo&utm_campaign=aplicativo&utm_id=aplicativo",
      features: [{
        text: "10 downloads por dia",
        included: true,
        bold: true
      }, {
        text: "Acesso as artes editáveis",
        included: true
      }, {
        text: "Atualizações semanais",
        included: true
      }, {
        text: "Suporte via WhatsApp",
        included: true
      }, {
        text: "Modelos de Telões de LED",
        included: true
      }, {
        text: "Ferramentas de IA",
        included: false
      }],
      popular: false,
      promo: false,
      hasTrial: false
    }, {
      name: "Unlimited",
      price: "39,90",
      originalPrice: "49,90",
      perMonth: true,
      paymentUrl: "https://payfast.greenn.com.br/redirect/250836?utm_source=aplicativo&utm_medium=aplicativo&utm_campaign=aplicativo&utm_id=aplicativo",
      features: [{
        text: "Downloads ilimitados",
        included: true,
        bold: true
      }, {
        text: "Acesso as artes editáveis",
        included: true
      }, {
        text: "Atualizações semanais",
        included: true
      }, {
        text: "Suporte via WhatsApp",
        included: true
      }, {
        text: "Modelos de Telões de LED",
        included: true
      }, {
        text: "Ferramentas de IA",
        included: true
      }],
      popular: false,
      promo: true
    }],
    anual: [{
      name: "Básico",
      price: "14,90",
      originalPrice: "19,90",
      perMonth: true,
      yearlyTotal: "178,80",
      paymentUrl: "https://payfast.greenn.com.br/redirect/250807?utm_source=aplicativo&utm_medium=aplicativo&utm_campaign=aplicativo&utm_id=aplicativo",
      features: [{
        text: "5 downloads por dia",
        included: true,
        bold: true
      }, {
        text: "Acesso as artes editáveis",
        included: true
      }, {
        text: "Atualizações semanais",
        included: true
      }, {
        text: "Suporte via WhatsApp",
        included: true
      }, {
        text: "Modelos de Telões de LED",
        included: false
      }, {
        text: "Ferramentas de IA",
        included: false
      }],
      popular: false,
      promo: false
    }, {
      name: "Pro",
      price: "22,90",
      originalPrice: "29,90",
      perMonth: true,
      yearlyTotal: "274,80",
      paymentUrl: "https://payfast.greenn.com.br/redirect/250835?utm_source=aplicativo&utm_medium=aplicativo&utm_campaign=aplicativo&utm_id=aplicativo",
      features: [{
        text: "10 downloads por dia",
        included: true,
        bold: true
      }, {
        text: "Acesso as artes editáveis",
        included: true
      }, {
        text: "Atualizações semanais",
        included: true
      }, {
        text: "Suporte via WhatsApp",
        included: true
      }, {
        text: "Modelos de Telões de LED",
        included: true
      }, {
        text: "Ferramentas de IA",
        included: false
      }],
      popular: false,
      promo: false,
      hasTrial: true
    }, {
      name: "Unlimited",
      price: "29,90",
      originalPrice: "49,90",
      perMonth: true,
      yearlyTotal: "358,80",
      paymentUrl: "https://payfast.greenn.com.br/redirect/250837?utm_source=aplicativo&utm_medium=aplicativo&utm_campaign=aplicativo&utm_id=aplicativo",
      features: [{
        text: "Downloads ilimitados",
        included: true,
        bold: true
      }, {
        text: "Acesso as artes editáveis",
        included: true
      }, {
        text: "Atualizações semanais",
        included: true
      }, {
        text: "Suporte via WhatsApp",
        included: true
      }, {
        text: "Modelos de Telões de LED",
        included: true
      }, {
        text: "Ferramentas de IA",
        included: true
      }],
      popular: false,
      promo: true
    }]
  };

  const currentPlans = plans[billingPeriod];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1a2e] to-[#16213e]">
      {/* Header */}
      <div className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/biblioteca-artes-musicos')} 
            className="text-violet-300 hover:text-violet-100 hover:bg-violet-500/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <img src={baaLogo} alt="BAA" className="h-8 hidden sm:block" />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/login-artes')} 
            className="gap-2 border-violet-500/30 text-violet-300 hover:bg-violet-500/20 hover:text-violet-100"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Já sou assinante</span>
            <span className="sm:hidden">Entrar</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
            ESCOLHA O MELHOR PLANO PARA VOCÊ
          </h1>

          {/* Billing Toggle */}
          <Tabs value={billingPeriod} onValueChange={v => setBillingPeriod(v as "mensal" | "anual")} className="inline-flex">
            <TabsList className="bg-violet-500/10 border border-violet-500/30">
              <TabsTrigger 
                value="mensal" 
                className="data-[state=active]:bg-violet-600 data-[state=active]:text-white px-6 text-violet-300"
              >
                MENSAL
              </TabsTrigger>
              <TabsTrigger 
                value="anual" 
                className="data-[state=active]:bg-violet-600 data-[state=active]:text-white px-6 text-violet-300 relative"
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-green-400 font-medium whitespace-nowrap">
                  +Desconto
                </span>
                ANUAL PARCELADO
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Discount Banner */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-t-xl lg:rounded-t-xl rounded-xl lg:rounded-b-none text-center max-w-5xl mx-auto py-[13px] px-px my-[20px]">
          <span className="text-white font-semibold tracking-wide">
            ATÉ {billingPeriod === "anual" ? "40" : "20"}% DE DESCONTO
          </span>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-0 max-w-5xl mx-auto">
          {currentPlans.map((plan, index) => (
            <Card 
              key={plan.name} 
              className={`relative bg-[#1a1a2e] border-violet-500/20 p-6 flex flex-col rounded-xl lg:rounded-none ${
                index === 0 ? "lg:rounded-bl-xl" : ""
              } ${index === 2 ? "lg:rounded-br-xl" : ""} ${
                plan.popular ? "border-2 border-violet-500" : ""
              }`}
            >
              {/* Badge above card - Promo or Popular */}
              {(plan.promo || plan.popular) && (
                <Badge 
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 border-0 text-xs whitespace-nowrap ${
                    plan.promo ? "bg-orange-500 text-white" : "bg-emerald-500 text-white"
                  }`}
                >
                  {plan.promo ? "PROMOÇÃO DE LANÇAMENTO" : "Popular"}
                </Badge>
              )}

              {/* Plan Name */}
              <div className="text-center mb-4 min-h-[40px] flex items-center justify-center">
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
              </div>

              {/* Price */}
              <div className="text-center mb-6 min-h-[80px]">
                {plan.originalPrice && (
                  <p className="text-violet-300/60 line-through text-sm">
                    R${plan.originalPrice}/mês
                  </p>
                )}
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-violet-300 text-lg">R$</span>
                  <span className="text-4xl font-bold text-white">
                    {plan.price}
                  </span>
                  <span className="text-violet-300">/mês</span>
                </div>
                {billingPeriod === "anual" && (plan as any).yearlyTotal && (
                  <p className="text-violet-400 text-sm mt-1">
                    R${(plan as any).yearlyTotal}/ano
                  </p>
                )}
              </div>

              {/* CTA Button */}
              <Button 
                onClick={() => {
                  if ((plan as any).paymentUrl === "#") {
                    setShowComingSoonModal(true);
                  } else {
                    window.open((plan as any).paymentUrl, '_blank');
                  }
                }}
                className={`w-full mb-6 ${
                  plan.popular 
                    ? "bg-violet-600 hover:bg-violet-500 text-white" 
                    : "bg-violet-500/20 hover:bg-violet-500/30 text-violet-100"
                }`}
              >
                {(plan as any).hasTrial ? "Teste grátis por 7 dias" : "Assinar"}
              </Button>

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {plan.features.map((feature, fIndex) => {
                  const isLedFeature = feature.text.includes("Telões de LED");
                  return (
                    <li key={fIndex} className="flex items-start gap-2 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                      )}
                      <span className={`${feature.included ? "text-violet-100" : "text-orange-500"} ${(feature as any).bold ? "font-bold" : ""}`}>
                        {feature.text}
                      </span>
                      {isLedFeature && !feature.included && (
                        <Badge className="ml-1 bg-amber-600 text-white text-[10px] px-1.5 py-0 h-4 border-0">
                          Pro+
                        </Badge>
                      )}
                      {isLedFeature && feature.included && (
                        <Monitor className="w-3 h-3 text-amber-400 shrink-0 ml-1" />
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Extra Benefits for Unlimited */}
              {plan.name === "Unlimited" && (
                <div className="mt-6 pt-4 border-t border-violet-500/20">
                  <p className="text-xs text-violet-300/60 mb-2 uppercase tracking-wide">
                    Benefícios extras do plano:
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-violet-100">Todos os recursos liberados</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* LED Feature Callout */}
        <div className="max-w-5xl mx-auto mt-8">
          <div className="bg-gradient-to-r from-amber-600/20 to-violet-600/20 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Monitor className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold flex flex-wrap items-center gap-2">
                Modelos de Telões de LED
                <Badge className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 border-0">
                  Exclusivo Pro+
                </Badge>
              </h3>
              <p className="text-violet-200/70 text-sm mt-1">
                Acesse nossa biblioteca de modelos para telões de LED exclusivos para shows e eventos. 
                Disponível apenas nos planos Pro e Unlimited.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Modal */}
      <Dialog open={showComingSoonModal} onOpenChange={setShowComingSoonModal}>
        <DialogContent className="sm:max-w-md bg-[#1a1a2e] border-violet-500/30">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Clock className="w-8 h-8 text-violet-400" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-white">Em Breve</DialogTitle>
            <DialogDescription className="text-center text-violet-200/70">
              Estamos trabalhando para disponibilizar os planos de assinatura em breve. Fique atento às novidades!
            </DialogDescription>
          </DialogHeader>
          <Button 
            onClick={() => setShowComingSoonModal(false)} 
            className="w-full mt-4 bg-violet-600 hover:bg-violet-500 text-white"
          >
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanosArtesMusicos;
