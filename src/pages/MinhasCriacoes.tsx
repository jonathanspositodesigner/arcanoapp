/**
 * MinhasCriacoes — página dedicada de "Minhas Criações".
 *
 * Substitui o modal global (MyCreationsModal + GlobalMyCreationsHost) por uma
 * rota persistente em /minhas-criacoes, usando o mesmo shell visual da
 * Biblioteca de Prompts (AppLayout: AppSidebar + AppTopBar).
 *
 * O modal antigo NÃO foi deletado — ficou intacto como backup. Para reverter,
 * basta voltar a montar <GlobalMyCreationsHost /> em App.tsx e trocar os
 * navigate("/minhas-criacoes") pelos antigos dispatchEvent("open-my-creations").
 */
import { useState } from "react";
import { Image as ImageIcon, Video, LayoutGrid, AlertTriangle, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AppLayout from "@/components/layout/AppLayout";
import { useMyCreations, type MediaType } from "@/components/ai-tools/creations/useMyCreations";
import MyCreationsGrid from "@/components/ai-tools/creations/MyCreationsGrid";

const FILTERS: { value: MediaType; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "Tudo", icon: <LayoutGrid className="w-4 h-4" /> },
  { value: "image", label: "Imagens", icon: <ImageIcon className="w-4 h-4" /> },
  { value: "video", label: "Vídeos", icon: <Video className="w-4 h-4" /> },
];

const MinhasCriacoes = () => {
  const [mediaType, setMediaType] = useState<MediaType>("all");

  const {
    creations,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    deleteCreation,
  } = useMyCreations({ mediaType });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Library className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Minhas Criações</h1>
            <p className="text-sm text-muted-foreground">
              Suas gerações recentes em todas as ferramentas de IA
            </p>
          </div>
        </div>

        {/* Expiration Warning */}
        <div className="flex items-center gap-2 p-3 rounded-lg border border-yellow-400/60 bg-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0 text-primary-foreground" />
          <p className="text-sm font-medium text-primary-foreground">
            Os arquivos expiram em <strong className="text-destructive">24 horas</strong> após a geração e somem automaticamente. Faça download para guardar.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant="outline"
              size="sm"
              onClick={() => setMediaType(filter.value)}
              className={cn(
                "gap-2 transition-all",
                mediaType === filter.value
                  ? "bg-accent border-primary/50 text-foreground"
                  : "bg-transparent border-border text-muted-foreground hover:bg-accent/50"
              )}
            >
              {filter.icon}
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Grid */}
        <MyCreationsGrid
          creations={creations}
          isLoading={isLoading}
          error={error}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onRetry={refresh}
          onDelete={deleteCreation}
        />
      </div>
    </AppLayout>
  );
};

export default MinhasCriacoes;
