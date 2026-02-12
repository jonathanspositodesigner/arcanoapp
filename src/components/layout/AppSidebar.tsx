import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Zap, Sparkles, Video, Star, LogIn, Smartphone, Menu, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface AppSidebarProps {
  user: any;
  isPremium: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AppSidebar = ({ user, isPremium, sidebarOpen, setSidebarOpen }: AppSidebarProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation('prompts');

  const externalLinks = [
    { name: t('sidebar.generateInChatGPT'), url: "https://chatgpt.com/", icon: Sparkles },
    { name: t('sidebar.generateInNanoBanana'), url: "https://labs.google/fx/pt/tools/flow", icon: Sparkles },
    { name: t('sidebar.generateInWhisk'), url: "https://labs.google/fx/pt/tools/whisk", icon: Sparkles },
    { name: t('sidebar.generateInFlux2'), url: "https://www.runninghub.ai/workflow/1995538803421020162", icon: Sparkles },
  ];

  return (
    <>
      {/* Mobile Bottom Menu Button */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Button onClick={() => setSidebarOpen(!sidebarOpen)} className="bg-purple-600 hover:bg-purple-700 text-white shadow-xl px-6 py-6 rounded-full">
          <Menu className="h-6 w-6 mr-2" />
          <span className="font-semibold">{t('mobileMenu.generateImage')}</span>
        </Button>
      </div>

      {/* Overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-72 min-h-screen bg-[#1A0A2E] border-r border-purple-500/20 p-6 space-y-4
        transform transition-transform duration-300 ease-in-out
        lg:pt-4
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo only on mobile sidebar */}
        <div className="mb-6 flex justify-center lg:hidden">
          <img alt="ArcanoApp" className="w-[70%] mb-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')} src="/lovable-uploads/7fbeb2fd-d77d-4357-acff-1947c5565fad.png" />
        </div>

        {/* Install App Button */}
        <Button onClick={() => navigate("/install-app")} variant="outline" className="w-full h-auto py-2.5 px-2.5 bg-purple-900/50 border-purple-400/50 text-white hover:bg-purple-500/30 font-medium mb-2 text-xs flex items-center justify-between">
          <span className="flex items-center">
            <Smartphone className="h-3.5 w-3.5 mr-1.5" />
            {t('sidebar.installApp')}
          </span>
        </Button>

        {/* Premium Badge */}
        {isPremium && (
          <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
            <Star className="h-3.5 w-3.5 text-yellow-500" fill="currentColor" />
            <span className="text-xs font-semibold text-yellow-400">{t('sidebar.premiumActive')}</span>
          </div>
        )}

        {/* Premium button for logged-in non-premium users */}
        {user && !isPremium && (
          <Button onClick={() => navigate("/planos")} className="w-full h-auto py-2.5 px-2.5 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white font-medium mb-2 text-xs flex items-center justify-between">
            <span className="flex items-center">
              <Star className="h-3.5 w-3.5 mr-1.5" fill="currentColor" />
              {t('sidebar.becomePremium')}
            </span>
          </Button>
        )}

        {/* Login button only for non-logged users */}
        {!user && (
          <>
            <Button onClick={() => navigate("/planos")} className="w-full h-auto py-2.5 px-2.5 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white font-medium mb-2 text-xs flex items-center justify-between">
              <span className="flex items-center">
                <Star className="h-3.5 w-3.5 mr-1.5" fill="currentColor" />
                {t('sidebar.becomePremium')}
              </span>
            </Button>
            <Button onClick={() => navigate("/login")} variant="outline" className="w-full h-auto py-2.5 px-2.5 bg-purple-900/50 border-purple-400/50 text-white hover:bg-purple-500/30 font-medium mb-4 text-xs flex items-center justify-between">
              <span className="flex items-center">
                <LogIn className="h-3.5 w-3.5 mr-1.5" />
                {t('sidebar.makeLogin')}
              </span>
            </Button>
          </>
        )}

        <h2 className="text-base font-bold text-white mb-4">{t('sidebar.generateWithAI')}</h2>

        {/* Botão Ferramentas de IA destacado */}
        <Button
          onClick={() => navigate("/ferramentas-ia-aplicativo")}
          className="w-full mb-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:opacity-90 text-white font-medium h-auto py-2.5 px-2.5 text-xs flex items-center justify-between"
        >
          <span className="font-medium">{t('sidebar.aiTools')}</span>
          <Zap className="h-3.5 w-3.5 ml-1.5 flex-shrink-0" />
        </Button>

        <div className="space-y-1.5">
          {externalLinks.map(link => (
            <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full h-auto py-2.5 px-2.5 flex items-center justify-between text-left bg-purple-900/40 border-purple-400/50 text-white hover:bg-purple-500/30 hover:scale-105 transition-all duration-300 text-xs">
                <span className="font-medium">{link.name}</span>
                <ExternalLink className="h-3.5 w-3.5 ml-1.5 flex-shrink-0 text-purple-300" />
              </Button>
            </a>
          ))}
        </div>

        <a href="https://labs.google/fx/pt/tools/flow" target="_blank" rel="noopener noreferrer" className="block mt-1.5">
          <Button variant="outline" className="w-full h-auto py-2.5 px-2.5 flex items-center justify-between text-left bg-purple-900/40 border-purple-400/50 text-white hover:bg-purple-500/30 hover:scale-105 transition-all duration-300 text-xs">
            <span className="font-medium">{t('sidebar.generateVideoVEO3')}</span>
            <Video className="h-3.5 w-3.5 ml-1.5 flex-shrink-0 text-purple-300" />
          </Button>
        </a>

        {/* Separador */}
        <div className="my-4 border-t border-purple-400/30" />

        {/* Botão Grupo da Comunidade */}
        <a href="https://chat.whatsapp.com/KkQmU8xiyda7KUSXiyc3pn" target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="outline" className="w-full h-auto py-2.5 px-2.5 flex items-center justify-between text-left bg-green-600/30 border-green-500/50 text-white hover:bg-green-500/40 hover:scale-105 transition-all duration-300 text-xs">
            <span className="font-medium">Entrar no grupo do WhatsApp</span>
            <Users className="h-3.5 w-3.5 ml-1.5 flex-shrink-0 text-green-300" />
          </Button>
        </a>
      </aside>
    </>
  );
};

export default AppSidebar;
