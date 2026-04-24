import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useIsAppInstalled } from "@/hooks/useIsAppInstalled";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Check, Smartphone, Bell, ExternalLink, Clock, RefreshCw, ShieldCheck, Users, User, LogIn, LogOut, Lock, Settings, Sun, Moon, Coins, PlusCircle, Phone } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import Seedance2PromoBanner from "@/components/Seedance2PromoBanner";
import GptImagePromoBanner from "@/components/GptImagePromoBanner";
import { useTheme } from "@/hooks/useTheme";
import { AnimatedCreditsDisplay } from "@/components/upscaler/AnimatedCreditsDisplay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Imagens de preview para os cards
import cardArtesArcanas from "@/assets/card-artes-arcanas.webp";
import cardPromptsIA from "@/assets/card-prompts-ia.png";
import cardFerramentasIA from "@/assets/card-ferramentas-ia.jpg";
import cardUpscalerVitalicio from "@/assets/card-upscaler-vitalicio.jpeg";

// Slugs de ferramentas de IA (não conta como acesso à biblioteca de prompts)
const TOOL_SLUGS = [
  'upscaller-arcano',
  'forja-selos-3d-ilimitada',
  'ia-muda-pose',
  'ia-muda-roupa',
  'arcano-cloner'
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

export const APP_BUILD_VERSION = '1.1.8';

const Index = () => {
  const navigate = useNavigate();
  
  const [isUpdating, setIsUpdating] = useState(false);

  const openForceUpdatePage = (source: string) => {
    const nextUrl = new URL('/force-update', window.location.origin);
    nextUrl.searchParams.set('from', source);
    nextUrl.searchParams.set('returnTo', `${window.location.pathname}${window.location.search}`);
    window.location.assign(nextUrl.toString());
  };

  // Service worker update check (non-blocking, no reload)
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) reg.update().catch(() => {});
      });
    }
  }, []);

  const handleManualUpdate = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    toast.info("Limpando cache do app...");

    try {
      // Step 1: Delete ALL caches directly
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.allSettled(cacheNames.map(name => caches.delete(name)));
        console.log('[ManualUpdate] Caches deleted:', cacheNames);
      }

      // Step 2: Unregister ALL service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          await reg.unregister();
        }
        console.log('[ManualUpdate] SWs unregistered:', registrations.length);
      }

      // Step 3: Small delay for cleanup to propagate
      await new Promise(r => setTimeout(r, 500));

      // Step 4: Hard redirect with cache-busting (no SW to intercept now)
      const url = new URL(window.location.pathname, window.location.origin);
      url.searchParams.set('_v', Date.now().toString());
      url.searchParams.set('_nocache', '1');
      window.location.replace(url.toString());
    } catch (error) {
      console.error('[ManualUpdate] Error:', error);
      // Fallback: just hard reload
      window.location.replace(`/?_v=${Date.now()}`);
    }
  };

  const { t } = useTranslation('index');
  const isAppInstalled = useIsAppInstalled();
  const { subscribe } = usePushNotifications();
  const [showAuthModal, setShowAuthModal] = useState(true);
  const signupInProgressRef = useRef(false);
  const { isPremium, planType, isLoading: isPremiumLoading } = usePremiumStatus();
  const { user, userPacks, isLoading: isPacksLoading } = usePackAccess();
  const { isLatam } = useLocale();
  const { isPlanos2User, hasImageGeneration, planos2Subscription } = useAuth();
  const planos2Slug = planos2Subscription?.plan_slug ?? null;
  const { breakdown: creditsBreakdown, isLoading: isCreditsLoading, balance: credits, isUnlimited } = useCredits();
  const { theme, toggleTheme } = useTheme();

  // Verificar se usuário está logado
  const isLoggedIn = !!user;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const showNotificationButton = typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted';

  // Capture referral code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      localStorage.setItem('referral_code', refCode);
      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && !signupInProgressRef.current) {
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

  // Aguarda TODOS carregarem antes de calcular qualquer acesso (evita flash de estado errado)
  const isLoading = isPremiumLoading || isPacksLoading || (isLoggedIn && isCreditsLoading);

  const TOOL_PLAN_TYPES = ['arcano_pro'];

  // Verificar se é planos2 pago (não-free)
  const isPlanos2Paid = isPlanos2User && planos2Slug !== 'free';

  // Verificar acessos do usuário — só calcula depois que tudo carregou
  // upscaller-arcano sozinho NÃO dá acesso ao card Ferramentas de IA
  const TOOL_ACCESS_SLUGS = TOOL_SLUGS.filter(s => s !== 'upscaller-arcano');
  const hasToolAccess = !isLoading && isLoggedIn && (
    userPacks.some(p => TOOL_ACCESS_SLUGS.includes(p.pack_slug)) ||
    isPlanos2Paid ||
    creditsBreakdown.lifetime > 0
  );
  // Card separado do Upscaler Arcano Vitalício
  const hasUpscalerPack = !isLoading && isLoggedIn && userPacks.some(p => p.pack_slug === 'upscaller-arcano' || p.pack_slug === 'upscaller-arcano-v3');
  const hasArtesAccess = !isLoading && isLoggedIn && userPacks.some(p => ARTES_SLUGS.includes(p.pack_slug));
  // hasPromptsAccess: premium SIM, mas NUNCA se planType for de ferramenta (arcano_pro, etc.)
  // OU planos2 pago (starter, pro, ultimate, unlimited)
  const hasPromptsAccess = !isLoading && isLoggedIn && (
    (isPremium && !TOOL_PLAN_TYPES.includes(planType ?? '')) ||
    isPlanos2Paid
  );

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
      route: "/ferramentas-ia-aplicativo",
      imagePosition: "center center",
    },
  ];

  // Categorizar cards baseado nas compras do usuário (apenas se logado)
  const purchasedCards = isLoggedIn ? [
    ...cards.filter(card => {
      if (card.id === 'ferramentas' && hasToolAccess) return true;
      if (card.id === 'artes' && hasArtesAccess) return true;
      if (card.id === 'prompts' && hasPromptsAccess) return true;
      return false;
    }),
    // Card exclusivo do Upscaler Arcano Vitalício
    ...(hasUpscalerPack ? [{
      id: 'upscaler-vitalicio',
      category: 'Ferramenta de IA',
      title: 'Upscaler Arcano Vitalício',
      description: 'Acesso vitalício ao Upscaler Arcano',
      image: cardUpscalerVitalicio,
      route: '/ferramenta-ia-artes/upscaller-arcano',
      imagePosition: 'center center',
    }] : []),
  ] : [];

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
      <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 z-10 flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-green-600 text-primary-foreground text-[9px] md:text-xs font-medium shadow-sm">
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
          className="w-full bg-green-600 hover:bg-green-700 text-primary-foreground text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-10"
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
            <button
              onClick={() => navigate("/admin-login")}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-[10px] sm:text-xs"
              title="Acesso Administrador"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Admin</span>
            </button>

            <button
              onClick={() => navigate("/parceiro-login-unificado")}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-[10px] sm:text-xs"
              title="Acesso Colaborador"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Colaborador</span>
            </button>

            {isAppInstalled ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/30 text-green-400">
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
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md bg-gradient-to-r from-purple-600 to-purple-500 text-primary-foreground text-[10px] sm:text-xs font-medium hover:from-purple-500 hover:to-purple-400 transition-all shadow-sm"
              >
                <Bell className="h-3 w-3" />
                <span className="hidden sm:inline">{t('notifications')}</span>
              </button>
            )}

            <button
              onClick={handleManualUpdate}
              disabled={isUpdating}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-[10px] sm:text-xs disabled:opacity-50"
              title="Atualizar app"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Atualizar</span>
            </button>

            {/* Login / User Menu */}
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                    <User className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-popover-foreground">
                  <DropdownMenuLabel className="text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">
                        {user?.email?.split('@')[0] || 'Meu Perfil'}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {user?.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator className="bg-border" />

                  <div className="px-2 py-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      Créditos
                    </span>
                    <div className="flex items-center gap-1">
                      <AnimatedCreditsDisplay 
                        credits={credits}
                        isLoading={isCreditsLoading}
                        size="sm"
                        showCoin={false}
                        variant="badge"
                        isUnlimited={isUnlimited}
                      />
                      <button
                        onClick={() => navigate('/planos-creditos')}
                        className="p-1 rounded hover:bg-accent"
                        title="Comprar créditos"
                      >
                        <PlusCircle className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  <DropdownMenuSeparator className="bg-border" />

                  <DropdownMenuItem
                    onClick={() => navigate('/change-password')}
                    className="cursor-pointer hover:bg-accent focus:bg-accent"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Alterar Senha
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate('/profile-settings')}
                    className="cursor-pointer hover:bg-accent focus:bg-accent"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={(e) => { e.preventDefault(); toggleTheme(); }}
                    className="cursor-pointer hover:bg-accent focus:bg-accent"
                  >
                    {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                    {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-border" />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-400 hover:bg-red-500/20 focus:bg-red-500/20 focus:text-red-400"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[10px] sm:text-xs font-medium hover:bg-primary/90 transition-all"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="px-3 pt-14">
        <div className="w-full max-w-7xl mx-auto">
          <GptImagePromoBanner />
        </div>
      </div>

      {/* Conteúdo principal compacto */}
      <main className="flex-1 flex flex-col px-3 py-3">
        <div className="w-full max-w-7xl mx-auto">

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

          {/* Banner Seedance 2 */}
          <Seedance2PromoBanner />

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

        </div>
      </main>

      {/* Auth Modal */}
      <HomeAuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={() => setShowAuthModal(false)}
        onSignupStart={() => { signupInProgressRef.current = true; }}
        onSignupEnd={() => { signupInProgressRef.current = false; }}
      />

      {/* Build version footer */}
      <div className="w-full text-center py-2 text-[10px] text-muted-foreground/40">
        v{APP_BUILD_VERSION}
      </div>

    </div>
  );
};

export default Index;
