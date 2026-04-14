import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Coins, Lock, Settings, LogOut, Phone, LogIn, Sparkles, PlusCircle, Home, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useCredits } from "@/contexts/CreditsContext";
import { useTranslation } from "react-i18next";
import { AnimatedCreditsDisplay } from "@/components/upscaler/AnimatedCreditsDisplay";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import NavigationBlockerModal from "@/components/NavigationBlockerModal";
import { MyCreationsModal } from "@/components/ai-tools/creations";

interface ToolsHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  showLogo?: boolean;
}

const ToolsHeader = ({
  title,
  subtitle,
  onBack,
  showBackButton = true,
  showLogo = false,
}: ToolsHeaderProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const { user, logout } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, isUnlimited } = useCredits();
  const [userProfile, setUserProfile] = useState<{ name?: string; phone?: string } | null>(null);
  const [showCreationsModal, setShowCreationsModal] = useState(false);
  
  // Hook de trava de navegação - bloqueia se job ativo
  const {
    showConfirmModal, 
    confirmLeave, 
    cancelLeave, 
    activeToolName 
  } = useNavigationGuard();

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('id', user.id)
        .single();
      if (data) setUserProfile(data);
    };
    fetchProfile();
  }, [user]);

  return (
    <header className="sticky top-0 z-50 bg-[#111113]/95 backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left Side: Home + Back Button + Title/Logo */}
        <div className="flex items-center gap-3">
          {/* Home Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="text-gray-300 hover:text-white hover:bg-white/50/20"
            title="Página Inicial"
          >
            <Home className="w-5 h-5" />
          </Button>
          
          {showBackButton && onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-gray-300 hover:text-white hover:bg-white/50/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          
          {showLogo ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              {title && (
                <h1 className="text-base sm:text-xl font-bold text-white hidden sm:block">
                  {title}
                </h1>
              )}
            </div>
          ) : title ? (
            <div>
            <h1 className="hidden sm:block text-xl font-bold bg-gradient-to-r from-gray-400 to-pink-400 bg-clip-text text-transparent">
              {title}
            </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-300 hidden sm:block">{subtitle}</p>
              )}
            </div>
          ) : null}
        </div>

        {/* Right Side: My Creations + Login or Profile */}
        <div className="flex items-center gap-2">
          {/* My Creations Button - only for logged users */}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreationsModal(true)}
              className="text-gray-300 hover:text-white hover:bg-white/50/20 hidden sm:flex"
            >
              <Library className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Minhas Criações</span>
            </Button>
          )}
          
          {!user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/login-artes?redirect=" + encodeURIComponent(window.location.pathname))}
              className="text-gray-300 border-white/10 hover:bg-white/50/20 text-xs sm:text-sm"
            >
              <LogIn className="w-4 h-4 mr-1 sm:mr-2" />
              {t('ferramentas.login')}
            </Button>
          ) : (
            <>
              {/* Credits Badge + Add Button */}
              <div className="flex items-center gap-1">
                <div
                  className={`rounded-full flex items-center gap-1.5 px-2.5 py-1 cursor-pointer ${
                    isUnlimited
                      ? 'bg-emerald-900/40 border border-emerald-500/30 hover:bg-emerald-800/40'
                      : 'bg-white/5 border border-white/10 hover:bg-slate-800/50'
                  }`}
                  onClick={() => navigate('/credit-history')}
                >
                  <AnimatedCreditsDisplay 
                    credits={credits} 
                    isLoading={creditsLoading}
                    size="sm"
                    showCoin={true}
                    variant="text"
                    className={isUnlimited ? 'text-white' : 'text-gray-300'}
                    isUnlimited={isUnlimited}
                  />
                </div>
                <button
                  onClick={() => navigate('/planos-creditos')}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-white/50/10"
                  title="Comprar créditos"
                >
                  <PlusCircle className="w-4 h-4 text-gray-400" style={{ filter: 'drop-shadow(0 0 4px rgba(148, 163, 184, 0.5))' }} />
                </button>
              </div>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-300 hover:text-white hover:bg-white/50/20 rounded-full"
                  >
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-[#111113] border-white/10 text-white"
                >
                  {/* User Info */}
                  <DropdownMenuLabel className="text-gray-300">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {userProfile?.name || user?.email?.split('@')[0] || 'Meu Perfil'}
                      </span>
                      <span className="text-xs text-gray-400 font-normal">
                        {user?.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>

                  {userProfile?.phone && (
                    <div className="px-2 py-1.5 text-sm text-gray-300 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      {userProfile.phone}
                    </div>
                  )}

                  <DropdownMenuSeparator className="bg-white/50/20" />

                  {/* Credits Display */}
                  <div className="px-2 py-2 flex items-center justify-between">
                    <span className="text-sm text-gray-300 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      Créditos
                    </span>
                    <div className="flex items-center gap-1">
                      <AnimatedCreditsDisplay 
                        credits={credits} 
                        isLoading={creditsLoading}
                        size="sm"
                        showCoin={false}
                        variant="badge"
                        isUnlimited={isUnlimited}
                      />
                      <button
                        onClick={() => navigate('/planos-creditos')}
                        className="p-1 rounded hover:bg-white/50/10"
                        title="Comprar créditos"
                      >
                        <PlusCircle className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <DropdownMenuSeparator className="bg-white/50/20" />

                  {/* Minhas Criações - acessível no mobile via dropdown */}
                  <DropdownMenuItem
                    onClick={() => setShowCreationsModal(true)}
                    className="cursor-pointer hover:bg-white/50/20 focus:bg-white/50/20"
                  >
                    <Library className="w-4 h-4 mr-2" />
                    Minhas Criações
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-white/50/20" />

                  {/* Actions */}
                  <DropdownMenuItem
                    onClick={() => navigate('/change-password')}
                    className="cursor-pointer hover:bg-white/50/20 focus:bg-white/50/20"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Alterar Senha
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate('/profile-settings')}
                    className="cursor-pointer hover:bg-white/50/20 focus:bg-white/50/20"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-white/50/20" />

                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-red-400 hover:bg-red-500/20 focus:bg-red-500/20 focus:text-red-400"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
      {/* Modal de confirmação de saída */}
      <NavigationBlockerModal
        open={showConfirmModal}
        onConfirmLeave={confirmLeave}
        onCancelLeave={cancelLeave}
        toolName={activeToolName}
      />
      
      {/* Modal Minhas Criações */}
      <MyCreationsModal 
        open={showCreationsModal} 
        onClose={() => setShowCreationsModal(false)} 
      />
    </header>
  );
};

export default ToolsHeader;
