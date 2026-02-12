import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, ImageIcon, LogIn, Star, PlusCircle, Lock, Settings, LogOut, User, Phone, Coins, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MyCreationsModal } from "@/components/ai-tools/creations";
import CreditsPreviewPopover from "@/components/CreditsPreviewPopover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppTopBarProps {
  user: any;
  isPremium: boolean;
  credits: number;
  creditsLoading: boolean;
  planType: string | null;
  userProfile?: { name?: string; phone?: string } | null;
  onLogout: () => void;
  onToggleSidebar?: () => void;
}

const AppTopBar = ({ user, isPremium, credits, creditsLoading, planType, userProfile, onLogout, onToggleSidebar }: AppTopBarProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation('prompts');
  const [showCreationsModal, setShowCreationsModal] = useState(false);

  const ProfileDropdown = ({ isMobile = false }: { isMobile?: boolean }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`${isMobile ? 'text-white hover:bg-white/20' : 'text-purple-300 hover:text-white hover:bg-purple-500/20'} rounded-full`}
        >
          <User className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-[#1A0A2E] border-purple-500/30 text-white"
      >
        <DropdownMenuLabel className="text-purple-200">
          <div className="flex flex-col gap-1">
            <span className="font-medium">
              {userProfile?.name || user?.email?.split('@')[0] || 'Meu Perfil'}
            </span>
            <span className="text-xs text-purple-400 font-normal">
              {user?.email}
            </span>
          </div>
        </DropdownMenuLabel>

        {userProfile?.phone && (
          <div className="px-2 py-1.5 text-sm text-purple-300 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" />
            {userProfile.phone}
          </div>
        )}

        <DropdownMenuSeparator className="bg-purple-500/20" />

        <div className="px-2 py-2 flex items-center justify-between">
          <span className="text-sm text-purple-300 flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            Créditos
          </span>
          <div className="flex items-center gap-1">
            <Badge className="bg-purple-600 text-white">
              {creditsLoading ? '...' : credits}
            </Badge>
            <button
              onClick={() => navigate('/planos-creditos')}
              className="p-1 rounded hover:bg-purple-500/10"
              title="Comprar créditos"
            >
              <PlusCircle className="w-4 h-4 text-fuchsia-400" />
            </button>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-purple-500/20" />

        <DropdownMenuItem
          onClick={() => navigate('/change-password')}
          className="cursor-pointer hover:bg-purple-500/20 focus:bg-purple-500/20"
        >
          <Lock className="w-4 h-4 mr-2" />
          Alterar Senha
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate('/profile-settings')}
          className="cursor-pointer hover:bg-purple-500/20 focus:bg-purple-500/20"
        >
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-purple-500/20" />

        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer text-red-400 hover:bg-red-500/20 focus:bg-red-500/20 focus:text-red-400"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* Top Bar - Desktop */}
      <header className="hidden lg:flex bg-[#0D0221]/80 backdrop-blur-lg border-b border-purple-500/20 px-6 py-3 items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <img alt="PromptClub" onClick={() => navigate('/')} src="/lovable-uploads/87022a3f-e907-4bc8-83b0-3c6ef7ab69da.png" className="h-7 cursor-pointer hover:opacity-80 transition-opacity" />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate("/")} variant="ghost" size="sm" className="text-purple-300 hover:text-white hover:bg-purple-500/20">
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
          {user && (
            <Button onClick={() => setShowCreationsModal(true)} variant="ghost" size="sm" className="text-purple-300 hover:text-white hover:bg-purple-500/20">
              <ImageIcon className="h-4 w-4 mr-2" />
              Minhas Criações
            </Button>
          )}
          {!user && (
            <>
              <Button onClick={() => navigate("/login?redirect=/biblioteca-prompts")} variant="ghost" size="sm" className="text-purple-300 hover:text-white hover:bg-purple-500/20">
                <LogIn className="h-4 w-4 mr-2" />
                {t('header.login')}
              </Button>
              <Button onClick={() => navigate("/planos")} size="sm" className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white">
                <Star className="h-3 w-3 mr-2" fill="currentColor" />
                {t('header.becomePremium')}
              </Button>
            </>
          )}
          {user && !isPremium && (
            <>
              <Button onClick={() => navigate("/planos")} size="sm" className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white">
                <Star className="h-3 w-3 mr-2" fill="currentColor" />
                {t('header.becomePremium')}
              </Button>
              <div className="flex items-center gap-1">
                <CreditsPreviewPopover
                  credits={credits}
                  creditsLoading={creditsLoading}
                  userId={user?.id || ''}
                  variant="desktop"
                />
                <button
                  onClick={() => navigate('/planos-creditos')}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-purple-500/10"
                  title="Comprar créditos"
                >
                  <PlusCircle className="w-4 h-4 text-fuchsia-400" style={{ filter: 'drop-shadow(0 0 4px rgba(217, 70, 239, 0.5))' }} />
                </button>
              </div>
              <ProfileDropdown />
            </>
          )}
          {isPremium && (
            <>
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                <Star className="h-3 w-3 mr-1" fill="currentColor" />
                {t('header.premiumActive')}
              </Badge>
              <div className="flex items-center gap-1">
                <CreditsPreviewPopover
                  credits={credits}
                  creditsLoading={creditsLoading}
                  userId={user?.id || ''}
                  variant="desktop"
                />
                <button
                  onClick={() => navigate('/planos-creditos')}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-purple-500/10"
                  title="Comprar créditos"
                >
                  <PlusCircle className="w-4 h-4 text-fuchsia-400" style={{ filter: 'drop-shadow(0 0 4px rgba(217, 70, 239, 0.5))' }} />
                </button>
              </div>
              <ProfileDropdown />
            </>
          )}
        </div>
      </header>

      {/* Top Bar - Mobile */}
      <header className="lg:hidden bg-[#0D0221]/95 backdrop-blur-lg px-4 py-3 flex items-center justify-between shadow-lg border-b border-purple-500/20 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button onClick={onToggleSidebar} className="text-purple-300 hover:text-white p-1">
            <Menu className="h-5 w-5" />
          </button>
        </div>
        {!user && (
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/login?redirect=/biblioteca-prompts")} size="sm" variant="ghost" className="text-purple-300 hover:bg-purple-500/20 text-xs">
              <LogIn className="h-4 w-4 mr-1" />
              {t('header.login')}
            </Button>
            <Button onClick={() => navigate("/planos")} size="sm" className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white text-xs">
              <Star className="h-3 w-3 mr-1" fill="currentColor" />
              Premium
            </Button>
          </div>
        )}
        {user && !isPremium && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <CreditsPreviewPopover
                credits={credits}
                creditsLoading={creditsLoading}
                userId={user?.id || ''}
                variant="mobile"
              />
              <button
                onClick={() => navigate('/planos-creditos')}
                className="p-0.5 rounded hover:bg-purple-500/10"
                title="Comprar créditos"
              >
                <PlusCircle className="w-3.5 h-3.5 text-fuchsia-400" />
              </button>
            </div>
            <ProfileDropdown isMobile />
          </div>
        )}
        {isPremium && (
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
              <Star className="h-3 w-3 mr-1" fill="currentColor" />
              Premium
            </Badge>
            <div className="flex items-center gap-1">
              <CreditsPreviewPopover
                credits={credits}
                creditsLoading={creditsLoading}
                userId={user?.id || ''}
                variant="mobile"
              />
              <button
                onClick={() => navigate('/planos-creditos')}
                className="p-0.5 rounded hover:bg-purple-500/10"
                title="Comprar créditos"
              >
                <PlusCircle className="w-3.5 h-3.5 text-fuchsia-400" />
              </button>
            </div>
            <ProfileDropdown isMobile />
          </div>
        )}
      </header>
      <MyCreationsModal open={showCreationsModal} onClose={() => setShowCreationsModal(false)} />
    </>
  );
};

export default AppTopBar;
