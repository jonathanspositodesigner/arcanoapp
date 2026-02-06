import { NavLink, useLocation } from "react-router-dom";
import { Wrench, BarChart3, Megaphone, LogOut, Home, ArrowLeft, Sparkles, Music, FileText, Cpu, Bug, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type AdminPlatform = "artes-eventos" | "artes-musicos" | "prompts";

interface AdminSidebarPlatformProps {
  platform: AdminPlatform;
  onLogout: () => void;
}

const platformConfig = {
  "artes-eventos": {
    title: "Artes - Eventos",
    subtitle: "Biblioteca de Artes Arcanas",
    icon: Sparkles,
    color: "text-amber-500",
    basePath: "/admin-artes-eventos"
  },
  "artes-musicos": {
    title: "Artes - Músicos",
    subtitle: "Biblioteca de Artes Arcanas",
    icon: Music,
    color: "text-violet-500",
    basePath: "/admin-artes-musicos"
  },
  "prompts": {
    title: "PromptClub",
    subtitle: "Biblioteca de Prompts",
    icon: FileText,
    color: "text-primary",
    basePath: "/admin-prompts"
  }
};

const AdminSidebarPlatform = ({ platform, onLogout }: AdminSidebarPlatformProps) => {
  const location = useLocation();
  const config = platformConfig[platform];

  const baseMenuItems = [
    {
      label: "FERRAMENTAS",
      path: config.basePath,
      icon: Wrench,
      description: "Gerenciar conteúdos"
    },
    {
      label: "MARKETING",
      path: `${config.basePath}/marketing`,
      icon: Megaphone,
      description: "Campanhas e divulgação"
    },
    {
      label: "DASHBOARD",
      path: `${config.basePath}/dashboard`,
      icon: BarChart3,
      description: "Métricas e analytics"
    }
  ];

  // Prompts-specific menu items (IA tools)
  const promptsExtraItems = platform === "prompts" ? [
    {
      label: "CUSTOS IA",
      path: `${config.basePath}/custos-ia`,
      icon: Cpu,
      description: "Uso das ferramentas de IA"
    },
    {
      label: "DEBUG IA",
      path: `${config.basePath}/debug-ia`,
      icon: Bug,
      description: "Simulação e diagnóstico"
    },
    {
      label: "RENTABILIDADE",
      path: `${config.basePath}/rentabilidade`,
      icon: TrendingUp,
      description: "Análise de lucro por ferramenta"
    }
  ] : [];

  const menuItems = [...baseMenuItems.slice(0, 2), ...promptsExtraItems, ...baseMenuItems.slice(2)];

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <config.icon className={cn("h-6 w-6", config.color)} />
          <div>
            <h1 className="text-lg font-bold text-foreground">{config.title}</h1>
            <p className="text-xs text-muted-foreground">{config.subtitle}</p>
          </div>
        </div>
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
        <NavLink to="/admin-hub">
          <Button variant="outline" className="w-full justify-start gap-2">
            <ArrowLeft className="h-4 w-4" />
            Trocar Plataforma
          </Button>
        </NavLink>
        <NavLink to="/">
          <Button variant="ghost" className="w-full justify-start gap-2">
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

export default AdminSidebarPlatform;
