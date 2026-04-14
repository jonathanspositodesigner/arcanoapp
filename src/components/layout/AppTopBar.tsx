import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, ImageIcon, LogIn, Star, PlusCircle, Lock, Settings, LogOut, User, Phone, Coins, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MyCreationsModal } from "@/components/ai-tools/creations";
import CreditsPreviewPopover from "@/components/CreditsPreviewPopover";
import { useCredits } from "@/contexts/CreditsContext";
import { AnimatedCreditsDisplay } from "@/components/upscaler/AnimatedCreditsDisplay";
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
  planType: string | null;
  userProfile?: { name?: string; phone?: string } | null;
  onLogout: () => void;
  onToggleSidebar?: () => void;
}

const AppTopBar = ({ user, isPremium, planType, userProfile, onLogout, onToggleSidebar }: AppTopBarProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation('prompts');
  const [showCreationsModal, setShowCreationsModal] = useState(false);
  const { balance: credits, isLoading: creditsLoading, isUnlimited } = useCredits();

  const ProfileDropdown = ({ isMobile = false }: { isMobile?: boolean }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`${isMobile ? 'text-white hover:bg-white/20' : 'text-gray-300 hover:text-white hover:bg-white/50/20'} rounded-full`}
        >
          <User className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-[#111113] border-white/10 text-white"
      >
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
          onClick={onLogout}
          className="cursor-pointer text-red-400 hover:bg-red-500/100/20 focus:bg-red-500/20 focus:text-red-400"
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
      <header className="hidden lg:flex bg-[#111113]/80 backdrop-blur-lg border-b border-white/10 px-6 py-3 items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <Button onClick={() => setShowCreationsModal(true)} variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-white/50/20">
              <ImageIcon className="h-4 w-4 mr-2" />
              Minhas Criações
            </Button>
          )}
          {!user && (
            <>
              <Button onClick={() => navigate("/login?redirect=/biblioteca-prompts")} variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-white/50/20">
                <LogIn className="h-4 w-4 mr-2" />
                {t('header.login')}
              </Button>
              <Button onClick={() => navigate("/planos-2")} size="sm" className="bg-gradient-to-r from-slate-600 to-blue-500 hover:from-slate-500 hover:to-blue-400 text-white">
                <Star className="h-3 w-3 mr-2" fill="currentColor" />
                {t('header.becomePremium')}
              </Button>
            </>
          )}
          {user && !isPremium && (
            <>
              <Button onClick={() => navigate("/planos-2")} size="sm" className="bg-gradient-to-r from-slate-600 to-blue-500 hover:from-slate-500 hover:to-blue-400 text-white">
                <Star className="h-3 w-3 mr-2" fill="currentColor" />
                {t('header.becomePremium')}
              </Button>
              <div className="flex items-center gap-1">
              <CreditsPreviewPopover
                  userId={user?.id || ''}
                  variant="desktop"
                />
                <button
                  onClick={() => navigate('/planos-creditos')}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-white/50/10"
                  title="Comprar créditos"
                >
                  <PlusCircle className="w-4 h-4 text-gray-400" style={{ filter: 'drop-shadow(0 0 4px rgba(148, 163, 184, 0.5))' }} />
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
                  userId={user?.id || ''}
                  variant="desktop"
                />
                <button
                  onClick={() => navigate('/planos-creditos')}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-white/50/10"
                  title="Comprar créditos"
                >
                  <PlusCircle className="w-4 h-4 text-gray-400" style={{ filter: 'drop-shadow(0 0 4px rgba(148, 163, 184, 0.5))' }} />
                </button>
              </div>
              <ProfileDropdown />
            </>
          )}
        </div>
      </header>

      {/* Top Bar - Mobile */}
      <header className="lg:hidden bg-[#111113]/95 backdrop-blur-lg px-4 py-3 flex items-center justify-between shadow-lg border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button onClick={onToggleSidebar} className="text-gray-300 hover:text-white p-1">
            <Menu className="h-5 w-5" />
          </button>
        </div>
        {!user && (
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/login?redirect=/biblioteca-prompts")} size="sm" variant="ghost" className="text-gray-300 hover:bg-white/50/20 text-xs">
              <LogIn className="h-4 w-4 mr-1" />
              {t('header.login')}
            </Button>
            <Button onClick={() => navigate("/planos-2")} size="sm" className="bg-gradient-to-r from-slate-600 to-blue-500 hover:from-slate-500 hover:to-blue-400 text-white text-xs">
              <Star className="h-3 w-3 mr-1" fill="currentColor" />
              Premium
            </Button>
          </div>
        )}
        {user && !isPremium && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <CreditsPreviewPopover
                userId={user?.id || ''}
                variant="mobile"
              />
              <button
                onClick={() => navigate('/planos-creditos')}
                className="p-0.5 rounded hover:bg-white/50/10"
                title="Comprar créditos"
              >
                <PlusCircle className="w-3.5 h-3.5 text-gray-400" />
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
                userId={user?.id || ''}
                variant="mobile"
              />
              <button
                onClick={() => navigate('/planos-creditos')}
                className="p-0.5 rounded hover:bg-white/50/10"
                title="Comprar créditos"
              >
                <PlusCircle className="w-3.5 h-3.5 text-gray-400" />
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
