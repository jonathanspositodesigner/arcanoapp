import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, ExternalLink, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useLocale } from "@/contexts/LocaleContext";
import { useSmartBackNavigation } from "@/hooks/useSmartBackNavigation";
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

interface FerramentaData {
  name: string;
  slug: string;
  tutorial_lessons: Lesson[] | null;
}

const FerramentaIAArtes = () => {
  const { t } = useTranslation('library');
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { locale } = useLocale();
  const [ferramenta, setFerramenta] = useState<FerramentaData | null>(null);
  const [loading, setLoading] = useState(true);
  const { isPremium, hasAccessToPack, isLoading: premiumLoading } = usePremiumArtesStatus();
  const { planType: promptsPlanType, isLoading: isPromptsLoading } = usePremiumStatus();
  
  // Unified path for all locales
  const toolsHomePath = '/ferramentas-ia-aplicativo';
  
  // Smart back navigation - for ES keep original behavior, for PT use smart back
  const { goBack } = useSmartBackNavigation({ fallback: toolsHomePath });

  useEffect(() => {
    const fetchFerramenta = async () => {
      if (!slug) {
        navigate(toolsHomePath);
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

  // Usuários com arcano_unlimited (plano de prompts) têm acesso a TODAS as ferramentas
  const hasUnlimitedAccess = promptsPlanType === "arcano_unlimited";
  
  // Ferramentas que são bônus (qualquer pack ativo dá acesso)
  const bonusTools = ["ia-muda-pose", "ia-muda-roupa"];
  
  // Lógica de acesso: Unlimited > Bônus > Compra direta
  const hasAccess = hasUnlimitedAccess || (slug && bonusTools.includes(slug) ? isPremium : hasAccessToPack(slug || ""));

  if (loading || premiumLoading || isPromptsLoading) {
    return (
      <div className="min-h-screen bg-[#0D0221] flex items-center justify-center">
        <div className="text-purple-300">{t('tools.loading')}</div>
      </div>
    );
  }

  // If user doesn't have access, show access denied
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#0D0221]">
        <header className="bg-[#1A0A2E] border-b border-purple-500/20 p-4">
          <div className="container mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={locale === 'es' ? () => navigate(toolsHomePath) : goBack}
            className="text-purple-300 hover:text-white hover:bg-purple-500/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
            <div>
              <h1 className="text-xl font-bold text-white">
                {ferramenta?.name || t('tools.aiTool')}
              </h1>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4 md:p-6">
          <Card className="max-w-2xl mx-auto bg-[#1A0A2E]/50 border-purple-500/20">
            <CardContent className="p-8 text-center">
              <Lock className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                {t('tools.restrictedAccess')}
              </h2>
              <p className="text-purple-300 mb-6">
                {t('tools.restrictedDescription')}
              </p>
              <Button 
                onClick={() => navigate("/planos-artes")}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90"
              >
                {t('tools.viewPlans')}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const lessons = ferramenta?.tutorial_lessons || [];
  const title = ferramenta?.name || t('tools.aiTool');
  const description = t('tools.aiToolDescription');

  return (
    <div className="min-h-screen bg-[#0D0221]">
      {/* Header */}
      <header className="bg-[#1A0A2E] border-b border-purple-500/20 p-4">
        <div className="container mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={locale === 'es' ? () => navigate(toolsHomePath) : goBack}
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
                {t('tools.comingSoon')}
              </h2>
              <p className="text-purple-300">
                {t('tools.comingSoonDescription')}
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
                          className="bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90"
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

            {/* WhatsApp Support Button */}
            <WhatsAppSupportButton />
          </div>
        )}
      </main>
    </div>
  );
};

export default FerramentaIAArtes;
