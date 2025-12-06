import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, ArrowLeft, Crown, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import logoHorizontal from "@/assets/logo_horizontal.png";

interface PlanInfo {
  id: string;
  name: string;
  slug: string;
  price: number;
  features: string[];
  isPopular?: boolean;
  checkoutUrl: string;
}

const UpgradePlano = () => {
  const navigate = useNavigate();
  const { user, isPremium } = usePremiumStatus();
  const [currentPlanType, setCurrentPlanType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const plans: PlanInfo[] = [
    {
      id: "arcano_basico",
      name: "Arcano Básico",
      slug: "basico",
      price: 14.90,
      features: [
        "10 prompts premium por dia",
        "Acesso a todo conteúdo premium",
        "Arcano Academy – Mini curso de IA",
        "Atualizações diárias",
        "Suporte via WhatsApp"
      ],
      checkoutUrl: "https://pay.greenn.com.br/arcano-basico"
    },
    {
      id: "arcano_pro",
      name: "Arcano Pro",
      slug: "pro",
      price: 29.90,
      isPopular: true,
      features: [
        "Prompts premium ilimitados",
        "Acesso a todo conteúdo premium",
        "Arcano Academy – Mini curso de IA",
        "IA que muda a roupa",
        "IA que muda pose",
        "Atualizações diárias",
        "Suporte prioritário via WhatsApp"
      ],
      checkoutUrl: "https://pay.greenn.com.br/arcano-pro"
    },
    {
      id: "arcano_unlimited",
      name: "Arcano IA Unlimited",
      slug: "unlimited",
      price: 49.90,
      features: [
        "Prompts premium ilimitados",
        "Acesso a todo conteúdo premium",
        "Arcano Academy – Mini curso de IA",
        "IA que muda a roupa",
        "IA que muda pose",
        "Upscale Arcano",
        "Forja de Selos 3D",
        "Atualizações diárias",
        "Suporte VIP via WhatsApp"
      ],
      checkoutUrl: "https://pay.greenn.com.br/arcano-unlimited"
    }
  ];

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
            alt="Arcano Lab" 
            className="h-8 cursor-pointer" 
            onClick={() => navigate('/')}
          />
          <Button
            variant="ghost"
            onClick={() => navigate('/biblioteca-prompts')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Title Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-2 rounded-full mb-4">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-600">Faça upgrade do seu plano</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Desbloqueie todo o potencial
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Você atingiu o limite diário de prompts do plano Básico. 
            Faça upgrade para continuar explorando nossa biblioteca completa!
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.id);
            const isUpgrade = !isCurrent && currentPlanType === "arcano_basico";
            
            return (
              <Card 
                key={plan.id}
                className={`relative p-6 flex flex-col ${
                  plan.isPopular 
                    ? 'border-2 border-primary shadow-lg scale-105' 
                    : 'border-border'
                } ${isCurrent ? 'bg-primary/5' : 'bg-card'}`}
              >
                {/* Popular Badge */}
                {plan.isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-white">
                    <Zap className="h-3 w-3 mr-1" />
                    Mais Popular
                  </Badge>
                )}

                {/* Current Plan Badge */}
                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white">
                    <Check className="h-3 w-3 mr-1" />
                    Plano Atual
                  </Badge>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-foreground">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                {isCurrent ? (
                  <Button disabled className="w-full bg-green-500/20 text-green-600 cursor-not-allowed">
                    <Check className="h-4 w-4 mr-2" />
                    Plano Atual
                  </Button>
                ) : (
                  <a href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer">
                    <Button 
                      className={`w-full ${
                        plan.isPopular 
                          ? 'bg-gradient-primary hover:opacity-90 text-white' 
                          : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white'
                      }`}
                    >
                      <Star className="h-4 w-4 mr-2" fill="currentColor" />
                      {isUpgrade ? 'Fazer Upgrade' : 'Assinar'}
                    </Button>
                  </a>
                )}
              </Card>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Seu limite diário será resetado à meia-noite.</p>
          <p className="mt-1">Dúvidas? Entre em contato pelo nosso suporte.</p>
        </div>
      </main>
    </div>
  );
};

export default UpgradePlano;
