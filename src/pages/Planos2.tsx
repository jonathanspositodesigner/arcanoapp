import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, X, Sparkles, Clock, LogIn } from "lucide-react";
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
import { AnimatedSection, StaggeredAnimation, FadeIn } from "@/hooks/useScrollAnimation";
import { appendUtmToUrl } from "@/lib/utmUtils";
import { useLocale } from "@/contexts/LocaleContext";

const Planos2 = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('prompts');
  const { locale } = useLocale();
  const [billingPeriod, setBillingPeriod] = useState<"mensal" | "anual">("mensal");
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  
  const plans = {
    mensal: [{
      name: "Starter",
      price: "14,90",
      originalPrice: null,
      perMonth: true,
      paymentUrl: "https://payfast.greenn.com.br/148926/offer/bBw6Ql",
      features: [
        { text: t('planos.features.10PromptsDay'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.changeClothesAI'), included: false },
        { text: t('planos.features.changePoseAI'), included: false },
        { text: t('planos.features.upscaleArcano'), included: false },
        { text: t('planos.features.forja3D'), included: false }
      ],
      popular: false,
      promo: false
    }, {
      name: "Pro",
      price: "20,90",
      originalPrice: null,
      perMonth: true,
      paymentUrl: "https://payfast.greenn.com.br/148936/offer/kbgwmH",
      features: [
        { text: t('planos.features.24PromptsDay'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.changeClothesAI'), included: true },
        { text: t('planos.features.changePoseAI'), included: true },
        { text: t('planos.features.upscaleArcano'), included: false },
        { text: t('planos.features.forja3D'), included: false }
      ],
      popular: false,
      promo: false,
      hasTrial: false
    }, {
      name: "IA Unlimited",
      price: "29,90",
      originalPrice: null,
      perMonth: true,
      paymentUrl: "https://payfast.greenn.com.br/148937/offer/Rt5HlW",
      features: [
        { text: t('planos.features.unlimitedPrompts'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.changeClothesAI'), included: true },
        { text: t('planos.features.changePoseAI'), included: true },
        { text: t('planos.features.upscaleArcano'), included: true },
        { text: t('planos.features.forja3D'), included: true }
      ],
      popular: false,
      promo: false,
      bestSeller: true
    }],
    anual: [{
      name: "Starter",
      price: "9,90",
      originalPrice: "14,90",
      perMonth: true,
      yearlyTotal: "118,80",
      paymentUrl: "https://payfast.greenn.com.br/148926/offer/RaLcc5",
      features: [
        { text: t('planos.features.10PromptsDay'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.changeClothesAI'), included: false },
        { text: t('planos.features.changePoseAI'), included: false },
        { text: t('planos.features.upscaleArcano'), included: false },
        { text: t('planos.features.forja3D'), included: false }
      ],
      popular: false,
      promo: false
    }, {
      name: "Pro",
      price: "14,90",
      originalPrice: "20,90",
      perMonth: true,
      yearlyTotal: "178,80",
      paymentUrl: "https://payfast.greenn.com.br/148936/offer/MgExub",
      features: [
        { text: t('planos.features.24PromptsDay'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.changeClothesAI'), included: true },
        { text: t('planos.features.changePoseAI'), included: true },
        { text: t('planos.features.upscaleArcano'), included: false },
        { text: t('planos.features.forja3D'), included: false }
      ],
      popular: false,
      promo: false,
      hasTrial: true
    }, {
      name: "IA Unlimited",
      price: "19,90",
      originalPrice: "29,90",
      perMonth: true,
      yearlyTotal: "238,80",
      paymentUrl: "https://payfast.greenn.com.br/148937/offer/Uqlls1",
      features: [
        { text: t('planos.features.unlimitedPrompts'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.changeClothesAI'), included: true },
        { text: t('planos.features.changePoseAI'), included: true },
        { text: t('planos.features.upscaleArcano'), included: true },
        { text: t('planos.features.forja3D'), included: true }
      ],
      popular: false,
      promo: true,
      bestSeller: true
    }]
  };

  const currentPlans = plans[billingPeriod];
  
  return (
    <div className="min-h-screen bg-[#0D0221]">
      {/* Header */}
      <div className="container mx-auto px-4 py-6 flex justify-between items-center">
        <Button variant="ghost" onClick={() => navigate('/biblioteca-prompts')} className="text-purple-300 hover:text-white hover:bg-purple-500/20">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('planos.back')}
        </Button>
        <Button variant="outline" onClick={() => navigate('/login')} className="gap-2 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-white">
          <LogIn className="w-4 h-4" />
          {t('planos.alreadyPremium')}
        </Button>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-16">
        <AnimatedSection animation="fade-up" className="text-center mb-10" as="div">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
            {t('planos.title')}
          </h1>

          {/* Billing Toggle */}
          <Tabs value={billingPeriod} onValueChange={v => setBillingPeriod(v as "mensal" | "anual")} className="inline-flex">
            <TabsList className="bg-[#1A0A2E] border border-purple-500/30">
              <TabsTrigger value="mensal" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300 px-6">
                {t('planos.monthly')}
              </TabsTrigger>
              <TabsTrigger value="anual" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300 px-6 relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-green-400 font-medium whitespace-nowrap">
                  {t('planos.discount')}
                </span>
                {t('planos.annualInstallments')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </AnimatedSection>

        {/* Discount Banner */}
        <AnimatedSection animation="scale" delay={100} className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-xl lg:rounded-t-xl rounded-xl lg:rounded-b-none text-center max-w-5xl mx-auto py-[13px] px-px my-[20px]" as="div">
          <span className="text-white font-semibold tracking-wide">
            {t('planos.upToDiscount', { percent: billingPeriod === "anual" ? "33" : "25" })}
          </span>
        </AnimatedSection>

        {/* Plans Grid */}
        <StaggeredAnimation 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-0 max-w-5xl mx-auto"
          itemClassName="flex"
          staggerDelay={150}
          animation="fade-up"
        >
          {currentPlans.map((plan, index) => {
            const isBestSeller = (plan as any).bestSeller;
            return (
            <Card key={plan.name} className={`relative p-6 flex flex-col rounded-xl lg:rounded-none bg-[#1A0A2E] w-full ${index === 0 ? "lg:rounded-bl-xl" : ""} ${index === 2 ? "lg:rounded-br-xl" : ""} ${isBestSeller ? "border-2 border-purple-500 shadow-lg shadow-purple-500/30" : "border border-purple-500/20"}`}>
              {isBestSeller && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-0 text-xs whitespace-nowrap bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1">
                  {t('planos.bestSeller')}
                </Badge>
              )}
              {(plan.promo || plan.popular) && !isBestSeller && (
                <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2 border-0 text-xs whitespace-nowrap ${plan.promo ? "bg-orange-500 text-white" : "bg-green-500 text-white"}`}>
                  {plan.promo ? t('planos.launchPromo') : t('planos.popular')}
                </Badge>
              )}

              <div className="text-center mb-4 min-h-[40px] flex items-center justify-center">
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
              </div>

              <div className="text-center mb-6 min-h-[80px]">
                {plan.originalPrice && (
                  <p className="text-purple-400 line-through text-sm">
                    R${plan.originalPrice}{t('planos.perMonth')}
                  </p>
                )}
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-purple-400 text-lg">R$</span>
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-purple-400">{t('planos.perMonth')}</span>
                </div>
                {billingPeriod === "anual" && (plan as any).yearlyTotal && (
                  <p className="text-purple-400 text-sm mt-1">
                    R${(plan as any).yearlyTotal}{t('planos.perYear')}
                  </p>
                )}
              </div>

              <Button 
                onClick={() => window.open(appendUtmToUrl((plan as any).paymentUrl, locale), '_blank')}
                className={`w-full mb-6 ${isBestSeller ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold" : plan.popular ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-900/50 hover:bg-purple-900/70 text-purple-200"}`}
              >
                {(plan as any).hasTrial ? t('planos.freeTrial') : t('planos.subscribe')}
              </Button>

              <ul className="space-y-3 flex-1">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-start gap-2 text-sm">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    )}
                    <span className={feature.included ? "text-purple-200" : "text-orange-500"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.name === "IA Unlimited" && (
                <div className="mt-6 pt-4 border-t border-purple-500/20">
                  <p className="text-xs text-purple-400 mb-2 uppercase tracking-wide">
                    {t('planos.extraBenefits')}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-200">{t('planos.allAIFeatures')}</span>
                  </div>
                </div>
              )}
            </Card>
          );
          })}
        </StaggeredAnimation>
      </div>

      {/* Coming Soon Modal */}
      <Dialog open={showComingSoonModal} onOpenChange={setShowComingSoonModal}>
        <DialogContent className="sm:max-w-md bg-[#1A0A2E] border-purple-500/30">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Clock className="w-8 h-8 text-purple-400" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-white">{t('planos.comingSoon.title')}</DialogTitle>
            <DialogDescription className="text-center text-purple-300">
              {t('planos.comingSoon.description')}
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowComingSoonModal(false)} className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white">
            {t('planos.comingSoon.understood')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Planos2;