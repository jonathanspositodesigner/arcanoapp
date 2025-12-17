import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, LogIn, Settings, LogOut, Loader2, Lock, Play, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import baaLogo from "@/assets/BAA.png";

const CATEGORIES = [
  { slug: "todos", name: "Todos" },
  { slug: "agendas", name: "Agendas" },
  { slug: "lancamento-musica", name: "Lançamento de Música" },
  { slug: "telao-led", name: "Telão de LED" },
  { slug: "presskit-digital", name: "Presskit Digital" },
];

interface Arte {
  id: string;
  title: string;
  image_url: string;
  category: string;
  is_premium: boolean;
  canva_link?: string;
  drive_link?: string;
}

const BibliotecaArtesMusicos = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [artes, setArtes] = useState<Arte[]>([]);
  const [loadingArtes, setLoadingArtes] = useState(true);

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

  useEffect(() => {
    const fetchArtes = async () => {
      setLoadingArtes(true);
      // For now, we'll use placeholder data since there's no specific musicos table yet
      // This can be connected to a real table later
      const mockArtes: Arte[] = [
        // Placeholder items - these will be replaced with real data
      ];
      setArtes(mockArtes);
      setLoadingArtes(false);
    };
    fetchArtes();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
  };

  const filteredArtes = selectedCategory === "todos" 
    ? artes 
    : artes.filter(a => a.category === selectedCategory);

  const isVideo = (url: string) => {
    return url?.includes('.mp4') || url?.includes('.webm') || url?.includes('.mov');
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
            <span className="hidden md:inline text-violet-300 font-medium">Músicos & Artistas</span>
          </div>

          {/* Center - Cadastrar Grátis */}
          <Button
            onClick={() => navigate("/planos-artes-musicos")}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Cadastrar Grátis</span>
            <span className="sm:hidden">Cadastrar</span>
          </Button>

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
      <main className="container mx-auto px-4 py-6">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Modelos
          </h1>
          <p className="text-violet-200/70">
            Encontre o visual perfeito para sua carreira
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.slug}
              variant={selectedCategory === cat.slug ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.slug)}
              className={
                selectedCategory === cat.slug
                  ? "bg-violet-600 hover:bg-violet-500 text-white border-violet-600"
                  : "border-violet-500/30 text-violet-300 hover:bg-violet-500/20 hover:text-violet-100"
              }
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Content Grid */}
        {loadingArtes ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : filteredArtes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredArtes.map((arte) => (
              <div
                key={arte.id}
                className="group relative bg-[#1a1a2e] rounded-xl overflow-hidden border border-violet-500/20 hover:border-violet-500/50 transition-all duration-300"
              >
                {/* Premium Badge */}
                {arte.is_premium && (
                  <div className="absolute top-2 left-2 z-10 bg-violet-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Premium
                  </div>
                )}

                {/* Media Preview */}
                <div className="aspect-square relative overflow-hidden">
                  {isVideo(arte.image_url) ? (
                    <div className="relative w-full h-full">
                      <video
                        src={arte.image_url}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={arte.image_url}
                      alt={arte.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>

                {/* Card Info */}
                <div className="p-3">
                  {/* Category Badge */}
                  <div className="mb-2">
                    <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-1 rounded">
                      {CATEGORIES.find(c => c.slug === arte.category)?.name || arte.category}
                    </span>
                  </div>
                  
                  <h3 className="text-white font-medium text-sm truncate mb-3">
                    {arte.title}
                  </h3>

                  {/* Action Button */}
                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white text-sm"
                    size="sm"
                  >
                    <Lock className="w-3 h-3 mr-1" />
                    Liberar Modelo
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-violet-100 mb-2">
              Em Breve!
            </h2>
            <p className="text-violet-200/70 max-w-md mx-auto mb-6">
              Estamos preparando uma biblioteca incrível de artes para músicos e artistas.
              Em breve você terá acesso a modelos incríveis para:
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {CATEGORIES.filter(c => c.slug !== "todos").map((cat) => (
                <span
                  key={cat.slug}
                  className="bg-violet-500/20 text-violet-300 px-3 py-1.5 rounded-full text-sm"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BibliotecaArtesMusicos;
