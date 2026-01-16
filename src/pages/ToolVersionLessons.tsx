import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, ExternalLink, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";

interface TutorialLesson {
  title: string;
  description: string;
  videoUrl: string;
  buttons: { text: string; url: string }[];
}

interface ToolVersion {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  display_order: number;
  is_visible: boolean;
  unlock_days: number;
  badges: { text: string; icon: string; color: string }[];
  lessons: TutorialLesson[];
}

const ToolVersionLessons = () => {
  const { toolSlug, versionSlug } = useParams<{ toolSlug: string; versionSlug: string }>();
  const navigate = useNavigate();
  const { user, hasAccessToPack, isLoading: premiumLoading } = usePremiumArtesStatus();
  
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState<ToolVersion | null>(null);
  const [toolName, setToolName] = useState("");
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchVersionData = async () => {
      if (!toolSlug || !versionSlug) return;

      try {
        const { data, error } = await supabase
          .from('artes_packs')
          .select('name, tool_versions')
          .eq('slug', toolSlug)
          .single();

        if (error) throw error;

        if (data) {
          setToolName(data.name);
          const versions = data.tool_versions as unknown as ToolVersion[] | null;
          if (versions && versions.length > 0) {
            const foundVersion = versions.find(v => v.slug === versionSlug);
            if (foundVersion) {
              setVersion(foundVersion);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching version data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVersionData();
  }, [toolSlug, versionSlug]);

  // Fetch purchase date
  useEffect(() => {
    const fetchPurchaseDate = async () => {
      if (!user || !toolSlug) return;

      try {
        const { data } = await supabase
          .from('user_pack_purchases')
          .select('purchased_at')
          .eq('user_id', user.id)
          .eq('pack_slug', toolSlug)
          .eq('is_active', true)
          .order('purchased_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (data?.purchased_at) {
          setPurchaseDate(new Date(data.purchased_at));
        }
      } catch (error) {
        console.error('Error fetching purchase date:', error);
      }
    };

    if (!premiumLoading && user) {
      fetchPurchaseDate();
    }
  }, [user, premiumLoading, toolSlug]);

  if (loading || premiumLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">{toolName}</h1>
          <p className="text-muted-foreground">Faça login para acessar as aulas.</p>
          <Button onClick={() => navigate("/login-artes")}>
            Fazer login
          </Button>
        </div>
      </div>
    );
  }

  const hasAccess = toolSlug ? hasAccessToPack(toolSlug) : false;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">{toolName}</h1>
          <p className="text-muted-foreground">Você ainda não tem acesso a esta ferramenta.</p>
          <Button onClick={() => navigate(`/planos-${toolSlug}`)}>
            Ver planos
          </Button>
        </div>
      </div>
    );
  }

  // Check if version is unlocked
  const isVersionUnlocked = () => {
    if (!version || !purchaseDate) return version?.unlock_days === 0;
    
    const unlockDate = new Date(purchaseDate);
    unlockDate.setDate(unlockDate.getDate() + version.unlock_days);
    return new Date() >= unlockDate;
  };

  if (!version) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Versão não encontrada</h1>
          <p className="text-muted-foreground">A versão solicitada não existe.</p>
          <Button onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (!isVersionUnlocked()) {
    const unlockDate = purchaseDate ? new Date(purchaseDate) : new Date();
    unlockDate.setDate(unlockDate.getDate() + version.unlock_days);
    const daysRemaining = Math.max(0, Math.ceil((unlockDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-4">
          <Lock className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">{toolName} - {version.name}</h1>
          <p className="text-muted-foreground">Esta versão ainda está bloqueada.</p>
          <p className="text-yellow-500 font-medium">
            Liberado em: {unlockDate.toLocaleDateString('pt-BR')} ({daysRemaining} dias restantes)
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const currentLesson = version.lessons[selectedLesson];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {toolName} - {version.name}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {version.lessons.length} aulas disponíveis
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Area */}
          <div className="lg:col-span-2 space-y-4">
            {currentLesson && (
              <>
                {/* Video */}
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  {currentLesson.videoUrl ? (
                    <iframe
                      src={currentLesson.videoUrl.replace('watch?v=', 'embed/')}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Play className="w-16 h-16" />
                    </div>
                  )}
                </div>

                {/* Lesson Info */}
                <Card className="p-4">
                  <h2 className="text-xl font-bold mb-2">{currentLesson.title}</h2>
                  {currentLesson.description && (
                    <p className="text-muted-foreground mb-4">{currentLesson.description}</p>
                  )}
                  
                  {/* Action Buttons */}
                  {currentLesson.buttons && currentLesson.buttons.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {currentLesson.buttons.map((button, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          onClick={() => window.open(button.url, '_blank')}
                          className="gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {button.text}
                        </Button>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>

          {/* Lesson List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg mb-4">Aulas</h3>
            {version.lessons.map((lesson, index) => (
              <Card
                key={index}
                className={`p-3 cursor-pointer transition-all hover:bg-accent ${
                  selectedLesson === index ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedLesson(index)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    selectedLesson === index 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${
                      selectedLesson === index ? 'text-primary' : ''
                    }`}>
                      {lesson.title || `Aula ${index + 1}`}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolVersionLessons;
