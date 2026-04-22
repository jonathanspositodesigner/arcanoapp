import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, X, Sparkles, Clock, LogIn, Tag, ChevronDown, Coins, Zap, Star, ShieldCheck, Headset, Loader2, CreditCard, QrCode, Video, ImageIcon, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

import { CreditsFAQSection } from "@/components/credits/CreditsFAQSection";
import { StatsCards } from "@/components/credits/StatsCards";

import { supabase } from "@/integrations/supabase/client";
import HomeAuthModal from "@/components/HomeAuthModal";
import { usePagarmeCheckout } from "@/hooks/usePagarmeCheckout";

import { usePlanos2Access } from "@/hooks/usePlanos2Access";
import { toast } from "sonner";

const PLAN_HIERARCHY: Record<string, number> = { free: 0, starter: 1, pro: 2, ultimate: 3, unlimited: 4 };
const PLAN_NAME_TO_SLUG: Record<string, string> = { "Free": "free", "Starter": "starter", "Pro": "pro", "Ultimate": "ultimate", "IA Unlimited": "unlimited" };

const Planos2 = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('prompts');
  
  const [billingPeriod, setBillingPeriod] = useState<"mensal" | "anual">("mensal");
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [expandedAiTools, setExpandedAiTools] = useState<Record<string, boolean>>({});
  
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const { planSlug: activePlanSlug } = usePlanos2Access(userId || undefined);
  const { openCheckout, isLoading: isMPLoading, PagarmeCheckoutModal } = usePagarmeCheckout({ source_page: "planos-2" });

  // Check auth and profile on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || null);
      }
    };
    checkAuth();
  }, []);

  const aiToolsList = [
    "Arcano Cloner",
    "IA que muda a roupa",
    "IA que muda pose",
    "Upscale Arcano v2.0",
    "Forja de Selos 3D",
    "Gerador de Personagens",
    "E muito mais..."
  ];
  // GPT Image promo countdown - 7 days
  const PROMO_START_KEY = "gpt_image_promo_planos2_start";
