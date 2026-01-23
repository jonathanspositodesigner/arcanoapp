import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, ExternalLink, Lock, Unlock, AlertTriangle, ChevronRight, Check, CheckCircle2, Circle, Trophy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

// Helper to get tool link from lessons
const getToolLinkFromLessons = (lessons: TutorialLesson[]): string | null => {
  // Look for button with "Link" or "Acesse" or "Ferramenta" in lesson 2 (index 1)
  if (lessons.length >= 2 && lessons[1]?.buttons) {
    const toolButton = lessons[1].buttons.find(b => 
      b.text.toLowerCase().includes('link') || 
      b.text.toLowerCase().includes('acesse') || 
      b.text.toLowerCase().includes('ferramenta') ||
      b.text.toLowerCase().includes('accede') ||
      b.text.toLowerCase().includes('herramienta')
    );
    if (toolButton) return toolButton.url;
  }
  
  // Fallback: search all lessons for tool link
  for (const lesson of lessons) {
    if (lesson.buttons) {
      const toolButton = lesson.buttons.find(b => 
        b.text.toLowerCase().includes('link') || 
        b.text.toLowerCase().includes('ferramenta') ||
        b.text.toLowerCase().includes('herramienta')
      );
      if (toolButton) return toolButton.url;
    }
  }
  
  return null;
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
  
  // Gamification state
  const [watchedLessons, setWatchedLessons] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(`watched_lessons_${toolSlug}_${versionSlug}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);

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

  // Tool link for the unlock button
  const toolLink = useMemo(() => getToolLinkFromLessons(lessons), [lessons]);

  // Check if tool is unlocked (first 4 lessons watched)
  const isToolUnlocked = useMemo(() => {
    return [1, 2, 3, 4].every(num => watchedLessons.includes(num));
  }, [watchedLessons]);

  // Progress count (max 4)
  const progressCount = useMemo(() => {
    return Math.min(watchedLessons.filter(n => n <= 4).length, 4);
  }, [watchedLessons]);

  // Tooltip message based on progress
  const tooltipMessage = useMemo(() => {
    if (isToolUnlocked) return t('toolLessons.toolUnlocked');
    if (progressCount === 0) return t('toolLessons.tooltipStart');
    if (progressCount === 1) return t('toolLessons.tooltipProgress1');
    if (progressCount === 2) return t('toolLessons.tooltipProgress2');
    if (progressCount === 3) return t('toolLessons.tooltipAlmostThere');
    return t('toolLessons.watchToUnlock');
  }, [progressCount, isToolUnlocked, t]);

  // Handle lesson click - mark as watched
  const handleLessonClick = (index: number) => {
    setSelectedLesson(index);
    const lessonNum = index + 1;
    if (!watchedLessons.includes(lessonNum)) {
      const updated = [...watchedLessons, lessonNum];
      setWatchedLessons(updated);
      localStorage.setItem(
        `watched_lessons_${toolSlug}_${versionSlug}`, 
        JSON.stringify(updated)
      );
    }
  };

  // Detect unlock moment for confetti
  useEffect(() => {
    if (isToolUnlocked && !justUnlocked) {
      const wasUnlocked = localStorage.getItem(`tool_unlocked_${toolSlug}_${versionSlug}`);
      if (!wasUnlocked) {
        setShowConfetti(true);
        setJustUnlocked(true);
        localStorage.setItem(`tool_unlocked_${toolSlug}_${versionSlug}`, 'true');
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }
  }, [isToolUnlocked, justUnlocked, toolSlug, versionSlug]);

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
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
            <div className="text-6xl animate-bounce">🎉</div>
            <div className="absolute text-5xl animate-ping" style={{ animationDelay: '0.1s' }}>✨</div>
            <div className="absolute text-4xl animate-pulse" style={{ animationDelay: '0.2s' }}>🎊</div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(toolSelectPath)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg md:text-3xl font-bold text-foreground">
              {toolName} - {versionName}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {t('toolLessons.lessonsAvailable', { count: lessons.length })}
            </p>
          </div>
        </div>

        {/* Master's Journey Progress Bar - Only for upscaler tools */}
        {toolSlug === 'upscaller-arcano' && lessons.length >= 4 && (
          <div className="mb-6 p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                {t('toolLessons.mastersJourney')}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('toolLessons.lessonsProgress', { current: progressCount })}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-green-500 
                           transition-all duration-700 ease-out rounded-full"
                style={{ width: `${(progressCount / 4) * 100}%` }}
              />
            </div>
            
            {/* Lesson Indicators - Clickable */}
            <div className="flex justify-between mt-3">
              {[1, 2, 3, 4].map((num) => {
                const isWatched = watchedLessons.includes(num);
                const nextLesson = [1, 2, 3, 4].find(n => !watchedLessons.includes(n)) || 5;
                const isNext = num === nextLesson;
                
                return (
                  <button
                    key={num}
                    onClick={() => handleLessonClick(num - 1)}
                    className={`flex flex-col items-center gap-1 transition-all ${
                      isWatched 
                        ? 'text-green-500 hover:text-green-400' 
                        : isNext 
                          ? 'text-primary hover:text-primary/80' 
                          : 'text-muted-foreground/50 cursor-not-allowed'
                    }`}
                    disabled={!isWatched && !isNext}
                  >
                    {isWatched ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : isNext ? (
                      <Play className="h-6 w-6 animate-pulse fill-current" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                    <span className="text-[10px]">{t('toolLessons.lesson')} {num}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tool Link Button with Unlock System */}
        {toolSlug === 'upscaller-arcano' && toolLink && (
          <div className="mb-6 relative">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      disabled={!isToolUnlocked}
                      onClick={() => window.open(toolLink, '_blank')}
                      className={`w-full h-12 text-base font-semibold transition-all duration-500 ${
                        isToolUnlocked 
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white shadow-lg shadow-orange-500/30' 
                          : 'bg-zinc-700 text-zinc-300 border border-zinc-600 cursor-not-allowed'
                      }`}
                    >
                      {isToolUnlocked ? (
                        <>
                          <Unlock className="h-5 w-5 mr-2" />
                          {t('toolLessons.accessTool')}
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </>
                      ) : (
                        <>
                          <Lock className="h-5 w-5 mr-2" />
                          {t('toolLessons.toolLinkLocked')}
                        </>
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-card border-border p-3 max-w-xs">
                  <p className="text-sm">{tooltipMessage}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Unlock message below button */}
            {!isToolUnlocked && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                {t('toolLessons.watchToUnlock')}
              </p>
            )}
          </div>
        )}


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Area */}
          <div className="lg:col-span-2 space-y-4">
            {currentLesson && (
              <>
                {/* Lesson Info - ABOVE video */}
                <Card className="p-4">
                  <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Play className="h-5 w-5 text-primary" />
                    {currentLesson.title}
                    {watchedLessons.includes(selectedLesson + 1) && (
                      <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full ml-2">
                        ✓ {t('toolLessons.completed')}
                      </span>
                    )}
                  </h2>
                  {currentLesson.description && (
                    <p className="text-muted-foreground">{currentLesson.description}</p>
                  )}
                </Card>

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
                onClick={() => handleLessonClick(index)}
              >
                <div className="flex items-center gap-3">
                  {/* Lesson number or checkmark */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    watchedLessons.includes(index + 1)
                      ? 'bg-green-500 text-white'
                      : selectedLesson === index 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {watchedLessons.includes(index + 1) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${
                      watchedLessons.includes(index + 1) ? 'text-green-500' :
                      selectedLesson === index ? 'text-primary' : ''
                    }`}>
                      {lesson.title || `${t('toolLessons.lesson')} ${index + 1}`}
                    </p>
                  </div>
                  
                  {/* Completed badge */}
                  {watchedLessons.includes(index + 1) && (
                    <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full shrink-0">
                      ✓
                    </span>
                  )}
                </div>
              </Card>
            ))}
            
            {/* Light Version Notice - Below lessons, above WhatsApp */}
            {toolSlug === 'upscaller-arcano' && lessons.length >= 4 && (
              <div 
                onClick={() => handleLessonClick(lessons.length - 1)}
                className="mt-4 px-3 py-1.5 bg-purple-500/20 border border-purple-400/30 
                           rounded-full cursor-pointer hover:bg-purple-500/30 transition-all 
                           inline-flex items-center gap-2 text-xs text-purple-300"
              >
                <AlertTriangle className="h-3 w-3" />
                <span>{t('toolLessons.lightVersionAvailable')}</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            )}
            
            {/* WhatsApp Support Button - MOBILE: dentro da lista, último elemento */}
            <div className="lg:hidden mt-6">
              <WhatsAppSupportButton />
            </div>
          </div>
        </div>

      </div>

      {/* WhatsApp Support Button - DESKTOP: fora do grid, full width no final */}
      <div className="hidden lg:block container mx-auto px-4 pb-8 max-w-6xl">
        <WhatsAppSupportButton />
      </div>
    </div>
  );
};

export default ToolVersionLessons;