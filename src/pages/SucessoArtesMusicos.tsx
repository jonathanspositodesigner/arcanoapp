import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Mail, LogIn, Music, Sparkles } from "lucide-react";

const SucessoArtesMusicos = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('library');
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div key={i} className="absolute animate-confetti" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s`, animationDuration: `${3 + Math.random() * 2}s` }}>
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)], transform: `rotate(${Math.random() * 360}deg)` }} />
            </div>
          ))}
        </div>
      )}

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-lg relative z-10 border-primary/20 shadow-2xl">
        <CardContent className="pt-8 pb-8 px-6 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-500 animate-pulse" />
            <Sparkles className="absolute -bottom-1 -left-2 w-5 h-5 text-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t('successMusicos.title')}</h1>
          <p className="text-muted-foreground mb-6">
            {t('successMusicos.welcome')} <span className="text-primary font-semibold">{t('successMusicos.platformName')}</span>!
          </p>

          <div className="bg-muted/50 rounded-xl p-5 mb-6 text-left space-y-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              {t('successMusicos.howToAccess')}
            </h2>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="text-sm text-foreground font-medium">{t('successMusicos.step1Title')}</p>
                  <p className="text-xs text-muted-foreground">{t('successMusicos.step1Description')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="text-sm text-foreground font-medium">{t('successMusicos.step2Title')}</p>
                  <p className="text-xs text-muted-foreground">{t('successMusicos.step2Description')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="text-sm text-foreground font-medium">{t('successMusicos.step3Title')}</p>
                  <p className="text-xs text-muted-foreground">{t('successMusicos.step3Description')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
            <Mail className="w-4 h-4" />
            <span>{t('successMusicos.spamWarning')}</span>
          </div>

          <Button onClick={() => navigate("/login-artes-musicos")} className="w-full h-12 text-base font-semibold" size="lg">
            <LogIn className="w-5 h-5 mr-2" />
            {t('successMusicos.loginButton')}
          </Button>

          <button onClick={() => navigate("/biblioteca-artes-musicos")} className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors">
            {t('successMusicos.goToLibrary')}
          </button>
        </CardContent>
      </Card>

      <style>{`
        @keyframes confetti { 0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
        .animate-confetti { animation: confetti 4s linear forwards; }
      `}</style>
    </div>
  );
};

export default SucessoArtesMusicos;