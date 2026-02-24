import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, X, Sparkles, Clock, LogIn, Tag, ChevronDown, Coins, Zap, Star } from "lucide-react";
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
  const [expandedAiTools, setExpandedAiTools] = useState<Record<string, boolean>>({});

  const aiToolsList = [
    "Arcano Cloner",
    "IA que muda a roupa",
    "IA que muda pose",
    "Upscale Arcano v2.0",
    "Forja de Selos 3D",
    "Gerador de Personagens",
    "E muito mais..."
  ];
  // Countdown timer state - starting at 48 minutes
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('planos2-countdown');
    if (saved) {
      const remaining = parseInt(saved, 10) - Date.now();
      if (remaining > 0) return remaining;
    }
    const initial = 48 * 60 * 1000; // 48 minutes in ms
    localStorage.setItem('planos2-countdown', String(Date.now() + initial));
    return initial;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          // Reset to 48 minutes when it reaches 0
          const newTime = 48 * 60 * 1000;
          localStorage.setItem('planos2-countdown', String(Date.now() + newTime));
          return newTime;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0')
    };
  };

  const countdown = formatTime(timeLeft);
  
  const plans = {
    mensal: [{
      name: "Free",
      price: "0",
      originalPrice: null,
      perMonth: true,
      paymentUrl: "",
      credits: "300 créditos de IA",
      images: 5,
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: 'Suporte exclusivo via WhatsApp', included: false },
        { text: 'Sem acesso a prompts premium', included: false },
        { text: 'Sem acesso ao conteúdo premium', included: false },
        { text: 'Geração de Imagem com NanoBanana Pro', included: false },
        { text: 'Geração de Vídeo com Veo 3', included: false },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false
    }, {
      name: "Starter",
      price: "19,90",
      originalPrice: "29,90",
      perMonth: true,
      paymentUrl: "https://payfast.greenn.com.br/jx9yun8",
      credits: "1.800 créditos de IA",
      images: 30,
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: '5 prompts premium por dia', included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Geração de Imagem com NanoBanana Pro', included: false },
        { text: 'Geração de Vídeo com Veo 3', included: false },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false
    }, {
      name: "Pro",
      price: "39,90",
      originalPrice: "49,90",
      perMonth: true,
      paymentUrl: "https://payfast.greenn.com.br/h4np9xr",
      credits: "4.200 créditos de IA",
      images: 70,
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: '10 prompts premium por dia', included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Geração de Imagem com NanoBanana Pro', included: true },
        { text: 'Geração de Vídeo com Veo 3', included: true },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false,
      hasTrial: false
    }, {
      name: "Ultimate",
      price: "59,90",
      originalPrice: "79,90",
      perMonth: true,
      paymentUrl: "https://payfast.greenn.com.br/vqehk38",
      credits: "10.800 créditos de IA",
      images: 180,
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: '24 prompts premium por dia', included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Geração de Imagem com NanoBanana Pro', included: true },
        { text: 'Geração de Vídeo com Veo 3', included: true },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false,
      hasTrial: false,
      bestSeller: true
    }, {
      name: "IA Unlimited",
      price: "149,90",
      originalPrice: "249,90",
      perMonth: true,
      paymentUrl: "https://payfast.greenn.com.br/qj4w66m",
      credits: "Créditos Ilimitados",
      images: "Ilimitadas",
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.unlimitedPrompts'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Geração de Imagem com NanoBanana Pro', included: true },
        { text: 'Geração de Vídeo com Veo 3', included: true },
        { text: 'Fila prioritária nas gerações de IA', included: true }
      ],
      popular: false,
      promo: false,
      hasCountdown: true
    }],
    anual: [{
      name: "Free",
      price: "0",
      originalPrice: null,
      perMonth: true,
      paymentUrl: "",
      credits: "300 créditos de IA",
      images: 5,
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: 'Suporte exclusivo via WhatsApp', included: false },
        { text: 'Sem acesso a prompts premium', included: false },
        { text: 'Sem acesso ao conteúdo premium', included: false },
        { text: 'Geração de Imagem com NanoBanana Pro', included: false },
        { text: 'Geração de Vídeo com Veo 3', included: false },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false
    }, {
      name: "Starter",
      price: "19,90",
      originalPrice: null,
      perMonth: true,
      yearlyTotal: "238,80",
      paymentUrl: "https://payfast.greenn.com.br/jx9yun8/offer/BBDc3r",
      credits: "1.800 créditos de IA",
      images: 30,
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: '5 prompts premium por dia', included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Geração de Imagem com NanoBanana Pro', included: false },
        { text: 'Geração de Vídeo com Veo 3', included: false },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false
    }, {
      name: "Pro",
      price: "33,90",
      originalPrice: "39,90",
      perMonth: true,
      yearlyTotal: "406,80",
      paymentUrl: "https://payfast.greenn.com.br/h4np9xr/offer/PirUeX",
      credits: "4.200 créditos de IA",
      images: 70,
      savings: "R$72",
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: '10 prompts premium por dia', included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Geração de Imagem com NanoBanana Pro', included: true },
        { text: 'Geração de Vídeo com Veo 3', included: true },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false,
      hasTrial: false
    }, {
      name: "Ultimate",
      price: "49,90",
      originalPrice: "59,90",
      perMonth: true,
      yearlyTotal: "598,80",
      paymentUrl: "https://payfast.greenn.com.br/vqehk38/offer/bOi2BO",
      credits: "10.800 créditos de IA",
      images: 180,
      savings: "R$120",
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: '24 prompts premium por dia', included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Geração de Imagem com NanoBanana Pro', included: true },
        { text: 'Geração de Vídeo com Veo 3', included: true },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false,
      hasTrial: false,
      bestSeller: true
    }, {
      name: "IA Unlimited",
      price: "119,90",
      originalPrice: "149,90",
      perMonth: true,
      yearlyTotal: "1.438,80",
      paymentUrl: "https://payfast.greenn.com.br/qj4w66m/offer/a6yNlw",
      credits: "Créditos Ilimitados",
      images: "Ilimitadas",
      savings: "R$360",
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.unlimitedPrompts'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Geração de Imagem com NanoBanana Pro', included: true },
        { text: 'Geração de Vídeo com Veo 3', included: true },
        { text: 'Fila prioritária nas gerações de IA', included: true }
      ],
      popular: false,
      promo: false,
      hasCountdown: true
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
        {/* Limited Time Promo Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-red-500 rounded-xl text-center max-w-6xl mx-auto py-3 px-4 mb-6 animate-pulse">
          <span className="text-white font-bold tracking-wide text-sm md:text-base flex items-center justify-center gap-2">
            🔥 Promoção por tempo limitado! 🔥
          </span>
        </div>

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
              <TabsTrigger value="anual" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300 px-6 relative flex items-center gap-2">
                {t('planos.annualInstallments')}
                <span className="bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  52% OFF
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Countdown Timer below billing toggle */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-purple-300 text-sm">Essa oferta expira em</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-red-500" />
              <div className="flex items-center gap-0.5">
                <div className="bg-red-950/80 border border-red-500/30 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                  <span className="text-red-400 font-mono font-bold text-xs">{countdown.hours}</span>
                </div>
                <span className="text-red-400 font-bold text-xs">:</span>
                <div className="bg-red-950/80 border border-red-500/30 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                  <span className="text-red-400 font-mono font-bold text-xs">{countdown.minutes}</span>
                </div>
                <span className="text-red-400 font-bold text-xs">:</span>
                <div className="bg-red-950/80 border border-red-500/30 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                  <span className="text-red-400 font-mono font-bold text-xs">{countdown.seconds}</span>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>


        {/* Plans Grid */}
        <StaggeredAnimation 
          className="grid grid-cols-1 lg:grid-cols-5 gap-4 max-w-7xl mx-auto"
          itemClassName="w-full"
          staggerDelay={150}
          animation="fade-up"
        >
          {currentPlans.map((plan, index) => {
            const isBestSeller = (plan as any).bestSeller;
            const hasCountdown = (plan as any).hasCountdown;
            return (
            <div key={plan.name} className="flex flex-col h-full w-full">
              <Card className={`relative p-4 flex flex-col rounded-lg bg-[#1A0A2E] w-full h-full ${isBestSeller ? "border-2 border-lime-400 shadow-lg shadow-lime-400/30" : hasCountdown ? "border-2 border-purple-500 shadow-lg shadow-purple-500/30" : "border border-purple-500/20"}`}>
              {isBestSeller && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 border-0 text-[10px] whitespace-nowrap bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold px-3 py-0.5">
                  {t('planos.bestSeller')}
                </Badge>
              )}
              {hasCountdown && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 border-0 text-[10px] whitespace-nowrap bg-gradient-to-r from-purple-600 to-blue-500 text-white px-3 py-0.5">
                  MELHOR CUSTO/BENEFÍCIO
                </Badge>
              )}
              {(plan.promo || plan.popular) && !isBestSeller && !hasCountdown && (
                <Badge className={`absolute -top-2.5 left-1/2 -translate-x-1/2 border-0 text-[10px] whitespace-nowrap ${plan.promo ? "bg-orange-500 text-white" : "bg-green-500 text-white"}`}>
                  {plan.promo ? t('planos.launchPromo') : t('planos.popular')}
                </Badge>
              )}

              <div className="text-center mb-3 min-h-[32px] flex items-center justify-center">
                <h2 className="text-base font-bold text-white">{plan.name}</h2>
              </div>

              {/* Price Section - fixed height */}
              <div className="text-center mb-2 h-[75px] flex flex-col justify-center">
                {plan.originalPrice ? (
                  <p className="text-purple-400 line-through text-xs">
                    R${plan.originalPrice}{t('planos.perMonth')}
                  </p>
                ) : (
                  <p className="text-transparent text-xs">.</p>
                )}
                <div className="flex items-baseline justify-center gap-0.5">
                  <span className="text-purple-400 text-sm">R$</span>
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-purple-400 text-xs">{t('planos.perMonth')}</span>
                </div>
                {billingPeriod === "anual" && (plan as any).yearlyTotal ? (
                  <p className="text-purple-400 text-xs mt-1">
                    R${(plan as any).yearlyTotal}{t('planos.perYear')}
                  </p>
                ) : (
                  <p className="text-transparent text-xs mt-1">.</p>
                )}
              </div>

              <Button 
                onClick={() => {
                  if (plan.name === "Free") {
                    navigate('/login');
                  } else {
                    window.open(appendUtmToUrl((plan as any).paymentUrl, locale), '_blank');
                  }
                }}
                className={`w-full mb-2 text-sm h-9 ${isBestSeller ? "bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 text-black font-semibold" : hasCountdown ? "bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-semibold" : plan.popular ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-900/50 hover:bg-purple-900/70 text-purple-200"}`}
              >
                {plan.name === "Free" ? "Criar conta grátis" : (plan as any).hasTrial ? t('planos.freeTrial') : t('planos.subscribe')}
              </Button>

              {/* Savings Badge - fixed height container */}
              <div className="h-[28px] mb-2 flex items-center justify-center">
                {billingPeriod === "anual" ? (
                  plan.name === "Starter" || plan.name === "Free" ? (
                    <div className="flex items-center justify-center gap-1.5 bg-gray-800/50 border border-gray-600/30 rounded-full px-3 py-1 whitespace-nowrap">
                      <Tag className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="text-[10px] text-gray-400">Sem diferença comparado ao mensal</span>
                    </div>
                  ) : (
                    <div className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1 whitespace-nowrap ${
                      plan.name === "Pro" ? "bg-yellow-900/30 border border-yellow-600/40" :
                      plan.name === "Ultimate" ? "bg-lime-900/30 border border-lime-500/40" :
                      "bg-purple-900/30 border border-purple-500/40"
                    }`}>
                      <Tag className={`w-3 h-3 flex-shrink-0 ${
                        plan.name === "Pro" ? "text-yellow-400" :
                        plan.name === "Ultimate" ? "text-lime-400" :
                        "text-purple-400"
                      }`} />
                      <span className={`text-[10px] font-medium ${
                        plan.name === "Pro" ? "text-yellow-400" :
                        plan.name === "Ultimate" ? "text-lime-400" :
                        "text-purple-400"
                      }`}>
                        Economize {(plan as any).savings} comparado ao mensal
                      </span>
                    </div>
                  )
                ) : null}
              </div>

              {/* Badge de Créditos - fixed height */}
              <div className="flex flex-col items-center mb-4 h-[44px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500">
                  <Sparkles className="w-2.5 h-2.5" />
                  {(plan as any).credits}/mês
                </span>
                {(plan as any).images && (
                  <span className="text-[9px] text-purple-400 mt-0.5">≈ {typeof (plan as any).images === 'string' ? (plan as any).images : `${(plan as any).images} imagens/mês`}</span>
                )}
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex}>
                    <div 
                      className={`flex items-start gap-1.5 text-xs ${(feature as any).isAiTools ? 'cursor-pointer select-none' : ''}`}
                      onClick={() => {
                        if ((feature as any).isAiTools) {
                          setExpandedAiTools(prev => ({ ...prev, [plan.name]: !prev[plan.name] }));
                        }
                      }}
                    >
                      {feature.included ? (
                        <Check className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                      )}
                      <span className={`${feature.included ? "text-purple-200" : "text-orange-500"} flex items-center gap-1.5`}>
                        {feature.text}
                        {(feature as any).hasDiscount && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 leading-none whitespace-nowrap">
                            50% OFF
                          </span>
                        )}
                      </span>
                      {(feature as any).isAiTools && (
                        <ChevronDown className={`w-3 h-3 shrink-0 mt-0.5 transition-transform duration-200 ${feature.included ? 'text-purple-400' : 'text-orange-500'} ${expandedAiTools[plan.name] ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                    {(feature as any).isAiTools && expandedAiTools[plan.name] && (
                      <ul className="ml-5 mt-1 space-y-0.5">
                        {aiToolsList.map((tool, tIndex) => (
                          <li key={tIndex} className={`text-[10px] ${tIndex === aiToolsList.length - 1 ? 'text-purple-400 italic' : 'text-purple-300/70'}`}>
                            • {tool}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              {plan.name === "IA Unlimited" && (
                <div className="mt-4 pt-3 border-t border-purple-500/20">
                  <p className="text-[10px] text-purple-400 mb-1.5 uppercase tracking-wide">
                    {t('planos.extraBenefits')}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span className="text-purple-200">{t('planos.allAIFeatures')}</span>
                  </div>
                </div>
              )}
              </Card>
            </div>
          );
          })}
        </StaggeredAnimation>
      </div>

      {/* Credit Plans Section */}
      <section className="mt-20 pb-20 px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 mb-4">
            <Coins className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Compre um pacote de créditos avulsos
          </h2>
          <p className="text-purple-300 max-w-md mx-auto">
            Créditos <span className="text-green-400 font-semibold">vitalícios</span> que nunca expiram — use quando quiser!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { credits: "+1.500", description: "~25 imagens", price: "19,90", originalPrice: "39,90", savings: "", link: "https://payfast.greenn.com.br/9trhhb9", icon: Coins, color: "from-purple-500 to-fuchsia-500" },
            { credits: "+4.200", description: "~70 imagens", price: "29,90", originalPrice: "49,90", savings: "46", link: "https://payfast.greenn.com.br/y3u2u3d", popular: true, icon: Zap, color: "from-fuchsia-500 to-pink-500" },
            { credits: "+14.000", description: "~233 imagens", price: "79,90", originalPrice: "149,90", savings: "57", link: "https://payfast.greenn.com.br/vwfzrw2", bestValue: true, icon: Star, color: "from-yellow-500 to-orange-500" },
          ].map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.credits}
                className={`relative p-6 bg-[#1A0A2E] border-purple-500/20 flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.02] hover:border-purple-400/40 ${
                  plan.bestValue ? 'ring-2 ring-yellow-500/50 border-yellow-500/30' : ''
                } ${plan.popular ? 'ring-2 ring-fuchsia-500/50 border-fuchsia-500/30' : ''}`}
              >
                {plan.bestValue && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 px-3 py-1 text-xs">
                    ⭐ MELHOR VALOR
                  </Badge>
                )}
                {plan.popular && !plan.bestValue && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white border-0 px-3 py-1 text-xs">
                    🔥 POPULAR
                  </Badge>
                )}

                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center mb-3 mt-2`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <div className="mb-1">
                  <span className="text-2xl sm:text-3xl font-bold text-white">{plan.credits}</span>
                  <p className="text-purple-300 text-sm">créditos</p>
                </div>

                <p className="text-purple-400 text-sm mb-3">{plan.description}</p>

                {plan.savings && (
                  <Badge className="bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-xs mb-2 gap-1">
                    <Tag className="w-3 h-3" />
                    Economize {plan.savings}%
                  </Badge>
                )}

                <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400 text-xs mb-3">
                  ♾️ Vitalício
                </Badge>

                <div className="flex-1 flex flex-col justify-end w-full">
                  <div className="mb-4">
                    {plan.originalPrice && (
                      <span className="text-sm text-purple-500 line-through block mb-1">R$ {plan.originalPrice}</span>
                    )}
                    <div>
                      <span className="text-sm text-purple-400">R$ </span>
                      <span className="text-2xl font-bold text-white">{plan.price}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => window.open(plan.link, "_blank")}
                    className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-semibold py-5`}
                  >
                    Comprar Agora
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <p className="text-purple-400 text-sm max-w-lg mx-auto">
            💡 Os créditos vitalícios são consumidos <strong className="text-purple-300">após</strong> os créditos mensais da sua assinatura,
            garantindo que você aproveite ao máximo seu plano.
          </p>
        </div>
      </section>

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