import { useState, useEffect, ReactNode } from "react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";
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
    <CreditsProvider userId={user?.id}>
      <div className={`${fullScreen ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-[#0D0221]`}>
        <AppTopBar
          user={user}
          isPremium={isPremium}
          planType={planType}
          userProfile={userProfile}
          onLogout={logout}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        />
        <div className="flex">
          <AppSidebar
            user={user}
            isPremium={isPremium}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
          <main className={`flex-1 ${fullScreen ? 'h-[calc(100vh-57px)] overflow-hidden' : ''}`}>
            {children}
          </main>
        </div>
      </div>
    </CreditsProvider>
  );
};

export default AppLayout;
