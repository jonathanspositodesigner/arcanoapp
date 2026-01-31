import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Unlock, Sparkles, Zap, Target, Star } from "lucide-react";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/contexts/LocaleContext";
import { useSmartBackNavigation } from "@/hooks/useSmartBackNavigation";
// Fallback images for backwards compatibility
import upscalerV1Image from "@/assets/upscaler-v1-card.png";
import upscalerV2Image from "@/assets/upscaler-v1-5-card.png";

interface ToolVersionBadge {
  text: string;
  icon: 'sparkles' | 'zap' | 'target' | 'star';
  color: 'yellow' | 'blue' | 'purple' | 'green' | 'orange';
}

interface LocalizedVersionContent {
  name?: string;
}

interface ToolVersion {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  display_order: number;
  is_visible: boolean;
  unlock_days: number;
  badges: ToolVersionBadge[];
  localized?: {
    es?: LocalizedVersionContent;
    en?: LocalizedVersionContent;
  };
}

const ICON_MAP = {
  sparkles: Sparkles,
  zap: Zap,
  target: Target,
  star: Star,
};

const COLOR_MAP = {
  yellow: 'bg-yellow-500/30 text-yellow-300',
  blue: 'bg-blue-500/30 text-blue-300',
  purple: 'bg-purple-500/30 text-purple-300',
  green: 'bg-green-500/30 text-green-300',
  orange: 'bg-orange-500/30 text-orange-300',
};

// Fallback versions for backwards compatibility
const FALLBACK_VERSIONS: ToolVersion[] = [
  {
    id: 'v1',
    name: 'v1.0',
    slug: 'v1',
    cover_url: null,
    display_order: 0,
    is_visible: true,
    unlock_days: 0,
    badges: []
  },
  {
    id: 'v2',
    name: 'v2.0',
    slug: 'v2',
    cover_url: null,
    display_order: 1,
    is_visible: true,
    unlock_days: 7,
    badges: [
      { text: 'NOVO', icon: 'sparkles', color: 'yellow' },
      { text: 'MAIS RÁPIDO', icon: 'zap', color: 'blue' },
      { text: 'MAIOR FIDELIDADE', icon: 'target', color: 'purple' }
    ]
  }
];

