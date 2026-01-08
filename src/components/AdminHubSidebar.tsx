import { Home, BarChart3, LogOut, ArrowLeft, Megaphone, Users, ShieldCheck, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export type HubViewType = "home" | "dashboard" | "marketing" | "email-marketing" | "push-notifications" | "partners" | "abandoned-checkouts" | "admins";

interface AdminHubSidebarProps {
  activeView: HubViewType;
  onViewChange: (view: HubViewType) => void;
  onLogout: () => void;
}

const AdminHubSidebar = ({ activeView, onViewChange, onLogout }: AdminHubSidebarProps) => {
  const navigate = useNavigate();

  const menuItems = [
    {
      id: "home" as const,
      label: "HOME",
      icon: Home,
      description: "Selecionar plataforma"
    },
    {
      id: "dashboard" as const,
      label: "DASHBOARD GERAL",
      icon: BarChart3,
      description: "Métricas consolidadas"
    },
    {
      id: "marketing" as const,
      label: "MARKETING GERAL",
      icon: Megaphone,
      description: "Visão geral de campanhas"
    },
    {
      id: "partners" as const,
      label: "GERENCIAR PARCEIROS",
      icon: Users,
      description: "Cadastrar e gerenciar colaboradores"
    },
    {
      id: "abandoned-checkouts" as const,
      label: "REMARKETING",
      icon: ShoppingCart,
      description: "Checkouts abandonados"
    },
    {
      id: "admins" as const,
      label: "ADMINISTRADORES",
      icon: ShieldCheck,
      description: "Gerenciar acessos de admin"
    }
  ];

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Painel Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Hub Central</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left",
                "hover:bg-accent hover:text-accent-foreground",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <div>
                <p className="font-semibold text-sm">{item.label}</p>
                <p className={cn(
                  "text-xs",
                  isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4" />
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

export default AdminHubSidebar;
