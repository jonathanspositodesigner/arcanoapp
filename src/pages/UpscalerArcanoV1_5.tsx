import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Play } from "lucide-react";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { supabase } from "@/integrations/supabase/client";

interface VideoLesson {
  titleKey: string;
  videoUrl: string;
  buttons?: { labelKey: string; url: string }[];
}

// V1.5 lessons - To be configured
const lessons: VideoLesson[] = [
  // Add lessons here as needed
];

const UpscalerArcanoV1_5 = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const { user, hasAccessToPack, isLoading: premiumLoading } = usePremiumArtesStatus();
  const { planType, isLoading: promptsLoading } = usePremiumStatus();
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoadingCheck, setIsLoadingCheck] = useState(true);

  const hasUnlimitedAccess = planType === "arcano_unlimited";
  const hasAccess = hasUnlimitedAccess || hasAccessToPack('upscaller-arcano');

  // Check if 7 days have passed since purchase
  useEffect(() => {
    const checkUnlockStatus = async () => {
      if (!user) {
        setIsLoadingCheck(false);
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
          const purchaseDate = new Date(data.purchased_at);
          const unlockDate = new Date(purchaseDate);
          unlockDate.setDate(unlockDate.getDate() + 7);
          setIsUnlocked(new Date() >= unlockDate);
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
          if (dt) {
            const purchaseDate = new Date(dt);
            const unlockDate = new Date(purchaseDate);
            unlockDate.setDate(unlockDate.getDate() + 7);
            setIsUnlocked(new Date() >= unlockDate);
          }
        }
      } catch (err) {
        console.error('Error checking unlock status:', err);
      } finally {
        setIsLoadingCheck(false);
      }
    };

    if (!premiumLoading) {
      checkUnlockStatus();
    }
  }, [user, premiumLoading]);

  // Redirect if no access or not unlocked
  useEffect(() => {
    if (!premiumLoading && !promptsLoading && !isLoadingCheck) {
      if (!user || !hasAccess) {
        navigate("/ferramentas-ia");
      } else if (!isUnlocked) {
        navigate("/ferramenta-ia-artes/upscaller-arcano");
      }
    }
  }, [premiumLoading, promptsLoading, isLoadingCheck, user, hasAccess, isUnlocked, navigate]);

  const isLoading = premiumLoading || promptsLoading || isLoadingCheck;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !hasAccess || !isUnlocked) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/ferramenta-ia-artes/upscaller-arcano")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Upscaler Arcano v1.5
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Nova versão com atualizações e melhorias
            </p>
          </div>
        </div>

        {/* Video Lessons */}
        {lessons.length > 0 ? (
          <div className="space-y-8">
            {lessons.map((lesson, index) => (
              <Card key={index} className="p-4 md:p-6 bg-card border-border">
                <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  {t(lesson.titleKey)}
                </h2>
                
                {/* Video Player */}
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted mb-4">
                  <iframe
                    src={lesson.videoUrl}
                    title={t(lesson.titleKey)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* Action Buttons */}
                {lesson.buttons && lesson.buttons.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    {lesson.buttons.map((button, btnIndex) => (
                      <Button
                        key={btnIndex}
                        onClick={() => window.open(button.url, "_blank")}
                        className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t(button.labelKey)}
                      </Button>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 bg-card border-border text-center">
            <p className="text-muted-foreground">
              Em breve novas aulas serão adicionadas aqui.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UpscalerArcanoV1_5;
