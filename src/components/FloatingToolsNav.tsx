import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles, BookOpen, Image, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Sparkles, label: "Ferramentas IA", path: "/ferramentas-ia-aplicativo" },
  { icon: BookOpen, label: "Prompts", path: "/biblioteca-prompts" },
  { icon: Image, label: "Gerar Imagem", path: "/gerar-imagem" },
  { icon: Video, label: "Gerar Vídeo", path: "/gerar-video" },
];

// Pages where the nav should NOT appear (actual AI tool interfaces)
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

export function FloatingToolsNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on excluded tool pages
  const isExcluded = excludedPaths.some(p => location.pathname.startsWith(p));
  if (isExcluded) return null;

  // Only show on relevant pages
  const showOnPaths = [
    "/ferramentas-ia-aplicativo",
    "/biblioteca-prompts",
    "/biblioteca-artes",
    "/promptverso",
    "/gerar-imagem",
    "/gerar-video",
    "/planos",
    "/contribuir",
  ];
  const shouldShow = showOnPaths.some(p => location.pathname.startsWith(p));
  if (!shouldShow) return null;

  return (
    <div className="fixed right-3 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1.5 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-1.5 shadow-lg shadow-black/20">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 group",
              isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            title={item.label}
          >
            <item.icon className="h-4.5 w-4.5" />
            {/* Tooltip */}
            <span className="absolute right-full mr-2.5 px-2.5 py-1 text-xs font-medium bg-popover text-popover-foreground border border-border rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-md">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
