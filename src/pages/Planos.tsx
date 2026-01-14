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

const Planos = () => {
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
        { text: t('planos.features.arcanoAcademy'), included: true },
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
        { text: t('planos.features.arcanoAcademy'), included: true },
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.changeClothesAI'), included: true },
        { text: t('planos.features.changePoseAI'), included: true },
        { text: t('planos.features.upscaleArcano'), included: false },
        { text: t('planos.features.forja3D'), included: false }
      ],
      popular: true,
      promo: false,
      hasTrial: false
    }, {
      name: "IA Unlimited",
      price: "24,90",
      originalPrice: "29,90",
      perMonth: true,
      paymentUrl: "https://payfast.greenn.com.br/148937/offer/CiCenB",
      features: [
        { text: t('planos.features.unlimitedPrompts'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: t('planos.features.arcanoAcademy'), included: true },
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.changeClothesAI'), included: true },
        { text: t('planos.features.changePoseAI'), included: true },
        { text: t('planos.features.upscaleArcano'), included: true },
        { text: t('planos.features.forja3D'), included: true }
      ],
      popular: false,
      promo: true
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
        { text: t('planos.features.arcanoAcademy'), included: true },
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
        { text: t('planos.features.arcanoAcademy'), included: true },
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.changeClothesAI'), included: true },
        { text: t('planos.features.changePoseAI'), included: true },
        { text: t('planos.features.upscaleArcano'), included: false },
        { text: t('planos.features.forja3D'), included: false }
      ],
      popular: true,
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
        { text: t('planos.features.arcanoAcademy'), included: true },
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.changeClothesAI'), included: true },
        { text: t('planos.features.changePoseAI'), included: true },
        { text: t('planos.features.upscaleArcano'), included: true },
        { text: t('planos.features.forja3D'), included: true }
      ],
      popular: false,
      promo: true
    }]
  };

  const currentPlans = plans[billingPeriod];
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="container mx-auto px-4 py-6 flex justify-between items-center">
        <Button variant="ghost" onClick={() => navigate('/biblioteca-prompts')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('planos.back')}
        </Button>
        <Button variant="outline" onClick={() => navigate('/login')} className="gap-2">
          <LogIn className="w-4 h-4" />
          {t('planos.alreadyPremium')}
        </Button>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-16">
        <AnimatedSection animation="fade-up" className="text-center mb-10" as="div">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            {t('planos.title')}
          </h1>

          {/* Billing Toggle */}
          <Tabs value={billingPeriod} onValueChange={v => setBillingPeriod(v as "mensal" | "anual")} className="inline-flex">
            <TabsList className="bg-muted/50 border border-border">
              <TabsTrigger value="mensal" className="data-[state=active]:bg-background data-[state=active]:text-foreground px-6">
                {t('planos.monthly')}
              </TabsTrigger>
              <TabsTrigger value="anual" className="data-[state=active]:bg-background data-[state=active]:text-foreground px-6 relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-green-500 font-medium whitespace-nowrap">
                  {t('planos.discount')}
                </span>
                {t('planos.annualInstallments')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </AnimatedSection>

        {/* Discount Banner */}
        <AnimatedSection animation="scale" delay={100} className="bg-gradient-to-r from-primary to-primary/80 rounded-t-xl lg:rounded-t-xl rounded-xl lg:rounded-b-none text-center max-w-5xl mx-auto py-[13px] px-px my-[20px]" as="div">
          <span className="text-primary-foreground font-semibold tracking-wide">
            {t('planos.upToDiscount', { percent: billingPeriod === "anual" ? "33" : "25" })}
          </span>
        </AnimatedSection>

        {/* Plans Grid */}
        <StaggeredAnimation 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-0 max-w-5xl mx-auto"
          staggerDelay={150}
          animation="fade-up"
        >
          {currentPlans.map((plan, index) => (
            <Card key={plan.name} className={`relative bg-card border-border p-6 flex flex-col rounded-xl lg:rounded-none ${index === 0 ? "lg:rounded-bl-xl" : ""} ${index === 2 ? "lg:rounded-br-xl" : ""} ${plan.popular ? "border-2 border-primary" : ""}`}>
              {(plan.promo || plan.popular) && (
                <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2 border-0 text-xs whitespace-nowrap ${plan.promo ? "bg-orange-500 text-white" : "bg-emerald-500 text-white"}`}>
                  {plan.promo ? t('planos.launchPromo') : t('planos.popular')}
                </Badge>
              )}

              <div className="text-center mb-4 min-h-[40px] flex items-center justify-center">
                <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
              </div>

              <div className="text-center mb-6 min-h-[80px]">
                {plan.originalPrice && (
                  <p className="text-muted-foreground line-through text-sm">
                    R${plan.originalPrice}{t('planos.perMonth')}
                  </p>
                )}
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-muted-foreground text-lg">R$</span>
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{t('planos.perMonth')}</span>
                </div>
                {billingPeriod === "anual" && (plan as any).yearlyTotal && (
                  <p className="text-primary text-sm mt-1">
                    R${(plan as any).yearlyTotal}{t('planos.perYear')}
                  </p>
                )}
              </div>

              <Button 
                onClick={() => window.open(appendUtmToUrl((plan as any).paymentUrl, locale), '_blank')}
                className={`w-full mb-6 ${plan.popular ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-muted hover:bg-muted/80 text-foreground"}`}
              >
                {(plan as any).hasTrial ? t('planos.freeTrial') : t('planos.subscribe')}
              </Button>

              <ul className="space-y-3 flex-1">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-start gap-2 text-sm">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    )}
                    <span className={feature.included ? "text-foreground" : "text-orange-500"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.name === "IA Unlimited" && (
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                    {t('planos.extraBenefits')}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-foreground">{t('planos.allAIFeatures')}</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </StaggeredAnimation>
      </div>

      {/* Coming Soon Modal */}
      <Dialog open={showComingSoonModal} onOpenChange={setShowComingSoonModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">{t('planos.comingSoon.title')}</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              {t('planos.comingSoon.description')}
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowComingSoonModal(false)} className="w-full mt-4">
            {t('planos.comingSoon.understood')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Planos;