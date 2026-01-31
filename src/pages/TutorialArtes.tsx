import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";

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

interface TutorialData {
  name: string;
  slug: string;
  tutorial_lessons: Lesson[] | null;
}

const TutorialArtes = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('prompts');
  const { slug } = useParams<{ slug: string }>();
  const [tutorial, setTutorial] = useState<TutorialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTutorial = async () => {
      if (!slug) {
        navigate("/biblioteca-artes");
        return;
      }

      const { data, error } = await supabase
        .from("artes_packs")
        .select("name, slug, tutorial_lessons")
        .eq("slug", slug)
        .eq("type", "tutorial")
        .maybeSingle();

      if (error) {
        console.error("Error fetching tutorial:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setTutorial({
          name: data.name,
          slug: data.slug,
          tutorial_lessons: data.tutorial_lessons as unknown as Lesson[] | null
        });
      }
      setLoading(false);
    };

    fetchTutorial();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0221] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const lessons = tutorial?.tutorial_lessons || [];
  const title = tutorial?.name || t('tutorial.title', { defaultValue: 'Tutorial' });
  const description = t('tutorial.learnWithTutorials');

  return (
    <div className="min-h-screen bg-[#0D0221]">
      {/* Header */}
      <header className="bg-[#1A0A2E] border-b border-purple-500/20 p-4">
        <div className="container mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/biblioteca-artes")}
            className="text-purple-300 hover:text-white hover:bg-purple-500/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">
              {title}
            </h1>
            <p className="text-sm text-purple-300">
              {description}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto p-4 md:p-6">
        {lessons.length === 0 ? (
          <Card className="max-w-2xl mx-auto bg-[#1A0A2E]/50 border-purple-500/20">
            <CardContent className="p-8 text-center">
              <Play className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                {t('tutorial.contentComingSoon')}
              </h2>
              <p className="text-purple-300">
                {t('tutorial.lessonsComingSoon')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {lessons.map((lesson, index) => (
              <Card key={index} className="bg-[#1A0A2E]/50 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-lg text-white">{lesson.title}</CardTitle>
                  {lesson.description && (
                    <p className="text-purple-300 text-sm mt-1">{lesson.description}</p>
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
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white"
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

        {/* WhatsApp Support Button */}
        <WhatsAppSupportButton />
      </main>
    </div>
  );
};

export default TutorialArtes;