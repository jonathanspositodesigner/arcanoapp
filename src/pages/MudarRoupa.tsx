import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { ArrowLeft, ExternalLink, Shirt, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MudarRoupa = () => {
  const navigate = useNavigate();
  const { isPremium, planType, isLoading } = usePremiumStatus();

  useEffect(() => {
    if (!isLoading) {
      if (!isPremium || (planType !== 'arcano_pro' && planType !== 'arcano_unlimited')) {
        navigate('/biblioteca-prompts');
      }
    }
  }, [isPremium, planType, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPremium || (planType !== 'arcano_pro' && planType !== 'arcano_unlimited')) {
    return null;
  }

  const lessons = [
    {
      title: "1. I.A que muda a roupa de qualquer foto",
      videoId: "LVw_UDtKFJs",
      buttons: [
        { label: "Crie sua conta na Running Hub", url: "https://www.runninghub.ai/?inviteCode=p93i9z36" },
        { label: "Acesse a Ferramenta", url: "https://www.runninghub.ai/ai-detail/1980306838455541762" }
      ]
    },
    {
      title: "2. Como usar grátis",
      videoId: "RI3vyGQD-2Q",
      buttons: [
        { label: "Acesse a Ferramenta Grátis", url: "https://www.runninghub.ai/post/1980310048037625858" }
      ]
    },
    {
      title: "3. NOVA AULA ATUALIZADA: Como usar a ferramenta de graça!",
      videoId: "-ZiVETjgekg",
      buttons: []
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/biblioteca-prompts')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Shirt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Mudar Roupa</h1>
              <p className="text-sm text-muted-foreground">IA que troca a roupa mantendo fidelidade do rosto</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {lessons.map((lesson, index) => (
            <div key={index} className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Lesson Header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{index + 1}</span>
                </div>
                <h2 className="text-lg font-semibold text-foreground">{lesson.title}</h2>
              </div>

              {/* Video Embed */}
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed/${lesson.videoId}`}
                  title={lesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>

              {/* Action Buttons */}
              {lesson.buttons.length > 0 && (
                <div className="p-4 bg-muted/30 flex flex-wrap gap-3">
                  {lesson.buttons.map((button, btnIndex) => (
                    <Button
                      key={btnIndex}
                      onClick={() => window.open(button.url, '_blank')}
                      className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {button.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MudarRoupa;
