import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Star, ArrowLeft, Crown, Zap, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import logoHorizontal from "@/assets/logo_horizontal.png";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanInfo {
  id: string;
  name: string;
  slug: string;
  price: string;
  originalPrice?: string;
  yearlyTotal?: string;
  features: PlanFeature[];
  isPopular?: boolean;
  isPromo?: boolean;
  checkoutUrl: string;
}

const UpgradePlano = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('plans');
  const { user, isPremium } = usePremiumStatus();
  const [currentPlanType, setCurrentPlanType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<"mensal" | "anual">("mensal");

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('premium_users')
        .select('plan_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        setCurrentPlanType(data.plan_type);
      }
      setIsLoading(false);
    };

    fetchCurrentPlan();
  }, [user]);

  const plans: Record<"mensal" | "anual", PlanInfo[]> = {
    mensal: [
      {
        id: "arcano_basico",
        name: "Arcano Básico",
        slug: "basico",
        price: "14,90",
        features: [
          { text: t('features.premiumPromptsDay', { count: 10 }), included: true },
          { text: t('features.allPremiumContent'), included: true },
          { text: t('features.dailyUpdates'), included: true },
          { text: t('features.whatsappSupport'), included: true },
          { text: t('features.aiClothesChange'), included: false },
          { text: t('features.aiPoseChange'), included: false },
          { text: t('features.upscaleArcano'), included: false },
          { text: t('features.forja3D'), included: false }
        ],
        checkoutUrl: "https://pay.greenn.com.br/arcano-basico"
      },
      {
        id: "arcano_pro",
        name: "Arcano Pro",
        slug: "pro",
        price: "20,90",
        isPopular: true,
        features: [
          { text: t('features.premiumPromptsDay', { count: 24 }), included: true },
          { text: t('features.allPremiumContent'), included: true },
          { text: t('features.dailyUpdates'), included: true },
          { text: t('features.immediateRelease'), included: true },
          { text: t('features.exclusiveWhatsappSupport'), included: true },
          { text: t('features.aiClothesChange'), included: true },
          { text: t('features.aiPoseChange'), included: true },
          { text: t('features.upscaleArcano'), included: false },
          { text: t('features.forja3D'), included: false }
        ],
        checkoutUrl: "https://pay.greenn.com.br/arcano-pro"
      },
      {
        id: "arcano_unlimited",
        name: "Arcano IA Unlimited",
        slug: "unlimited",
        price: "29,90",
        features: [
          { text: t('features.unlimitedPremiumPrompts'), included: true },
          { text: t('features.allPremiumContent'), included: true },
          { text: t('features.dailyUpdates'), included: true },
          { text: t('features.immediateRelease'), included: true },
          { text: t('features.vipWhatsappSupport'), included: true },
          { text: t('features.aiClothesChange'), included: true },
          { text: t('features.aiPoseChange'), included: true },
          { text: t('features.upscaleArcano'), included: true },
          { text: t('features.forja3D'), included: true }
        ],
        checkoutUrl: "https://pay.greenn.com.br/arcano-unlimited"
      }
    ],
    anual: [
      {
        id: "arcano_basico",
        name: "Arcano Básico",
        slug: "basico",
        price: "9,90",
        originalPrice: "14,90",
        yearlyTotal: "118,80",
        features: [
          { text: t('features.premiumPromptsDay', { count: 10 }), included: true },
          { text: t('features.allPremiumContent'), included: true },
          { text: t('features.dailyUpdates'), included: true },
          { text: t('features.whatsappSupport'), included: true },
          { text: t('features.aiClothesChange'), included: false },
          { text: t('features.aiPoseChange'), included: false },
          { text: t('features.upscaleArcano'), included: false },
          { text: t('features.forja3D'), included: false }
        ],
        checkoutUrl: "https://pay.greenn.com.br/arcano-basico-anual"
      },
      {
        id: "arcano_pro",
        name: "Arcano Pro",
        slug: "pro",
        price: "14,90",
        originalPrice: "20,90",
        yearlyTotal: "178,80",
        isPopular: true,
        features: [
          { text: t('features.premiumPromptsDay', { count: 24 }), included: true },
          { text: t('features.allPremiumContent'), included: true },
          { text: t('features.dailyUpdates'), included: true },
          { text: t('features.immediateRelease'), included: true },
          { text: t('features.exclusiveWhatsappSupport'), included: true },
          { text: t('features.aiClothesChange'), included: true },
          { text: t('features.aiPoseChange'), included: true },
          { text: t('features.upscaleArcano'), included: false },
          { text: t('features.forja3D'), included: false }
        ],
        checkoutUrl: "https://pay.greenn.com.br/arcano-pro-anual"
      },
      {
        id: "arcano_unlimited",
        name: "Arcano IA Unlimited",
        slug: "unlimited",
        price: "19,90",
        originalPrice: "29,90",
        yearlyTotal: "238,80",
        features: [
          { text: t('features.unlimitedPremiumPrompts'), included: true },
          { text: t('features.allPremiumContent'), included: true },
          { text: t('features.dailyUpdates'), included: true },
          { text: t('features.immediateRelease'), included: true },
          { text: t('features.vipWhatsappSupport'), included: true },
          { text: t('features.aiClothesChange'), included: true },
          { text: t('features.aiPoseChange'), included: true },
          { text: t('features.upscaleArcano'), included: true },
          { text: t('features.forja3D'), included: true }
        ],
        checkoutUrl: "https://pay.greenn.com.br/arcano-unlimited-anual"
      }
    ]
  };

  const currentPlans = plans[billingPeriod];
  const isCurrentPlan = (planId: string) => currentPlanType === planId;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary px-4 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <img 
            src={logoHorizontal} 
            alt="ArcanoApp" 
            className="h-8 cursor-pointer" 
            onClick={() => navigate('/')}
          />
          <Button
            variant="ghost"
            onClick={() => navigate('/biblioteca-prompts')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('upgrade.back')}
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Title Section */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-2 rounded-full mb-4">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-600">{t('upgrade.upgradeYourPlan')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {t('upgrade.unlockPotential')}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            {t('upgrade.limitReached')}
          </p>

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
                {t('upgrade.monthly')}
              </TabsTrigger>
              <TabsTrigger 
                value="anual" 
                className="data-[state=active]:bg-background data-[state=active]:text-foreground px-6 relative"
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-green-500 font-medium whitespace-nowrap">
                  {t('upgrade.discount')}
                </span>
                {t('upgrade.yearlyInstallments')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Discount Banner */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl text-center max-w-5xl mx-auto py-3 px-4 mb-6">
          <span className="text-primary-foreground font-semibold tracking-wide">
            {t('upgrade.upToDiscount', { percent: billingPeriod === "anual" ? "33" : "25" })}
          </span>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {currentPlans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.id);
            const isUpgrade = !isCurrent && currentPlanType === "arcano_basico";
            
            return (
              <Card 
                key={plan.id}
                className={`relative p-6 flex flex-col ${
                  plan.isPopular 
                    ? 'border-2 border-primary shadow-lg' 
                    : 'border-border'
                } ${isCurrent ? 'bg-primary/5' : 'bg-card'}`}
              >
                {/* Promo Badge */}
                {plan.isPromo && !isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white border-0 flex items-center justify-center text-center">
                    {t('upgrade.launchPromo')}
                  </Badge>
                )}

                {/* Popular Badge */}
                {plan.isPopular && !isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white border-0">
                    <Zap className="h-3 w-3 mr-1" />
                    {t('upgrade.mostPopular')}
                  </Badge>
                )}

                {/* Current Plan Badge */}
                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white border-0">
                    <Check className="h-3 w-3 mr-1" />
                    {t('upgrade.currentPlan')}
                  </Badge>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                  
                  {/* Price */}
                  <div className="min-h-[70px]">
                    {plan.originalPrice && (
                      <p className="text-muted-foreground line-through text-sm">
                        R${plan.originalPrice}/mês
                      </p>
                    )}
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-muted-foreground text-lg">R$</span>
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    {billingPeriod === "anual" && plan.yearlyTotal && (
                      <p className="text-primary text-sm mt-1">
                        R${plan.yearlyTotal}/ano
                      </p>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? "text-foreground" : "text-orange-500"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                {isCurrent ? (
                  <Button disabled className="w-full bg-green-500/20 text-green-600 cursor-not-allowed">
                    <Check className="h-4 w-4 mr-2" />
                    {t('upgrade.currentPlan')}
                  </Button>
                ) : (
                  <a href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer">
                    <Button 
                      className={`w-full ${
                        plan.isPopular 
                          ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                          : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white'
                      }`}
                    >
                      <Star className="h-4 w-4 mr-2" fill="currentColor" />
                      {isUpgrade ? t('upgrade.doUpgrade') : t('upgrade.subscribe')}
                    </Button>
                  </a>
                )}
              </Card>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>{t('upgrade.limitResetNote')}</p>
          <p className="mt-1">{t('upgrade.supportNote')}</p>
        </div>
      </main>
    </div>
  );
};

export default UpgradePlano;
