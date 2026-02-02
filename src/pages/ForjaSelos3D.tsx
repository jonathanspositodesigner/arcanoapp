import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play } from "lucide-react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useSmartBackNavigation } from "@/hooks/useSmartBackNavigation";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";
import ToolsHeader from "@/components/ToolsHeader";

interface VideoLesson {
  titleKey: string;
  videoUrl: string;
  buttons?: { labelKey: string; url: string }[];
}

const lessons: VideoLesson[] = [
  {
    titleKey: "forja3DLessons.lesson1",
    videoUrl: "https://www.youtube.com/embed/LZN3RbMRZV0",
    buttons: [
      { labelKey: "forja3DLessons.createAccount", url: "https://www.runninghub.ai/?inviteCode=p93i9z36" },
      { labelKey: "forja3DLessons.accessTool", url: "https://www.runninghub.ai/post/1988729401963581442" }
    ]
  },
  {
    titleKey: "forja3DLessons.lesson2",
    videoUrl: "https://www.youtube.com/embed/WCfGZUHpZn8"
  },
  {
    titleKey: "forja3DLessons.lesson3",
    videoUrl: "https://www.youtube.com/embed/Y6hka2qUI3I"
  },
  {
    titleKey: "forja3DLessons.lesson4",
    videoUrl: "https://www.youtube.com/embed/C1-BNlYQTnY"
  },
  {
    titleKey: "forja3DLessons.lesson5",
    videoUrl: "https://www.youtube.com/embed/A_U_VBGA-24"
  },
  {
    titleKey: "forja3DLessons.lesson6",
    videoUrl: "https://www.youtube.com/embed/n5Xe4WrGzak"
  }
];

const ForjaSelos3D = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const { user, isPremium, planType, isLoading } = usePremiumStatus();
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia' });

  const hasAccess = isPremium && planType === "arcano_unlimited";

  useEffect(() => {
    if (!isLoading && (!user || !hasAccess)) {
      navigate("/ferramentas-ia");
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
    <div className="min-h-screen bg-[#0D0221]">
      <ToolsHeader 
        title={t('forja3DLessons.title')}
        subtitle={t('forja3DLessons.description')}
        onBack={goBack}
      />
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
    </div>
  );
};

export default ForjaSelos3D;
