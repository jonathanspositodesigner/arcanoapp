import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Play, AlertTriangle, ChevronRight, Lock, Unlock, Check, CheckCircle2, Circle, Trophy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";

interface VideoLesson {
  titleKey: string;
  videoUrl: string;
  buttons?: { labelKey: string; url: string }[];
}

const lessons: VideoLesson[] = [
  {
    titleKey: "upscalerLessons.lesson1",
    videoUrl: "https://www.youtube.com/embed/l7SaOQISidk",
    buttons: [
      { labelKey: "upscalerLessons.createAccount", url: "https://www.runninghub.ai/?inviteCode=p93i9z36" },
      { labelKey: "upscalerLessons.accessTool", url: "https://www.runninghub.ai/post/1976744965550358529" }
    ]
  },
  {
    titleKey: "upscalerLessons.lesson2",
    videoUrl: "https://www.youtube.com/embed/mf39fwnowW4"
  },
  {
    titleKey: "upscalerLessons.lesson3",
    videoUrl: "https://www.youtube.com/embed/v3xHVxRxt2E"
  }
];

// Tool link from lesson 1
const TOOL_LINK = "https://www.runninghub.ai/post/1976744965550358529";

const UpscalerArcanoV1 = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const { user, hasAccessToPack, isLoading } = usePremiumArtesStatus();
  const { planType, isLoading: promptsLoading } = usePremiumStatus();

  const hasUnlimitedAccess = planType === "arcano_unlimited";
  const hasAccess = hasUnlimitedAccess || hasAccessToPack('upscaller-arcano');

  // Selected lesson for display
  const [selectedLesson, setSelectedLesson] = useState(0);

  // Gamification state
  const [watchedLessons, setWatchedLessons] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('watched_lessons_upscaller-arcano_v1-legacy');
    return saved ? JSON.parse(saved) : [];
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  
  // Warning modal state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  // Check if tool is unlocked (first 3 lessons for v1 since it only has 3 lessons)
  const requiredLessons = Math.min(lessons.length, 4);
  const isToolUnlocked = Array.from({ length: requiredLessons }, (_, i) => i + 1).every(num => watchedLessons.includes(num));
  const progressCount = Math.min(watchedLessons.filter(n => n <= requiredLessons).length, requiredLessons);

  // Tooltip message based on progress
  const getTooltipMessage = () => {
    if (isToolUnlocked) return t('toolLessons.toolUnlocked');
    if (progressCount === 0) return t('toolLessons.tooltipStart');
    if (progressCount === 1) return t('toolLessons.tooltipProgress1');
    if (progressCount === 2) return t('toolLessons.tooltipProgress2');
    return t('toolLessons.tooltipAlmostThere');
  };

  // Handle lesson click
  const handleLessonClick = (index: number) => {
    setSelectedLesson(index);
    const lessonNum = index + 1;
    if (!watchedLessons.includes(lessonNum)) {
      const updated = [...watchedLessons, lessonNum];
      setWatchedLessons(updated);
      localStorage.setItem('watched_lessons_upscaller-arcano_v1-legacy', JSON.stringify(updated));
    }
  };

  // Handle tool button click - show warning modal
  const handleToolButtonClick = (url: string) => {
    setPendingUrl(url);
    setShowWarningModal(true);
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
    if (isToolUnlocked && !justUnlocked) {
      const wasUnlocked = localStorage.getItem('tool_unlocked_upscaller-arcano_v1-legacy');
      if (!wasUnlocked) {
        setShowConfetti(true);
        setJustUnlocked(true);
        localStorage.setItem('tool_unlocked_upscaller-arcano_v1-legacy', 'true');
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }
  }, [isToolUnlocked, justUnlocked]);

  useEffect(() => {
    if (!isLoading && !promptsLoading && (!user || !hasAccess)) {
      navigate("/ferramentas-ia");
    }
  }, [isLoading, promptsLoading, user, hasAccess, navigate]);

  if (isLoading || promptsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
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
            onClick={() => navigate("/ferramenta-ia-artes/upscaller-arcano")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg md:text-3xl font-bold text-foreground">
              Upscaler Arcano v1.0
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {t('upscalerLessons.description')}
            </p>
          </div>
        </div>

        {/* Master's Journey Progress Bar */}
        <div className="mb-6 p-4 bg-card border border-border rounded-lg">
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
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-green-500 
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

        {/* Tool Link Button with Unlock System */}
        <div className="mb-6 relative">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    disabled={!isToolUnlocked}
                    onClick={() => window.open(TOOL_LINK, '_blank')}
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
                <p className="text-sm">{getTooltipMessage()}</p>
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


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Area */}
          <div className="lg:col-span-2 space-y-4">
            {currentLesson && (
              <>
                {/* Lesson Info - ABOVE video */}
                <Card className="p-4">
                  <h2 className="text-base md:text-xl font-bold mb-2 flex items-center gap-2 flex-wrap">
                    <Play className="h-5 w-5 text-primary" />
                    {t(currentLesson.titleKey)}
                    {watchedLessons.includes(selectedLesson + 1) && (
                      <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full ml-2">
                        ✓ {t('toolLessons.completed')}
                      </span>
                    )}
                  </h2>
                </Card>

                {/* Video Player */}
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
                  <iframe
                    src={currentLesson.videoUrl}
                    title={t(currentLesson.titleKey)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* Action Buttons */}
                {currentLesson.buttons && currentLesson.buttons.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    {currentLesson.buttons.map((button, btnIndex) => (
                      <Button
                        key={btnIndex}
                        onClick={() => handleToolButtonClick(button.url)}
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
            
            {/* WhatsApp Support Button - MOBILE */}
            <div className="lg:hidden mt-6">
              <WhatsAppSupportButton />
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Support Button - DESKTOP */}
      <div className="hidden lg:block container mx-auto px-4 pb-8 max-w-6xl">
        <WhatsAppSupportButton />
      </div>

      {/* Warning Modal - Tool Access */}
      <AlertDialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl">
              {t('toolLessons.warningModalTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              {t('toolLessons.warningModalDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel 
              onClick={handleContinueWatching}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
            >
              {t('toolLessons.continueWatching')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmOpen}
              className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
            >
              {t('toolLessons.assumeRisk')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UpscalerArcanoV1;