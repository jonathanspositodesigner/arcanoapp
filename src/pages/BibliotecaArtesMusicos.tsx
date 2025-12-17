import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Music, LogIn, User, Settings, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import baaLogo from "@/assets/BAA.png";

const BibliotecaArtesMusicos = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1a2e] to-[#16213e]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f]/80 backdrop-blur-md border-b border-violet-500/20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left - Back + Logo */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/biblioteca-artes-hub")}
              className="text-violet-300 hover:text-violet-100 hover:bg-violet-500/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={baaLogo} alt="BAA" className="h-8" />
            <span className="hidden sm:inline text-violet-300 font-medium">Músicos & Artistas</span>
          </div>

          {/* Right - Auth */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/perfil-artes")}
                  className="text-violet-300 hover:text-violet-100 hover:bg-violet-500/20"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Perfil</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-violet-300 hover:text-violet-100 hover:bg-violet-500/20"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login-artes")}
                className="text-violet-300 hover:text-violet-100 hover:bg-violet-500/20"
              >
                <LogIn className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Entrar</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 mb-6">
            <Music className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            BAA - Músicos & Artistas
          </h1>
          <p className="text-violet-200/70 max-w-2xl mx-auto text-lg">
            Artes editáveis profissionais para músicos, bandas, DJs e artistas independentes.
            Capas de álbum, flyers de show, posts para redes sociais e muito mais.
          </p>
        </div>

        {/* Em Breve Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Music className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-violet-100 mb-2">
              Em Breve!
            </h2>
            <p className="text-violet-200/70 mb-6">
              Estamos preparando uma biblioteca incrível de artes para músicos e artistas.
              Em breve você terá acesso a:
            </p>
            <ul className="text-left text-violet-200/80 space-y-2 max-w-md mx-auto mb-6">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                Capas de Álbum e Singles
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                Flyers de Shows e Eventos
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                Posts para Redes Sociais
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                Banners para YouTube e Twitch
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                Materiais para Divulgação
              </li>
            </ul>
            <Button
              onClick={() => navigate("/biblioteca-artes-hub")}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500"
            >
              Voltar para Seleção
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BibliotecaArtesMusicos;
