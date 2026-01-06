import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, ExternalLink, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { toPackSlug } from "@/lib/utils";

interface LessonButton {
  text: string;
  url: string;
}

interface Lesson {
  title: string;
  description?: string;
  videoUrl: string;
  buttons?: LessonButton[];
}

interface FerramentaData {
  name: string;
  slug: string;
  tutorial_lessons: Lesson[] | null;
}

const FerramentaIAArtes = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [ferramenta, setFerramenta] = useState<FerramentaData | null>(null);
  const [loading, setLoading] = useState(true);
  const { isPremium, hasAccessToPack, isLoading: premiumLoading } = usePremiumArtesStatus();

  useEffect(() => {
    const fetchFerramenta = async () => {
      if (!slug) {
        navigate("/biblioteca-artes");
        return;
      }

      const { data, error } = await supabase
        .from("artes_packs")
        .select("name, slug, tutorial_lessons")
        .eq("slug", slug)
        .in("type", ["ferramentas_ia", "ferramenta"])
        .maybeSingle();

      if (error) {
        console.error("Error fetching ferramenta:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setFerramenta({
          name: data.name,
          slug: data.slug,
          tutorial_lessons: data.tutorial_lessons as unknown as Lesson[] | null
        });
      }
      setLoading(false);
    };

    fetchFerramenta();
  }, [slug, navigate]);

  const getEmbedUrl = (url: string) => {
    // Se for um código iframe, extrair o src
    if (url.includes('<iframe')) {
      const srcMatch = url.match(/src=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1]) {
        return srcMatch[1];
      }
    }
    
    if (url.includes("youtube.com/watch")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("vimeo.com/") && !url.includes("player.vimeo.com")) {
      const videoId = url.split("vimeo.com/")[1]?.split("?")[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  // Check if user has access to this tool (any active pack = access)
  const hasAccess = isPremium;

  if (loading || premiumLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Carregando...</div>
      </div>
    );
  }

  // If user doesn't have access, show access denied
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border p-4">
          <div className="container mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/biblioteca-artes?secao=ferramentas-ia")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {ferramenta?.name || "Ferramenta de IA"}
              </h1>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4 md:p-6">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Acesso Restrito
              </h2>
              <p className="text-muted-foreground mb-6">
                Esta ferramenta está disponível apenas para membros com acesso ativo.
              </p>
              <Button 
                onClick={() => navigate("/planos-artes")}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90"
              >
                Ver Planos
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const lessons = ferramenta?.tutorial_lessons || [];
  const title = ferramenta?.name || "Ferramenta de IA";
  const description = "Ferramenta de Inteligência Artificial";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="container mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/biblioteca-artes?secao=ferramentas-ia")}
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
                As aulas desta ferramenta serão disponibilizadas em breve.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {lessons.map((lesson, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{lesson.title}</CardTitle>
                  {lesson.description && (
                    <p className="text-muted-foreground text-sm mt-1">{lesson.description}</p>
                  )}
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

export default FerramentaIAArtes;
