import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Play } from "lucide-react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

interface VideoLesson {
  title: string;
  videoUrl: string;
  buttons?: { label: string; url: string }[];
}

const lessons: VideoLesson[] = [
  {
    title: "Aula 1 - Acessando nossa IA exclusiva",
    videoUrl: "https://www.youtube.com/embed/l7SaOQISidk",
    buttons: [
      { label: "Crie uma conta na Running Hub", url: "https://www.runninghub.ai/?inviteCode=p93i9z36" },
      { label: "Acesse a Ferramenta", url: "https://www.runninghub.ai/post/1976744965550358529" }
    ]
  },
  {
    title: "Aula 2 - Como Usar o Upscaller Arcano",
    videoUrl: "https://www.youtube.com/embed/mf39fwnowW4"
  },
  {
    title: "Aula 3 - Como usar de Graça e Ilimitado",
    videoUrl: "https://www.youtube.com/embed/v3xHVxRxt2E"
  }
];

const UpscalerArcano = () => {
  const navigate = useNavigate();
  const { user, isPremium, planType, isLoading } = usePremiumStatus();

  const hasAccess = isPremium && planType === "arcano_unlimited";

  console.log("UpscalerArcano - Debug:", { user: user?.id, isPremium, planType, isLoading, hasAccess });

  useEffect(() => {
    if (!isLoading && (!user || !hasAccess)) {
      console.log("UpscalerArcano - Redirecting because:", { user: !!user, hasAccess });
      navigate("/biblioteca-prompts");
    }
  }, [isLoading, user, hasAccess, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !hasAccess) {
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
            onClick={() => navigate("/biblioteca-prompts")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Upscaler Arcano
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Melhore suas imagens deixando em 4K e remova o fundo.
            </p>
          </div>
        </div>

        {/* Video Lessons */}
        <div className="space-y-8">
          {lessons.map((lesson, index) => (
            <Card key={index} className="p-4 md:p-6 bg-card border-border">
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                {lesson.title}
              </h2>
              
              {/* Video Player */}
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted mb-4">
                <iframe
                  src={lesson.videoUrl}
                  title={lesson.title}
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
                      {button.label}
                    </Button>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UpscalerArcano;
