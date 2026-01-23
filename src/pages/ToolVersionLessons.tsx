import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, ExternalLink, Lock, AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { useLocale } from "@/contexts/LocaleContext";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";

interface TutorialLesson {
  title: string;
  description: string;
  videoUrl: string;
  buttons: { text: string; url: string }[];
}

interface LocalizedVersionContent {
  name?: string;
  lessons?: TutorialLesson[];
}

interface ToolVersion {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  display_order: number;
  is_visible: boolean;
  unlock_days: number;
  badges: { text: string; icon: string; color: string }[];
  lessons: TutorialLesson[];
  localized?: {
    es?: LocalizedVersionContent;
    en?: LocalizedVersionContent;
  };
}

// Helper function to extract video embed URL from iframe or various URL formats
const getVideoEmbedUrl = (videoUrl: string): string | null => {
  if (!videoUrl) return null;
  
  // Check if it's an iframe - extract src
  if (videoUrl.includes('<iframe')) {
    const srcMatch = videoUrl.match(/src="([^"]+)"/);
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1];
    }
    return null;
  }
  
  // Check if it's already an embed URL
  if (videoUrl.includes('/embed/')) {
    return videoUrl;
  }
  
  // Convert YouTube watch URL to embed URL
  if (videoUrl.includes('youtube.com/watch')) {
    const videoId = new URL(videoUrl).searchParams.get('v');
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }
  
  // Handle youtu.be short URLs
  if (videoUrl.includes('youtu.be/')) {
    const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }
  
  // Return as-is for other video sources (Vimeo embed URLs, etc)
  return videoUrl;
};

