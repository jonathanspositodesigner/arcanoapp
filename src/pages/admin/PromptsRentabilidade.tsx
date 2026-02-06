import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdminSidebarPlatform from "@/components/AdminSidebarPlatform";
import AIToolsProfitTable from "@/components/admin/AIToolsProfitTable";

const PromptsRentabilidade = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/admin-login');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      toast.error("Acesso negado");
      navigate('/');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin-login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebarPlatform platform="prompts" onLogout={handleLogout} />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Rentabilidade</h1>
            <p className="text-muted-foreground">
              Análise de lucro das ferramentas de IA
            </p>
          </div>

          <AIToolsProfitTable />
        </div>
      </main>
    </div>
  );
};

export default PromptsRentabilidade;
