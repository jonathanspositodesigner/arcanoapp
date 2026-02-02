import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Coins, Lock, Settings, LogOut, Phone, LogIn, Sparkles } from "lucide-react";
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
import { useUpscalerCredits } from "@/hooks/useUpscalerCredits";
import { useTranslation } from "react-i18next";

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
  const { balance: credits, isLoading: creditsLoading } = useUpscalerCredits(user?.id);
  const [userProfile, setUserProfile] = useState<{ name?: string; phone?: string } | null>(null);

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
    <header className="sticky top-0 z-50 bg-[#0D0221]/95 backdrop-blur-lg border-b border-purple-500/20">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left Side: Back Button + Title/Logo */}
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-purple-300 hover:text-white hover:bg-purple-500/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          
          {showLogo ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
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
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-purple-300 hidden sm:block">{subtitle}</p>
              )}
            </div>
          ) : null}
        </div>

        {/* Right Side: Login or Profile */}
        <div className="flex items-center gap-2">
          {!user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/login-artes?redirect=" + encodeURIComponent(window.location.pathname))}
              className="text-purple-300 border-purple-500/30 hover:bg-purple-500/20 text-xs sm:text-sm"
            >
              <LogIn className="w-4 h-4 mr-1 sm:mr-2" />
              {t('ferramentas.login')}
            </Button>
          ) : (
            <>
              {/* Credits Badge */}
              <Badge
                variant="outline"
                className="bg-purple-900/50 border-purple-500/30 text-purple-200 flex items-center gap-1.5 px-2.5 py-1 cursor-pointer hover:bg-purple-800/50"
                onClick={() => navigate('/credit-history')}
              >
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span className="font-medium">
                  {creditsLoading ? '...' : credits}
                </span>
              </Badge>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-purple-300 hover:text-white hover:bg-purple-500/20 rounded-full"
                  >
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-[#1A0A2E] border-purple-500/30 text-white"
                >
                  {/* User Info */}
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

                  {/* Credits Display */}
                  <div className="px-2 py-2 flex items-center justify-between">
                    <span className="text-sm text-purple-300 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      Créditos
                    </span>
                    <Badge className="bg-purple-600 text-white">
                      {creditsLoading ? '...' : credits}
                    </Badge>
                  </div>

                  <DropdownMenuSeparator className="bg-purple-500/20" />

                  {/* Actions */}
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
    </header>
  );
};

export default ToolsHeader;