const UpscalerArcanoVersionSelect = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const { locale } = useLocale();
  const { user, hasAccessToPack, isLoading: premiumLoading } = usePremiumArtesStatus();
  const { planType, isLoading: promptsLoading } = usePremiumStatus();
  
  // Locale-aware paths
  const toolsHomePath = locale === 'es' ? '/ferramentas-ia-es' : '/ferramentas-ia';
  const upscalerPlansPath = locale === 'es' ? '/planos-upscaler-arcano-69-es' : '/planos-upscaler-arcano-69';
  const loginPath = `/login-artes?redirect=${encodeURIComponent('/ferramenta-ia-artes/upscaller-arcano')}`;
  
  // Smart back navigation - for ES keep original behavior, for PT use smart back
  const { goBack } = useSmartBackNavigation({ fallback: toolsHomePath });
  
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(true);
  const [versions, setVersions] = useState<ToolVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(true);

  const hasUnlimitedAccess = planType === "arcano_unlimited";
  const hasUpscalerPack = hasAccessToPack('upscaller-arcano');
  const hasAccess = hasUnlimitedAccess || hasUpscalerPack;
  const isArcanoUnlimitedOnly = hasUnlimitedAccess && !hasUpscalerPack;

  // Fetch versions from database
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const { data, error } = await supabase
          .from('artes_packs')
          .select('tool_versions')
          .eq('slug', 'upscaller-arcano')
          .single();

        if (!error && data?.tool_versions) {
          const dbVersions = data.tool_versions as unknown as ToolVersion[];
          if (dbVersions && dbVersions.length > 0) {
            setVersions(dbVersions.filter(v => v.is_visible).sort((a, b) => a.display_order - b.display_order));
          } else {
            setVersions(FALLBACK_VERSIONS);
          }
        } else {
          setVersions(FALLBACK_VERSIONS);
        }
      } catch (err) {
        console.error('Error fetching versions:', err);
        setVersions(FALLBACK_VERSIONS);
      } finally {
        setLoadingVersions(false);
      }
    };

    fetchVersions();
  }, []);

  // Fetch purchase date for 7-day lock calculation
  useEffect(() => {
    const fetchPurchaseDate = async () => {
      if (!user) {
        setIsLoadingPurchase(false);
        return;
      }

      try {
        // 1) Prefer user_pack_purchases
        const { data, error } = await supabase
          .from('user_pack_purchases')
          .select('purchased_at')
          .eq('user_id', user.id)
          .in('pack_slug', ['upscaller-arcano', 'upscaler-arcano'])
          .eq('is_active', true)
          .order('purchased_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!error && data?.purchased_at) {
          setPurchaseDate(new Date(data.purchased_at));
          return;
        }

        // 2) Fallback: subscription-based access (if applicable)
        const { data: premiumData, error: premiumError } = await supabase
          .from('premium_artes_users')
          .select('subscribed_at, created_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!premiumError && premiumData) {
          const dt = premiumData.subscribed_at || premiumData.created_at;
          if (dt) setPurchaseDate(new Date(dt));
        }
      } catch (err) {
        console.error('Error fetching purchase date:', err);
      } finally {
        setIsLoadingPurchase(false);
      }
    };

    if (!premiumLoading) {
      fetchPurchaseDate();
    }
  }, [user, premiumLoading]);

  const isLoading = premiumLoading || promptsLoading || isLoadingPurchase || loadingVersions;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0221] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Não redireciona silenciosamente (isso parecia que "não saiu da página")
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0D0221]">
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">{t('upscaler.title')}</h1>
          <p className="text-purple-300">{t('versionSelect.loginRequired')}</p>
          <Button onClick={() => navigate(loginPath)} className="bg-gradient-to-r from-purple-600 to-blue-500">
            {t('ferramentas.login')}
          </Button>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#0D0221]">
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">{t('upscaler.title')}</h1>
          <p className="text-purple-300">{t('versionSelect.noAccess')}</p>
          <Button onClick={() => navigate(upscalerPlansPath)} className="bg-gradient-to-r from-purple-600 to-blue-500">
            {t('ferramentas.seePlans')}
          </Button>
        </div>
      </div>
    );
  }

  // Helper functions
  const getUnlockDate = (version: ToolVersion) => {
    // HARDCODED: v1 SEMPRE liberada imediatamente
    if (version.slug === 'v1') return null;
    
    // Normaliza unlock_days para número
    const unlockDays = Number(version.unlock_days ?? 0);
    if (unlockDays <= 0) return null;
    if (!purchaseDate) return null;
    
    // Clamp purchaseDate to prevent future dates from blocking access
    const now = new Date();
    const baseDate = purchaseDate > now ? now : purchaseDate;
    
    const unlockDate = new Date(baseDate);
    unlockDate.setDate(unlockDate.getDate() + unlockDays);
    return unlockDate;
  };

  const isVersionUnlocked = (version: ToolVersion) => {
    // HARDCODED: v1 SEMPRE liberada imediatamente
    if (version.slug === 'v1') return true;
    
    // Normaliza unlock_days para número
    const unlockDays = Number(version.unlock_days ?? 0);
    if (unlockDays <= 0) return true;
    
    const unlockDate = getUnlockDate(version);
    if (!unlockDate) return false;
    return new Date() >= unlockDate;
  };

  const getDaysRemaining = (version: ToolVersion) => {
    const unlockDate = getUnlockDate(version);
    if (!unlockDate) return 0;
    
    const diffMs = unlockDate.getTime() - new Date().getTime();
    return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Get localized version name
  const getVersionName = (version: ToolVersion) => {
    if (locale === 'es' && version.localized?.es?.name) {
      return version.localized.es.name;
    }
    return version.name;
  };

  const handleVersionClick = (version: ToolVersion) => {
    const isUnlocked = isVersionUnlocked(version);
    
    // If version has unlock_days > 0 and user only has unlimited access, show upgrade
    if (version.unlock_days > 0 && isArcanoUnlimitedOnly) {
      return; // Don't navigate, use button instead
    }
    
    if (isUnlocked) {
      // Always use dynamic route - database is the source of truth
      navigate(`/ferramenta-ia-artes/upscaller-arcano/${version.slug}`);
    }
  };

  const getVersionImage = (version: ToolVersion, index: number) => {
    if (version.cover_url) return version.cover_url;
    // Fallback to old images
    return index === 0 ? upscalerV1Image : upscalerV2Image;
  };

  const getVersionColors = (version: ToolVersion, isUnlocked: boolean) => {
    if (version.unlock_days > 0) {
      if (isArcanoUnlimitedOnly) {
        return 'bg-gradient-to-br from-orange-900/50 to-red-800/30 border-orange-500/30 hover:border-orange-400/50';
      }
      if (isUnlocked) {
        return 'bg-gradient-to-br from-yellow-900/50 to-orange-800/30 border-yellow-500/30 hover:border-yellow-400/50';
      }
      return 'bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-gray-600/30';
    }
    return 'bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500/30 hover:border-purple-400/50';
  };

  return (
    <div className="min-h-screen bg-[#0D0221]">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={locale === 'es' ? () => navigate(toolsHomePath) : goBack}
            className="shrink-0 text-purple-300 hover:text-white hover:bg-purple-500/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {t('upscaler.title')}
            </h1>
            <p className="text-purple-300 text-sm md:text-base">
              {t('versionSelect.chooseVersion')}
            </p>
          </div>
        </div>

        {/* Version Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {versions.map((version, index) => {
            const isUnlocked = isVersionUnlocked(version);
            const unlockDate = getUnlockDate(version);
            const daysRemaining = getDaysRemaining(version);
            const isClickable = (isUnlocked && !(version.unlock_days > 0 && isArcanoUnlimitedOnly)) || version.unlock_days === 0;

            return (
              <Card 
                key={version.id}
                className={`relative overflow-hidden transition-all ${
                  isClickable ? 'cursor-pointer group' : 'cursor-not-allowed'
                } ${getVersionColors(version, isUnlocked)}`}
                onClick={() => handleVersionClick(version)}
              >
                {/* Image with overlay if locked */}
                <div className="aspect-[3/4] overflow-hidden relative">
                  <img 
                    src={getVersionImage(version, index)} 
                    alt={`Upscaler Arcano ${version.name}`} 
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      isUnlocked && !(version.unlock_days > 0 && isArcanoUnlimitedOnly) 
                        ? 'group-hover:scale-105' 
                        : version.unlock_days > 0 && isArcanoUnlimitedOnly 
                          ? '' 
                          : 'grayscale'
                    }`}
                  />
                  {/* Cadeado para usuários bloqueados OU Arcano Unlimited que precisam fazer upgrade */}
                  {((!isUnlocked && version.unlock_days > 0) || (version.unlock_days > 0 && isArcanoUnlimitedOnly)) && (
                    <div className={`absolute inset-0 flex items-center justify-center ${
                      isArcanoUnlimitedOnly 
                        ? 'bg-black/40' 
                        : 'bg-black/60'
                    }`}>
                      <Lock className={`h-16 w-16 ${
                        isArcanoUnlimitedOnly 
                          ? 'text-orange-400' 
                          : 'text-gray-400'
                      }`} />
                    </div>
                  )}
                  
                  {/* Badges at bottom of image */}
                  {version.badges && version.badges.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-wrap gap-1.5 bg-gradient-to-t from-black/70 to-transparent">
                      {version.badges.map((badge, badgeIndex) => {
                        const IconComponent = ICON_MAP[badge.icon] || Sparkles;
                        const colorClass = COLOR_MAP[badge.color] || COLOR_MAP.yellow;
                        return (
                          <div 
                            key={badgeIndex} 
                            className={`flex items-center gap-1 ${colorClass} backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-medium`}
                          >
                            <IconComponent className="h-2.5 w-2.5" />
                            {badge.text}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Status Badge - top right */}
                <div className="absolute top-4 right-4">
                  {version.unlock_days > 0 && isArcanoUnlimitedOnly ? (
                    <div className="flex items-center gap-1.5 bg-orange-500/20 backdrop-blur-sm text-orange-400 px-3 py-1 rounded-full text-xs font-medium">
                      <Sparkles className="h-3 w-3" />
                      {t('versionSelect.upgrade')}
                    </div>
                  ) : isUnlocked ? (
                    <div className="flex items-center gap-1.5 bg-green-500/20 backdrop-blur-sm text-green-400 px-3 py-1 rounded-full text-xs font-medium">
                      <Unlock className="h-3 w-3" />
                      {t('versionSelect.available')}
                    </div>
                  ) : version.unlock_days > 0 ? (
                    <div className="flex items-center gap-1.5 bg-red-500/20 backdrop-blur-sm text-red-400 px-3 py-1 rounded-full text-xs font-medium">
                      <Lock className="h-3 w-3" />
                      {t('versionSelect.locked')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-green-500/20 backdrop-blur-sm text-green-400 px-3 py-1 rounded-full text-xs font-medium">
                      <Unlock className="h-3 w-3" />
                      {t('versionSelect.available')}
                    </div>
                  )}
                </div>

                {/* Version Badge - top left */}
                <div className="absolute top-4 left-4">
                  <div className={`px-4 py-1.5 rounded-full text-sm font-black shadow-lg ${
                    isUnlocked || isArcanoUnlimitedOnly
                      ? version.unlock_days > 0 ? 'bg-white text-orange-600' : 'bg-white text-purple-900'
                      : 'bg-white/80 text-gray-700'
                  }`}>
                    {getVersionName(version)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h2 className="text-lg md:text-xl font-bold text-foreground mb-3">
                    {t('upscaler.title')}
                  </h2>
                  
                  {/* Unlock Info - only for pack owners waiting */}
                  {!isUnlocked && !isArcanoUnlimitedOnly && unlockDate && version.unlock_days > 0 && (
                    <div className="bg-gray-800/50 rounded-lg p-3 mb-3 border border-gray-700/50">
                      <p className="text-sm text-gray-300">
                        <span className="font-medium text-yellow-400">{t('versionSelect.unlocksAt')}:</span>{' '}
                        {formatDate(unlockDate)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {t('versionSelect.daysRemaining', { count: daysRemaining })}
                      </p>
                    </div>
                  )}
                  
                  {/* Button logic based on access type */}
                  {version.unlock_days > 0 && isArcanoUnlimitedOnly ? (
                    <Button 
                      className="w-full bg-gradient-to-r from-orange-600 to-red-500 hover:from-orange-500 hover:to-red-400 text-white group-hover:scale-[1.02] transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(upscalerPlansPath);
                      }}
                    >
                      {t('versionSelect.acquireUpdated')}
                    </Button>
                  ) : isUnlocked ? (
                    <Button 
                      className={`w-full text-white group-hover:scale-[1.02] transition-transform ${
                        version.unlock_days > 0 
                          ? 'bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400'
                          : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400'
                      }`}
                    >
                      {t('versionSelect.accessLessons')}
                    </Button>
                  ) : (
                    <Button 
                      disabled
                      className="w-full bg-gray-700 text-gray-400 cursor-not-allowed"
                    >
                      {t('versionSelect.locked')}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UpscalerArcanoVersionSelect;
