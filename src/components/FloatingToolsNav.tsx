import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles, BookOpen, FolderOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Sparkles, label: "Ferramentas IA", path: "/ferramentas-ia-aplicativo" },
  { icon: BookOpen, label: "Prompts", path: "/biblioteca-prompts" },
  { icon: FolderOpen, label: "Criações", path: "/credit-history" },
  { icon: User, label: "Perfil", path: "/profile-settings" },
];

const excludedPaths = [
  "/upscaler-arcano-tool",
  "/remover-fundo-tool",
  "/gerador-personagem-tool",
  "/pose-changer-tool",
  "/veste-ai-tool",
  "/video-upscaler-tool",
  "/arcano-cloner-tool",
  "/flyer-maker",
  "/mudar-roupa",
  "/mudar-pose",
  "/forja-selos-3d",
  "/ferramenta-ia-artes",
];

const showOnPaths = [
  "/ferramentas-ia-aplicativo",
  "/biblioteca-prompts",
  "/biblioteca-artes",
  "/promptverso",
  "/gerar-imagem",
  "/gerar-video",
  "/planos",
  "/contribuir",
  "/credit-history",
  "/profile-settings",
];

export function FloatingToolsNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isExcluded = excludedPaths.some(p => location.pathname.startsWith(p));
  if (isExcluded) return null;

  const shouldShow = showOnPaths.some(p => location.pathname.startsWith(p));
  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-2xl shadow-lg shadow-primary/20 border border-primary/20"
      style={{ background: 'linear-gradient(135deg, hsl(263 56% 20% / 0.95), hsl(273 50% 28% / 0.95))' }}
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[52px]",
              isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/40"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            <item.icon className="h-[18px] w-[18px]" />
            <span className="text-[9px] font-medium leading-tight">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
