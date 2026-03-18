import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play } from "lucide-react";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { useSmartBackNavigation } from "@/hooks/useSmartBackNavigation";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";
import AppLayout from "@/components/layout/AppLayout";

interface VideoLesson {
  titleKey: string;
  videoUrl: string;
  buttons?: { labelKey: string; url: string }[];
}

const lessons: VideoLesson[] = [
  {
    titleKey: "mudarPose.lesson1",
    videoUrl: "https://www.youtube.com/embed/LVw_UDtKFJs",
    buttons: [
      { labelKey: "mudarPose.createAccount", url: "https://www.runninghub.ai/?inviteCode=p93i9z36" },
      { labelKey: "mudarPose.accessTool", url: "https://www.runninghub.ai/ai-detail/1980306838455541762" }
    ]
  },
  {
    titleKey: "mudarPose.lesson2",
    videoUrl: "https://www.youtube.com/embed/RI3vyGQD-2Q",
    buttons: [
      { labelKey: "mudarPose.accessToolFree", url: "https://www.runninghub.ai/post/1980310048037625858" }
    ]
  },
  {
    titleKey: "mudarPose.lesson3",
    videoUrl: "https://www.youtube.com/embed/-ZiVETjgekg"
  }
];

const MudarPose = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const { user, isPremium, isLoading } = usePremiumArtesStatus();
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });

  // Qualquer pack ativo dá acesso (ferramenta bônus)
  const hasAccess = isPremium;

  useEffect(() => {
    if (!isLoading && (!user || !hasAccess)) {
      navigate("/ferramentas-ia-aplicativo");
    }
  }, [isLoading, user, hasAccess, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0221] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Video Lessons */}
        <div className="space-y-8">
          {lessons.map((lesson, index) => (
            <Card key={index} className="p-4 md:p-6 bg-[#1A0A2E]/50 border-purple-500/20">
              <h2 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Play className="h-5 w-5 text-purple-400" />
                {t(lesson.titleKey)}
              </h2>
              
              {/* Video Player */}
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/50 mb-4">
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

        {/* WhatsApp Support Button */}
        <WhatsAppSupportButton />
      </div>
    </AppLayout>
  );
};

export default MudarPose;