const ToolVersionLessons = () => {
  const { toolSlug, versionSlug } = useParams<{ toolSlug: string; versionSlug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const { user, hasAccessToPack, isLoading: premiumLoading } = usePremiumArtesStatus();
  const { locale } = useLocale();
  
  // Locale-aware paths
  const currentPath = `/ferramenta-ia-artes/${toolSlug}/${versionSlug}`;
  const loginPath = `/login-artes?redirect=${encodeURIComponent(currentPath)}`;
  const toolSelectPath = `/ferramenta-ia-artes/${toolSlug}`;
  const plansPath = locale === 'es' ? `/planos-upscaler-arcano-69-es` : `/planos-${toolSlug}`;
  
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState<ToolVersion | null>(null);
  const [toolName, setToolName] = useState("");
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);

  // Get localized lessons based on current locale
  const lessons = useMemo(() => {
    if (!version) return [];
    
    // Check for localized lessons based on locale
    if (locale === 'es' && version.localized?.es?.lessons && version.localized.es.lessons.length > 0) {
      return version.localized.es.lessons;
    }
    // EN support for future (when LocaleContext is extended)
    const localeStr = locale as string;
    if (localeStr === 'en' && version.localized?.en?.lessons && version.localized.en.lessons.length > 0) {
      return version.localized.en.lessons;
    }
    
    // Fallback to Portuguese (default)
    return version.lessons || [];
  }, [version, locale]);

  // Get localized version name
  const versionName = useMemo(() => {
    if (!version) return '';
    
    if (locale === 'es' && version.localized?.es?.name) {
      return version.localized.es.name;
    }
    const localeStr = locale as string;
    if (localeStr === 'en' && version.localized?.en?.name) {
      return version.localized.en.name;
    }
    
    return version.name;
  }, [version, locale]);

  useEffect(() => {
    const fetchVersionData = async () => {
      if (!toolSlug || !versionSlug) return;

      try {
        const { data, error } = await supabase
          .from('artes_packs')
          .select('name, tool_versions')
          .eq('slug', toolSlug)
          .single();

        if (error) throw error;

        if (data) {
          setToolName(data.name);
          const versions = data.tool_versions as unknown as ToolVersion[] | null;
          if (versions && versions.length > 0) {
            const foundVersion = versions.find(v => v.slug === versionSlug);
            if (foundVersion) {
              setVersion(foundVersion);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching version data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVersionData();
  }, [toolSlug, versionSlug]);

  // Fetch purchase date
  useEffect(() => {
    const fetchPurchaseDate = async () => {
      if (!user || !toolSlug) return;

      try {
        const { data } = await supabase
          .from('user_pack_purchases')
          .select('purchased_at')
          .eq('user_id', user.id)
          .eq('pack_slug', toolSlug)
          .eq('is_active', true)
          .order('purchased_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (data?.purchased_at) {
          setPurchaseDate(new Date(data.purchased_at));
        }
      } catch (error) {
        console.error('Error fetching purchase date:', error);
      }
    };

    if (!premiumLoading && user) {
      fetchPurchaseDate();
    }
  }, [user, premiumLoading, toolSlug]);

  if (loading || premiumLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">{toolName}</h1>
          <p className="text-muted-foreground">{t('versionSelect.loginRequired')}</p>
          <Button onClick={() => navigate(loginPath)}>
            {t('ferramentas.login')}
          </Button>
        </div>
      </div>
    );
  }

  const hasAccess = toolSlug ? hasAccessToPack(toolSlug) : false;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">{toolName}</h1>
          <p className="text-muted-foreground">{t('versionSelect.noAccess')}</p>
          <Button onClick={() => navigate(plansPath)}>
            {t('ferramentas.seePlans')}
          </Button>
        </div>
      </div>
    );
  }

  // Check if version is unlocked
  const isVersionUnlocked = () => {
    if (!version) return false;
    
    // HARDCODED: v1 do Upscaler Arcano SEMPRE liberada imediatamente
    if (toolSlug === 'upscaller-arcano' && versionSlug === 'v1') return true;
    
    // Normaliza unlock_days para número (evita "0" string ou null)
    const unlockDays = Number(version.unlock_days ?? 0);
    
    // unlock_days <= 0 means immediately unlocked, no date check needed
    if (unlockDays <= 0) return true;
    
    // For versions with unlock_days > 0, we need a purchase date
    if (!purchaseDate) return false;
    
    // Clamp purchaseDate to prevent future dates from blocking access
    const now = new Date();
    const baseDate = purchaseDate > now ? now : purchaseDate;
    
    const unlockDate = new Date(baseDate);
    unlockDate.setDate(unlockDate.getDate() + unlockDays);
    return now >= unlockDate;
  };

  if (!version) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">{t('toolLessons.versionNotFound')}</h1>
          <p className="text-muted-foreground">{t('toolLessons.versionNotFoundDesc')}</p>
          <Button onClick={() => navigate(toolSelectPath)}>
            {t('upscaler.back')}
          </Button>
        </div>
      </div>
    );
  }

  if (!isVersionUnlocked()) {
    const now = new Date();
    const baseDate = purchaseDate && purchaseDate <= now ? purchaseDate : now;
    const unlockDate = new Date(baseDate);
    unlockDate.setDate(unlockDate.getDate() + version.unlock_days);
    
    const diffMs = unlockDate.getTime() - now.getTime();
    const daysRemaining = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
    const formattedDate = unlockDate.toLocaleDateString(locale === 'es' ? 'es-ES' : 'pt-BR');

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-4">
          <Lock className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">{toolName} - {versionName}</h1>
          <p className="text-muted-foreground">{t('toolLessons.versionLocked')}</p>
          <p className="text-yellow-500 font-medium">
            {t('toolLessons.unlocksOn', { date: formattedDate, days: daysRemaining })}
          </p>
          <Button variant="outline" onClick={() => navigate(toolSelectPath)}>
            {t('upscaler.back')}
          </Button>
        </div>
      </div>
    );
  }

  const currentLesson = lessons[selectedLesson];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 py-8 max-w-6xl flex-1">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(toolSelectPath)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {toolName} - {versionName}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {t('toolLessons.lessonsAvailable', { count: lessons.length })}
            </p>
          </div>
        </div>

        {/* Light Version Notice Banner */}
        {toolSlug === 'upscaller-arcano' && lessons.length >= 4 && (
          <div 
            onClick={() => setSelectedLesson(lessons.length - 1)}
            className="mb-6 p-4 bg-purple-600 
                       border border-purple-500 rounded-lg cursor-pointer 
                       hover:bg-purple-500 transition-all group"
          >
            <p className="text-white text-sm md:text-base flex items-center gap-2 font-medium">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>
                {t('toolLessons.lightVersionNotice')}
              </span>
              <ChevronRight className="h-4 w-4 ml-auto group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Area */}
          <div className="lg:col-span-2 space-y-4">
            {currentLesson && (
              <>
                {/* Video */}
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  {currentLesson.videoUrl ? (
                    (() => {
                      const embedUrl = getVideoEmbedUrl(currentLesson.videoUrl);
                      return embedUrl ? (
                        <iframe
                          src={embedUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Play className="w-16 h-16" />
                        </div>
                      );
                    })()
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Play className="w-16 h-16" />
                    </div>
                  )}
                </div>

                {/* Lesson Info */}
                <Card className="p-4">
                  <h2 className="text-xl font-bold mb-2">{currentLesson.title}</h2>
                  {currentLesson.description && (
                    <p className="text-muted-foreground mb-4">{currentLesson.description}</p>
                  )}
                  
                  {/* Action Buttons */}
                  {currentLesson.buttons && currentLesson.buttons.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {currentLesson.buttons.map((button, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          onClick={() => window.open(button.url, '_blank')}
                          className="gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {button.text}
                        </Button>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>

          {/* Lesson List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg mb-4">{t('toolLessons.lessons')}</h3>
            {lessons.map((lesson, index) => (
              <Card
                key={index}
                className={`p-3 cursor-pointer transition-all hover:bg-accent ${
                  selectedLesson === index ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedLesson(index)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    selectedLesson === index 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${
                      selectedLesson === index ? 'text-primary' : ''
                    }`}>
                      {lesson.title || `${t('toolLessons.lesson')} ${index + 1}`}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>

      {/* WhatsApp Support Button - No final absoluto da página */}
      <div className="container mx-auto px-4 pb-8 max-w-6xl">
        <WhatsAppSupportButton />
      </div>
    </div>
  );
};

export default ToolVersionLessons;
