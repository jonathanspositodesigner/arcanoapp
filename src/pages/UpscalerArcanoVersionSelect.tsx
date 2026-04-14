import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Sparkles, Zap, Target, Star, ChevronRight } from "lucide-react";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/contexts/LocaleContext";
import { useSmartBackNavigation } from "@/hooks/useSmartBackNavigation";
import AppLayout from "@/components/layout/AppLayout";
// Fallback images for backwards compatibility
import upscalerV1Image from "@/assets/upscaler-v1-card.png";
import upscalerV2Image from "@/assets/upscaler-v1-5-card.png";

interface ToolVersionBadge {
  text: string;
  icon: 'sparkles' | 'zap' | 'target' | 'star';
  color: 'yellow' | 'blue' | 'dark' | 'green' | 'orange';
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
  green: 'bg-green-500/30 text-green-300',
  orange: 'bg-orange-500/30 text-orange-300',
   gray: 'bg-accent0/30 text-muted-foreground',
};

// Fallback versions for backwards compatibility
const FALLBACK_VERSIONS: ToolVersion[] = [
  {
     id: 'v2',
     name: 'v2.5',
     slug: 'v2',
    cover_url: null,
    display_order: 0,
    is_visible: true,
     badges: [
       { text: 'NOVO', icon: 'sparkles', color: 'yellow' },
       { text: 'MAIS RÁPIDO', icon: 'zap', color: 'blue' },
       { text: 'MAIOR FIDELIDADE', icon: 'target', color: 'blue' }
     ]
  },
  {
     id: 'v1',
     name: 'v1.5',
     slug: 'v1',
    cover_url: null,
    display_order: 1,
    is_visible: true,
     badges: []
  }
];

