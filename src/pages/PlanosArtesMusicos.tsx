import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, X, Sparkles, Clock, LogIn, UserPlus, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import baaLogo from "@/assets/BAA.png";
import { appendUtmToUrl } from "@/lib/utmUtils";

const PlanosArtesMusicos = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('library');
  const [billingPeriod, setBillingPeriod] = useState<"mensal" | "anual">("mensal");
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  
  const plans = {
    mensal: [{
      name: t('plansMusicos.plans.basic'),
      price: "19,90",
      originalPrice: null,
      perMonth: true,
      paymentUrl: "https://payfast.greenn.com.br/redirect/250806",
      features: [
        { text: t('plansMusicos.features.downloadsPerDay', { count: 5 }), included: true, bold: true },
        { text: t('plansMusicos.features.editableArts'), included: true },
        { text: t('plansMusicos.features.weeklyUpdates'), included: true },
        { text: t('plansMusicos.features.whatsappSupport'), included: true },
        { text: t('plansMusicos.features.ledScreens'), included: false },
        { text: t('plansMusicos.features.aiTools'), included: false }
      ],
      popular: false,
      promo: false
    }, {
      name: t('plansMusicos.plans.pro'),
      price: "29,90",
      originalPrice: null,
      perMonth: true,
      paymentUrl: "https://payfast.greenn.com.br/redirect/250834",
      features: [
        { text: t('plansMusicos.features.downloadsPerDay', { count: 10 }), included: true, bold: true },
        { text: t('plansMusicos.features.editableArts'), included: true },
        { text: t('plansMusicos.features.weeklyUpdates'), included: true },
        { text: t('plansMusicos.features.whatsappSupport'), included: true },
        { text: t('plansMusicos.features.ledScreens'), included: true },
        { text: t('plansMusicos.features.aiTools'), included: false }
      ],
      popular: false,
      promo: false,
      hasTrial: false
    }, {
      name: t('plansMusicos.plans.unlimited'),
      price: "39,90",
      originalPrice: "49,90",
      perMonth: true,
      paymentUrl: "https://payfast.greenn.com.br/redirect/250836",
      features: [
        { text: t('plansMusicos.features.unlimitedDownloads'), included: true, bold: true },
        { text: t('plansMusicos.features.editableArts'), included: true },
        { text: t('plansMusicos.features.weeklyUpdates'), included: true },
        { text: t('plansMusicos.features.whatsappSupport'), included: true },
        { text: t('plansMusicos.features.ledScreens'), included: true },
        { text: t('plansMusicos.features.aiTools'), included: true }
      ],
      popular: false,
      promo: true
    }],
    anual: [{
      name: t('plansMusicos.plans.basic'),
      price: "14,90",
      originalPrice: "19,90",
      perMonth: true,
      yearlyTotal: "178,80",
      paymentUrl: "https://payfast.greenn.com.br/redirect/250807",
      features: [
        { text: t('plansMusicos.features.downloadsPerDay', { count: 5 }), included: true, bold: true },
        { text: t('plansMusicos.features.editableArts'), included: true },
        { text: t('plansMusicos.features.weeklyUpdates'), included: true },
        { text: t('plansMusicos.features.whatsappSupport'), included: true },
        { text: t('plansMusicos.features.ledScreens'), included: false },
        { text: t('plansMusicos.features.aiTools'), included: false }
      ],
      popular: false,
      promo: false
    }, {
      name: t('plansMusicos.plans.pro'),
      price: "22,90",
      originalPrice: "29,90",
      perMonth: true,
      yearlyTotal: "274,80",
      paymentUrl: "https://payfast.greenn.com.br/redirect/250835",
      features: [
        { text: t('plansMusicos.features.downloadsPerDay', { count: 10 }), included: true, bold: true },
        { text: t('plansMusicos.features.editableArts'), included: true },
        { text: t('plansMusicos.features.weeklyUpdates'), included: true },
        { text: t('plansMusicos.features.whatsappSupport'), included: true },
        { text: t('plansMusicos.features.ledScreens'), included: true },
        { text: t('plansMusicos.features.aiTools'), included: false }
      ],
      popular: false,
      promo: false,
      hasTrial: true
    }, {
      name: t('plansMusicos.plans.unlimited'),
      price: "29,90",
      originalPrice: "49,90",
      perMonth: true,
      yearlyTotal: "358,80",
      paymentUrl: "https://payfast.greenn.com.br/redirect/250837",
      features: [
        { text: t('plansMusicos.features.unlimitedDownloads'), included: true, bold: true },
        { text: t('plansMusicos.features.editableArts'), included: true },
        { text: t('plansMusicos.features.weeklyUpdates'), included: true },
        { text: t('plansMusicos.features.whatsappSupport'), included: true },
        { text: t('plansMusicos.features.ledScreens'), included: true },
        { text: t('plansMusicos.features.aiTools'), included: true }
      ],
      popular: false,
      promo: true
    }]
  };

  const currentPlans = plans[billingPeriod];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1a2e] to-[#16213e]">
      <div className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/biblioteca-artes-musicos')} className="text-violet-300 hover:text-violet-100 hover:bg-violet-500/20">
            <ArrowLeft className="w-4 h-4 mr-2" />{t('plansMusicos.back')}
          </Button>
          <img src={baaLogo} alt="BAA" className="h-8 hidden sm:block" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/login-artes-musicos')} className="gap-2 border-violet-500/30 text-violet-300 hover:bg-violet-500/20 hover:text-violet-100">
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">{t('plansMusicos.alreadySubscriber')}</span>
            <span className="sm:hidden">{t('plansMusicos.login')}</span>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">{t('plansMusicos.title')}</h1>
          <Tabs value={billingPeriod} onValueChange={v => setBillingPeriod(v as "mensal" | "anual")} className="inline-flex">
            <TabsList className="bg-violet-500/10 border border-violet-500/30">
              <TabsTrigger value="mensal" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white px-6 text-violet-300">{t('plansMusicos.monthly')}</TabsTrigger>
              <TabsTrigger value="anual" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white px-6 text-violet-300 relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-green-400 font-medium whitespace-nowrap">{t('plansMusicos.discount')}</span>
                {t('plansMusicos.annual')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-t-xl lg:rounded-t-xl rounded-xl lg:rounded-b-none text-center max-w-5xl mx-auto py-[13px] px-px my-[20px]">
          <span className="text-white font-semibold tracking-wide">{t('plansMusicos.discountBanner', { percent: billingPeriod === "anual" ? "40" : "20" })}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-0 max-w-5xl mx-auto">
          {currentPlans.map((plan, index) => (
            <Card key={plan.name} className={`relative bg-[#1a1a2e] border-violet-500/20 p-6 flex flex-col rounded-xl lg:rounded-none ${index === 0 ? "lg:rounded-bl-xl" : ""} ${index === 2 ? "lg:rounded-br-xl" : ""} ${plan.popular ? "border-2 border-violet-500" : ""}`}>
              {(plan.promo || plan.popular) && (
                <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2 border-0 text-xs whitespace-nowrap ${plan.promo ? "bg-orange-500 text-white" : "bg-emerald-500 text-white"}`}>
                  {plan.promo ? t('plansMusicos.badges.promo') : t('plansMusicos.badges.popular')}
                </Badge>
              )}
              <div className="text-center mb-4 min-h-[40px] flex items-center justify-center">
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
              </div>
              <div className="text-center mb-6 min-h-[80px]">
                {plan.originalPrice && <p className="text-violet-300/60 line-through text-sm">R${plan.originalPrice}{t('plansMusicos.perMonth')}</p>}
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-violet-300 text-lg">R$</span>
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-violet-300">{t('plansMusicos.perMonth')}</span>
                </div>
                {billingPeriod === "anual" && (plan as any).yearlyTotal && <p className="text-violet-400 text-sm mt-1">R${(plan as any).yearlyTotal}{t('plansMusicos.perYear')}</p>}
              </div>
              <Button onClick={() => {
                if ((plan as any).paymentUrl === "#") { setShowComingSoonModal(true); } 
                else {
                  const checkoutUrl = encodeURIComponent(appendUtmToUrl((plan as any).paymentUrl));
                  const planName = encodeURIComponent(`${plan.name} ${billingPeriod === 'anual' ? 'Anual' : 'Mensal'}`);
                  navigate(`/aguardando-pagamento-musicos?checkout=${checkoutUrl}&plan=${planName}`);
                }
              }} className={`w-full mb-6 ${plan.popular ? "bg-violet-600 hover:bg-violet-500 text-white" : "bg-violet-500/20 hover:bg-violet-500/30 text-violet-100"}`}>
                {(plan as any).hasTrial ? t('plansMusicos.freeTrial') : t('plansMusicos.subscribe')}
              </Button>
              <ul className="space-y-3 flex-1">
                {plan.features.map((feature, fIndex) => {
                  const isLedFeature = feature.text.includes("LED");
                  return (
                    <li key={fIndex} className="flex items-start gap-2 text-sm">
                      {feature.included ? <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" /> : <X className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />}
                      <span className={`${feature.included ? "text-violet-100" : "text-orange-500"} ${(feature as any).bold ? "font-bold" : ""}`}>{feature.text}</span>
                      {isLedFeature && !feature.included && <Badge className="ml-1 bg-amber-600 text-white text-[10px] px-1.5 py-0 h-4 border-0">{t('plansMusicos.badges.proPlusBadge')}</Badge>}
                      {isLedFeature && feature.included && <Monitor className="w-3 h-3 text-amber-400 shrink-0 ml-1" />}
                    </li>
                  );
                })}
              </ul>
              {plan.name === t('plansMusicos.plans.unlimited') && (
                <div className="mt-6 pt-4 border-t border-violet-500/20">
                  <p className="text-xs text-violet-300/60 mb-2 uppercase tracking-wide">{t('plansMusicos.features.extraBenefits')}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-violet-100">{t('plansMusicos.features.allUnlocked')}</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="max-w-5xl mx-auto mt-8">
          <div className="bg-gradient-to-r from-amber-600/20 to-violet-600/20 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Monitor className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold flex flex-wrap items-center gap-2">
                {t('plansMusicos.ledCallout.title')}
                <Badge className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 border-0">{t('plansMusicos.badges.exclusivePro')}</Badge>
              </h3>
              <p className="text-violet-200/70 text-sm mt-1">{t('plansMusicos.ledCallout.description')}</p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showComingSoonModal} onOpenChange={setShowComingSoonModal}>
        <DialogContent className="sm:max-w-md bg-[#1a1a2e] border-violet-500/30">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Clock className="w-8 h-8 text-violet-400" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-white">{t('plansMusicos.comingSoon.title')}</DialogTitle>
            <DialogDescription className="text-center text-violet-200/70">{t('plansMusicos.comingSoon.description')}</DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowComingSoonModal(false)} className="w-full mt-4 bg-violet-600 hover:bg-violet-500 text-white">{t('plansMusicos.comingSoon.understood')}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanosArtesMusicos;