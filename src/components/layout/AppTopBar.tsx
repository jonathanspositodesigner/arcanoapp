import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, ImageIcon, LogIn, Star, PlusCircle, Lock, Settings, LogOut, User, Users, Phone, Coins, Menu, Sun, Moon } from "lucide-react";
import { usePremiumPromptContext } from "@/contexts/PremiumPromptContext";
import { useTheme } from "@/hooks/useTheme";
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
  const { theme, toggleTheme } = useTheme();
  const [showCreationsModal, setShowCreationsModal] = useState(false);
  const { balance: credits, isLoading: creditsLoading, isUnlimited } = useCredits();
  const {
    remainingUnlocks,
    dailyLimit: premiumDailyLimit,
    isUnlimited: isPremiumUnlimited,
  } = usePremiumPromptContext();

  const PremiumCounter = () => (
    isPremium ? (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent border border-border">
        <Lock className="h-3.5 w-3.5 text-purple-400" />
        <span className="text-xs font-bold text-purple-400 tabular-nums">
          {isPremiumUnlimited ? '∞' : `${remainingUnlocks}/${premiumDailyLimit}`}
        </span>
      </div>
    ) : null
  );

  const ProfileDropdown = ({ isMobile = false }: { isMobile?: boolean }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-full"
        >
          <User className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-popover border-border text-popover-foreground"
      >
        <DropdownMenuLabel className="text-muted-foreground">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-foreground">
              {userProfile?.name || user?.email?.split('@')[0] || 'Meu Perfil'}
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              {user?.email}
            </span>
          </div>
        </DropdownMenuLabel>

        {userProfile?.phone && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" />
            {userProfile.phone}
          </div>
        )}

        <DropdownMenuSeparator className="bg-border" />

        <div className="px-2 py-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
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
              className="p-1 rounded hover:bg-accent"
              title="Comprar créditos"
            >
              <PlusCircle className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border" />

        <DropdownMenuItem
          onClick={() => navigate('/change-password')}
          className="cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <Lock className="w-4 h-4 mr-2" />
          Alterar Senha
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate('/profile-settings')}
          className="cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={(e) => { e.preventDefault(); toggleTheme(); }}
          className="cursor-pointer hover:bg-accent focus:bg-accent"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
          {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border" />

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
      <header className="hidden lg:flex bg-background/80 backdrop-blur-lg border-b border-border px-6 py-3 items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-accent transition-colors">
            <Home className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <Button onClick={() => setShowCreationsModal(true)} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent">
              <ImageIcon className="h-4 w-4 mr-2" />
              Minhas Criações
            </Button>
          )}
          {!user && (
            <>
              <Button onClick={() => navigate("/login?redirect=/biblioteca-prompts")} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent">
                <LogIn className="h-4 w-4 mr-2" />
                {t('header.login')}
              </Button>
              <Button onClick={() => navigate("/planos-2")} size="sm" className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-primary-foreground">
                <Star className="h-3 w-3 mr-2" fill="currentColor" />
                {t('header.becomePremium')}
              </Button>
            </>
          )}
          {user && !isPremium && (
            <>
              <Button onClick={() => navigate("/planos-2")} size="sm" className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-primary-foreground">
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
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent"
                  title="Comprar créditos"
                >
                  <PlusCircle className="w-4 h-4 text-muted-foreground" style={{ filter: 'drop-shadow(0 0 4px rgba(148, 163, 184, 0.5))' }} />
                </button>
              </div>
              <ProfileDropdown />
            </>
          )}
          {isPremium && (
            <>
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-primary-foreground">
                <Star className="h-3 w-3 mr-1" fill="currentColor" />
                {t('header.premiumActive')}
              </Badge>
              <PremiumCounter />
              <div className="flex items-center gap-1">
              <CreditsPreviewPopover
                  userId={user?.id || ''}
                  variant="desktop"
                />
                <button
                  onClick={() => navigate('/planos-creditos')}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent"
                  title="Comprar créditos"
                >
                  <PlusCircle className="w-4 h-4 text-muted-foreground" style={{ filter: 'drop-shadow(0 0 4px rgba(148, 163, 184, 0.5))' }} />
                </button>
              </div>
              <ProfileDropdown />
            </>
          )}
        </div>
      </header>

      {/* Top Bar - Mobile */}
      <header className="lg:hidden bg-background/95 backdrop-blur-lg px-4 py-3 flex items-center justify-between shadow-lg border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button onClick={onToggleSidebar} className="text-muted-foreground hover:text-foreground p-1">
            <Menu className="h-5 w-5" />
          </button>
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground p-1">
            <Home className="h-5 w-5" />
          </button>
        </div>
        {!user && (
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/login?redirect=/biblioteca-prompts")} size="sm" variant="ghost" className="text-muted-foreground hover:bg-accent text-xs">
              <LogIn className="h-4 w-4 mr-1" />
              {t('header.login')}
            </Button>
            <Button onClick={() => navigate("/planos-2")} size="sm" className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-primary-foreground text-xs">
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
                className="p-0.5 rounded hover:bg-accent"
                title="Comprar créditos"
              >
                <PlusCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <ProfileDropdown isMobile />
          </div>
        )}
        {isPremium && (
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-primary-foreground text-xs px-2">
              <Star className="h-3 w-3" fill="currentColor" />
            </Badge>
            <PremiumCounter />
            <div className="flex items-center gap-1">
              <CreditsPreviewPopover
                userId={user?.id || ''}
                variant="mobile"
              />
              <button
                onClick={() => navigate('/planos-creditos')}
                className="p-0.5 rounded hover:bg-accent"
                title="Comprar créditos"
              >
                <PlusCircle className="w-3.5 h-3.5 text-muted-foreground" />
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
