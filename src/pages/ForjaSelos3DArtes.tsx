import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, ExternalLink } from "lucide-react";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";

interface Lesson {
  title: string;
  videoUrl: string;
  buttons?: {
    text: string;
    url: string;
  }[];
}

const ForjaSelos3DArtes = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const { hasAccessToPack, isLoading } = usePremiumArtesStatus();
  const [hasAccess, setHasAccess] = useState(false);
  const [checked, setChecked] = useState(false);

  // Lições do curso - configurar depois
  const lessons: Lesson[] = [
    // Exemplo de estrutura para adicionar lições:
    // {
    //   title: "Aula 1 - Introdução",
    //   videoUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
    //   buttons: [
    //     { text: "Acessar Ferramenta", url: "https://..." }
    //   ]
    // },
  ];

  useEffect(() => {
    if (!isLoading && !checked) {
      const access = hasAccessToPack("forja-selos-3d-ilimitada");
      setHasAccess(access);
      setChecked(true);
      
      if (!access) {
        navigate("/ferramentas-ia");
      }
    }
  }, [isLoading, checked, hasAccessToPack, navigate]);

  const getEmbedUrl = (url: string) => {
    if (url.includes("youtube.com/watch")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("vimeo.com/")) {
      const videoId = url.split("vimeo.com/")[1]?.split("?")[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  if (isLoading || !checked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">{t('forja3DArtes.loading')}</div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="container mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/ferramentas-ia")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {t('forja3DArtes.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('forja3DArtes.description')}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto p-4 md:p-6">
        {lessons.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {t('forja3DArtes.comingSoon')}
              </h2>
              <p className="text-muted-foreground">
                {t('forja3DArtes.comingSoonDesc')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {lessons.map((lesson, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{lesson.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={getEmbedUrl(lesson.videoUrl)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  
                  {lesson.buttons && lesson.buttons.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {lesson.buttons.map((button, btnIndex) => (
                        <Button
                          key={btnIndex}
                          onClick={() => window.open(button.url, "_blank")}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {button.text}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ForjaSelos3DArtes;
