import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Lesson {
  title: string;
  videoUrl: string;
  buttons?: {
    text: string;
    url: string;
  }[];
}

interface TutorialConfig {
  [key: string]: {
    title: string;
    description: string;
    lessons: Lesson[];
  };
}

// Configuração dos tutoriais - adicionar lições aqui
const tutorialConfigs: TutorialConfig = {
  "como-editar-no-after-effects": {
    title: "Como Editar no After Effects",
    description: "Aprenda a editar suas artes no Adobe After Effects",
    lessons: [
      // Adicionar lições aqui quando necessário
      // {
      //   title: "Aula 1 - Introdução",
      //   videoUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
      //   buttons: [{ text: "Acessar Ferramenta", url: "https://..." }]
      // },
    ]
  },
  "como-editar-no-photoshop": {
    title: "Como Editar no Photoshop",
    description: "Aprenda a editar suas artes no Adobe Photoshop",
    lessons: []
  },
  "como-editar-no-canva": {
    title: "Como Editar no Canva",
    description: "Aprenda a editar suas artes no Canva",
    lessons: []
  }
};

const TutorialArtes = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [packInfo, setPackInfo] = useState<{ name: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackInfo = async () => {
      if (!slug) {
        navigate("/biblioteca-artes");
        return;
      }

      // Buscar info do pack pelo slug
      const { data } = await supabase
        .from("artes_packs")
        .select("name, slug")
        .eq("slug", slug)
        .eq("type", "tutorial")
        .maybeSingle();

      if (data) {
        setPackInfo(data);
      }
      setLoading(false);
    };

    fetchPackInfo();
  }, [slug, navigate]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Carregando...</div>
      </div>
    );
  }

  // Usa config específica ou fallback genérico
  const config = slug ? tutorialConfigs[slug] : null;
  const title = config?.title || packInfo?.name || "Tutorial";
  const description = config?.description || "Aprenda com nossos tutoriais gratuitos";
  const lessons = config?.lessons || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="container mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/biblioteca-artes")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {description}
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
                Conteúdo em breve
              </h2>
              <p className="text-muted-foreground">
                As aulas deste tutorial serão disponibilizadas em breve.
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

export default TutorialArtes;
