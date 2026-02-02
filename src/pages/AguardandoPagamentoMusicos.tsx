import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Mail, ExternalLink, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumMusicosStatus } from "@/hooks/usePremiumMusicosStatus";

const AguardandoPagamentoMusicos = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('library');
  const [searchParams] = useSearchParams();
  const { user, isPremium, refetch } = usePremiumMusicosStatus();
  const [checkoutOpened, setCheckoutOpened] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const checkoutUrl = searchParams.get("checkout");
  const planName = searchParams.get("plan") || "Premium";

  useEffect(() => {
    if (checkoutUrl && !checkoutOpened) {
      window.open(checkoutUrl, "_blank");
      setCheckoutOpened(true);
    }
  }, [checkoutUrl, checkoutOpened]);

  useEffect(() => {
    if (!user?.id) return;
    setIsListening(true);
    const channel = supabase
      .channel('premium-musicos-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'premium_musicos_users', filter: `user_id=eq.${user.id}` }, (payload) => {
        // @ts-ignore
        if (payload.new?.is_active) { navigate('/sucesso-artes-musicos'); }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, navigate]);

  useEffect(() => { if (isPremium) { navigate('/sucesso-artes-musicos'); } }, [isPremium, navigate]);

  // Realtime is the only detection method - no polling needed

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-lg relative z-10 border-primary/20 shadow-xl">
        <CardContent className="pt-8 pb-8 px-6 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 mb-6">
            <Clock className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">{t('pendingMusicos.title')}</h1>
          <p className="text-muted-foreground mb-6">{t('pendingMusicos.description')} <span className="text-primary font-semibold">{planName}</span></p>

          {user && isListening && (
            <div className="bg-primary/10 rounded-lg p-3 mb-6 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-primary font-medium">{t('pendingMusicos.detecting')}</span>
            </div>
          )}

          <div className="bg-muted/50 rounded-xl p-5 mb-6 text-left space-y-4">
            <h2 className="font-semibold text-foreground">{t('pendingMusicos.whatHappens')}</h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-foreground">{t('pendingMusicos.instantProcessing')}</p>
                  <p className="text-xs text-muted-foreground">{t('pendingMusicos.instantDescription')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-foreground">{t('pendingMusicos.welcomeEmail')}</p>
                  <p className="text-xs text-muted-foreground">{t('pendingMusicos.welcomeDescription')}</p>
                </div>
              </div>
              {user && (
                <div className="flex gap-3">
                  <Loader2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground">{t('pendingMusicos.autoRedirect')}</p>
                    <p className="text-xs text-muted-foreground">{t('pendingMusicos.autoRedirectDescription')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {checkoutUrl && (
              <Button onClick={() => window.open(checkoutUrl, "_blank")} className="w-full" variant="default">
                <ExternalLink className="w-4 h-4 mr-2" />{t('pendingMusicos.openCheckout')}
              </Button>
            )}
            <Button onClick={() => navigate("/planos-artes-musicos")} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />{t('pendingMusicos.backToPlans')}
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">{t('pendingMusicos.alreadyPaid')}<br />{t('pendingMusicos.helpText')}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AguardandoPagamentoMusicos;