const UpscalerArcanoVersionSelect = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const { locale } = useLocale();
  const { user, hasAccessToPack, isLoading: premiumLoading } = usePremiumArtesStatus();
  const { planType, isLoading: promptsLoading } = usePremiumStatus();
  
  // Unified path for all locales
  const toolsHomePath = '/ferramentas-ia-aplicativo';
  const upscalerPlansPath = locale === 'es' ? '/planos-upscaler-arcano-69-es' : '/upscalerarcanov3';
  const loginPath = `/login-artes?redirect=${encodeURIComponent('/ferramenta-ia-artes/upscaller-arcano')}`;
  
  // Smart back navigation - for ES keep original behavior, for PT use smart back
  const { goBack } = useSmartBackNavigation({ fallback: toolsHomePath });
  
  const [versions, setVersions] = useState<ToolVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(true);

  const hasUnlimitedAccess = planType === "arcano_unlimited";
  const hasUpscalerPack = hasAccessToPack('upscaller-arcano');
  const hasV3Pack = hasAccessToPack('upscaller-arcano-v3');
  const hasAccess = hasUnlimitedAccess || hasUpscalerPack || hasV3Pack;
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
            // Show ALL versions including V3 (don't filter is_visible)
            setVersions(dbVersions.sort((a, b) => a.display_order - b.display_order));
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

  const isLoading = premiumLoading || promptsLoading || loadingVersions;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-500"></div>
      </div>
    );
  }

  // Não redireciona silenciosamente (isso parecia que "não saiu da página")
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">{t('upscaler.title')}</h1>
          <p className="text-muted-foreground">{t('versionSelect.loginRequired')}</p>
          <Button onClick={() => navigate(loginPath)} className="bg-gradient-to-r from-slate-600 to-blue-500">
            {t('ferramentas.login')}
          </Button>
        </div>
      </div>
    );
  }

  // Access is now universal — no gate needed

  // Get localized version name
  const getVersionName = (version: ToolVersion) => {
    if (locale === 'es' && version.localized?.es?.name) {
      return version.localized.es.name;
    }
    return version.name;
  };

  const handleVersionClick = (version: ToolVersion) => {
    navigate(`/ferramenta-ia-artes/upscaller-arcano/${version.slug}`);
  };

   const getVersionImage = (version: ToolVersion) => {
    if (version.cover_url) return version.cover_url;
    // Fallback to old images
     return version.slug === 'v1' ? upscalerV1Image : upscalerV2Image;
  };

  const getVersionColors = (_version: ToolVersion, _isUnlocked: boolean) => {
    return 'bg-gradient-to-br from-white/5 to-slate-700/30 border-border hover:border-border';
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {/* V2 Version Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {versions.map((version) => {
              const isV3 = version.name.toLowerCase().includes('v3') || version.slug === 'v3';
               const isLegacyVersion = !isV3 && (version.slug === 'v1' || version.name.toLowerCase().includes('1.5') || version.name.toLowerCase().includes('1.0'));
               const hasV2Access = hasUpscalerPack || hasV3Pack || hasUnlimitedAccess;
               const hasVersionAccess = isV3 ? (hasV3Pack || hasUnlimitedAccess) : hasV2Access;

            return (
              <Card 
                key={version.id + '-' + version.name}
                className={`relative overflow-hidden transition-all cursor-pointer group bg-gradient-to-br from-white/5 to-slate-700/30 border-border hover:border-border`}
                onClick={() => {
                  if (hasVersionAccess) {
                    handleVersionClick(version);
                  } else if (isV3) {
                    window.open('https://arcanoapp.voxvisual.com.br/upscalerarcanov3', '_blank');
                  }
                }}
              >
                {/* Image */}
                <div className="aspect-[3/4] overflow-hidden relative">
                  <img 
                     src={getVersionImage(version)} 
                    alt={`Upscaler Arcano ${version.name}`} 
                    className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105`}
                  />
                  
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
                 <div className="absolute top-4 right-4 flex flex-col gap-2">
                   {!hasVersionAccess && isV3 ? (
                     <div className="flex items-center gap-1.5 bg-accent0/20 backdrop-blur-sm text-muted-foreground px-3 py-1 rounded-full text-xs font-medium">
                       <Sparkles className="h-3 w-3" />
                       Novidades
                     </div>
                   ) : !hasVersionAccess ? (
                     <div className="flex items-center gap-1.5 bg-yellow-500/20 backdrop-blur-sm text-yellow-300 px-3 py-1 rounded-full text-xs font-medium">
                       <Lock className="h-3 w-3" />
                       Em Breve
                     </div>
                   ) : isLegacyVersion ? (
                     <div className="flex items-center gap-1.5 bg-gray-600/80 backdrop-blur-sm text-gray-200 px-3 py-1 rounded-full text-xs font-medium">
                       Versão defasada
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
                  <div className={`px-4 py-1.5 rounded-full text-sm font-black shadow-lg bg-white text-black`}>
                    {getVersionName(version)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h2 className={`text-lg md:text-xl font-bold mb-3 text-foreground`}>
                    {t('upscaler.title')} {isV3 ? 'V3' : ''}
                  </h2>

                  <Button 
                    className={`w-full ${hasVersionAccess 
                      ? 'bg-gradient-to-r from-slate-600 to-blue-500 hover:from-slate-500 hover:to-blue-400 text-white group-hover:scale-[1.02] transition-transform' 
                      : isV3
                        ? 'bg-gradient-to-r from-slate-600 to-slate-400 hover:opacity-90 text-white group-hover:scale-[1.02] transition-transform'
                        : 'bg-gray-600 text-muted-foreground cursor-not-allowed'
                    }`}
                    disabled={!hasVersionAccess && !isV3}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasVersionAccess) {
                        navigate(`/ferramenta-ia-artes/upscaller-arcano/${version.slug}`);
                      } else if (isV3) {
                        window.open('https://arcanoapp.voxvisual.com.br/upscalerarcanov3', '_blank');
                      }
                    }}
                  >
                    {hasVersionAccess ? (
                      <>{t('ferramentas.accessTool')} <ChevronRight className="h-4 w-4 ml-1" /></>
                    ) : isV3 ? (
                      <>Veja as Novidades <Sparkles className="h-4 w-4 ml-1" /></>
                    ) : (
                      <>Em Breve</>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default UpscalerArcanoVersionSelect;
