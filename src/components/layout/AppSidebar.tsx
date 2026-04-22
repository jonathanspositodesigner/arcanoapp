import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Zap, Sparkles, Video, Star, LogIn, Smartphone, Menu, Users, X, ChevronDown, BookOpen, Settings, LogOut, Coins, Wand2, Home, ImagePlus, Gift, Layout, Film, Palette, Shirt, MonitorPlay, Gem } from "lucide-react";
import { LibraryBig } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import ReferralModal from "@/components/ReferralModal";

interface AppSidebarProps {
  user: any;
  isPremium: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  fullScreen?: boolean;
}

const AppSidebar = ({ user, isPremium, sidebarOpen, setSidebarOpen, fullScreen = false }: AppSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('prompts');
  const { logout } = useAuth();
  const [showReferralModal, setShowReferralModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleNavAndClose = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navItemClass = (path: string) =>
    `w-full flex items-center text-left text-[13px] font-medium py-2.5 px-3 rounded-lg transition-colors ${
      isActive(path)
        ? 'bg-primary/10 text-primary font-semibold'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
    }`;

  return (
    <>
      {/* Overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-muted/70 z-[35]" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-[40]
        w-64 ${fullScreen ? 'lg:h-full lg:min-h-0 lg:self-stretch' : 'min-h-screen'} bg-background lg:bg-sidebar-background border-r border-border p-4 flex flex-col
        transform transition-transform duration-300 ease-in-out
        pt-16 lg:pt-4
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">

          {/* PRINCIPAL */}
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-3 mb-1">Principal</p>

          <button onClick={() => handleNavAndClose("/biblioteca-prompts")} className={navItemClass("/biblioteca-prompts")}>
            <Layout className="h-4 w-4 mr-2.5 flex-shrink-0" />
            Biblioteca de Prompts
          </button>

          <button onClick={() => handleNavAndClose("/biblioteca-artes")} className={navItemClass("/biblioteca-artes")}>
            <LibraryBig className="h-4 w-4 mr-2.5 flex-shrink-0" />
            Biblioteca de Artes
          </button>

          <button onClick={() => handleNavAndClose("/ferramentas-ia-aplicativo")} className={navItemClass("/ferramentas-ia-aplicativo")}>
            <Zap className="h-4 w-4 mr-2.5 flex-shrink-0" />
            Ferramentas IA
          </button>

          <button onClick={() => handleNavAndClose("/seedance2")} className={navItemClass("/seedance2")}>
            <Film className="h-4 w-4 mr-2.5 flex-shrink-0" />
            Seedance 2.0
            <span className="ml-auto text-[9px] font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white px-1.5 py-0.5 rounded-full leading-none">Novo</span>
          </button>

          <button onClick={() => handleNavAndClose("/gerar-imagem")} className={navItemClass("/gerar-imagem")}>
            <ImagePlus className="h-4 w-4 mr-2.5 flex-shrink-0" />
            Gerar Imagem
          </button>

          <button onClick={() => handleNavAndClose("/gerar-video")} className={navItemClass("/gerar-video")}>
            <Video className="h-4 w-4 mr-2.5 flex-shrink-0" />
            Gerar Vídeo
          </button>

          {/* FERRAMENTAS EXCLUSIVAS */}
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-3 mt-4 mb-1 flex items-center gap-1">
            <Star className="h-3 w-3" />
            Ferramentas Exclusivas
          </p>

          <button onClick={() => handleNavAndClose("/upscaler-arcano-tool")} className={navItemClass("/upscaler-arcano-tool")}>
            <Wand2 className="h-4 w-4 mr-2.5 flex-shrink-0" />
            Upscaler Arcano
          </button>

          <button onClick={() => handleNavAndClose("/arcano-cloner-tool")} className={navItemClass("/arcano-cloner-tool")}>
            <Palette className="h-4 w-4 mr-2.5 flex-shrink-0" />
            Arcano Cloner
          </button>

          <button onClick={() => handleNavAndClose("/pose-changer-tool")} className={navItemClass("/pose-changer-tool")}>
            <ImagePlus className="h-4 w-4 mr-2.5 flex-shrink-0" />
            Pose Changer
          </button>

          <button onClick={() => handleNavAndClose("/veste-ai-tool")} className={navItemClass("/veste-ai-tool")}>
            <Shirt className="h-4 w-4 mr-2.5 flex-shrink-0" />
            Veste AI
          </button>

          <button onClick={() => handleNavAndClose("/movieled-maker")} className={navItemClass("/movieled-maker")}>
            <MonitorPlay className="h-4 w-4 mr-2.5 flex-shrink-0" />
            MovieLed Maker
          </button>

          <button onClick={() => handleNavAndClose("/flyer-maker")} className={navItemClass("/flyer-maker")}>
            <Palette className="h-4 w-4 mr-2.5 flex-shrink-0" />
            Flyer Maker
          </button>

          {/* CONTA */}
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-3 mt-4 mb-1">Conta</p>

          <button onClick={() => handleNavAndClose("/minhas-criacoes")} className={navItemClass("/minhas-criacoes")}>
            <Sparkles className="h-4 w-4 mr-2.5 flex-shrink-0" />
            Minhas Criações
          </button>

          <button onClick={() => handleNavAndClose("/planos-2")} className={navItemClass("/planos-2")}>
            <Gem className="h-4 w-4 mr-2.5 flex-shrink-0" />
            Planos
          </button>

          {user && (
            <button onClick={() => handleNavAndClose("/credit-history")} className={navItemClass("/credit-history")}>
              <Coins className="h-4 w-4 mr-2.5 flex-shrink-0" />
              Créditos
            </button>
          )}

          {user && (
            <button onClick={() => handleNavAndClose("/profile-settings")} className={navItemClass("/profile-settings")}>
              <Settings className="h-4 w-4 mr-2.5 flex-shrink-0" />
              Config
            </button>
          )}

          {/* Divider */}
          <div className="my-3 border-t border-border" />

          {/* Grupo WhatsApp */}
          <a href="https://chat.whatsapp.com/KkQmU8xiyda7KUSXiyc3pn" target="_blank" rel="noopener noreferrer" className="block">
            <button className="w-full flex items-center text-left text-[13px] font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 py-2.5 px-3 rounded-lg hover:bg-emerald-500/15 transition-colors">
              <Users className="h-4 w-4 mr-2.5 flex-shrink-0" />
              Grupo do WhatsApp
            </button>
          </a>

          {/* Indique e Ganhe Créditos */}
          {user && (
            <button
              onClick={() => setShowReferralModal(true)}
              className="w-full flex items-center text-left text-[13px] font-bold text-foreground py-2.5 px-3 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-all"
            >
              <Gift className="h-4 w-4 mr-2.5 text-primary flex-shrink-0" />
              Ganhe 500 Créditos!
            </button>
          )}

          {/* Login for non-logged users */}
          {!user && (
            <Button onClick={() => handleNavAndClose("/login")} variant="outline" className="w-full h-auto py-2.5 px-3 bg-accent/50 border-border text-foreground hover:bg-accent font-medium text-[12px] flex items-center">
              <LogIn className="h-4 w-4 mr-2.5" />
              {t('sidebar.makeLogin')}
            </Button>
          )}
        </div>

        {/* Logout button at the bottom */}
        {user && (
          <div className="pt-3 border-t border-border mt-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center text-left text-[12px] font-medium text-red-400 hover:text-red-300 py-2 px-3 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 mr-2" />
              Sair
            </button>
          </div>
        )}
      </aside>

      {/* Referral Modal */}
      {user && (
        <ReferralModal
          open={showReferralModal}
          onClose={() => setShowReferralModal(false)}
          userId={user.id}
        />
      )}
    </>
  );
};

export default AppSidebar;