const PROMO_DURATION_DAYS = 7;

  const getPromoStart = (): number => {
    const stored = localStorage.getItem(PROMO_START_KEY);
    if (stored) return parseInt(stored, 10);
    const now = Date.now();
    localStorage.setItem(PROMO_START_KEY, String(now));
    return now;
  };

  const [timeLeft, setTimeLeft] = useState(() => {
    const start = getPromoStart();
    const end = start + PROMO_DURATION_DAYS * 24 * 60 * 60 * 1000;
    const diff = end - Date.now();
    return diff > 0 ? diff : 0;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) return 0;
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0')
    };
  };

  const countdown = formatTime(timeLeft);

  const handleCreditPurchase = (slug: string) => {
    openCheckout(slug);
  };

  const handleSubscriptionPurchase = (planName: string) => {
    const slugMap: Record<string, string> = {
      "Starter": `plano-starter-${billingPeriod}`,
      "Pro": `plano-pro-${billingPeriod}`,
      "Ultimate": `plano-ultimate-${billingPeriod}`,
      "IA Unlimited": `plano-unlimited-${billingPeriod}`,
    };
    const slug = slugMap[planName];
    if (!slug) return;
    openCheckout(slug);
  };

  const plans = {
    mensal: [{
      name: "Free",
      price: "0",
      originalPrice: null,
      perMonth: true,
      credits: "300 créditos de IA",
      images: 5,
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: 'Suporte exclusivo via WhatsApp', included: false },
        { text: 'Sem acesso a prompts premium', included: false },
        { text: 'Sem acesso ao conteúdo premium', included: false },
        { text: 'Wan 2.2', iconType: 'video', included: false },
        { text: 'Flux 2 Klein', iconType: 'image', included: false },
        { text: 'Nano Banana Pro', iconType: 'image', included: false },
        { text: 'Veo 3.1', iconType: 'video', included: false },
        { text: 'GPT Image 2', iconType: 'image', included: false },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false
    }, {
      name: "Starter",
      price: "24,90",
      originalPrice: "29,90",
      perMonth: true,
      credits: "1.500 créditos de IA",
      images: 25,
      tagline: "Para começar",
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.5PromptsDay'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Wan 2.2', iconType: 'video', included: true },
        { text: 'Flux 2 Klein', iconType: 'image', included: true },
        { text: 'Nano Banana Pro', iconType: 'image', included: false },
        { text: 'Veo 3.1', iconType: 'video', included: false },
        { text: 'GPT Image 2', iconType: 'image', included: true, promoBadge: '7 dias free' },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false
    }, {
      name: "Pro",
      price: "39,90",
      originalPrice: "49,90",
      perMonth: true,
      credits: "5.000 créditos de IA",
      images: 83,
      tagline: "3x mais créditos por mais R$15",
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.10PromptsDay'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Wan 2.2', iconType: 'video', included: true },
        { text: 'Flux 2 Klein', iconType: 'image', included: true },
        { text: 'Nano Banana Pro', iconType: 'image', included: true },
        { text: 'Veo 3.1', iconType: 'video', included: true },
        { text: 'GPT Image 2', iconType: 'image', included: true, promoBadge: '7 dias free' },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false,
      hasTrial: false,
      bestSeller: true
    }, {
      name: "Ultimate",
      price: "79,90",
      originalPrice: "99,90",
      perMonth: true,
      credits: "14.000 créditos de IA",
      images: 233,
      tagline: "Ideal para designers e criadores ativos",
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.20PromptsDay'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Wan 2.2', iconType: 'video', included: true },
        { text: 'Flux 2 Klein', iconType: 'image', included: true },
        { text: 'Nano Banana Pro', iconType: 'image', included: true },
        { text: 'Veo 3.1', iconType: 'video', included: true },
        { text: 'GPT Image 2', iconType: 'image', included: true, promoBadge: '7 dias free' },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false,
      hasTrial: false,
      hasCountdown: true
    }, {
      name: "IA Unlimited",
      price: "149,90",
      originalPrice: "249,90",
      perMonth: true,
      credits: "Créditos Ilimitados",
      images: "Ilimitadas",
      tagline: "Máxima liberdade",
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true, badge: 'Ilimitado' },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.unlimitedPrompts'), included: true, badge: 'Ilimitado' },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Wan 2.2', iconType: 'video', included: true, badge: 'Ilimitado' },
        { text: 'Flux 2 Klein', iconType: 'image', included: true, badge: 'Ilimitado' },
        { text: 'Nano Banana Pro', iconType: 'image', included: true, badge: 'Ilimitado' },
        { text: 'Veo 3.1', iconType: 'video', included: true },
        { text: 'GPT Image 2', iconType: 'image', included: true, badge: 'Ilimitado' },
        { text: 'Fila prioritária nas gerações de IA', included: true }
      ],
      popular: false,
      promo: false,
      isUnlimitedBadge: true
    }],
    anual: [{
      name: "Free",
      price: "0",
      originalPrice: null,
      perMonth: true,
      credits: "300 créditos de IA",
      images: 5,
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: 'Suporte exclusivo via WhatsApp', included: false },
        { text: 'Sem acesso a prompts premium', included: false },
        { text: 'Sem acesso ao conteúdo premium', included: false },
        { text: 'Wan 2.2', iconType: 'video', included: false },
        { text: 'Flux 2 Klein', iconType: 'image', included: false },
        { text: 'Nano Banana Pro', iconType: 'image', included: false },
        { text: 'Veo 3.1', iconType: 'video', included: false },
        { text: 'GPT Image 2', iconType: 'image', included: false },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false
    }, {
      name: "Starter",
      price: "24,90",
      originalPrice: null,
      perMonth: true,
      yearlyTotal: "298,80",
      credits: "1.500 créditos de IA",
      images: 25,
      tagline: "Para começar",
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.unlimitedPrompts'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Wan 2.2', iconType: 'video', included: true },
        { text: 'Flux 2 Klein', iconType: 'image', included: true },
        { text: 'Nano Banana Pro', iconType: 'image', included: false },
        { text: 'Veo 3.1', iconType: 'video', included: false },
        { text: 'GPT Image 2', iconType: 'image', included: true, promoBadge: '7 dias free' },
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
      credits: "5.000 créditos de IA",
      images: 83,
      savings: "R$72",
      tagline: "3x mais créditos por mais R$15",
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.unlimitedPrompts'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Wan 2.2', iconType: 'video', included: true },
        { text: 'Flux 2 Klein', iconType: 'image', included: true },
        { text: 'Nano Banana Pro', iconType: 'image', included: true },
        { text: 'Veo 3.1', iconType: 'video', included: true },
        { text: 'GPT Image 2', iconType: 'image', included: true, promoBadge: '7 dias free' },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false,
      hasTrial: false,
      bestSeller: true
    }, {
      name: "Ultimate",
      price: "59,90",
      originalPrice: "79,90",
      perMonth: true,
      yearlyTotal: "718,80",
      credits: "14.000 créditos de IA",
      images: 233,
      savings: "R$240",
      tagline: "Ideal para designers e criadores ativos",
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.unlimitedPrompts'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Wan 2.2', iconType: 'video', included: true },
        { text: 'Flux 2 Klein', iconType: 'image', included: true },
        { text: 'Nano Banana Pro', iconType: 'image', included: true },
        { text: 'Veo 3.1', iconType: 'video', included: true },
        { text: 'GPT Image 2', iconType: 'image', included: true, promoBadge: '7 dias free' },
        { text: 'Fila prioritária nas gerações de IA', included: false }
      ],
      popular: false,
      promo: false,
      hasTrial: false,
      hasCountdown: true
    }, {
      name: "IA Unlimited",
      price: "119,90",
      originalPrice: "149,90",
      perMonth: true,
      yearlyTotal: "1.438,80",
      credits: "Créditos Ilimitados",
      images: "Ilimitadas",
      savings: "R$360",
      tagline: "Máxima liberdade",
      features: [
        { text: t('planos.features.dailyUpdates'), included: true },
        { text: t('planos.features.immediateRelease'), included: true },
        { text: 'Acesso às Ferramentas de IA', included: true, isAiTools: true, badge: 'Ilimitado' },
        { text: t('planos.features.whatsappSupport'), included: true },
        { text: t('planos.features.unlimitedPrompts'), included: true },
        { text: t('planos.features.allPremiumContent'), included: true },
        { text: 'Wan 2.2', iconType: 'video', included: true, badge: 'Ilimitado' },
        { text: 'Flux 2 Klein', iconType: 'image', included: true, badge: 'Ilimitado' },
        { text: 'Nano Banana Pro', iconType: 'image', included: true, badge: 'Ilimitado' },
        { text: 'Veo 3.1', iconType: 'video', included: true },
        { text: 'GPT Image 2', iconType: 'image', included: true, badge: 'Ilimitado' },
        { text: 'Fila prioritária nas gerações de IA', included: true }
      ],
      popular: false,
      promo: false,
      isUnlimitedBadge: true
    }]
  };

  const currentPlans = plans[billingPeriod];
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="container mx-auto px-4 py-6 flex justify-between items-center">
        <Button variant="ghost" onClick={() => navigate('/biblioteca-prompts')} className="text-foreground hover:text-foreground hover:bg-accent">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('planos.back')}
        </Button>
        <Button variant="outline" onClick={() => navigate('/login')} className="gap-2 border-border text-foreground hover:bg-accent hover:text-foreground">
          <LogIn className="w-4 h-4" />
          {t('planos.alreadyPremium')}
        </Button>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-16">
        {/* Limited Time Promo Banner with Countdown */}
        <div className="max-w-6xl mx-auto mb-6 rounded-xl overflow-hidden shadow-lg relative" style={{ background: "linear-gradient(90deg, #ff0059 0%, #cc0047 50%, #99003a 100%)" }}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-[shimmer_3s_ease-in-out_infinite] -translate-x-full" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 relative">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="text-white font-bold tracking-wide text-sm md:text-base">
                🎉 GPT Image 2 Ilimitado por 7 dias em qualquer assinatura!
              </span>
            </div>

            {/* Right: Countdown */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/80" />
              <span className="text-white/80 text-xs sm:text-sm font-medium">Oferta expira em</span>
              <div className="flex items-center gap-1">
                <div className="bg-black/30 rounded-md px-2 py-1 min-w-[28px] text-center">
                  <span className="text-white font-mono font-bold text-sm">{countdown.days}</span>
                </div>
                <span className="text-white/70 text-[10px]">d</span>
                <div className="bg-black/30 rounded-md px-2 py-1 min-w-[28px] text-center">
                  <span className="text-white font-mono font-bold text-sm">{countdown.hours}</span>
                </div>
                <span className="text-white/70 text-[10px]">h</span>
                <div className="bg-black/30 rounded-md px-2 py-1 min-w-[28px] text-center">
                  <span className="text-white font-mono font-bold text-sm">{countdown.minutes}</span>
                </div>
                <span className="text-white/70 text-[10px]">m</span>
                <div className="bg-black/30 rounded-md px-2 py-1 min-w-[28px] text-center">
                  <span className="text-white font-mono font-bold text-sm">{countdown.seconds}</span>
                </div>
                <span className="text-white/70 text-[10px]">s</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-foreground/70 text-xs mb-4 max-w-6xl mx-auto">Assine qualquer plano e ganhe acesso ao GPT Image 2 ilimitado por 7 dias!</p>

        <AnimatedSection animation="fade-up" className="text-center mb-10" as="div">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r dark:from-gray-400 dark:to-pink-400 from-purple-700 to-pink-600 bg-clip-text text-transparent mb-6">
            {t('planos.title')}
          </h1>

          <StatsCards />

          {/* Billing Toggle */}
          <Tabs value={billingPeriod} onValueChange={v => setBillingPeriod(v as "mensal" | "anual")} className="inline-flex">
            <TabsList className="bg-muted/60 border border-border shadow-sm">
              <TabsTrigger value="mensal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground px-6">
                {t('planos.monthly')}
              </TabsTrigger>
              <TabsTrigger value="anual" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground px-6 relative flex items-center gap-2">
                {t('planos.annualInstallments')}
                <span className="bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  52% OFF
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>


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
            const isUnlimitedBadge = (plan as any).isUnlimitedBadge;
            return (
            <div key={plan.name} className="flex flex-col h-full w-full">
              <Card className={`relative p-4 flex flex-col rounded-lg bg-card text-card-foreground w-full h-full shadow-sm ${isUnlimitedBadge ? "border-2 border-yellow-500/60 shadow-lg shadow-yellow-500/20" : isBestSeller ? "border-2 border-lime-500/60 shadow-lg shadow-lime-500/20" : hasCountdown ? "border-2 border-primary/50 shadow-lg shadow-primary/10" : "border border-border"}`}>
              {isBestSeller && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 border-0 text-[10px] whitespace-nowrap bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold px-3 py-0.5">
                  {t('planos.bestSeller')}
                </Badge>
              )}
              {hasCountdown && !isUnlimitedBadge && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 border-0 text-[10px] whitespace-nowrap bg-gradient-to-r from-purple-600 to-purple-500 text-white px-3 py-0.5">
                  MELHOR CUSTO/BENEFÍCIO
                </Badge>
              )}
              {isUnlimitedBadge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-0 text-[11px] whitespace-nowrap bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 text-black font-extrabold px-4 py-1 shadow-lg shadow-yellow-400/40 tracking-wider">
                  ✨ CRIE SEM LIMITES ✨
                </Badge>
              )}
              {(plan.promo || plan.popular) && !isBestSeller && !hasCountdown && !isUnlimitedBadge && (
                <Badge className={`absolute -top-2.5 left-1/2 -translate-x-1/2 border-0 text-[10px] whitespace-nowrap ${plan.promo ? "bg-orange-500 text-white" : "bg-green-500 text-white"}`}>
                  {plan.promo ? t('planos.launchPromo') : t('planos.popular')}
                </Badge>
              )}

              <div className="text-center mb-3 min-h-[32px] flex items-center justify-center">
                <h2 className="text-base font-bold text-foreground">{plan.name}</h2>
              </div>

              {/* Price Section - fixed height */}
              <div className="text-center mb-2 h-[75px] flex flex-col justify-center">
                {plan.originalPrice ? (
                  <p className="text-foreground/70 line-through text-xs">
                    R${plan.originalPrice}{t('planos.perMonth')}
                  </p>
                ) : (
                  <p className="text-transparent text-xs">.</p>
                )}
                <div className="flex items-baseline justify-center gap-0.5">
                  <span className="text-foreground/80 text-sm">R$</span>
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-foreground/80 text-xs">{t('planos.perMonth')}</span>
                </div>
                {billingPeriod === "anual" && (plan as any).yearlyTotal ? (
                  <p className="text-foreground/75 text-xs mt-1">
                    R${(plan as any).yearlyTotal}{t('planos.perYear')}
                  </p>
                ) : (
                  <p className="text-transparent text-xs mt-1">.</p>
                )}
              </div>

              {(() => {
                const targetSlug = PLAN_NAME_TO_SLUG[plan.name] || 'free';
                const targetLevel = PLAN_HIERARCHY[targetSlug] ?? 0;
                const userLevel = PLAN_HIERARCHY[activePlanSlug || (userId ? 'free' : '')] ?? -1;
                const isCurrentPlan = userId && activePlanSlug && targetSlug === activePlanSlug && billingPeriod === "mensal";
                const isUpgrade = userId && targetLevel > userLevel;
                const isFree = plan.name === "Free";
                const isAnnualUpgrade = userId && activePlanSlug && targetSlug === activePlanSlug && billingPeriod === "anual";

                let buttonText: string;
                let isDisabled = false;

                if (isFree) {
                  if (userId) { buttonText = "Você já tem uma conta"; isDisabled = true; }
                  else { buttonText = "Criar conta grátis"; }
                } else if (isCurrentPlan) {
                  buttonText = "Seu plano atual"; isDisabled = true;
                } else if (isAnnualUpgrade) {
                  buttonText = "Assinar anual";
                } else if (isUpgrade) {
                  buttonText = "Fazer upgrade";
                } else {
                  buttonText = (plan as any).hasTrial ? t('planos.freeTrial') : t('planos.subscribe');
                }

                return (
                  <>
                    <Button 
                      onClick={() => {
                        if (isFree) {
                          if (!userId) setShowSignupModal(true);
                        } else {
                          handleSubscriptionPurchase(plan.name);
                        }
                      }}
                      disabled={isDisabled || isMPLoading}
                      className={`w-full mb-1 text-sm h-9 ${isCurrentPlan ? "bg-muted border border-border text-muted-foreground cursor-not-allowed" : isUnlimitedBadge ? "bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 hover:from-yellow-500 hover:via-amber-600 hover:to-yellow-500 text-black font-bold" : isBestSeller ? "bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-white font-semibold" : hasCountdown ? "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold" : plan.popular ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-muted"}`}
                    >
                      {buttonText}
                    </Button>
                    {(plan as any).tagline && (
                      <p className="text-[10px] text-foreground/80 text-center mb-1 italic">{(plan as any).tagline}</p>
                    )}
                  </>
                );
              })()}

              {/* Savings Badge - fixed height container */}
              <div className="h-[28px] mb-2 flex items-center justify-center">
                {billingPeriod === "anual" ? (
                  plan.name === "Starter" || plan.name === "Free" ? (
                      <div className="flex items-center justify-center gap-1.5 bg-muted/70 border border-border rounded-full px-3 py-1 whitespace-nowrap">
                        <Tag className="w-3 h-3 text-foreground/80 flex-shrink-0" />
                        <span className="text-[10px] text-foreground/80">Sem diferença comparado ao mensal</span>
                    </div>
                  ) : (
                    <div className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1 whitespace-nowrap ${
                        plan.name === "Pro" ? "bg-amber-500/10 border border-amber-500/30" :
                        plan.name === "Ultimate" ? "bg-primary/10 border border-primary/30" :
                        "bg-primary/10 border border-primary/30"
                    }`}>
                      <Tag className={`w-3 h-3 flex-shrink-0 ${
                          plan.name === "Pro" ? "text-amber-700 dark:text-amber-300" :
                          plan.name === "Ultimate" ? "text-primary" :
                          "text-primary"
                      }`} />
                      <span className={`text-[10px] font-medium ${
                          plan.name === "Pro" ? "text-amber-700 dark:text-amber-300" :
                          plan.name === "Ultimate" ? "text-primary" :
                          "text-primary"
                      }`}>
                        Economize {(plan as any).savings} comparado ao mensal
                      </span>
                    </div>
                  )
                ) : null}
              </div>

              {/* Badge de Créditos - fixed height */}
              <div className="flex flex-col items-center mb-4 h-[44px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white bg-gradient-to-r from-purple-600 to-purple-500">
                  <Sparkles className="w-2.5 h-2.5" />
                  {(plan as any).credits}/mês
                  {String((plan as any).credits).toLowerCase().includes('ilimitado') && (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-white/80 cursor-pointer ml-0.5" />
                        </TooltipTrigger>
                          <TooltipContent side="top" className="bg-popover border-border text-popover-foreground text-xs max-w-[200px]">
                          14.000 créditos para usar em ferramentas não ilimitadas por mês
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </span>
                {(plan as any).images && (
                  <span className="text-[9px] text-foreground/75 mt-0.5">≈ {typeof (plan as any).images === 'string' ? (plan as any).images : `${(plan as any).images} imagens/mês`}</span>
                )}
              </div>

              {/* Seedance 2 Badge for Starter, Pro, Ultimate, Unlimited */}
              {(plan.name === "Starter" || plan.name === "Pro" || plan.name === "Ultimate" || plan.name === "IA Unlimited") && (
                <>
                <div className="mb-2 mx-auto w-full rounded-lg bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500 px-3 py-2 flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25">
                    <Video className="w-3.5 h-3.5 text-white" />
                    <span className="text-[12px] font-extrabold italic text-white tracking-wider">Seedance 2</span>
                    <span className="text-[8px] font-extrabold bg-white/15 border border-white/20 text-white px-2 py-0.5 rounded-full leading-none animate-pulse">INCLUSO</span>
                </div>
                <div className="mb-3 mx-auto w-full rounded-lg px-3 py-2 flex items-center justify-center gap-2 shadow-md" style={{ background: "linear-gradient(90deg, #ff0059, #cc0047)" }}>
                    <ImageIcon className="w-3.5 h-3.5 text-white" />
                    <span className="text-[12px] font-extrabold italic text-white tracking-wider">GPT Image 2</span>
                    <span className="text-[8px] font-extrabold bg-white/15 border border-white/20 text-white px-2 py-0.5 rounded-full leading-none animate-pulse">{plan.name === "IA Unlimited" ? "ILIMITADO" : "7 DIAS FREE"}</span>
                </div>
                </>
              )}

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
                        <Check className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3 h-3 text-foreground/60 shrink-0 mt-0.5" />
                      )}
                      <span className={`${feature.included ? "text-foreground" : "text-foreground/65"} flex items-center gap-1.5`}>
                        {(feature as any).iconType === 'video' && <Video className="w-3 h-3 shrink-0" />}
                        {(feature as any).iconType === 'image' && <ImageIcon className="w-3 h-3 shrink-0" />}
                        {feature.text}
                        {(feature as any).badge && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-black leading-none">
                            {(feature as any).badge}
                          </span>
                        )}
                        {(feature as any).promoBadge && feature.included && !(feature as any).badge && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-destructive text-destructive-foreground leading-none animate-pulse">
                            {(feature as any).promoBadge}
                          </span>
                        )}
                      </span>
                      {(feature as any).isAiTools && (
                        <ChevronDown className={`w-3 h-3 shrink-0 mt-0.5 transition-transform duration-200 ${feature.included ? 'text-foreground' : 'text-foreground/65'} ${expandedAiTools[plan.name] ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                    {(feature as any).isAiTools && expandedAiTools[plan.name] && (
                      <ul className="ml-5 mt-1 space-y-0.5">
                        {aiToolsList.map((tool, tIndex) => (
                          <li key={tIndex} className={`text-[10px] ${tIndex === aiToolsList.length - 1 ? 'text-foreground/70 italic' : 'text-foreground/70'}`}>
                            • {tool}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              {plan.name === "IA Unlimited" && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-[10px] text-foreground/80 mb-1.5 uppercase tracking-wide">
                    {t('planos.extraBenefits')}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-foreground">{t('planos.allAIFeatures')}</span>
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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 mb-4">
            <Coins className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Compre um pacote de créditos avulsos
          </h2>
          <p className="text-foreground/80 max-w-md mx-auto">
            Créditos <span className="text-primary font-semibold">vitalícios</span> que nunca expiram — use quando quiser!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { credits: "+1.500", description: "~25 imagens", price: "19,90", originalPrice: "39,90", savings: "", slug: "creditos-1500", icon: Coins, color: "from-purple-500 to-purple-400" },
            { credits: "+4.200", description: "~70 imagens", price: "29,90", originalPrice: "49,90", savings: "46", slug: "creditos-4200", popular: true, icon: Zap, color: "from-purple-500 to-pink-500" },
            { credits: "+14.000", description: "~233 imagens", price: "79,90", originalPrice: "149,90", savings: "57", slug: "creditos-14000", bestValue: true, icon: Star, color: "from-yellow-500 to-orange-500" },
          ].map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.credits}
                className={`relative p-6 bg-card border border-border shadow-sm flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.02] hover:border-primary/30 ${
                  plan.bestValue ? 'ring-2 ring-yellow-500/50 border-yellow-500/30' : ''
                } ${plan.popular ? 'ring-2 ring-primary/20 border-primary/30' : ''}`}
              >
                {plan.bestValue && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 px-3 py-1 text-xs">
                    ⭐ MELHOR VALOR
                  </Badge>
                )}
                {plan.popular && !plan.bestValue && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-3 py-1 text-xs">
                    🔥 POPULAR
                  </Badge>
                )}

                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center mb-3 mt-2`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <div className="mb-1">
                  <span className="text-2xl sm:text-3xl font-bold text-foreground">{plan.credits}</span>
                  <p className="text-foreground/75 text-sm">créditos</p>
                </div>

                <p className="text-foreground/75 text-sm mb-3">{plan.description}</p>

                {plan.savings && (
                  <Badge className="bg-primary/10 border border-primary/30 text-primary font-semibold text-xs mb-2 gap-1">
                    <Tag className="w-3 h-3" />
                    Economize {plan.savings}%
                  </Badge>
                )}

                <Badge variant="outline" className="bg-muted/70 border-border text-foreground text-xs mb-3">
                  ♾️ Vitalício
                </Badge>

                <div className="flex-1 flex flex-col justify-end w-full">
                  <div className="mb-4">
                    {plan.originalPrice && (
                      <span className="text-sm text-foreground/70 line-through block mb-1">R$ {plan.originalPrice}</span>
                    )}
                    <div>
                      <span className="text-sm text-foreground/80">R$ </span>
                      <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleCreditPurchase(plan.slug)}
                    className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-semibold py-5`}
                  >
                    Comprar Agora
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="max-w-4xl mx-auto mt-10 rounded-xl border border-border bg-card/70 shadow-sm px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0" />
            <div>
               <p className="text-foreground text-sm font-semibold leading-tight">Pagamento seguro</p>
               <p className="text-foreground/75 text-xs">transmissão criptografada SSL</p>
            </div>
          </div>
          <div className="hidden sm:block w-px h-8 bg-accent" />
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-muted-foreground shrink-0" />
            <div>
               <p className="text-foreground text-sm font-semibold leading-tight">Pagamento instantâneo</p>
               <p className="text-foreground/75 text-xs">Os pontos chegam instantaneamente.</p>
            </div>
          </div>
          <div className="hidden sm:block w-px h-8 bg-accent" />
          <div className="flex items-center gap-3">
            <Headset className="w-5 h-5 text-muted-foreground shrink-0" />
            <div>
               <p className="text-foreground text-sm font-semibold leading-tight">Suporte 24 horas por dia, 7 dias por semana</p>
               <p className="text-foreground/75 text-xs">Estamos à sua disposição a qualquer momento.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-foreground/80 text-sm max-w-lg mx-auto">
            💡 Os créditos vitalícios são consumidos <strong className="text-foreground">após</strong> os créditos mensais da sua assinatura,
            garantindo que você aproveite ao máximo seu plano.
          </p>
        </div>
      </section>

      <CreditsFAQSection />

      {/* Coming Soon Modal */}
      <Dialog open={showComingSoonModal} onOpenChange={setShowComingSoonModal}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-accent0/20 flex items-center justify-center">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-foreground">{t('planos.comingSoon.title')}</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              {t('planos.comingSoon.description')}
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowComingSoonModal(false)} className="w-full mt-4 bg-secondary hover:bg-secondary text-foreground">
            {t('planos.comingSoon.understood')}
          </Button>
        </DialogContent>
      </Dialog>

      <PagarmeCheckoutModal />

      {/* Signup Modal for Free plan */}
      <HomeAuthModal
        open={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onAuthSuccess={() => {
          setShowSignupModal(false);
          window.location.reload();
        }}
        startAtSignup
      />
    </div>
  );
};

export default Planos2;