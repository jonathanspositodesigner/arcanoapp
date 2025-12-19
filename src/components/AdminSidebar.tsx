import { useNavigate } from "react-router-dom";
import { LogOut, Home, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps {
  onLogout: () => void;
}

const AdminSidebar = ({ onLogout }: AdminSidebarProps) => {
  const navigate = useNavigate();

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Painel Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerenciamento geral</p>
      </div>

      {/* Central message */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
        <p className="text-muted-foreground mb-4">
          Esta página foi migrada para o novo Hub administrativo.
        </p>
        <Button 
          className="gap-2"
          onClick={() => navigate('/admin-hub')}
        >
          <LayoutDashboard className="h-4 w-4" />
          Ir para o Hub
        </Button>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={() => navigate('/')}
        >
          <Home className="h-4 w-4" />
          Voltar ao Site
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
