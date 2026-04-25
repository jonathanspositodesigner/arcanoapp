import { useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, FolderOpen, User, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
// MyCreationsModal substituído pela página /minhas-criacoes (mantido como backup).

const navItems = [
  { icon: Home, label: "Início", path: "/" },
  { icon: BookOpen, label: "Prompts", path: "/biblioteca-prompts" },
  { icon: FolderOpen, label: "Criações", path: "/minhas-criacoes" },
  { icon: Coins, label: "Recarregar", path: "/planos-2" },
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
  "/gerar-imagem",
  "/gerar-video",
  "/seedance2",
  // Landing pages
  "/planos-upscaler-arcano",
  "/planos-forja-selos-3d",
  "/planos-arcanocloner",
  "/planos-creditos",
  "/planos-upscaler-creditos",
  "/arcanocloner-teste",
  "/testecloner",
  "/combo-artes-arcanas",
  "/prevenda-pack4",
  "/pack-agendas",
  "/obrigado",
  // Biblioteca de Artes (plataforma isolada)
  "/biblioteca-artes",
  "/biblioteca-artes-hub",
  "/biblioteca-artes-musicos",
  "/planos-artes",
  "/login-artes",
  "/login-artes-musicos",
];

const showOnPaths = [
  "/ferramentas-ia-aplicativo",
  "/biblioteca-prompts",
  "/promptverso",
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
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-2 rounded-2xl shadow-lg shadow-primary/20 border border-border bg-card/95 backdrop-blur-md">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => {
                if (item.path) navigate(item.path);
              }}
              title={item.label}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
            </button>
          );
        })}
      </div>
    </>
  );
}
