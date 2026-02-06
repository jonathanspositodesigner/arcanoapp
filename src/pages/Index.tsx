import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useIsAppInstalled } from "@/hooks/useIsAppInstalled";
import { usePushNotifications } from "@/hooks/usePushNotifications";
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
  const { user, userPacks, isLoading: isPacksLoading } = usePackAccess();
  const { isLatam } = useLocale();

  // Verificar se usuário está logado
  const isLoggedIn = !!user;

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
      toast.success(t('toast.notificationsActivated'));
    } else {
      toast.error(t('toast.notificationsError'));
    }
  };

  // Verificar acessos do usuário (apenas se logado)
  const hasToolAccess = isLoggedIn && userPacks.some(p => TOOL_SLUGS.includes(p.pack_slug));
  const hasArtesAccess = isLoggedIn && userPacks.some(p => ARTES_SLUGS.includes(p.pack_slug));
  const hasPromptsAccess = isLoggedIn && isPremium;

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

  // Categorizar cards baseado nas compras do usuário (apenas se logado)
  const purchasedCards = isLoggedIn ? cards.filter(card => {
    if (card.id === 'ferramentas' && hasToolAccess) return true;
    if (card.id === 'artes' && hasArtesAccess) return true;
    if (card.id === 'prompts' && hasPromptsAccess) return true;
    return false;
  }) : [];

  const availableCards = isLoggedIn ? cards.filter(card => {
    if (card.id === 'ferramentas' && !hasToolAccess) return true;
    if (card.id === 'artes' && !hasArtesAccess) return true;
    if (card.id === 'prompts' && !hasPromptsAccess) return true;
    return false;
  }) : [];

  // Determinar se o card deve aparecer como "Em Breve" para LATAM
  const isCardComingSoon = (cardId: string) => {
    if (isLatamUpscalerOnly && (cardId === 'artes' || cardId === 'prompts')) {
      return true;
    }
    return false;
  };

  const isLoading = isPremiumLoading || isPacksLoading;

  // Card para usuário NÃO logado (descoberta)
  const DiscoverCard = ({ card }: { card: CardData }) => (
    <div 
      className="group bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/50 relative"
    >
      {/* Imagem */}
      <div className="relative overflow-hidden aspect-[16/9] md:aspect-[3/2]">
        <img 
          src={card.image} 
          alt={card.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ objectPosition: card.imagePosition }}
        />
      </div>
      
      {/* Conteúdo */}
      <div className="p-2 sm:p-2.5 md:p-3">
        <p className="text-[10px] md:text-[11px] text-muted-foreground mb-0.5">{card.category}</p>
        <h2 className="text-xs sm:text-xs md:text-sm font-semibold text-foreground mb-2 line-clamp-1">{card.title}</h2>
        <Button 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-10"
          onClick={() => navigate(card.route)}
        >
          {t('access')}
          <ExternalLink className="ml-1 h-3 w-3 md:h-4 md:w-4" />
        </Button>
      </div>
    </div>
  );

  // Card de compra realizada (com visual verde)
  const PurchasedCard = ({ card }: { card: CardData }) => (
    <div 
      className="group bg-card border-2 border-green-500/30 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:border-green-500/50 relative"
    >
      {/* Badge de acesso */}
      <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 z-10 flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-green-500/90 text-white text-[9px] md:text-xs font-medium shadow-sm">
        <Check className="h-2.5 w-2.5 md:h-3 md:w-3" />
        <span className="hidden sm:inline">{t('accessGranted')}</span>
      </div>
      
      {/* Imagem */}
      <div className="relative overflow-hidden aspect-[16/9] md:aspect-[3/2]">
        <img 
          src={card.image} 
          alt={card.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ objectPosition: card.imagePosition }}
        />
      </div>
      
      {/* Conteúdo */}
      <div className="p-2 sm:p-2.5 md:p-3">
        <p className="text-[10px] md:text-[11px] text-muted-foreground mb-0.5">{card.category}</p>
        <h2 className="text-xs sm:text-xs md:text-sm font-semibold text-foreground mb-2 line-clamp-1">{card.title}</h2>
        <Button 
          className="w-full bg-green-600 hover:bg-green-700 text-white text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-10"
          onClick={() => navigate(card.route)}
        >
          {t('access')}
          <ExternalLink className="ml-1 h-3 w-3 md:h-4 md:w-4" />
        </Button>
      </div>
    </div>
  );

  // Card disponível para compra (ou "Em Breve" para LATAM)
  const AvailableCard = ({ card, isComingSoon }: { card: CardData; isComingSoon: boolean }) => (
    <div 
      className={`group bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all duration-300 relative ${
        isComingSoon 
          ? 'grayscale opacity-60 cursor-not-allowed' 
          : 'hover:shadow-md hover:border-primary/50'
      }`}
    >
      {/* Badge "Em Breve" */}
      {isComingSoon && (
        <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 z-10 flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-muted text-muted-foreground text-[9px] md:text-xs font-medium shadow-sm">
          <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" />
          <span className="hidden sm:inline">{t('comingSoon')}</span>
        </div>
      )}
      
      {/* Imagem */}
      <div className="relative overflow-hidden aspect-[16/9] md:aspect-[3/2]">
        <img 
          src={card.image} 
          alt={card.title}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            isComingSoon ? '' : 'group-hover:scale-105'
          }`}
          style={{ objectPosition: card.imagePosition }}
        />
      </div>
      
      {/* Conteúdo */}
      <div className="p-2 sm:p-2.5 md:p-3">
        <p className="text-[10px] md:text-[11px] text-muted-foreground mb-0.5">{card.category}</p>
        <h2 className="text-xs sm:text-xs md:text-sm font-semibold text-foreground mb-2 line-clamp-1">{card.title}</h2>
        <Button 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-10"
          onClick={() => !isComingSoon && navigate(card.route)}
          disabled={isComingSoon}
        >
          {isComingSoon ? t('comingSoon') : t('access')}
          {!isComingSoon && <ExternalLink className="ml-1 h-3 w-3 md:h-4 md:w-4" />}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex flex-col">
      {/* Header fixo compacto */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between">
          <img alt="ArcanoApp" className="h-5 sm:h-6" src={logoHorizontal} />
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isAppInstalled ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/30 text-green-600">
                <Check className="h-3 w-3" />
                <span className="text-[10px] font-medium hidden sm:inline">{t('appInstalled')}</span>
              </div>
            ) : (
              <button 
                onClick={() => navigate("/install-app")} 
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-[10px] sm:text-xs font-medium hover:from-yellow-600 hover:to-amber-700 transition-all shadow-sm"
              >
                <Smartphone className="h-3 w-3" />
                <span className="hidden sm:inline">{t('installApp')}</span>
              </button>
            )}

            {showNotificationButton && (
              <button 
                onClick={handleActivateNotifications} 
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] sm:text-xs font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm"
              >
                <Bell className="h-3 w-3" />
                <span className="hidden sm:inline">{t('notifications')}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo principal compacto */}
      <main className="flex-1 flex flex-col items-center px-3 py-3 pt-14 md:px-10 lg:px-16">
        <div className="w-full max-w-6xl">
          {/* Títulos compactos */}
          <FadeIn delay={150} duration={600}>
            <div className="mb-3 sm:mb-4">
              <h1 className="text-lg sm:text-xl font-bold text-primary mb-0.5">
                {t('welcome')}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t('subtitle')}
              </p>
            </div>
          </FadeIn>

          {/* Loading state */}
          {isLoading ? (
            <div className="w-full animate-pulse">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="aspect-[16/10] bg-muted" />
                    <div className="p-2 sm:p-3 space-y-2">
                      <div className="h-2 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="h-7 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !isLoggedIn ? (
            /* Usuário NÃO logado - mostrar todos os cards */
            <section className="w-full">
              <FadeIn delay={200} duration={500}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/40">
                    <span className="text-primary text-[10px] sm:text-xs font-semibold">
                      {t('discoverPlatforms')}
                    </span>
                  </div>
                </div>
              </FadeIn>
              
              <StaggeredAnimation 
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4"
                staggerDelay={150}
                animation="fade-up"
              >
                {cards.map((card) => (
                  <div key={card.id} className="relative">
                    <DiscoverCard card={card} />
                  </div>
                ))}
              </StaggeredAnimation>
            </section>
          ) : (
            /* Usuário LOGADO - mostrar seções "Suas Compras" e "Veja também" */
            <>
              {/* Seção "Suas Compras" */}
              {purchasedCards.length > 0 && (
                <section className="w-full mb-4">
                  <FadeIn delay={200} duration={500}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/40">
                        <span className="text-green-500 text-[10px] sm:text-xs font-semibold flex items-center gap-1">
                          <Check className="h-2.5 w-2.5" />
                          {t('yourPurchases')}
                        </span>
                      </div>
                    </div>
                  </FadeIn>
                  
                  <StaggeredAnimation 
                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4"
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

              {/* Seção "Veja também" */}
              {availableCards.length > 0 && (
                <section className="w-full">
                  {purchasedCards.length > 0 && (
                    <FadeIn delay={300} duration={500}>
                      <h3 className="text-xs sm:text-sm text-muted-foreground mb-2 font-medium">
                        {t('seeAlso')}
                      </h3>
                    </FadeIn>
                  )}
                  
                  <StaggeredAnimation 
                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4"
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
        </div>
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
