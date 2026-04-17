import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Play, AlertTriangle, ChevronRight, Lock, Unlock, Check, CheckCircle2, Circle, Trophy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useSmartBackNavigation } from "@/hooks/useSmartBackNavigation";
import { supabase } from "@/integrations/supabase/client";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";
import WarrantyWaiverModal from "@/components/lessons/WarrantyWaiverModal";

interface VideoLesson {
  titleKey: string;
  videoUrl: string;
  buttons?: { labelKey: string; url: string }[];
}

// V2.0 lessons - To be configured
const lessons: VideoLesson[] = [
  // Add lessons here as needed
];

// Tool link for v2
const TOOL_LINK = "https://www.runninghub.ai/post/2008684425269219329";

const UpscalerArcanoV2 = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const { user, hasAccessToPack, isLoading: premiumLoading } = usePremiumArtesStatus();
  const { planType, isLoading: promptsLoading } = usePremiumStatus();
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramenta-ia-artes/upscaller-arcano' });
  
  const [selectedLesson, setSelectedLesson] = useState(0);

  // Gamification state
  const [watchedLessons, setWatchedLessons] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('watched_lessons_upscaller-arcano_v2-legacy');
    return saved ? JSON.parse(saved) : [];
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  
  // Warning modal state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const hasUnlimitedAccess = planType === "arcano_unlimited";
  const hasAccess = hasUnlimitedAccess || hasAccessToPack('upscaller-arcano') || hasAccessToPack('upscaller-arcano-v3');

  // Check if tool is unlocked (first 4 lessons or all if less than 4)
  const requiredLessons = Math.min(lessons.length, 4);
  const isToolButtonUnlocked = requiredLessons === 0 || Array.from({ length: requiredLessons }, (_, i) => i + 1).every(num => watchedLessons.includes(num));
  const progressCount = Math.min(watchedLessons.filter(n => n <= requiredLessons).length, requiredLessons);

  // Tooltip message based on progress
  const getTooltipMessage = () => {
    if (isToolButtonUnlocked) return t('toolLessons.toolUnlocked');
    if (progressCount === 0) return t('toolLessons.tooltipStart');
    if (progressCount === 1) return t('toolLessons.tooltipProgress1');
    if (progressCount === 2) return t('toolLessons.tooltipProgress2');
    return t('toolLessons.tooltipAlmostThere');
  };

  // Helper: persist watched lessons to localStorage
  const persistWatched = (next: number[]) => {
    setWatchedLessons(next);
    localStorage.setItem('watched_lessons_upscaller-arcano_v2-legacy', JSON.stringify(next));
  };

  // Handle lesson click - select and auto-mark as watched
  const handleLessonClick = (index: number) => {
    setSelectedLesson(index);
    const lessonNum = index + 1;
    if (!watchedLessons.includes(lessonNum)) {
      persistWatched([...watchedLessons, lessonNum]);
    }
  };

  // Toggle watched status for a lesson (manual button)
  const toggleWatchedStatus = (lessonNum: number) => {
    const updated = watchedLessons.includes(lessonNum)
      ? watchedLessons.filter(n => n !== lessonNum)
      : [...watchedLessons, lessonNum];
    persistWatched(updated);
  };

  // Check if button is a tool access button (should show warning modal)
  const isToolAccessButton = (labelKey: string): boolean => {
    const lowerKey = labelKey.toLowerCase();
    return lowerKey.includes('accesstool') || 
           lowerKey.includes('tool') || 
           lowerKey.includes('ferramenta') ||
           lowerKey.includes('herramienta') ||
           lowerKey.includes('link');
  };

  // Handle tool button click - show warning modal only if lessons not completed
  const handleToolButtonClick = (url: string) => {
    // If all required lessons are completed, open directly
    if (isToolButtonUnlocked) {
      window.open(url, '_blank');
      return;
    }
    // Otherwise show warning modal
    setPendingUrl(url);
    setShowWarningModal(true);
  };

  // Handle regular button click - open directly
  const handleRegularButtonClick = (url: string) => {
    window.open(url, '_blank');
  };

  const handleConfirmOpen = () => {
    if (pendingUrl) {
      window.open(pendingUrl, '_blank');
    }
    setShowWarningModal(false);
    setPendingUrl(null);
  };

  const handleContinueWatching = () => {
    setShowWarningModal(false);
    setPendingUrl(null);
  };

  // Detect unlock moment for confetti
  useEffect(() => {
    if (isToolButtonUnlocked && !justUnlocked && lessons.length > 0) {
      const wasUnlocked = localStorage.getItem('tool_unlocked_upscaller-arcano_v2-legacy');
      if (!wasUnlocked) {
        setShowConfetti(true);
        setJustUnlocked(true);
        localStorage.setItem('tool_unlocked_upscaller-arcano_v2-legacy', 'true');
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }
  }, [isToolButtonUnlocked, justUnlocked]);

  // Redirect if no access
  useEffect(() => {
    if (!premiumLoading && !promptsLoading) {
      if (!user || !hasAccess) {
        navigate("/ferramentas-ia-aplicativo");
      }
    }
  }, [premiumLoading, promptsLoading, user, hasAccess, navigate]);

  const isLoading = premiumLoading || promptsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-500"></div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  const currentLesson = lessons[selectedLesson];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header minimalista standalone */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-14">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="text-muted-foreground hover:text-foreground hover:bg-accent0/20 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar para Home</span>
          </Button>
          <h1 className="text-sm md:text-base font-bold text-foreground absolute left-1/2 -translate-x-1/2">
            Upscaler Arcano v2.0
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(user ? '/minha-conta' : '/auth')}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-accent0/20"
          >
            {user ? 'Minha Conta' : 'Login'}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl flex-1">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
            <div className="text-6xl animate-bounce">🎉</div>
            <div className="absolute text-5xl animate-ping" style={{ animationDelay: '0.1s' }}>✨</div>
            <div className="absolute text-4xl animate-pulse" style={{ animationDelay: '0.2s' }}>🎊</div>
          </div>
        )}

        {/* Subtitle */}
        <div className="mb-6">
          <p className="text-muted-foreground text-sm md:text-base">
            Nova versão com atualizações e melhorias
          </p>
        </div>

        {/* Master's Journey Progress Bar - Only show if there are lessons */}
        {lessons.length > 0 && (
          <div className="mb-6 p-4 bg-background/50 border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                {t('toolLessons.mastersJourney')}
              </span>
              <span className="text-xs text-muted-foreground">
                {progressCount}/{requiredLessons} {t('toolLessons.lessons').toLowerCase()}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="h-3 bg-accent rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 
                           transition-all duration-700 ease-out rounded-full"
                style={{ width: `${(progressCount / requiredLessons) * 100}%` }}
              />
            </div>
            
            {/* Lesson Indicators - Clickable */}
            <div className="flex justify-between mt-3">
              {Array.from({ length: requiredLessons }, (_, i) => i + 1).map((num) => {
                const isWatched = watchedLessons.includes(num);
                const nextLesson = Array.from({ length: requiredLessons }, (_, i) => i + 1).find(n => !watchedLessons.includes(n)) || requiredLessons + 1;
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
        <div className="mb-6 relative">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    disabled={!isToolButtonUnlocked}
                    onClick={() => window.open(TOOL_LINK, '_blank')}
                    className={`w-full h-12 text-base font-semibold transition-all duration-500 ${
                      isToolButtonUnlocked 
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white shadow-lg shadow-orange-500/30' 
                        : 'bg-zinc-700 text-zinc-300 border border-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    {isToolButtonUnlocked ? (
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
              {!isToolButtonUnlocked && (
                <TooltipContent side="bottom" className="bg-background border-border p-3 max-w-xs">
                  <p className="text-sm text-muted-foreground">{getTooltipMessage()}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Unlock message below button */}
          {!isToolButtonUnlocked && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              {t('toolLessons.watchToUnlock')}
            </p>
          )}
        </div>


        {/* Video Lessons */}
        {lessons.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player Area */}
            <div className="lg:col-span-2 space-y-4">
              {currentLesson && (
                <>
                  {/* Lesson Info - ABOVE video */}
                  <Card className="p-4 bg-background/50 border-border">
                    <h2 className="text-base md:text-xl font-bold mb-2 flex items-center gap-2 flex-wrap text-foreground">
                      <Play className="h-5 w-5 text-muted-foreground" />
                      {t(currentLesson.titleKey)}
                      {watchedLessons.includes(selectedLesson + 1) && (
                        <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full ml-2">
                          ✓ {t('toolLessons.completed')}
                        </span>
                      )}
                    </h2>
                  </Card>

                  {/* Video Player */}
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-accent">
                    <iframe
                      src={currentLesson.videoUrl}
                      title={t(currentLesson.titleKey)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  {/* Mark as Watched Button */}
                  <Button
                    variant={watchedLessons.includes(selectedLesson + 1) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleWatchedStatus(selectedLesson + 1)}
                    className={`w-full sm:w-auto ${
                      watchedLessons.includes(selectedLesson + 1) 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'border-border text-muted-foreground hover:bg-green-600/10 hover:text-green-500 hover:border-green-600'
                    }`}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {watchedLessons.includes(selectedLesson + 1) 
                      ? t('toolLessons.markedAsWatched')
                      : t('toolLessons.markAsWatched')
                    }
                  </Button>

                  {/* Action Buttons */}
                  {currentLesson.buttons && currentLesson.buttons.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      {currentLesson.buttons.map((button, btnIndex) => (
                        <Button
                          key={btnIndex}
                          onClick={() => 
                            isToolAccessButton(button.labelKey) 
                              ? handleToolButtonClick(button.url)
                              : handleRegularButtonClick(button.url)
                          }
                          className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t(button.labelKey)}
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Lesson List */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg mb-4 text-foreground">{t('toolLessons.lessons')}</h3>
              {lessons.map((lesson, index) => (
                <Card
                  key={index}
                  className={`p-3 cursor-pointer transition-all bg-background/50 border-border hover:bg-accent0/10 ${
                    selectedLesson === index ? 'border-border bg-accent0/10' : ''
                  }`}
                  onClick={() => handleLessonClick(index)}
                >
                  <div className="flex items-center gap-3">
                    {/* Lesson number or checkmark */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      watchedLessons.includes(index + 1)
                        ? 'bg-green-500 text-white'
                        : selectedLesson === index 
                          ? 'bg-accent text-accent-foreground' 
                          : 'bg-accent text-muted-foreground'
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
                        selectedLesson === index ? 'text-muted-foreground' : 'text-muted-foreground'
                      }`}>
                        {t(lesson.titleKey)}
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
              {lessons.length >= 4 && (
                <div 
                  onClick={() => handleLessonClick(lessons.length - 1)}
                  className="mt-4 px-3 py-1.5 bg-accent0/20 border border-border 
                             rounded-full cursor-pointer hover:bg-accent0/30 transition-all 
                             inline-flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>{t('toolLessons.lightVersionAvailable')}</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              )}
              
              {/* WhatsApp Support Button - MOBILE */}
              <div className="lg:hidden mt-6">
                <WhatsAppSupportButton />
              </div>
            </div>
          </div>
          ) : (
          <div className="space-y-8">
            <Card className="p-8 bg-background/50 border-border text-center">
              <p className="text-muted-foreground">
                Em breve novas aulas serão adicionadas aqui.
              </p>
            </Card>
            
            {/* WhatsApp Support Button - mesmo sem aulas, sempre último */}
            <div className="mt-6">
              <WhatsAppSupportButton />
            </div>
          </div>
        )}

      </div>

      {/* WhatsApp Support Button - DESKTOP */}
      {lessons.length > 0 && (
        <div className="hidden lg:block container mx-auto px-4 pb-8 max-w-6xl">
          <WhatsAppSupportButton />
        </div>
      )}

      {/* Warning Modal - Tool Access (com termo de waiver) */}
      <WarrantyWaiverModal
        open={showWarningModal}
        onOpenChange={setShowWarningModal}
        toolSlug="upscaller-arcano"
        versionSlug="v2-legacy"
        onConfirm={handleConfirmOpen}
        onCancel={handleContinueWatching}
      />
    </div>
  );
};

export default UpscalerArcanoV2;