import { useState, useEffect, ReactNode } from "react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useMetaPixelAdvancedMatching } from "@/hooks/useMetaPixelAdvancedMatching";
import { supabase } from "@/integrations/supabase/client";
import { PremiumPromptProvider } from "@/contexts/PremiumPromptContext";
import AppSidebar from "./AppSidebar";
import AppTopBar from "./AppTopBar";

interface AppLayoutProps {
  children: ReactNode;
  /** If true, the content area uses h-screen with overflow-hidden (for full-screen tools) */
  fullScreen?: boolean;
}

const AppLayout = ({ children, fullScreen = false }: AppLayoutProps) => {
  const { user, isPremium, planType, logout } = usePremiumStatus();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name?: string; phone?: string } | null>(null);
  useMetaPixelAdvancedMatching();

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
    <PremiumPromptProvider user={user} isPremium={isPremium} planType={planType}>
    <div className={`${fullScreen ? 'h-screen flex flex-col overflow-hidden' : 'min-h-screen'} bg-background`}>
      <AppTopBar
        user={user}
        isPremium={isPremium}
        planType={planType}
        userProfile={userProfile}
        onLogout={logout}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
      />
      <div className={fullScreen ? 'flex flex-1 min-h-0 overflow-hidden' : 'flex'}>
        <AppSidebar
          user={user}
          isPremium={isPremium}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          fullScreen={fullScreen}
        />
        <main className={`flex-1 min-w-0 ${fullScreen ? 'flex min-h-0 flex-col overflow-hidden' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
