import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useIsAppInstalled } from "@/hooks/useIsAppInstalled";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { trackPushNotificationEvent } from "@/hooks/usePushNotificationAnalytics";
import { Check, Smartphone, Bell, ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";
import logoHorizontal from "@/assets/logo_horizontal.png";
import { FadeIn, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import HomeAuthModal from "@/components/HomeAuthModal";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { usePackAccess } from "@/hooks/usePackAccess";
import { useLocale } from "@/contexts/LocaleContext";

// Imagens de preview para os cards
import cardArtesArcanas from "@/assets/card-artes-arcanas.webp";
import cardPromptsIA from "@/assets/card-prompts-ia.png";
import cardFerramentasIA from "@/assets/card-ferramentas-ia.jpg";

// Slugs de ferramentas de IA (não conta como acesso à biblioteca de prompts)
const TOOL_SLUGS = [
  'upscaller-arcano',
  'forja-selos-3d-ilimitada',
  'ia-muda-pose',
  'ia-muda-roupa'
];

// Slugs de packs de artes (exclui ferramentas, bonus e cursos)
const ARTES_SLUGS = [
  'pack-arcano-vol-1', 'pack-arcano-vol-2', 'pack-arcano-vol-3',
  'pack-agendas', 'pack-de-carnaval', 'pack-de-halloween',
  'pack-fim-de-ano', '2200-fontes-para-eventos'
];

interface CardData {
  id: string;
  category: string;
  title: string;
  description: string;
  image: string;
  route: string;
  imagePosition: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('index');
  const isAppInstalled = useIsAppInstalled();
  const { subscribe } = usePushNotifications();
  const [showAuthModal, setShowAuthModal] = useState(true);
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();
  const { userPacks, isLoading: isPacksLoading } = usePackAccess();
  const { isLatam } = useLocale();

  const showNotificationButton = typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted';

  // Check if user is already logged in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setShowAuthModal(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setShowAuthModal(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  
  const handleActivateNotifications = async () => {
    const success = await subscribe();
    if (success) {
      trackPushNotificationEvent('activated_manual');
      toast.success(t('toast.notificationsActivated'));
    } else {
      trackPushNotificationEvent('permission_denied');
      toast.error(t('toast.notificationsError'));
    }
  };

  // Verificar acessos do usuário
  const hasToolAccess = userPacks.some(p => TOOL_SLUGS.includes(p.pack_slug));
  const hasArtesAccess = userPacks.some(p => ARTES_SLUGS.includes(p.pack_slug));
  const hasPromptsAccess = isPremium; // Da tabela premium_users

  // LATAM que comprou apenas upscaler
  const hasOnlyUpscaler = userPacks.some(p => p.pack_slug === 'upscaller-arcano') && 
                          !userPacks.some(p => ARTES_SLUGS.includes(p.pack_slug)) &&
                          !isPremium;
  const isLatamUpscalerOnly = isLatam && hasOnlyUpscaler;

  const cards: CardData[] = [
    {
      id: 'artes',
      category: t('cards.artesCategory'),
      title: t('cards.artesTitle'),
      description: t('cards.artesDescription'),
      image: cardArtesArcanas,
      route: "/biblioteca-artes",
      imagePosition: "center 30%",
    },
    {
      id: 'prompts',
      category: t('cards.promptsCategory'),
      title: t('cards.promptsTitle'),
      description: t('cards.promptsDescription'),
      image: cardPromptsIA,
      route: "/biblioteca-prompts",
      imagePosition: "center center",
    },
    {
      id: 'ferramentas',
      category: t('cards.toolsCategory'),
      title: t('cards.toolsTitle'),
      description: t('cards.toolsDescription'),
      image: cardFerramentasIA,
      route: "/ferramentas-ia",
      imagePosition: "center center",
    },
  ];

  // Categorizar cards baseado nas compras do usuário
  const purchasedCards = cards.filter(card => {
    if (card.id === 'ferramentas' && hasToolAccess) return true;
    if (card.id === 'artes' && hasArtesAccess) return true;
    if (card.id === 'prompts' && hasPromptsAccess) return true;
    return false;
  });

  const availableCards = cards.filter(card => {
    if (card.id === 'ferramentas' && !hasToolAccess) return true;
    if (card.id === 'artes' && !hasArtesAccess) return true;
    if (card.id === 'prompts' && !hasPromptsAccess) return true;
    return false;
  });

  // Determinar se o card deve aparecer como "Em Breve" para LATAM
  const isCardComingSoon = (cardId: string) => {
    if (isLatamUpscalerOnly && (cardId === 'artes' || cardId === 'prompts')) {
      return true;
    }
    return false;
  };

  const isLoading = isPremiumLoading || isPacksLoading;

  // Card de compra realizada (com visual verde)
  const PurchasedCard = ({ card }: { card: CardData }) => (
    <div 
      className="group bg-card border-2 border-green-500/30 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:border-green-500/50"
    >
      {/* Badge de acesso */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/90 text-white text-xs font-medium shadow-md">
        <Check className="h-3 w-3" />
        {t('accessGranted')}
      </div>
      
      {/* Imagem com hover zoom */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <img 
          src={card.image} 
          alt={card.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          style={{ objectPosition: card.imagePosition }}
        />
      </div>
      
      {/* Conteúdo abaixo da imagem */}
      <div className="p-4 sm:p-5">
        {/* Categoria */}
        <p className="text-xs text-muted-foreground mb-1">
          {card.category}
        </p>
        
        {/* Título */}
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4 line-clamp-2">
          {card.title}
        </h2>
        
        {/* Botão verde */}
        <Button 
          className="w-full bg-green-600 hover:bg-green-700 text-white text-sm"
          onClick={() => navigate(card.route)}
        >
          {t('access')}
          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  // Card disponível para compra (ou "Em Breve" para LATAM)
  const AvailableCard = ({ card, isComingSoon }: { card: CardData; isComingSoon: boolean }) => (
    <div 
      className={`group bg-card border border-border rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ${
        isComingSoon 
          ? 'grayscale opacity-60 cursor-not-allowed' 
          : 'hover:shadow-2xl hover:border-primary/50'
      }`}
    >
      {/* Badge "Em Breve" para LATAM */}
      {isComingSoon && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium shadow-md">
          <Clock className="h-3 w-3" />
          {t('comingSoon')}
        </div>
      )}
      
      {/* Imagem com hover zoom */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <img 
          src={card.image} 
          alt={card.title}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            isComingSoon ? '' : 'group-hover:scale-110'
          }`}
          style={{ objectPosition: card.imagePosition }}
        />
      </div>
      
      {/* Conteúdo abaixo da imagem */}
      <div className="p-4 sm:p-5">
        {/* Categoria */}
        <p className="text-xs text-muted-foreground mb-1">
          {card.category}
        </p>
        
        {/* Título */}
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4 line-clamp-2">
          {card.title}
        </h2>
        
        {/* Botão */}
        <Button 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
          onClick={() => !isComingSoon && navigate(card.route)}
          disabled={isComingSoon}
        >
          {isComingSoon ? t('comingSoon') : t('access')}
          {!isComingSoon && <ExternalLink className="ml-1.5 h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex flex-col">
      {/* Header fixo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <img alt="ArcanoApp" className="h-6 sm:h-7" src={logoHorizontal} />
          
          <div className="flex items-center gap-2 sm:gap-3">
            {isAppInstalled ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600">
                <Check className="h-3.5 w-3.5" />
                <span className="text-xs font-medium hidden sm:inline">{t('appInstalled')}</span>
              </div>
            ) : (
              <button 
                onClick={() => navigate("/install-app")} 
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-xs sm:text-sm font-medium hover:from-yellow-600 hover:to-amber-700 transition-all shadow-md hover:shadow-lg"
              >
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">{t('installApp')}</span>
              </button>
            )}

            {showNotificationButton && (
              <button 
                onClick={handleActivateNotifications} 
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs sm:text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">{t('notifications')}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo principal com padding para o header fixo */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 pt-24">
        {/* Títulos */}
        <FadeIn delay={150} duration={600}>
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2">
              {t('welcome')}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
        </FadeIn>

        {/* Loading state */}
        {isLoading ? (
          <div className="w-full max-w-5xl animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-5 bg-muted rounded w-2/3" />
                    <div className="h-10 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Seção "Suas Compras" - apenas se tiver alguma compra */}
            {purchasedCards.length > 0 && (
              <section className="w-full max-w-5xl mb-10">
                <FadeIn delay={200} duration={500}>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="px-4 py-1.5 rounded-full bg-green-500/15 border border-green-500/40">
                      <span className="text-green-500 text-sm font-semibold flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        {t('yourPurchases')}
                      </span>
                    </div>
                  </div>
                </FadeIn>
                
                <StaggeredAnimation 
                  className={`grid gap-6 sm:gap-8 ${
                    purchasedCards.length === 1 
                      ? 'grid-cols-1 max-w-sm mx-auto' 
                      : purchasedCards.length === 2 
                        ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  }`}
                  staggerDelay={150}
                  animation="fade-up"
                >
                  {purchasedCards.map((card) => (
                    <div key={card.id} className="relative">
                      <PurchasedCard card={card} />
                    </div>
                  ))}
                </StaggeredAnimation>
              </section>
            )}

            {/* Seção "Veja também" - cards disponíveis */}
            {availableCards.length > 0 && (
              <section className="w-full max-w-5xl">
                {purchasedCards.length > 0 && (
                  <FadeIn delay={300} duration={500}>
                    <h3 className="text-lg text-muted-foreground mb-5 font-medium">
                      {t('seeAlso')}
                    </h3>
                  </FadeIn>
                )}
                
                <StaggeredAnimation 
                  className={`grid gap-6 sm:gap-8 ${
                    availableCards.length === 1 
                      ? 'grid-cols-1 max-w-sm mx-auto' 
                      : availableCards.length === 2 
                        ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  }`}
                  staggerDelay={150}
                  animation="fade-up"
                >
                  {availableCards.map((card) => (
                    <div key={card.id} className="relative">
                      <AvailableCard 
                        card={card} 
                        isComingSoon={isCardComingSoon(card.id)}
                      />
                    </div>
                  ))}
                </StaggeredAnimation>
              </section>
            )}
          </>
        )}

        {/* Links de acesso */}
        <FadeIn delay={600} duration={600}>
          <div className="mt-10 flex items-center justify-center gap-4">
            <button 
              onClick={() => navigate("/admin-login")} 
              className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
            >
              {t('adminAccess')}
            </button>
            <span className="text-muted-foreground">•</span>
            <button 
              onClick={() => navigate("/parceiro-login-unificado")} 
              className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
            >
              {t('collaboratorAccess')}
            </button>
          </div>
        </FadeIn>
      </main>

      {/* Auth Modal */}
      <HomeAuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default Index;
