import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Zap, Sparkles, Video, Star, LogIn, Smartphone, Menu, Users, X, ChevronDown, BookOpen, Settings, LogOut, Coins, Wand2, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";

interface AppSidebarProps {
  user: any;
  isPremium: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AppSidebar = ({ user, isPremium, sidebarOpen, setSidebarOpen }: AppSidebarProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation('prompts');
  const { logout } = useAuth();
  const [aiSitesOpen, setAiSitesOpen] = useState(false);
  const [aiToolsOpen, setAiToolsOpen] = useState(true);

  const externalLinks = [
    { name: t('sidebar.generateInChatGPT'), url: "https://chatgpt.com/", icon: Sparkles },
    { name: t('sidebar.generateInNanoBanana'), url: "https://labs.google/fx/pt/tools/flow", icon: Sparkles },
    { name: t('sidebar.generateInWhisk'), url: "https://labs.google/fx/pt/tools/whisk", icon: Sparkles },
    { name: t('sidebar.generateInFlux2'), url: "https://www.runninghub.ai/workflow/1995538803421020162", icon: Sparkles },
    { name: t('sidebar.generateVideoVEO3'), url: "https://labs.google/fx/pt/tools/flow", icon: Video },
  ];

  const aiToolLinks = [
    { name: "Upscaler Arcano V3", path: "/ferramentas-ia-aplicativo", badge: null },
    { name: "Pose Changer", path: "/pose-changer-tool", badge: null },
    { name: "Veste AI", path: "/veste-ai-tool", badge: null },
    { name: "Arcano Cloner", path: "/arcano-cloner-tool", badge: "Novo" },
    { name: "Forja Selos 3D", path: "/ferramentas-ia-aplicativo", badge: null },
    { name: "Gerador de Avatar", path: "/gerador-avatar", badge: null },
    { name: "Video Upscaler", path: "/video-upscaler-tool", badge: null },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleNavAndClose = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-72 min-h-screen bg-[#1A0A2E] border-r border-purple-500/20 p-5 flex flex-col
        transform transition-transform duration-300 ease-in-out
        lg:pt-4
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo only on mobile sidebar */}
        <div className="mb-4 flex justify-center lg:hidden">
          <img alt="ArcanoApp" className="w-[60%] mb-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')} src="/lovable-uploads/7fbeb2fd-d77d-4357-acff-1947c5565fad.png" />
        </div>

        {/* Top section */}
        <div className="space-y-2 flex-1 overflow-y-auto">
          {/* Home Button */}
          <button
            onClick={() => handleNavAndClose("/")}
            className="w-full flex items-center text-left text-[12px] font-medium text-purple-200 hover:text-white py-2 px-2.5 rounded-lg hover:bg-purple-500/20 transition-colors"
          >
            <Home className="h-3.5 w-3.5 mr-1.5" />
            Home
          </button>

          <div className="border-t border-purple-400/30" />

          {/* Install App Button */}
          <Button onClick={() => handleNavAndClose("/install-app")} variant="outline" className="w-full h-auto py-2 px-2.5 bg-purple-900/50 border-purple-400/50 text-white hover:bg-purple-500/30 font-medium text-[11px] flex items-center justify-between">
            <span className="flex items-center">
              <Smartphone className="h-3 w-3 mr-1.5" />
              {t('sidebar.installApp')}
            </span>
          </Button>

          {/* Premium Badge */}
          {isPremium && (
            <div className="flex items-center justify-center gap-2 p-1.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
              <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
              <span className="text-[11px] font-semibold text-yellow-400">{t('sidebar.premiumActive')}</span>
            </div>
          )}

          {/* Premium button for logged-in non-premium users */}
          {user && !isPremium && (
            <Button onClick={() => handleNavAndClose("/planos")} className="w-full h-auto py-2 px-2.5 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white font-medium text-[11px] flex items-center justify-between">
              <span className="flex items-center">
                <Star className="h-3 w-3 mr-1.5" fill="currentColor" />
                {t('sidebar.becomePremium')}
              </span>
            </Button>
          )}

          {/* Login button only for non-logged users */}
          {!user && (
            <>
              <Button onClick={() => handleNavAndClose("/planos")} className="w-full h-auto py-2 px-2.5 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white font-medium text-[11px] flex items-center justify-between">
                <span className="flex items-center">
                  <Star className="h-3 w-3 mr-1.5" fill="currentColor" />
                  {t('sidebar.becomePremium')}
                </span>
              </Button>
              <Button onClick={() => handleNavAndClose("/login")} variant="outline" className="w-full h-auto py-2 px-2.5 bg-purple-900/50 border-purple-400/50 text-white hover:bg-purple-500/30 font-medium text-[11px] flex items-center justify-between">
                <span className="flex items-center">
                  <LogIn className="h-3 w-3 mr-1.5" />
                  {t('sidebar.makeLogin')}
                </span>
              </Button>
            </>
          )}

          <div className="my-3 border-t border-purple-400/30" />

          {/* Ferramentas de IA - Collapsible */}
          <button
            onClick={() => setAiToolsOpen(!aiToolsOpen)}
            className="w-full flex items-center justify-between text-left text-[12px] font-semibold text-white hover:text-purple-200 py-2 px-2.5 rounded-lg bg-gradient-to-r from-fuchsia-500/20 to-purple-600/20 hover:from-fuchsia-500/30 hover:to-purple-600/30 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-fuchsia-400" />
              {t('sidebar.aiTools')}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${aiToolsOpen ? 'rotate-180' : ''}`} />
          </button>

          {aiToolsOpen && (
            <div className="space-y-1 pl-2">
              {aiToolLinks.map(link => (
                <button
                  key={link.name}
                  onClick={() => handleNavAndClose(link.path)}
                  className="w-full flex items-center justify-between text-[11px] text-purple-200 hover:text-white py-1.5 px-2.5 rounded-md hover:bg-purple-500/20 transition-colors"
                >
                  <span>{link.name}</span>
                  {link.badge && (
                    <span className="text-[9px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full leading-none">{link.badge}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Biblioteca de Prompts */}
          <button
            onClick={() => handleNavAndClose("/biblioteca-prompts")}
            className="w-full flex items-center text-left text-[12px] font-medium text-purple-200 hover:text-white py-2 px-2.5 rounded-lg hover:bg-purple-500/20 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            Biblioteca de Prompts
          </button>

          {/* Sites de IA - Hidden for now, links preserved in externalLinks array above */}

          <div className="my-3 border-t border-purple-400/30" />

          {/* Créditos */}
          {user && (
            <button
              onClick={() => handleNavAndClose("/credit-history")}
              className="w-full flex items-center text-left text-[12px] font-medium text-purple-200 hover:text-white py-2 px-2.5 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <Coins className="h-3.5 w-3.5 mr-1.5" />
              Meus Créditos
            </button>
          )}

          {/* Configurações */}
          {user && (
            <button
              onClick={() => handleNavAndClose("/profile-settings")}
              className="w-full flex items-center text-left text-[12px] font-medium text-purple-200 hover:text-white py-2 px-2.5 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Configurações
            </button>
          )}

          {/* Grupo WhatsApp */}
          <a href="https://chat.whatsapp.com/KkQmU8xiyda7KUSXiyc3pn" target="_blank" rel="noopener noreferrer" className="block">
            <button className="w-full flex items-center text-left text-[12px] font-medium text-green-300 hover:text-green-200 py-2 px-2.5 rounded-lg hover:bg-green-500/20 transition-colors">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Grupo do WhatsApp
            </button>
          </a>
        </div>

        {/* Logout button at the bottom */}
        {user && (
          <div className="pt-3 border-t border-purple-400/30 mt-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center text-left text-[12px] font-medium text-red-400 hover:text-red-300 py-2 px-2.5 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Sair
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default AppSidebar;
