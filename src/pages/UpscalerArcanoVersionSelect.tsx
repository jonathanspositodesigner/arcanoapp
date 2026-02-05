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
import ToolsHeader from "@/components/ToolsHeader";
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
   gray: 'bg-gray-500/30 text-gray-300',
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
       { text: 'MAIOR FIDELIDADE', icon: 'target', color: 'purple' }
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
  
  // Locale-aware paths
  const toolsHomePath = locale === 'es' ? '/ferramentas-ia-es' : '/ferramentas-ia';
  const upscalerPlansPath = locale === 'es' ? '/planos-upscaler-arcano-69-es' : '/planos-upscaler-arcano-69';
  const loginPath = `/login-artes?redirect=${encodeURIComponent('/ferramenta-ia-artes/upscaller-arcano')}`;
  
  // Smart back navigation - for ES keep original behavior, for PT use smart back
  const { goBack } = useSmartBackNavigation({ fallback: toolsHomePath });
  
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

  const isLoading = premiumLoading || promptsLoading || loadingVersions;

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
  const isVersionUnlocked = (_version: ToolVersion) => {
    // Todas as versões são desbloqueadas imediatamente para quem tem o pack
    return true;
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
    // Sempre navega - todas as versões estão desbloqueadas
    navigate(`/ferramenta-ia-artes/upscaller-arcano/${version.slug}`);
  };

   const getVersionImage = (version: ToolVersion) => {
    if (version.cover_url) return version.cover_url;
    // Fallback to old images
     return version.slug === 'v1' ? upscalerV1Image : upscalerV2Image;
  };

  const getVersionColors = (_version: ToolVersion, _isUnlocked: boolean) => {
    // Todas as versões usam o mesmo estilo - desbloqueadas
    return 'bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500/30 hover:border-purple-400/50';
  };

  return (
    <div className="min-h-screen bg-[#0D0221]">
      <ToolsHeader 
        title={t('upscaler.title')}
        subtitle={t('versionSelect.chooseVersion')}
        onBack={locale === 'es' ? () => navigate(toolsHomePath) : goBack}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Version Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {versions.map((version) => {
            const isUnlocked = true; // Todas desbloqueadas
             // Check if this is the legacy/deprecated version (v1 or v1.5)
             const isLegacyVersion = version.slug === 'v1' || version.name.toLowerCase().includes('1.5') || version.name.toLowerCase().includes('1.0');

            return (
              <Card 
                key={version.id}
                className={`relative overflow-hidden transition-all ${
                  'cursor-pointer group'
                } ${getVersionColors(version, isUnlocked)}`}
                onClick={() => handleVersionClick(version)}
              >
                {/* Image with overlay if locked */}
                <div className="aspect-[3/4] overflow-hidden relative">
                  <img 
                     src={getVersionImage(version)} 
                    alt={`Upscaler Arcano ${version.name}`} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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

                 {/* Status Badge - top right (or "defasada" badge) */}
                 <div className="absolute top-4 right-4 flex flex-col gap-2">
                   {isLegacyVersion ? (
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
                  <div className="px-4 py-1.5 rounded-full text-sm font-black shadow-lg bg-white text-purple-900">
                    {getVersionName(version)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h2 className="text-lg md:text-xl font-bold text-foreground mb-3">
                    {t('upscaler.title')}
                  </h2>

                  {/* Button - sempre disponível */}
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white group-hover:scale-[1.02] transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/ferramenta-ia-artes/upscaller-arcano/${version.slug}`);
                    }}
                  >
                    {t('ferramentas.accessTool')} <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
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
