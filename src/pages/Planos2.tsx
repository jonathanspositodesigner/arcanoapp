import { useState, useEffect } from "react";
import { getSanitizedUtms } from "@/lib/utmUtils";
import { getMetaCookies } from "@/lib/metaCookies";
import { useProcessingButton } from "@/hooks/useProcessingButton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, X, Sparkles, Clock, LogIn, Tag, ChevronDown, Coins, Zap, Star, ShieldCheck, Headset, Loader2, CreditCard, QrCode } from "lucide-react";
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
import PreCheckoutModal from "@/components/upscaler/PreCheckoutModal";
import HomeAuthModal from "@/components/HomeAuthModal";
import PaymentMethodModal from "@/components/checkout/PaymentMethodModal";
import CreditCardForm from "@/components/checkout/CreditCardForm";
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
  
  // Credit purchase state
  const [showPreCheckout, setShowPreCheckout] = useState(false);
  const [selectedCreditSlug, setSelectedCreditSlug] = useState('creditos-1500');
  const [pixLoading, setPixLoading] = useState<string | null>(null);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [pendingProfile, setPendingProfile] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [pendingPlanName, setPendingPlanName] = useState<string>("");
  const [isSubscriptionFlow, setIsSubscriptionFlow] = useState(false);
  const { planSlug: activePlanSlug } = usePlanos2Access(userId || undefined);
  const { isSubmitting: isCheckoutSubmitting, startSubmit: startCheckout, endSubmit: endCheckout } = useProcessingButton();

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

  const handleCreditPurchase = async (slug: string) => {
    if (!startCheckout()) return;
    
    if (!userId) {
      setSelectedCreditSlug(slug);
      setShowPreCheckout(true);
      endCheckout();
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, phone, cpf, address_line, address_zip, address_city, address_state, address_country')
        .eq('id', userId)
        .single();

      const isProfileComplete = profile?.name && profile?.phone && profile?.cpf 
        && profile?.address_line && profile?.address_zip && profile?.address_city && profile?.address_state;

      if (isProfileComplete) {
        setPendingSlug(slug);
        setPendingProfile(profile);
        setIsSubscriptionFlow(false);
        setShowPaymentMethodModal(true);
        endCheckout();
      } else {
        setSelectedCreditSlug(slug);
        setShowPreCheckout(true);
        endCheckout();
      }
    } catch {
      endCheckout();
    }
  };

  const handlePaymentMethodSelected = async (method: 'PIX' | 'CREDIT_CARD') => {
    if (!pendingSlug || !pendingProfile) return;

    // For subscriptions with credit card: open card form for tokenization
    if (isSubscriptionFlow && method === 'CREDIT_CARD') {
      setShowPaymentMethodModal(false);
      setShowCardForm(true);
      return;
    }

    // For PIX (subscription or credits) and credit card (credits only): use hosted checkout
    if (!startCheckout()) return;
    
    setPixLoading(pendingSlug);
    
    try {
      let utmData: Record<string, string> | null = null;
      try {
        const raw = sessionStorage.getItem('captured_utms');
        if (raw) utmData = JSON.parse(raw);
      } catch { /* ignore */ }

      const { fbp, fbc } = getMetaCookies();
      const body: any = {
        product_slug: pendingSlug,
        user_email: userEmail,
        user_phone: pendingProfile.phone,
        user_name: pendingProfile.name,
        user_cpf: pendingProfile.cpf,
        billing_type: method,
        utm_data: utmData,
        fbp,
        fbc,
      };

      // PIX: send address pre-filled; Credit card: omit address for antifraude form
      if (method === 'PIX') {
        body.user_address = {
          line_1: pendingProfile.address_line,
          zip_code: pendingProfile.address_zip,
          city: pendingProfile.address_city,
          state: pendingProfile.address_state,
          country: pendingProfile.address_country || 'BR'
        };
      }

      const response = await supabase.functions.invoke('create-pagarme-checkout', { body });

      if (response.error) {
        console.error('Erro checkout direto:', response.error);
        toast.error('Erro ao gerar pagamento. Tente novamente.');
        setPixLoading(null);
        setShowPaymentMethodModal(false);
        endCheckout();
        return;
      }

      const { checkout_url, event_id } = response.data;
      // Fire InitiateCheckout with event_id for deduplication with server-side CAPI
      if (typeof window !== 'undefined' && (window as any).fbq && event_id) {
        (window as any).fbq('track', 'InitiateCheckout', {}, { eventID: event_id });
      }
      if (checkout_url) {
        window.location.href = checkout_url;
        // Don't close modal — let the page navigate away naturally
        return;
      } else {
        toast.error('Erro ao gerar link de pagamento.');
      }
    } catch (error) {
      console.error('Erro checkout direto:', error);
      toast.error('Erro ao processar. Tente novamente.');
    }
    // Only reaches here on error — reset everything
    endCheckout();
    setPixLoading(null);
    setShowPaymentMethodModal(false);
  };

  // Handler for card token from CreditCardForm (subscription with real recurrence)
  const handleCardTokenGenerated = async (cardToken: string) => {
    if (!pendingSlug || !pendingProfile) return;
    if (!startCheckout()) return;

    try {
      let utmData: Record<string, string> | null = null;
      try {
        const raw = sessionStorage.getItem('captured_utms');
        if (raw) utmData = JSON.parse(raw);
      } catch { /* ignore */ }

      const response = await supabase.functions.invoke('create-pagarme-subscription', {
        body: {
          product_slug: pendingSlug,
          card_token: cardToken,
          user_email: userEmail,
          user_phone: pendingProfile.phone,
          user_name: pendingProfile.name,
          user_cpf: pendingProfile.cpf,
          utm_data: utmData,
          user_address: {
            line_1: pendingProfile.address_line,
            zip_code: pendingProfile.address_zip,
            city: pendingProfile.address_city,
            state: pendingProfile.address_state,
            country: pendingProfile.address_country || 'BR'
          }
        }
      });

      if (response.error) {
        const errorMsg = response.error?.message || 'Erro ao criar assinatura';
        console.error('Erro ao criar subscription:', response.error);
        toast.error(errorMsg);
        endCheckout();
        setShowCardForm(false);
        return;
      }

      const data = response.data;
      if (data?.success) {
        toast.success('Assinatura criada com sucesso! Seu plano será ativado em instantes.');
        setShowCardForm(false);
        // Redirect to success page
        window.location.href = 'https://arcanoapp.voxvisual.com.br/sucesso-compra';
        return;
      } else {
        toast.error(data?.error || 'Erro ao criar assinatura');
      }
    } catch (error: any) {
      console.error('Erro subscription:', error);
      toast.error('Erro ao processar assinatura. Tente novamente.');
    }

    endCheckout();
    setShowCardForm(false);
  };

  const countdown = formatTime(timeLeft);
  
  // Subscription purchase handler
  const handleSubscriptionPurchase = async (planName: string) => {
    const slugMap: Record<string, string> = {
      "Starter": `plano-starter-${billingPeriod}`,
      "Pro": `plano-pro-${billingPeriod}`,
      "Ultimate": `plano-ultimate-${billingPeriod}`,
      "IA Unlimited": `plano-unlimited-${billingPeriod}`,
    };
    const slug = slugMap[planName];
    if (!slug) return;

    if (!userId) {
      setSelectedCreditSlug(slug);
      setShowPreCheckout(true);
      return;
    }

    if (!startCheckout()) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, phone, cpf, address_line, address_zip, address_city, address_state, address_country')
        .eq('id', userId)
        .single();

      const isProfileComplete = profile?.name && profile?.phone && profile?.cpf 
        && profile?.address_line && profile?.address_zip && profile?.address_city && profile?.address_state;

      if (isProfileComplete) {
        setPendingSlug(slug);
        setPendingProfile(profile);
        setPendingPlanName(planName);
        setIsSubscriptionFlow(true);
        setShowPaymentMethodModal(true);
        endCheckout();
      } else {
        setSelectedCreditSlug(slug);
        setShowPreCheckout(true);
        endCheckout();
      }
    } catch {
      endCheckout();
    }
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
        {/* Limited Time Promo Banner with Countdown */}
        <div className="max-w-6xl mx-auto mb-6 rounded-xl overflow-hidden border border-red-500/30 bg-gradient-to-r from-red-950/80 via-purple-950/60 to-red-950/80">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3">
            {/* Left: Promo text */}
            <div className="flex items-center gap-2 animate-pulse">
              <span className="text-lg">🔥</span>
              <span className="text-white font-bold tracking-wide text-sm md:text-base">
                Promoção por tempo limitado!
              </span>
              <span className="text-lg">🔥</span>
            </div>

            {/* Right: Countdown */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-xs sm:text-sm font-medium">Essa oferta expira em</span>
              <div className="flex items-center gap-1">
                <div className="bg-red-900/60 border border-red-500/40 rounded-md px-2 py-1 min-w-[28px] text-center">
                  <span className="text-white font-mono font-bold text-sm">{countdown.hours}</span>
                </div>
                <span className="text-red-400 font-bold text-sm">:</span>
                <div className="bg-red-900/60 border border-red-500/40 rounded-md px-2 py-1 min-w-[28px] text-center">
                  <span className="text-white font-mono font-bold text-sm">{countdown.minutes}</span>
                </div>
                <span className="text-red-400 font-bold text-sm">:</span>
                <div className="bg-red-900/60 border border-red-500/40 rounded-md px-2 py-1 min-w-[28px] text-center">
                  <span className="text-white font-mono font-bold text-sm">{countdown.seconds}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AnimatedSection animation="fade-up" className="text-center mb-10" as="div">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
            {t('planos.title')}
          </h1>

          <StatsCards />

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
                  <Button 
                    onClick={() => {
                      if (isFree) {
                        if (!userId) setShowSignupModal(true);
                      } else {
                        handleSubscriptionPurchase(plan.name);
                      }
                    }}
                    disabled={isDisabled || isCheckoutSubmitting}
                    className={`w-full mb-2 text-sm h-9 ${isCurrentPlan ? "bg-purple-500/20 border border-purple-500/40 text-purple-300 cursor-not-allowed" : isBestSeller ? "bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 text-black font-semibold" : hasCountdown ? "bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-semibold" : plan.popular ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-900/50 hover:bg-purple-900/70 text-purple-200"}`}
                  >
                    {buttonText}
                  </Button>
                );
              })()}

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
            { credits: "+1.500", description: "~25 imagens", price: "19,90", originalPrice: "39,90", savings: "", slug: "creditos-1500", icon: Coins, color: "from-purple-500 to-fuchsia-500" },
            { credits: "+4.200", description: "~70 imagens", price: "29,90", originalPrice: "49,90", savings: "46", slug: "creditos-4200", popular: true, icon: Zap, color: "from-fuchsia-500 to-pink-500" },
            { credits: "+14.000", description: "~233 imagens", price: "79,90", originalPrice: "149,90", savings: "57", slug: "creditos-14000", bestValue: true, icon: Star, color: "from-yellow-500 to-orange-500" },
          ].map((plan) => {
            const Icon = plan.icon;
            const isLoading = pixLoading === plan.slug;
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
                    onClick={() => handleCreditPurchase(plan.slug)}
                    disabled={isLoading || !!pixLoading || isCheckoutSubmitting}
                    className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-semibold py-5 disabled:opacity-70`}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gerando pagamento...
                      </span>
                    ) : (
                      'Comprar Agora'
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="max-w-4xl mx-auto mt-10 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold leading-tight">Pagamento seguro</p>
              <p className="text-white/50 text-xs">transmissão criptografada SSL</p>
            </div>
          </div>
          <div className="hidden sm:block w-px h-8 bg-white/10" />
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold leading-tight">Pagamento instantâneo</p>
              <p className="text-white/50 text-xs">Os pontos chegam instantaneamente.</p>
            </div>
          </div>
          <div className="hidden sm:block w-px h-8 bg-white/10" />
          <div className="flex items-center gap-3">
            <Headset className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold leading-tight">Suporte 24 horas por dia, 7 dias por semana</p>
              <p className="text-white/50 text-xs">Estamos à sua disposição a qualquer momento.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-purple-400 text-sm max-w-lg mx-auto">
            💡 Os créditos vitalícios são consumidos <strong className="text-purple-300">após</strong> os créditos mensais da sua assinatura,
            garantindo que você aproveite ao máximo seu plano.
          </p>
        </div>
      </section>

      <CreditsFAQSection />

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

      {/* Payment Method Modal for complete profiles */}
      <PaymentMethodModal
        open={showPaymentMethodModal}
        onOpenChange={setShowPaymentMethodModal}
        onSelect={handlePaymentMethodSelected}
        isProcessing={isCheckoutSubmitting}
        colorScheme="purple"
      />

      {/* Credit Card Form for subscription with real recurrence */}
      <CreditCardForm
        open={showCardForm}
        onOpenChange={setShowCardForm}
        onTokenGenerated={handleCardTokenGenerated}
        isProcessing={isCheckoutSubmitting}
        planName={pendingPlanName}
      />

      {/* PreCheckout Modal for credit purchases */}
      <PreCheckoutModal
        isOpen={showPreCheckout}
        onClose={() => setShowPreCheckout(false)}
        userEmail={userEmail}
        userId={userId}
        productSlug={selectedCreditSlug}
      />

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