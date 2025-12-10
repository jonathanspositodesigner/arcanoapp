import { NavLink, useLocation } from "react-router-dom";
import { Wrench, BarChart3, Megaphone, LogOut, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps {
  onLogout: () => void;
}

const AdminSidebar = ({ onLogout }: AdminSidebarProps) => {
  const location = useLocation();

  const menuItems = [
    {
      label: "FERRAMENTAS",
      path: "/admin-ferramentas",
      icon: Wrench,
      description: "Gerenciar conteúdos"
    },
    {
      label: "DASHBOARD",
      path: "/admin-dashboard",
      icon: BarChart3,
      description: "Métricas e analytics"
    },
    {
      label: "MARKETING",
      path: "/admin-marketing",
      icon: Megaphone,
      description: "Campanhas e divulgação"
    }
  ];

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Painel Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerenciamento geral</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
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
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <NavLink to="/">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Home className="h-4 w-4" />
            Voltar ao Site
          </Button>
        </NavLink>
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
